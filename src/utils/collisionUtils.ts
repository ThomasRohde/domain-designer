import type { Rectangle } from '../types';

/**
 * Utility functions for collision detection in bulk movement operations.
 * Ensures rectangles don't overlap inappropriately during multi-select operations.
 */

/**
 * Represents the bounds of a rectangle for collision detection
 */
export interface RectangleBounds {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  parentId?: string;
}

/**
 * Result of a collision detection check
 */
export interface CollisionResult {
  hasCollision: boolean;
  collidingRectangles: string[];
  constraintViolations: string[];
}

/**
 * Checks if two rectangles overlap
 * @param rect1 - First rectangle bounds
 * @param rect2 - Second rectangle bounds  
 * @returns true if rectangles overlap, false otherwise
 */
export const rectanglesOverlap = (rect1: RectangleBounds, rect2: RectangleBounds): boolean => {
  return !(
    rect1.x + rect1.w <= rect2.x ||  // rect1 is to the left of rect2
    rect2.x + rect2.w <= rect1.x ||  // rect2 is to the left of rect1
    rect1.y + rect1.h <= rect2.y ||  // rect1 is above rect2
    rect2.y + rect2.h <= rect1.y     // rect2 is above rect1
  );
};

/**
 * Checks if a rectangle is within the bounds of its parent
 * @param child - Child rectangle bounds
 * @param parent - Parent rectangle bounds
 * @param margin - Margin to maintain within parent (default: 1 grid unit)
 * @param labelMargin - Top margin for labels (default: 2 grid units)
 * @returns true if child is within parent bounds, false otherwise
 */
export const isWithinParentBounds = (
  child: RectangleBounds,
  parent: RectangleBounds,
  margin: number = 1,
  labelMargin: number = 2
): boolean => {
  const minX = parent.x + margin;
  const minY = parent.y + labelMargin;
  const maxX = parent.x + parent.w - child.w - margin;
  const maxY = parent.y + parent.h - child.h - margin;

  const result = (
    child.x >= minX &&
    child.x <= maxX &&
    child.y >= minY &&
    child.y <= maxY
  );

  return result;
};

/**
 * Checks if a selection's bounding box is within the bounds of its parent
 * Calculates collective boundaries for multi-select operations
 * @param selection - Array of selected rectangle bounds
 * @param parent - Parent rectangle bounds
 * @param margin - Margin to maintain within parent (default: 1 grid unit)
 * @param labelMargin - Top margin for labels (default: 2 grid units)
 * @returns true if entire selection would fit within parent bounds, false otherwise
 */
export const isSelectionWithinParentBounds = (
  selection: RectangleBounds[],
  parent: RectangleBounds,
  margin: number = 1,
  labelMargin: number = 2
): boolean => {
  if (selection.length === 0) return true;

  // Calculate the bounding box of the entire selection
  const selectionMinX = Math.min(...selection.map(r => r.x));
  const selectionMinY = Math.min(...selection.map(r => r.y));
  const selectionMaxX = Math.max(...selection.map(r => r.x + r.w));
  const selectionMaxY = Math.max(...selection.map(r => r.y + r.h));
  
  const selectionBounds = {
    id: 'selection',
    x: selectionMinX,
    y: selectionMinY,
    w: selectionMaxX - selectionMinX,
    h: selectionMaxY - selectionMinY
  };

  // Check if the collective selection bounding box fits within parent
  return isWithinParentBounds(selectionBounds, parent, margin, labelMargin);
};

/**
 * Detects collisions for bulk movement operations
 * @param selectedIds - IDs of rectangles being moved
 * @param deltaX - X movement in grid units
 * @param deltaY - Y movement in grid units
 * @param rectangles - All rectangles in the diagram
 * @param settings - Layout settings with margin information
 * @returns CollisionResult with collision information
 */
export const detectBulkMovementCollisions = (
  selectedIds: string[],
  deltaX: number,
  deltaY: number,
  rectangles: Rectangle[],
  settings: { margin: number; labelMargin: number }
): CollisionResult => {
  const result: CollisionResult = {
    hasCollision: false,
    collidingRectangles: [],
    constraintViolations: []
  };

  const selectedSet = new Set(selectedIds);
  
  // Calculate new positions for selected rectangles
  const movedRectangles = rectangles.map(rect => {
    if (selectedSet.has(rect.id)) {
      return {
        id: rect.id,
        x: rect.x + deltaX,
        y: rect.y + deltaY,
        w: rect.w,
        h: rect.h,
        parentId: rect.parentId
      };
    }
    return {
      id: rect.id,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      parentId: rect.parentId
    };
  });

  // Check for collisions between moved rectangles and static rectangles
  for (const movedRect of movedRectangles) {
    if (!selectedSet.has(movedRect.id)) continue;

    // Check collision with non-selected rectangles at the same level
    for (const staticRect of movedRectangles) {
      if (selectedSet.has(staticRect.id) || staticRect.id === movedRect.id) continue;
      
      // Only check collisions between siblings (same parent)
      if (movedRect.parentId !== staticRect.parentId) continue;

      if (rectanglesOverlap(movedRect, staticRect)) {
        result.hasCollision = true;
        if (!result.collidingRectangles.includes(staticRect.id)) {
          result.collidingRectangles.push(staticRect.id);
        }
      }
    }
  }

  // Check parent boundary constraints for multi-select operations
  // Group selected rectangles by parent to check collective bounds
  const rectsByParent = new Map<string | undefined, RectangleBounds[]>();
  
  for (const movedRect of movedRectangles) {
    if (!selectedSet.has(movedRect.id)) continue;
    
    const parentKey = movedRect.parentId || 'root';
    if (!rectsByParent.has(parentKey)) {
      rectsByParent.set(parentKey, []);
    }
    rectsByParent.get(parentKey)!.push(movedRect);
  }

  // Check bounds for each parent group using collective selection bounds
  for (const [parentKey, groupRects] of rectsByParent.entries()) {
    if (parentKey === 'root') continue; // Root rectangles have no parent bounds
    
    const parent = rectangles.find(r => r.id === parentKey);
    if (!parent) continue;

    const parentBounds = {
      id: parent.id,
      x: parent.x,
      y: parent.y,
      w: parent.w,
      h: parent.h,
      parentId: parent.parentId
    };

    // For multi-select, check if the collective selection would fit within parent bounds
    if (!isSelectionWithinParentBounds(groupRects, parentBounds, settings.margin, settings.labelMargin)) {
      result.hasCollision = true;
      result.constraintViolations.push(
        `Selection would move outside parent bounds`
      );
    }
  }

  return result;
};

/**
 * Finds the maximum safe movement distance in a given direction using direct calculation
 * @param selectedIds - IDs of rectangles being moved
 * @param direction - Movement direction ('x' or 'y')
 * @param delta - Desired movement amount (positive or negative)
 * @param rectangles - All rectangles in the diagram
 * @param settings - Layout settings with margin information
 * @returns Maximum safe movement distance
 */
export const findMaxSafeMovement = (
  selectedIds: string[],
  direction: 'x' | 'y',
  delta: number,
  rectangles: Rectangle[],
  settings: { margin: number; labelMargin: number }
): number => {
  if (delta === 0) return 0;

  const selectedSet = new Set(selectedIds);
  let maxMovement = delta; // Start with desired movement

  // Group selected rectangles by parent to calculate collective constraints
  const rectsByParent = new Map<string | undefined, Rectangle[]>();
  
  for (const rect of rectangles) {
    if (!selectedSet.has(rect.id)) continue;
    
    const parentKey = rect.parentId || 'root';
    if (!rectsByParent.has(parentKey)) {
      rectsByParent.set(parentKey, []);
    }
    rectsByParent.get(parentKey)!.push(rect);
  }

  // Calculate maximum movement for each parent group
  for (const [parentKey, groupRects] of rectsByParent.entries()) {
    if (parentKey === 'root') continue; // Root rectangles have no parent bounds
    
    const parent = rectangles.find(r => r.id === parentKey);
    if (!parent) continue;

    // Calculate selection bounds for this group
    const selectionMinX = Math.min(...groupRects.map(r => r.x));
    const selectionMinY = Math.min(...groupRects.map(r => r.y));
    const selectionMaxX = Math.max(...groupRects.map(r => r.x + r.w));
    const selectionMaxY = Math.max(...groupRects.map(r => r.y + r.h));
    
    const selectionBounds = {
      x: selectionMinX,
      y: selectionMinY,
      w: selectionMaxX - selectionMinX,
      h: selectionMaxY - selectionMinY
    };

    // Calculate parent available area
    const parentMinX = parent.x + settings.margin;
    const parentMinY = parent.y + settings.labelMargin;
    const parentMaxX = parent.x + parent.w - settings.margin;
    const parentMaxY = parent.y + parent.h - settings.margin;

    let groupMaxMovement: number;

    if (direction === 'x') {
      if (delta > 0) {
        // Moving right: constrain by right edge
        const maxX = parentMaxX - selectionBounds.w;
        groupMaxMovement = maxX - selectionBounds.x;
      } else {
        // Moving left: constrain by left edge
        groupMaxMovement = parentMinX - selectionBounds.x;
      }
    } else { // direction === 'y'
      if (delta > 0) {
        // Moving down: constrain by bottom edge
        const maxY = parentMaxY - selectionBounds.h;
        groupMaxMovement = maxY - selectionBounds.y;
      } else {
        // Moving up: constrain by top edge
        groupMaxMovement = parentMinY - selectionBounds.y;
      }
    }


    // Use the most restrictive constraint
    if (delta > 0) {
      maxMovement = Math.min(maxMovement, Math.min(delta, groupMaxMovement));
    } else {
      maxMovement = Math.max(maxMovement, Math.max(delta, groupMaxMovement));
    }
  }

  return maxMovement;
};

/**
 * Validates if bulk movement is safe (no collisions)
 * @param selectedIds - IDs of rectangles being moved
 * @param deltaX - X movement in grid units
 * @param deltaY - Y movement in grid units  
 * @param rectangles - All rectangles in the diagram
 * @param settings - Layout settings with margin information
 * @returns true if movement is safe, false if collisions detected
 */
export const isBulkMovementSafe = (
  selectedIds: string[],
  deltaX: number,
  deltaY: number,
  rectangles: Rectangle[],
  settings: { margin: number; labelMargin: number }
): boolean => {
  const collision = detectBulkMovementCollisions(selectedIds, deltaX, deltaY, rectangles, settings);
  return !collision.hasCollision;
};

/**
 * Constrains bulk movement to avoid collisions
 * @param selectedIds - IDs of rectangles being moved
 * @param deltaX - Desired X movement in grid units
 * @param deltaY - Desired Y movement in grid units
 * @param rectangles - All rectangles in the diagram
 * @param settings - Layout settings with margin information
 * @returns Constrained movement deltas that avoid collisions
 */
export const constrainBulkMovement = (
  selectedIds: string[],
  deltaX: number,
  deltaY: number,
  rectangles: Rectangle[],
  settings: { margin: number; labelMargin: number }
): { deltaX: number; deltaY: number } => {

  // Find maximum safe movement in each direction
  const maxSafeDeltaX = findMaxSafeMovement(selectedIds, 'x', deltaX, rectangles, settings);
  const maxSafeDeltaY = findMaxSafeMovement(selectedIds, 'y', deltaY, rectangles, settings);

  const result = {
    deltaX: maxSafeDeltaX,
    deltaY: maxSafeDeltaY
  };


  return result;
};

/**
 * Preserves relative positions during bulk drag operations
 * @param selectedIds - IDs of rectangles being moved  
 * @param rectangles - All rectangles in the diagram
 * @returns Map of initial positions for preserving relative spacing
 */
export const captureRelativePositions = (
  selectedIds: string[],
  rectangles: Rectangle[]
): Map<string, { x: number; y: number; relativeX: number; relativeY: number }> => {
  const selectedRects = rectangles.filter(r => selectedIds.includes(r.id));
  
  if (selectedRects.length === 0) {
    return new Map();
  }

  // Find the bounds of the selection to establish reference point
  const minX = Math.min(...selectedRects.map(r => r.x));
  const minY = Math.min(...selectedRects.map(r => r.y));

  const positions = new Map<string, { x: number; y: number; relativeX: number; relativeY: number }>();

  selectedRects.forEach(rect => {
    positions.set(rect.id, {
      x: rect.x,
      y: rect.y,
      relativeX: rect.x - minX,  // Relative to selection bounds
      relativeY: rect.y - minY   // Relative to selection bounds
    });
  });

  return positions;
};

/**
 * Applies relative positioning during bulk drag to maintain spacing
 * @param selectedIds - IDs of rectangles being moved
 * @param newReferenceX - New X position for the reference point (top-left of selection)
 * @param newReferenceY - New Y position for the reference point (top-left of selection)
 * @param relativePositions - Captured relative positions from captureRelativePositions
 * @param rectangles - All rectangles in the diagram
 * @returns Updated rectangles with preserved relative positioning
 */
export const applyRelativePositioning = (
  selectedIds: string[],
  newReferenceX: number,
  newReferenceY: number,
  relativePositions: Map<string, { x: number; y: number; relativeX: number; relativeY: number }>,
  rectangles: Rectangle[]
): Rectangle[] => {
  return rectangles.map(rect => {
    // Skip non-selected rectangles (no position changes)
    if (!selectedIds.includes(rect.id)) {
      return rect;
    }

    // Handle missing relative position data gracefully
    const relativePos = relativePositions.get(rect.id);
    if (!relativePos) {
      return rect;
    }

    // Spatial relationship restoration: apply relative offset to new reference position
    return {
      ...rect,
      x: newReferenceX + relativePos.relativeX,
      y: newReferenceY + relativePos.relativeY
    };
  });
};