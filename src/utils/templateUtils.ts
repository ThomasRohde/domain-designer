import { Rectangle, RectangleType } from '../types';
import { TemplateNode, TreeData, TemplateInsertionOptions, TemplateInsertionResult } from '../types/template';
import { DEFAULT_RECTANGLE_SIZE } from './constants';

/**
 * Asynchronously loads and validates template hierarchy from JSON file
 * Performs comprehensive schema validation to ensure data integrity
 * 
 * @param file - File object containing JSON template data
 * @returns Promise resolving to validated TemplateNode array
 * @throws Error with descriptive message for parsing or validation failures
 */
export const loadTemplateFromFile = async (file: File): Promise<TemplateNode[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Ensure root structure is an array of template nodes
        if (!Array.isArray(data)) {
          throw new Error('Template file must contain an array of template nodes');
        }
        
        // Validate each node's required fields and structure
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
 * Transforms flat template array into hierarchical tree structure
 * Creates virtual root for react-complex-tree component compatibility
 * 
 * @param templateNodes - Flat array of template nodes with parent references
 * @returns Object with tree data structure and root item identifiers
 */
export const convertToTreeData = (templateNodes: TemplateNode[]): { treeData: TreeData; rootItems: string[] } => {
  const treeData: TreeData = {};
  const actualRootItems: string[] = [];
  
  // Transform flat structure into hierarchical tree with computed children
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
  
  // Create synthetic root node to satisfy react-complex-tree requirements
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
 * Recursively collects all descendant nodes in the template hierarchy
 * Used for bulk operations and hierarchy validation
 * 
 * @param nodeId - Parent node identifier to start traversal from
 * @param templateNodes - Complete array of template nodes to search
 * @returns Array of all descendant nodes in depth-first order
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
 * Determines optimal insertion position to avoid overlapping existing rectangles
 * Uses grid-aligned positioning with intelligent spacing calculation
 * 
 * @param existingRectangles - Current rectangles in the diagram
 * @param globalSettings - Grid size and dimension settings for alignment
 * @returns Calculated x,y coordinates for new template root
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
  
  // Calculate rightmost boundary to avoid overlap
  const rightmost = Math.max(...existingRectangles.map(r => r.x + r.w));
  
  // Apply grid-aligned spacing for visual consistency
  const spacing = globalSettings.gridSize * 2;
  const x = Math.ceil((rightmost + spacing) / globalSettings.gridSize) * globalSettings.gridSize;
  const y = 0; // Start at top
  
  return { x, y };
};

/**
 * Transforms template node into diagram rectangle with proper styling and metadata
 * Applies consistent sizing based on rectangle type and hierarchy position
 * 
 * @param templateNode - Source template node with name and description
 * @param position - Target position coordinates in grid units
 * @param size - Rectangle dimensions in grid units
 * @param parentId - Parent rectangle ID for hierarchy establishment
 * @param generateId - ID generation function for uniqueness
 * @param type - Rectangle type determining visual appearance
 * @param color - Background color for the rectangle
 * @returns Complete Rectangle object ready for diagram insertion
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
      tags: ['template'],  // Mark as template-derived for tracking
      templateId: templateNode.id  // Preserve original template reference
    }
  };
};

/**
 * Converts template hierarchy into rectangle diagram with intelligent layout
 * Handles parent-child relationships, sizing, and positioning automatically
 * 
 * This is the main template-to-diagram conversion function that:
 * - Maintains hierarchical relationships
 * - Applies consistent sizing rules
 * - Calculates intelligent positioning
 * - Handles error recovery gracefully
 * 
 * @param templateNode - Root node of template subtree to insert
 * @param templateNodes - Complete template node array for relationship resolution
 * @param options - Insertion configuration (depth, positioning, styling)
 * @param existingRectangles - Current diagram rectangles for collision avoidance
 * @param generateId - Unique ID generator function
 * @param globalSettings - Grid and sizing configuration
 * @returns Result object with success status and created rectangle IDs
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
    
    // Determine insertion scope based on user preferences
    const nodesToInsert = options.includeChildren
      ? [templateNode, ...getTemplateDescendants(templateNode.id, templateNodes)]
      : [templateNode];
    
    // Ensure parents are created before children to maintain referential integrity
    const sortedNodes = sortNodesByHierarchy(nodesToInsert);
    
    // Calculate starting position
    const startPosition = options.startPosition || 
      calculateTemplateInsertionPosition(existingRectangles, globalSettings);
    
    let currentPosition = { ...startPosition };
    
    // Transform each template node into a positioned rectangle
    sortedNodes.forEach((node, index) => {
      const parentTemplateId = node.parent;
      const parentRectangleId = parentTemplateId ? rectangleIdMap.get(parentTemplateId) : undefined;
      
      // Classify rectangle type based on hierarchy position and children
      const hasChildren = nodesToInsert.some(n => n.parent === node.id);
      const type: RectangleType = !node.parent ? 'root' : hasChildren ? 'parent' : 'leaf';
      
      // Calculate size based on type
      const size = type === 'leaf' 
        ? { w: globalSettings.leafWidth, h: globalSettings.leafHeight }
        : DEFAULT_RECTANGLE_SIZE.root;
      
      // Calculate optimal position based on hierarchy and existing layout
      let position = currentPosition;
      if (parentRectangleId) {
        // Child positioning - use grid layout within parent bounds
        const parentRect = newRectangles.find(r => r.id === parentRectangleId);
        if (parentRect) {
          const siblingCount = newRectangles.filter(r => r.parentId === parentRectangleId).length;
          position = calculateChildPosition(parentRect, siblingCount, size, globalSettings.gridSize);
        }
      } else if (index > 0) {
        // Multiple root nodes - arrange horizontally with spacing
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
 * Topologically sorts template nodes ensuring parents precede children
 * Prevents referential integrity issues during rectangle creation
 * Includes cycle detection to handle malformed template data gracefully
 * 
 * @param nodes - Array of template nodes to sort
 * @returns Sorted array with parents before their children
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
    
    // Detect circular dependencies and fail gracefully
    if (remaining.length === beforeLength) {
      console.warn('Circular dependency detected in template nodes, processing remaining nodes anyway');
      sorted.push(...remaining);  // Include problematic nodes to prevent data loss
      break;
    }
  }
  
  return sorted;
};

/**
 * Calculates grid-aligned position for child rectangle within parent bounds
 * Uses simple grid layout with consistent margins and label spacing
 * 
 * @param parentRect - Parent rectangle defining container bounds
 * @param childIndex - Zero-based index of child for grid positioning
 * @param childSize - Dimensions of child rectangle in grid units
 * @param gridSize - Base grid unit for alignment calculations
 * @returns Calculated position coordinates within parent
 */
const calculateChildPosition = (
  parentRect: Rectangle,
  childIndex: number,
  childSize: { w: number; h: number },
  gridSize: number
): { x: number; y: number } => {
  const margin = gridSize;
  const labelMargin = gridSize * 2;
  
  // Calculate grid dimensions based on available space
  const availableWidth = parentRect.w - (margin * 2);
  
  const cols = Math.floor(availableWidth / (childSize.w + margin));
  const maxCols = Math.max(1, cols);  // Ensure at least one column
  
  // Convert linear index to 2D grid coordinates
  const col = childIndex % maxCols;
  const row = Math.floor(childIndex / maxCols);
  
  // Calculate absolute position with proper margins
  const x = parentRect.x + margin + (col * (childSize.w + margin));
  const y = parentRect.y + labelMargin + (row * (childSize.h + margin));  // Account for parent label space
  
  return { x, y };
};