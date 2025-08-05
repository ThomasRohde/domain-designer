import { Rectangle, DragState, ResizeState, HierarchyDragState } from '../types';
import { layoutManager } from './layout';



/**
 * Recursively update child layouts throughout the hierarchy
 * 
 * Processes rectangles level by level to maintain parent-child dependencies.
 * Skips automatic layout for manually positioned or locked rectangles.
 * Implements parent auto-sizing based on child requirements.
 * 
 * @param rectangles - Complete rectangle set to process
 * @param fixedDimensions - Optional fixed sizing for leaf nodes
 * @param margins - Spacing configuration
 * @returns Updated rectangles with recalculated layouts
 */
export const updateChildrenLayout = (
  rectangles: Rectangle[],
  margins: {
    margin: number;
    labelMargin: number;
  },
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
            // Skip automatic layout if manual positioning is enabled or locked as-is
            if (currentParent.isManualPositioningEnabled || currentParent.isLockedAsIs) {
              // Just mark as processed without updating layout
              siblings.forEach(child => {
                processedIds.add(child.id);
              });
              processedAny = true;
            } else {
              // Check if parent needs to be resized to fit children properly
              const minParentSize = layoutManager.calculateMinimumParentSize(rect.parentId, updated, margins, fixedDimensions);
              
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
                const newLayout = layoutManager.calculateChildLayout(updatedParent, siblings, margins, fixedDimensions, updated);
                
                newLayout.forEach(layoutRect => {
                  const index = updated.findIndex(r => r.id === layoutRect.id);
                  if (index !== -1) {
                    const existingRect = updated[index];
                    updated[index] = { 
                      ...existingRect, 
                      x: layoutRect.x, 
                      y: layoutRect.y, 
                      // Only update dimensions if not locked as-is
                      w: existingRect.isLockedAsIs ? existingRect.w : layoutRect.w, 
                      h: existingRect.isLockedAsIs ? existingRect.h : layoutRect.h 
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


// Cache for descendant calculations to prevent expensive O(n²) traversals
const descendantCache = new Map<string, { 
  descendants: string[], 
  lastUpdated: number, 
  rectangleCount: number 
}>();

const CACHE_TTL = 100; // 100ms cache TTL to balance performance and accuracy

/**
 * Clear descendant cache when rectangles change significantly
 */
export const clearDescendantCache = () => {
  descendantCache.clear();
};

/**
 * Recursively collect all descendant rectangle IDs with performance caching
 * 
 * Traverses the hierarchy tree depth-first to gather all children,
 * grandchildren, etc. Implements cycle detection to prevent infinite
 * loops in malformed hierarchies. Uses intelligent caching to prevent
 * expensive recalculation during drag operations.
 * 
 * @param parentId - Root rectangle ID to start traversal
 * @param rectangles - Complete rectangle set for relationship lookup
 * @returns Array of descendant rectangle IDs
 */
export const getAllDescendants = (parentId: string, rectangles: Rectangle[]): string[] => {
  const now = Date.now();
  const cacheKey = parentId;
  
  // Check cache first for performance optimization
  const cached = descendantCache.get(cacheKey);
  if (cached && 
      now - cached.lastUpdated < CACHE_TTL && 
      cached.rectangleCount === rectangles.length) {
    return cached.descendants;
  }
  
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
  
  // Cache the result for future use
  descendantCache.set(cacheKey, {
    descendants: [...descendants], // Create copy to prevent mutation
    lastUpdated: now,
    rectangleCount: rectangles.length
  });
  
  return descendants;
};

/**
 * Find direct children of a rectangle
 * 
 * @param parentId - Parent rectangle ID
 * @param rectangles - Rectangle set to search
 * @returns Array of direct child rectangles
 */
export const getChildren = (parentId: string, rectangles: Rectangle[]): Rectangle[] => {
  return rectangles.filter(rect => rect.parentId === parentId);
};

/**
 * Determine if rectangle has no children
 * 
 * @param id - Rectangle ID to check
 * @param rectangles - Rectangle set for relationship lookup
 * @returns true if rectangle has no children
 */
export const isLeaf = (id: string, rectangles: Rectangle[]): boolean => {
  return getChildren(id, rectangles).length === 0;
};

/**
 * Filter rectangles to find top-level (parentless) rectangles
 * 
 * @param rectangles - Rectangle set to filter
 * @returns Array of root rectangles
 */
export const getRootRectangles = (rectangles: Rectangle[]): Rectangle[] => {
  return rectangles.filter(rect => !rect.parentId);
};

/**
 * Calculate layering order for proper rectangle rendering
 * 
 * Implements depth-based z-indexing with special handling for:
 * - Dragged rectangles and their descendants (elevated above all)
 * - Resized rectangles (elevated above normal but below dragged)
 * - Selected rectangles (slight elevation, reduced for parents with children)
 * 
 * Ensures children always render above their parents while maintaining
 * interaction state visibility.
 * 
 * @param rect - Rectangle to calculate z-index for
 * @param rectangles - Complete rectangle set for hierarchy traversal
 * @param selectedId - Currently selected rectangle ID
 * @param dragState - Current drag operation state
 * @param resizeState - Current resize operation state
 * @param hierarchyDragState - Hierarchy drag operation state
 * @returns Z-index value for CSS layering
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
 * Sort rectangles for optimal rendering order (deepest first)
 * 
 * Ensures children render before their parents to prevent visual occlusion.
 * Uses caching to avoid recalculating depths and implements stable sorting
 * with numeric ID ordering for consistent results.
 * 
 * Performance: O(n log n) with O(n) space for depth cache
 * 
 * @param rectangles - Rectangles to sort
 * @returns Sorted array with deepest rectangles first
 */
export const sortRectanglesByDepth = (rectangles: Rectangle[]): Rectangle[] => {
  // Depth cache prevents O(n²) recalculation during sorting
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
  
  // Extract numeric suffix for stable sorting (rect-2 before rect-10)
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
