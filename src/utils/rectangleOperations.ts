import { Rectangle, RectangleType } from '../types';
import { DEFAULT_COLORS, DEFAULT_RECTANGLE_SIZE, MIN_WIDTH, MIN_HEIGHT } from './constants';
import { getChildren, updateChildrenLayout } from './layoutUtils';
import { layoutManager } from './layout';

/**
 * Dimension constraints for leaf rectangles in fixed-size mode
 */
export interface FixedDimensions {
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
}

/**
 * Factory function for rectangle creation with type inference
 * 
 * Automatically determines rectangle type based on context:
 * - Text labels: Special rendering and sizing behavior
 * - Root rectangles: No parent, can contain children
 * - Leaf rectangles: Have parent, typically end nodes
 * 
 * @param id - Unique identifier for the rectangle
 * @param x - X coordinate in grid units
 * @param y - Y coordinate in grid units
 * @param w - Width in grid units (enforced minimum)
 * @param h - Height in grid units (enforced minimum)
 * @param parentId - Optional parent rectangle ID
 * @param label - Display text for the rectangle
 * @param isTextLabel - Special text-only rectangle flag
 * @returns Complete rectangle with inferred properties
 */
export const createRectangle = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  parentId?: string,
  label?: string,
  isTextLabel?: boolean
): Rectangle => {
  const type: RectangleType = isTextLabel ? 'textLabel' : (parentId ? 'leaf' : 'root');
  const defaultColor = DEFAULT_COLORS[type] || DEFAULT_COLORS['leaf'];
  
  return {
    id,
    parentId,
    x,
    y,
    w: Math.max(MIN_WIDTH, w),
    h: Math.max(MIN_HEIGHT, h),
    label: label || (isTextLabel ? `Text Label ${id}` : `Rectangle ${id}`),
    color: defaultColor,
    type,
    isEditing: false,
    isLockedAsIs: false,
    isTextLabel,
    textFontFamily: isTextLabel ? 'Arial, sans-serif' : undefined,
    textFontSize: isTextLabel ? 14 : undefined,
    fontWeight: isTextLabel ? 'normal' : undefined,
    textAlign: isTextLabel ? 'center' : undefined
  };
};

/**
 * Infer and update rectangle type based on hierarchy relationships
 * 
 * Type inference rules:
 * - Root: No parent, may have children
 * - Parent: Has parent and has children
 * - Leaf: Has parent but no children
 * - Text labels: Type preserved regardless of relationships
 * 
 * @param rectangles - Complete rectangle set for relationship analysis
 * @param rectangleId - ID of rectangle to update
 * @returns Updated rectangle array with corrected type
 */
export const updateRectangleType = (
  rectangles: Rectangle[],
  rectangleId: string
): Rectangle[] => {
  return rectangles.map(rect => {
    if (rect.id === rectangleId) {
      if (rect.isTextLabel) {
        return rect;
      }
      
      const hasChildren = getChildren(rect.id, rectangles).length > 0;
      const hasParent = rect.parentId !== undefined;
      
      let newType: RectangleType;
      if (!hasParent) {
        newType = 'root';
      } else if (hasChildren) {
        newType = 'parent';
      } else {
        newType = 'leaf';
      }
      
      return {
        ...rect,
        type: newType
      };
    }
    return rect;
  });
};

/**
 * Clamp rectangle position within visible container bounds
 * 
 * Converts screen coordinates to grid coordinates and applies boundary
 * constraints to prevent rectangles from being dragged outside the
 * visible viewport area.
 * 
 * @param rect - Rectangle with current position
 * @param containerRect - Container boundaries in screen coordinates
 * @param panOffset - Current pan offset for coordinate conversion
 * @param gridSize - Grid unit size for coordinate conversion
 * @returns Clamped position in grid coordinates
 */
export const validateRectanglePosition = (
  rect: Rectangle,
  containerRect: DOMRect,
  panOffset: { x: number; y: number },
  gridSize: number
): { x: number; y: number } => {
  const minX = Math.floor((0 - panOffset.x) / gridSize);
  const minY = Math.floor((0 - panOffset.y) / gridSize);
  const maxX = Math.floor((containerRect.width - panOffset.x) / gridSize) - rect.w;
  const maxY = Math.floor((containerRect.height - panOffset.y) / gridSize) - rect.h;
  
  return {
    x: Math.max(minX, Math.min(maxX, rect.x)),
    y: Math.max(minY, Math.min(maxY, rect.y))
  };
};

/**
 * Apply dimensional constraints to leaf rectangles
 * 
 * Only affects leaf rectangles when fixed dimensions are enabled.
 * Enforces minimum size constraints to prevent unusably small rectangles.
 * 
 * @param rect - Rectangle to modify
 * @param fixedDimensions - Dimension constraint configuration
 * @returns Rectangle with applied size constraints
 */
export const applyFixedDimensions = (
  rect: Rectangle,
  fixedDimensions: FixedDimensions
): Rectangle => {
  if (rect.type !== 'leaf' || rect.isLockedAsIs) {
    return rect;
  }
  
  let newW = rect.w;
  let newH = rect.h;
  
  if (fixedDimensions.leafFixedWidth) {
    newW = fixedDimensions.leafWidth;
  }
  
  if (fixedDimensions.leafFixedHeight) {
    newH = fixedDimensions.leafHeight;
  }
  
  return {
    ...rect,
    w: Math.max(MIN_WIDTH, newW),
    h: Math.max(MIN_HEIGHT, newH)
  };
};

/**
 * Retrieve type-specific default dimensions
 * 
 * @param type - Rectangle type identifier
 * @returns Default width and height for the type
 */
export const getDefaultRectangleSize = (type: RectangleType): { w: number; h: number } => {
  return DEFAULT_RECTANGLE_SIZE[type];
};

/**
 * Batch update all rectangle types based on current relationships
 * 
 * Processes entire rectangle set to ensure all types reflect current
 * parent-child relationships. Used after bulk operations that may
 * change hierarchy structure.
 * 
 * @param rectangles - Rectangle set to process
 * @returns Updated rectangles with corrected types
 */
export const updateAllRectangleTypes = (rectangles: Rectangle[]): Rectangle[] => {
  let updated = [...rectangles];
  
  for (const rect of rectangles) {
    updated = updateRectangleType(updated, rect.id);
  }
  
  return updated;
};

/**
 * Create a copy of a rectangle with new identity and position
 * 
 * Preserves all properties except ID and position. Automatically
 * resets editing state and adds copy indicator to label.
 * 
 * @param rect - Source rectangle to clone
 * @param newId - Unique ID for the cloned rectangle
 * @param offsetX - X position offset from original
 * @param offsetY - Y position offset from original
 * @returns New rectangle instance with copied properties
 */
export const cloneRectangle = (
  rect: Rectangle,
  newId: string,
  offsetX: number = 0,
  offsetY: number = 0
): Rectangle => {
  return {
    ...rect,
    id: newId,
    x: rect.x + offsetX,
    y: rect.y + offsetY,
    label: `${rect.label} (Copy)`,
    isEditing: false
  };
};

/**
 * Validate parent-child relationship changes for hierarchy integrity
 * 
 * Prevents:
 * - Self-parenting (rectangle becoming its own parent)
 * - Circular dependencies (moving rectangle to its own descendant)
 * 
 * @param rectangleId - Rectangle being moved
 * @param newParentId - Proposed new parent (undefined for root)
 * @param rectangles - Complete rectangle set for relationship validation
 * @returns true if the parent change is valid
 */
export const canMoveToParent = (
  rectangleId: string,
  newParentId: string | undefined,
  rectangles: Rectangle[]
): boolean => {
  if (rectangleId === newParentId) {
    return false;
  }
  
  if (newParentId) {
    const rect = rectangles.find(r => r.id === rectangleId);
    if (!rect) return false;
    
    const isDescendant = (parentId: string, targetId: string): boolean => {
      const children = getChildren(parentId, rectangles);
      return children.some(child => 
        child.id === targetId || isDescendant(child.id, targetId)
      );
    };
    
    if (isDescendant(rectangleId, newParentId)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Calculate bounding box encompassing rectangle and all descendants
 * 
 * Recursively traverses hierarchy to find the minimal bounding box
 * that contains the specified rectangle and all its children, grandchildren, etc.
 * Used for hierarchy drag operations and export bounds calculation.
 * 
 * @param rectangleId - Root rectangle ID for bounds calculation
 * @param rectangles - Complete rectangle set for traversal
 * @returns Bounding box coordinates and dimensions
 */
export const getRectangleBounds = (
  rectangleId: string,
  rectangles: Rectangle[]
): { x: number; y: number; w: number; h: number } => {
  const rect = rectangles.find(r => r.id === rectangleId);
  if (!rect) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  
  const children = getChildren(rectangleId, rectangles);
  if (children.length === 0) {
    return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  }
  
  let minX = rect.x;
  let minY = rect.y;
  let maxX = rect.x + rect.w;
  let maxY = rect.y + rect.h;
  
  for (const child of children) {
    const childBounds = getRectangleBounds(child.id, rectangles);
    minX = Math.min(minX, childBounds.x);
    minY = Math.min(minY, childBounds.y);
    maxX = Math.max(maxX, childBounds.x + childBounds.w);
    maxY = Math.max(maxY, childBounds.y + childBounds.h);
  }
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
};

/**
 * Spacing configuration for automatic layout algorithms
 */
export interface MarginSettings {
  margin: number;
  labelMargin: number;
}

/**
 * Automatically resize parent rectangle to optimally fit all children
 * 
 * Supports two distinct positioning modes based on parent configuration:
 * 
 * **Manual Positioning Mode** (isManualPositioningEnabled=true):
 * - Preserves exact parent dimensions regardless of children
 * - Prevents automatic resizing when children are added/modified
 * - Children can be positioned anywhere within parent bounds
 * - Used for precise layout control and fixed container scenarios
 * 
 * **Automatic Positioning Mode** (isManualPositioningEnabled=false):
 * - Calculates minimum required parent size to contain all children
 * - Automatically resizes parent when children change
 * - Applies layout algorithm to arrange children optimally
 * - Used for dynamic layouts that adapt to content
 * 
 * This is a core utility that performs fit-to-children operations without
 * triggering history saves, designed for atomic operations where history
 * should be saved as a single entry.
 * 
 * @param parentId - ID of the parent rectangle to potentially resize
 * @param rectangles - Current rectangle array
 * @param fixedDimensions - Fixed dimension configuration for leaf rectangles
 * @param margins - Margin configuration for layout calculations
 * @returns Updated rectangle array with parent fitted (if in automatic mode)
 */
export const fitParentToChildren = (
  parentId: string,
  rectangles: Rectangle[],
  fixedDimensions: FixedDimensions,
  margins: MarginSettings
): Rectangle[] => {
  const children = getChildren(parentId, rectangles);
  if (children.length === 0) {
    return rectangles;
  }
  
  const parentRect = rectangles.find(r => r.id === parentId);
  if (!parentRect || parentRect.isLockedAsIs) {
    return rectangles;
  }
  
  /* 
   * MANUAL POSITIONING MODE: Preserve exact parent dimensions
   * 
   * When manual positioning is enabled, the parent acts as a fixed container.
   * This prevents automatic resizing that would interfere with user-controlled
   * layouts and maintains precise dimensions for design consistency.
   */
  if (parentRect.isManualPositioningEnabled) {
    return rectangles;
  }
  
  /* 
   * AUTOMATIC POSITIONING MODE: Calculate and apply optimal parent size
   * 
   * Uses layout algorithm to determine minimum size needed to contain all
   * children with proper margins, then resizes parent and arranges children.
   */
  const optimalSize = layoutManager.calculateMinimumParentSize(
    parentId, 
    rectangles, 
    margins,
    fixedDimensions
  );
  
  const updatedRectangles = rectangles.map(rect => 
    rect.id === parentId ? { 
      ...rect, 
      w: optimalSize.w, 
      h: optimalSize.h,
      isLockedAsIs: false
    } : rect
  );
  
  return updateChildrenLayout(updatedRectangles, margins, fixedDimensions);
};

/**
 * Recursively fit parent and all ancestors to accommodate child changes
 * 
 * Traverses up the hierarchy chain, applying fit-to-children logic at each level.
 * This ensures that when children are added or modified, the sizing changes
 * propagate upward through the entire ancestor chain.
 * 
 * **Manual Positioning Behavior:**
 * - Parents with isManualPositioningEnabled=true will NOT resize
 * - Sizing propagation stops at manual positioning parents
 * - Only automatic positioning parents will resize to fit their children
 * 
 * **Use Cases:**
 * - Adding children to deeply nested hierarchies
 * - Bulk operations that affect multiple hierarchy levels
 * - Ensuring consistent sizing after layout algorithm changes
 * 
 * @param parentId - ID of the starting parent rectangle to fit
 * @param rectangles - Current rectangle array
 * @param fixedDimensions - Fixed dimension configuration for leaf rectangles
 * @param margins - Margin configuration for layout calculations
 * @returns Updated rectangle array with eligible ancestors resized
 */
export const fitParentToChildrenRecursive = (
  parentId: string,
  rectangles: Rectangle[],
  fixedDimensions: FixedDimensions,
  margins: MarginSettings
): Rectangle[] => {
  let currentRectangles = rectangles;
  let currentParentId: string | undefined = parentId;
  
  while (currentParentId) {
    const parent = currentRectangles.find(r => r.id === currentParentId);
    if (!parent) break;
    
    currentRectangles = fitParentToChildren(currentParentId, currentRectangles, fixedDimensions, margins);
    currentParentId = parent.parentId;
  }
  
  return currentRectangles;
};