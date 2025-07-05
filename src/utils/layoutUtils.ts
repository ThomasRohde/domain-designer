import { Rectangle, DragState, ResizeState } from '../types';
import { MARGIN, LABEL_MARGIN, MIN_WIDTH, MIN_HEIGHT } from './constants';

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

  const cols = Math.ceil(Math.sqrt(children.length));
  const rows = Math.ceil(children.length / cols);

  // Calculate dimensions for all children, considering fixed dimensions for leaves
  const childDimensions = children.map(child => {
    let childWidth = Math.max(MIN_WIDTH, Math.floor(availableWidth / cols));
    let childHeight = Math.max(MIN_HEIGHT, Math.floor(availableHeight / rows));
    
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

  // Use consistent spacing between children (same as margin)
  const childSpacing = MARGIN;
  
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

    // Use the calculated dimensions for this specific child
    const { width: childWidth, height: childHeight } = childDimensions[index];

    // Calculate position with consistent spacing between children
    // For columns: start position + (column index * (child width + spacing))
    // For rows: start position + (row index * (child height + spacing))
    const x = parentRect.x + sideMargin + horizontalOffset + (col * (maxChildWidth + childSpacing));
    const y = parentRect.y + topMargin + verticalOffset + (row * (maxChildHeight + childSpacing));

    // Check if we need to adjust layout to prevent overlap
    const maxX = parentRect.x + parentRect.w - sideMargin - childWidth;
    const maxY = parentRect.y + parentRect.h - sideMargin - childHeight;

    // If the calculated position would place the child outside the parent,
    // we need to adjust the layout to prevent overlap
    let adjustedX = x;
    let adjustedY = y;
    let adjustedWidth = childWidth;
    let adjustedHeight = childHeight;

    if (x > maxX || y > maxY) {
      // Parent is too small for the ideal layout - adjust to prevent overlap
      // Recalculate with tighter packing
      const availableWidthPerChild = (availableWidth - (cols - 1) * childSpacing) / cols;
      const availableHeightPerChild = (availableHeight - (rows - 1) * childSpacing) / rows;
      
      // Shrink children if needed, but not below minimum size
      adjustedWidth = Math.max(MIN_WIDTH, Math.floor(availableWidthPerChild));
      adjustedHeight = Math.max(MIN_HEIGHT, Math.floor(availableHeightPerChild));
      
      // Recalculate position with adjusted dimensions
      adjustedX = parentRect.x + sideMargin + (col * (adjustedWidth + childSpacing));
      adjustedY = parentRect.y + topMargin + (row * (adjustedHeight + childSpacing));
      
      // Final clamp to ensure we don't exceed parent boundaries
      adjustedX = Math.min(adjustedX, parentRect.x + parentRect.w - sideMargin - adjustedWidth);
      adjustedY = Math.min(adjustedY, parentRect.y + parentRect.h - sideMargin - adjustedHeight);
    }

    return {
      ...child,
      x: adjustedX,
      y: adjustedY,
      w: adjustedWidth,
      h: adjustedHeight
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
      
      const cols = Math.ceil(Math.sqrt(totalChildren));
      const rows = Math.ceil(totalChildren / cols);
      
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
  resizeState: ResizeState | null
): number => {
  let depth = 0;
  let current: Rectangle | undefined = rect;
  
  while (current && current.parentId) {
    depth++;
    current = rectangles.find(r => r.id === current!.parentId);
    if (!current || depth > 10) break;
  }
  
  const baseZ = 10 + (depth * 10);
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

  const cols = Math.ceil(Math.sqrt(children.length));
  const rows = Math.ceil(children.length / cols);

  // Calculate dimensions for all children, considering fixed dimensions for leaves
  const childDimensions = children.map(child => {
    let childWidth = Math.max(MIN_WIDTH, child.w);
    let childHeight = Math.max(MIN_HEIGHT, child.h);
    
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

  // Use consistent spacing between children (same as margin)
  const childSpacing = MARGIN;

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
    w: Math.max(MIN_WIDTH, Math.ceil(minParentWidth)),
    h: Math.max(MIN_HEIGHT, Math.ceil(minParentHeight))
  };
};

/**
 * Sort rectangles by depth (deepest first) to ensure parents render after children
 */
export const sortRectanglesByDepth = (rectangles: Rectangle[]): Rectangle[] => {
  const getDepth = (rect: Rectangle, rectangles: Rectangle[]): number => {
    let depth = 0;
    let current: Rectangle | undefined = rect;
    
    while (current && current.parentId) {
      depth++;
      current = rectangles.find(r => r.id === current!.parentId);
      if (!current || depth > 10) break;
    }
    
    return depth;
  };

  return [...rectangles].sort((a, b) => {
    const depthA = getDepth(a, rectangles);
    const depthB = getDepth(b, rectangles);
    
    // Sort by depth (deepest first), then by creation order (id) for stable sorting
    if (depthA !== depthB) {
      return depthB - depthA; // Deeper elements first
    }
    return a.id.localeCompare(b.id);
  });
};
