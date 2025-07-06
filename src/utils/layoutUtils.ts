import { Rectangle, DragState, ResizeState, HierarchyDragState, LayoutPreferences } from '../types';
import { MARGIN, LABEL_MARGIN, MIN_WIDTH, MIN_HEIGHT, DEFAULT_RECTANGLE_SIZE } from './constants';

/**
 * Calculate grid dimensions based on layout preferences
 */
export const calculateGridDimensions = (
  childrenCount: number,
  layoutPreferences?: LayoutPreferences
): { cols: number; rows: number } => {
  if (!layoutPreferences) {
    // Default behavior - square grid
    const cols = Math.ceil(Math.sqrt(childrenCount));
    const rows = Math.ceil(childrenCount / cols);
    return { cols, rows };
  }

  const { fillStrategy, maxColumns, maxRows } = layoutPreferences;

  if (fillStrategy === 'fill-rows-first') {
    // Fill rows first, limited by maxColumns
    const cols = maxColumns ? Math.min(maxColumns, childrenCount) : Math.ceil(Math.sqrt(childrenCount));
    const rows = Math.ceil(childrenCount / cols);
    return { cols, rows };
  } else {
    // Fill columns first, limited by maxRows
    const rows = maxRows ? Math.min(maxRows, childrenCount) : Math.ceil(Math.sqrt(childrenCount));
    const cols = Math.ceil(childrenCount / rows);
    return { cols, rows };
  }
};

/**
 * Calculate auto-sized dimensions and positions for child rectangles
 */
export const calculateChildLayout = (
  parentRect: Rectangle, 
  children: Rectangle[], 
  fixedDimensions?: {
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
  }
): Rectangle[] => {
  if (!parentRect || children.length === 0) return [];

  // Use LABEL_MARGIN for top spacing to accommodate labels, regular MARGIN for other sides
  const topMargin = LABEL_MARGIN;
  const sideMargin = MARGIN;
  
  const availableWidth = parentRect.w - (sideMargin * 2);
  const availableHeight = parentRect.h - topMargin - sideMargin;

  // Use layout preferences from parent rectangle
  const { cols, rows } = calculateGridDimensions(children.length, parentRect.layoutPreferences);

  // Use consistent spacing between children (same as margin)
  const childSpacing = MARGIN;
  
  // Calculate dimensions for all children, considering fixed dimensions for leaves
  const childDimensions = children.map(child => {
    let childWidth = Math.max(MIN_WIDTH, Math.floor((availableWidth - (cols - 1) * childSpacing) / cols));
    let childHeight = Math.max(MIN_HEIGHT, Math.floor((availableHeight - (rows - 1) * childSpacing) / rows));
    
    if (child.type === 'leaf' && fixedDimensions) {
      if (fixedDimensions.leafFixedWidth) {
        childWidth = fixedDimensions.leafWidth;
      }
      if (fixedDimensions.leafFixedHeight) {
        childHeight = fixedDimensions.leafHeight;
      }
    }
    
    return { width: childWidth, height: childHeight };
  });

  // Calculate maximum dimensions needed
  const maxChildWidth = Math.max(...childDimensions.map(d => d.width));
  const maxChildHeight = Math.max(...childDimensions.map(d => d.height));
  
  // Calculate total space needed for all children including spacing
  const totalSpacingWidth = (cols - 1) * childSpacing;
  const totalSpacingHeight = (rows - 1) * childSpacing;
  const totalChildrenWidth = cols * maxChildWidth + totalSpacingWidth;
  const totalChildrenHeight = rows * maxChildHeight + totalSpacingHeight;

  // Calculate remaining space for centering, but ensure we don't exceed available space
  const extraHorizontalSpace = Math.max(0, availableWidth - totalChildrenWidth);
  const extraVerticalSpace = Math.max(0, availableHeight - totalChildrenHeight);

  // Center the children grid within the available space
  const horizontalOffset = extraHorizontalSpace / 2;
  const verticalOffset = extraVerticalSpace / 2;

  return children.map((child, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    // Use consistent dimensions for all children based on maximum size
    const childWidth = maxChildWidth;
    const childHeight = maxChildHeight;

    // Calculate position with consistent spacing between children
    // For columns: start position + (column index * (child width + spacing))
    // For rows: start position + (row index * (child height + spacing))
    const x = parentRect.x + sideMargin + horizontalOffset + (col * (maxChildWidth + childSpacing));
    const y = parentRect.y + topMargin + verticalOffset + (row * (maxChildHeight + childSpacing));

    return {
      ...child,
      x: x,
      y: y,
      w: childWidth,
      h: childHeight
    };
  });
};

/**
 * Update child rectangles layout when parent changes
 */
export const updateChildrenLayout = (
  rectangles: Rectangle[],
  fixedDimensions?: {
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
  }
): Rectangle[] => {
  const updated = [...rectangles];
  const processedIds = new Set<string>();
  
  const processLevel = (): boolean => {
    let processedAny = false;
    
    updated.forEach(rect => {
      if (processedIds.has(rect.id) || !rect.parentId) return;
      
      const parent = updated.find(p => p.id === rect.parentId);
      if (!parent || (!parent.parentId && !processedIds.has(parent.id))) {
        if (parent && !parent.parentId) processedIds.add(parent.id);
      }
      
      if (processedIds.has(rect.parentId) || (parent && !parent.parentId)) {
        const siblings = updated.filter(s => s.parentId === rect.parentId);
        
        if (siblings.length > 0) {
          const currentParent = updated.find(p => p.id === rect.parentId);
          if (currentParent) {
            const newLayout = calculateChildLayout(currentParent, siblings, fixedDimensions);
            
            newLayout.forEach(layoutRect => {
              const index = updated.findIndex(r => r.id === layoutRect.id);
              if (index !== -1) {
                updated[index] = { 
                  ...updated[index], 
                  x: layoutRect.x, 
                  y: layoutRect.y, 
                  w: layoutRect.w, 
                  h: layoutRect.h 
                };
                processedIds.add(layoutRect.id);
                processedAny = true;
              }
            });
          }
        }
      }
    });
    
    return processedAny;
  };
  
  let maxIterations = 10;
  while (processLevel() && maxIterations > 0) {
    maxIterations--;
  }
  
  return updated;
};

/**
 * Calculate initial position and size for a new rectangle
 */
export const calculateNewRectangleLayout = (
  parentId: string | null,
  rectangles: Rectangle[],
  defaultSizes: { root: { w: number; h: number }, leaf: { w: number; h: number } }
): { x: number; y: number; w: number; h: number } => {
  let x = 0, y = 0;
  let { w, h } = parentId ? defaultSizes.leaf : defaultSizes.root;

  if (parentId) {
    const parent = rectangles.find(rect => rect.id === parentId);
    if (parent) {
      const existingChildren = rectangles.filter(rect => rect.parentId === parentId);
      const totalChildren = existingChildren.length + 1; // +1 for the new child
      
      // Use LABEL_MARGIN for top spacing to accommodate labels, regular MARGIN for other sides
      const topMargin = LABEL_MARGIN;
      const sideMargin = MARGIN;
      
      const availableWidth = Math.max(MIN_WIDTH, parent.w - (sideMargin * 2));
      const availableHeight = Math.max(MIN_HEIGHT, parent.h - topMargin - sideMargin);
      
      // Use layout preferences from parent rectangle
      const { cols, rows } = calculateGridDimensions(totalChildren, parent.layoutPreferences);
      
      // Calculate child dimensions
      const childWidth = Math.max(MIN_WIDTH, Math.floor(availableWidth / cols));
      const childHeight = Math.max(MIN_HEIGHT, Math.floor(availableHeight / rows));
      
      // Use consistent spacing between children (same as margin)
      const childSpacing = MARGIN;
      
      // Calculate total space needed including spacing
      const totalSpacingWidth = (cols - 1) * childSpacing;
      const totalSpacingHeight = (rows - 1) * childSpacing;
      const totalChildrenWidth = cols * childWidth + totalSpacingWidth;
      const totalChildrenHeight = rows * childHeight + totalSpacingHeight;
      
      const extraHorizontalSpace = Math.max(0, availableWidth - totalChildrenWidth);
      const extraVerticalSpace = Math.max(0, availableHeight - totalChildrenHeight);
      
      // Center the children grid within the available space
      const horizontalOffset = extraHorizontalSpace / 2;
      const verticalOffset = extraVerticalSpace / 2;
      
      const col = existingChildren.length % cols;
      const row = Math.floor(existingChildren.length / cols);
      
      x = parent.x + sideMargin + horizontalOffset + (col * (childWidth + childSpacing));
      y = parent.y + topMargin + verticalOffset + (row * (childHeight + childSpacing));
      w = childWidth;
      h = childHeight;
      
      w = Math.max(MIN_WIDTH, w);
      h = Math.max(MIN_HEIGHT, h);
    }
  } else {
    const rootRects = rectangles.filter(rect => !rect.parentId);
    if (rootRects.length > 0) {
      const lastRect = rootRects[rootRects.length - 1];
      x = lastRect.x + lastRect.w + MARGIN;
      y = lastRect.y;
    }
  }

  return { x, y, w, h };
};

/**
 * Get all descendants of a rectangle (recursive)
 */
export const getAllDescendants = (parentId: string, rectangles: Rectangle[]): string[] => {
  const descendants: string[] = [];
  const directChildren = rectangles.filter(rect => rect.parentId === parentId);
  
  directChildren.forEach(child => {
    descendants.push(child.id);
    descendants.push(...getAllDescendants(child.id, rectangles));
  });
  
  return descendants;
};

/**
 * Get children of a rectangle
 */
export const getChildren = (parentId: string, rectangles: Rectangle[]): Rectangle[] => {
  return rectangles.filter(rect => rect.parentId === parentId);
};

/**
 * Check if rectangle is a leaf (has no children)
 */
export const isLeaf = (id: string, rectangles: Rectangle[]): boolean => {
  return getChildren(id, rectangles).length === 0;
};

/**
 * Get root rectangles (no parent)
 */
export const getRootRectangles = (rectangles: Rectangle[]): Rectangle[] => {
  return rectangles.filter(rect => !rect.parentId);
};

/**
 * Calculate z-index based on hierarchy depth
 */
export const getZIndex = (
  rect: Rectangle, 
  rectangles: Rectangle[], 
  selectedId: string | null,
  dragState: DragState | null,
  resizeState: ResizeState | null,
  hierarchyDragState?: HierarchyDragState | null
): number => {
  let depth = 0;
  let current: Rectangle | undefined = rect;
  
  while (current && current.parentId) {
    depth++;
    current = rectangles.find(r => r.id === current!.parentId);
    if (!current || depth > 10) break;
  }
  
  const baseZ = 10 + (depth * 10);
  
  // Check if this rectangle is being dragged or is a descendant of the dragged rectangle
  if (dragState || hierarchyDragState) {
    const draggedId = dragState?.id || hierarchyDragState?.draggedRectangleId;
    if (draggedId) {
      const isDraggedRect = rect.id === draggedId;
      const isDescendantOfDragged = getAllDescendants(draggedId, rectangles).includes(rect.id);
      
      if (isDraggedRect || isDescendantOfDragged) {
        // Elevate dragged rectangle and its descendants above everything else
        // Use a high base value (1000) plus depth to maintain hierarchy within the dragged group
        return 1000 + depth;
      }
    }
  }
  
  // Check if this rectangle is being resized
  if (resizeState && rect.id === resizeState.id) {
    // Elevate resized rectangle above others (but not as high as dragged)
    return 900 + depth;
  }
  
  let selectedBoost = 0;
  if (selectedId === rect.id && !dragState && !resizeState) {
    const hasChildren = getChildren(rect.id, rectangles).length > 0;
    // For parent rectangles with children, don't give them a boost that would put them above their children
    // Children need to remain visible when parent is selected
    selectedBoost = hasChildren ? 5 : 100;
  }
  
  return baseZ + selectedBoost;
};

/**
 * Calculate minimum size needed to fit all children snugly
 */
export const calculateMinimumParentSize = (
  parentId: string,
  rectangles: Rectangle[],
  fixedDimensions?: {
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
  }
): { w: number; h: number } => {
  const children = getChildren(parentId, rectangles);
  if (children.length === 0) return { w: MIN_WIDTH, h: MIN_HEIGHT };

  // Use LABEL_MARGIN for top spacing to accommodate labels, regular MARGIN for other sides
  const topMargin = LABEL_MARGIN;
  const sideMargin = MARGIN;

  // Get parent rectangle to access layout preferences
  const parent = rectangles.find(r => r.id === parentId);
  const { cols, rows } = calculateGridDimensions(children.length, parent?.layoutPreferences);

  // Calculate theoretical optimal child dimensions (not actual current dimensions)
  // This ensures consistent sizing and prevents growth on repeated fit-to-children
  const childSpacing = MARGIN;
  
  // Calculate theoretical optimal child dimensions to avoid resize traps
  // Use default sizes rather than current expanded dimensions
  const actualChildDimensions = children.map(child => {
    if (child.type === 'leaf' && fixedDimensions) {
      return {
        width: fixedDimensions.leafFixedWidth ? fixedDimensions.leafWidth : DEFAULT_RECTANGLE_SIZE.leaf.w,
        height: fixedDimensions.leafFixedHeight ? fixedDimensions.leafHeight : DEFAULT_RECTANGLE_SIZE.leaf.h
      };
    }
    // For parent rectangles, calculate their minimum size recursively
    if (child.type === 'parent') {
      const childMinSize = calculateMinimumParentSize(child.id, rectangles, fixedDimensions);
      return { width: childMinSize.w, height: childMinSize.h };
    }
    // For leaf rectangles without fixed dimensions, use default leaf size
    return { 
      width: DEFAULT_RECTANGLE_SIZE.leaf.w, 
      height: DEFAULT_RECTANGLE_SIZE.leaf.h 
    };
  });
  
  
  // Use the actual child dimensions we calculated above
  const childDimensions = actualChildDimensions;

  // Calculate maximum dimensions needed
  const maxChildWidth = Math.max(...childDimensions.map(d => d.width));
  const maxChildHeight = Math.max(...childDimensions.map(d => d.height));

  // Calculate total space needed for all children with consistent spacing
  const totalChildrenWidth = cols * maxChildWidth;
  const totalChildrenHeight = rows * maxChildHeight;

  // Add consistent spacing between children
  const horizontalSpacing = cols > 1 ? (cols - 1) * childSpacing : 0;
  const verticalSpacing = rows > 1 ? (rows - 1) * childSpacing : 0;

  // Calculate minimum required parent size with proper margins
  const minParentWidth = totalChildrenWidth + horizontalSpacing + (sideMargin * 2);
  const minParentHeight = totalChildrenHeight + verticalSpacing + topMargin + sideMargin;

  return {
    w: Math.max(MIN_WIDTH, minParentWidth),
    h: Math.max(MIN_HEIGHT, minParentHeight)
  };
};

/**
 * Sort rectangles by depth (deepest first) to ensure parents render after children
 * Optimized to cache depth calculations and handle numeric ID sorting
 */
export const sortRectanglesByDepth = (rectangles: Rectangle[]): Rectangle[] => {
  // Cache depth calculations to avoid recalculating for each comparison
  const depthCache = new Map<string, number>();
  
  const getDepth = (rect: Rectangle): number => {
    if (depthCache.has(rect.id)) {
      return depthCache.get(rect.id)!;
    }
    
    let depth = 0;
    let current: Rectangle | undefined = rect;
    
    while (current && current.parentId) {
      depth++;
      current = rectangles.find(r => r.id === current!.parentId);
      if (!current || depth > 10) break; // Prevent infinite loops
    }
    
    depthCache.set(rect.id, depth);
    return depth;
  };
  
  // Helper to extract numeric part of ID for proper sorting
  const getNumericId = (id: string): number => {
    const match = id.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
  };

  return [...rectangles].sort((a, b) => {
    const depthA = getDepth(a);
    const depthB = getDepth(b);
    
    // Sort by depth (deepest first), then by numeric creation order for stable sorting
    if (depthA !== depthB) {
      return depthB - depthA; // Deeper elements first
    }
    
    // Proper numeric ID sorting (rect-2 before rect-10)
    const numA = getNumericId(a.id);
    const numB = getNumericId(b.id);
    return numA - numB;
  });
};
