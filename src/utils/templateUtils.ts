import { Rectangle, RectangleType } from '../types';
import { TemplateNode, TreeData, TemplateInsertionOptions, TemplateInsertionResult } from '../types/template';
import { DEFAULT_RECTANGLE_SIZE } from './constants';

/**
 * Load and parse template data from JSON file
 */
export const loadTemplateFromFile = async (file: File): Promise<TemplateNode[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate that data is an array
        if (!Array.isArray(data)) {
          throw new Error('Template file must contain an array of template nodes');
        }
        
        // Validate each template node
        const validatedNodes: TemplateNode[] = data.map((node, index) => {
          if (!node.id || typeof node.id !== 'string') {
            throw new Error(`Template node at index ${index} is missing required 'id' field`);
          }
          if (!node.name || typeof node.name !== 'string') {
            throw new Error(`Template node at index ${index} is missing required 'name' field`);
          }
          if (!node.description || typeof node.description !== 'string') {
            throw new Error(`Template node at index ${index} is missing required 'description' field`);
          }
          if (node.parent !== null && typeof node.parent !== 'string') {
            throw new Error(`Template node at index ${index} has invalid 'parent' field - must be string or null`);
          }
          
          return {
            id: node.id,
            name: node.name,
            description: node.description,
            parent: node.parent
          };
        });
        
        resolve(validatedNodes);
      } catch (error) {
        reject(new Error(`Failed to parse template file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read template file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Convert template nodes to tree data structure for react-complex-tree
 */
export const convertToTreeData = (templateNodes: TemplateNode[]): { treeData: TreeData; rootItems: string[] } => {
  const treeData: TreeData = {};
  const actualRootItems: string[] = [];
  
  // Build tree structure for all actual nodes
  templateNodes.forEach(node => {
    const children = templateNodes
      .filter(child => child.parent === node.id)
      .map(child => child.id);
    
    const isFolder = children.length > 0;
    
    treeData[node.id] = {
      index: node.id,
      children: children.length > 0 ? children : undefined,
      data: node,
      isFolder,
      canMove: true,
      canRename: false
    };
    
    // Track actual root items (nodes with no parent)
    if (!node.parent) {
      actualRootItems.push(node.id);
    }
  });
  
  // Create a virtual root that contains all actual root items
  const VIRTUAL_ROOT_ID = '__virtual_root__';
  treeData[VIRTUAL_ROOT_ID] = {
    index: VIRTUAL_ROOT_ID,
    children: actualRootItems,
    data: {
      id: VIRTUAL_ROOT_ID,
      name: 'Template Root',
      description: 'Virtual root containing all template hierarchies',
      parent: null
    },
    isFolder: true,
    canMove: false,
    canRename: false
  };
  
  return { treeData, rootItems: [VIRTUAL_ROOT_ID] };
};

/**
 * Get all descendants of a template node
 */
export const getTemplateDescendants = (nodeId: string, templateNodes: TemplateNode[]): TemplateNode[] => {
  const descendants: TemplateNode[] = [];
  const directChildren = templateNodes.filter(node => node.parent === nodeId);
  
  directChildren.forEach(child => {
    descendants.push(child);
    descendants.push(...getTemplateDescendants(child.id, templateNodes));
  });
  
  return descendants;
};

/**
 * Calculate intelligent position for template insertion
 */
export const calculateTemplateInsertionPosition = (
  existingRectangles: Rectangle[],
  globalSettings: {
    gridSize: number;
    leafWidth: number;
    leafHeight: number;
  }
): { x: number; y: number } => {
  if (existingRectangles.length === 0) {
    return { x: 0, y: 0 };
  }
  
  // Find the rightmost position
  const rightmost = Math.max(...existingRectangles.map(r => r.x + r.w));
  
  // Calculate grid-aligned position with some spacing
  const spacing = globalSettings.gridSize * 2;
  const x = Math.ceil((rightmost + spacing) / globalSettings.gridSize) * globalSettings.gridSize;
  const y = 0; // Start at top
  
  return { x, y };
};

/**
 * Convert template node to rectangle
 */
export const templateNodeToRectangle = (
  templateNode: TemplateNode,
  position: { x: number; y: number },
  size: { w: number; h: number },
  parentId: string | undefined,
  generateId: () => string,
  type: RectangleType,
  color: string = '#3b82f6'
): Rectangle => {
  return {
    id: generateId(),
    parentId,
    x: position.x,
    y: position.y,
    w: size.w,
    h: size.h,
    label: templateNode.name,
    color,
    type,
    metadata: {
      description: templateNode.description,
      tags: ['template'],
      templateId: templateNode.id
    }
  };
};

/**
 * Insert template node and its descendants as rectangles
 */
export const insertTemplateAsRectangles = (
  templateNode: TemplateNode,
  templateNodes: TemplateNode[],
  options: TemplateInsertionOptions,
  existingRectangles: Rectangle[],
  generateId: () => string,
  globalSettings: {
    gridSize: number;
    leafWidth: number;
    leafHeight: number;
  }
): TemplateInsertionResult => {
  try {
    const newRectangles: Rectangle[] = [];
    const rectangleIdMap = new Map<string, string>(); // template ID -> rectangle ID
    
    // Get all nodes to insert (target node + descendants if requested)
    const nodesToInsert = options.includeChildren
      ? [templateNode, ...getTemplateDescendants(templateNode.id, templateNodes)]
      : [templateNode];
    
    // Sort nodes by hierarchy level (parents first)
    const sortedNodes = sortNodesByHierarchy(nodesToInsert);
    
    // Calculate starting position
    const startPosition = options.startPosition || 
      calculateTemplateInsertionPosition(existingRectangles, globalSettings);
    
    let currentPosition = { ...startPosition };
    
    // Convert each template node to rectangle
    sortedNodes.forEach((node, index) => {
      const parentTemplateId = node.parent;
      const parentRectangleId = parentTemplateId ? rectangleIdMap.get(parentTemplateId) : undefined;
      
      // Determine rectangle type
      const hasChildren = nodesToInsert.some(n => n.parent === node.id);
      const type: RectangleType = !node.parent ? 'root' : hasChildren ? 'parent' : 'leaf';
      
      // Calculate size based on type
      const size = type === 'leaf' 
        ? { w: globalSettings.leafWidth, h: globalSettings.leafHeight }
        : DEFAULT_RECTANGLE_SIZE.root;
      
      // Calculate position
      let position = currentPosition;
      if (parentRectangleId) {
        // For child nodes, use layout calculation
        const parentRect = newRectangles.find(r => r.id === parentRectangleId);
        if (parentRect) {
          const siblingCount = newRectangles.filter(r => r.parentId === parentRectangleId).length;
          position = calculateChildPosition(parentRect, siblingCount, size, globalSettings.gridSize);
        }
      } else if (index > 0) {
        // For root nodes after the first, offset horizontally
        currentPosition.x += size.w + globalSettings.gridSize * 2;
        position = currentPosition;
      }
      
      // Create rectangle
      const rectangle = templateNodeToRectangle(
        node,
        position,
        size,
        parentRectangleId,
        generateId,
        type,
        options.color
      );
      
      newRectangles.push(rectangle);
      rectangleIdMap.set(node.id, rectangle.id);
      
      // Update current position for next root-level node
      if (!node.parent) {
        currentPosition = { ...position };
      }
    });
    
    return {
      success: true,
      insertedRectangleIds: newRectangles.map(r => r.id),
      rootRectangleId: rectangleIdMap.get(templateNode.id) || null
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during template insertion',
      insertedRectangleIds: [],
      rootRectangleId: null
    };
  }
};

/**
 * Sort template nodes by hierarchy level (parents before children)
 */
const sortNodesByHierarchy = (nodes: TemplateNode[]): TemplateNode[] => {
  const sorted: TemplateNode[] = [];
  const remaining = [...nodes];
  const processed = new Set<string>();
  
  while (remaining.length > 0) {
    const beforeLength = remaining.length;
    
    for (let i = remaining.length - 1; i >= 0; i--) {
      const node = remaining[i];
      
      // Can process if it's a root node or if its parent is already processed
      if (!node.parent || processed.has(node.parent)) {
        sorted.push(node);
        processed.add(node.id);
        remaining.splice(i, 1);
      }
    }
    
    // Prevent infinite loop if there are circular dependencies
    if (remaining.length === beforeLength) {
      console.warn('Circular dependency detected in template nodes, processing remaining nodes anyway');
      sorted.push(...remaining);
      break;
    }
  }
  
  return sorted;
};

/**
 * Calculate position for child rectangle within parent
 */
const calculateChildPosition = (
  parentRect: Rectangle,
  childIndex: number,
  childSize: { w: number; h: number },
  gridSize: number
): { x: number; y: number } => {
  const margin = gridSize;
  const labelMargin = gridSize * 2;
  
  // Simple grid layout within parent
  const availableWidth = parentRect.w - (margin * 2);
  
  const cols = Math.floor(availableWidth / (childSize.w + margin));
  const maxCols = Math.max(1, cols);
  
  const col = childIndex % maxCols;
  const row = Math.floor(childIndex / maxCols);
  
  const x = parentRect.x + margin + (col * (childSize.w + margin));
  const y = parentRect.y + labelMargin + (row * (childSize.h + margin));
  
  return { x, y };
};