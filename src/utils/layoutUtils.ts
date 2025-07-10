import { Rectangle, DragState, ResizeState, HierarchyDragState, LayoutPreferences } from '../types';
import { layoutManager } from './layout';

/**
 * Calculate grid dimensions based on layout preferences
 * @deprecated Use layoutManager.calculateGridDimensions instead
 */
export const calculateGridDimensions = (
  childrenCount: number,
  layoutPreferences?: LayoutPreferences
): { cols: number; rows: number } => {
  return layoutManager.calculateGridDimensions(childrenCount, layoutPreferences);
};

/**
 * Calculate auto-sized dimensions and positions for child rectangles
 * @deprecated Use layoutManager.calculateChildLayout instead
 */
export const calculateChildLayout = (
  parentRect: Rectangle, 
  children: Rectangle[], 
  fixedDimensions?: {
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
  },
  margins?: {
    margin: number;
    labelMargin: number;
  },
  allRectangles?: Rectangle[]
): Rectangle[] => {
  return layoutManager.calculateChildLayout(parentRect, children, fixedDimensions, margins, allRectangles);
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
  },
  margins?: {
    margin: number;
    labelMargin: number;
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
            // Skip automatic layout if manual positioning is enabled
            if (currentParent.isManualPositioningEnabled) {
              // Just mark as processed without updating layout
              siblings.forEach(child => {
                processedIds.add(child.id);
              });
              processedAny = true;
            } else {
              // Check if parent needs to be resized to fit children properly
              const minParentSize = calculateMinimumParentSize(rect.parentId, updated, fixedDimensions, margins);
              
              // Find parent index to update if needed
              const parentIndex = updated.findIndex(r => r.id === rect.parentId);
              if (parentIndex !== -1) {
                const currentParentRect = updated[parentIndex];
                if (currentParentRect.w < minParentSize.w || currentParentRect.h < minParentSize.h) {
                  updated[parentIndex] = {
                    ...currentParentRect,
                    w: Math.max(currentParentRect.w, minParentSize.w),
                    h: Math.max(currentParentRect.h, minParentSize.h)
                  };
                }
              }
              
              // Get the updated parent after potential resize
              const updatedParent = updated.find(p => p.id === rect.parentId);
              if (updatedParent) {
                const newLayout = calculateChildLayout(updatedParent, siblings, fixedDimensions, margins, updated);
                
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
        }
      }
    });
    
    return processedAny;
  };
  
  // Increase max iterations to handle deeper hierarchies
  let maxIterations = 20;
  while (processLevel() && maxIterations > 0) {
    maxIterations--;
  }
  
  return updated;
};

/**
 * Calculate initial position and size for a new rectangle
 * @deprecated Use layoutManager.calculateNewRectangleLayout instead
 */
export const calculateNewRectangleLayout = (
  parentId: string | null,
  rectangles: Rectangle[],
  defaultSizes: { root: { w: number; h: number }, leaf: { w: number; h: number } },
  margins?: {
    margin: number;
    labelMargin: number;
  }
): { x: number; y: number; w: number; h: number } => {
  return layoutManager.calculateNewRectangleLayout(parentId, rectangles, defaultSizes, margins);
};

/**
 * Get all descendants of a rectangle (recursive)
 */
export const getAllDescendants = (parentId: string, rectangles: Rectangle[]): string[] => {
  const descendants: string[] = [];
  const visited = new Set<string>();
  
  const getDescendantsRecursive = (currentId: string) => {
    if (visited.has(currentId)) {
      console.warn(`Circular reference detected for rectangle ID: ${currentId}`);
      return;
    }
    
    visited.add(currentId);
    const directChildren = rectangles.filter(rect => rect.parentId === currentId);
    
    directChildren.forEach(child => {
      descendants.push(child.id);
      getDescendantsRecursive(child.id);
    });
    
    visited.delete(currentId);
  };
  
  getDescendantsRecursive(parentId);
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
 * @deprecated Use layoutManager.calculateMinimumParentSize instead
 */
export const calculateMinimumParentSize = (
  parentId: string,
  rectangles: Rectangle[],
  fixedDimensions?: {
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
  },
  margins?: {
    margin: number;
    labelMargin: number;
  }
): { w: number; h: number } => {
  return layoutManager.calculateMinimumParentSize(parentId, rectangles, fixedDimensions, margins);
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
