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

  return (
    child.x >= minX &&
    child.x <= maxX &&
    child.y >= minY &&
    child.y <= maxY
  );
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

    // Check parent boundary constraints
    if (movedRect.parentId) {
      const parent = rectangles.find(r => r.id === movedRect.parentId);
      if (parent) {
        const parentBounds = {
          id: parent.id,
          x: parent.x,
          y: parent.y,
          w: parent.w,
          h: parent.h,
          parentId: parent.parentId
        };

        if (!isWithinParentBounds(movedRect, parentBounds, settings.margin, settings.labelMargin)) {
          result.hasCollision = true;
          result.constraintViolations.push(
            `Rectangle ${movedRect.id} would move outside parent bounds`
          );
        }
      }
    }
  }

  return result;
};

/**
 * Finds the maximum safe movement distance in a given direction
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

  const increment = delta > 0 ? 1 : -1;
  let testDelta = 0;
  let maxSafeDelta = 0;

  // Test movement in increments until collision is detected
  while (Math.abs(testDelta) <= Math.abs(delta)) {
    const deltaX = direction === 'x' ? testDelta : 0;
    const deltaY = direction === 'y' ? testDelta : 0;
    
    const collision = detectBulkMovementCollisions(selectedIds, deltaX, deltaY, rectangles, settings);
    
    if (collision.hasCollision) {
      break;
    }
    
    maxSafeDelta = testDelta;
    testDelta += increment;
  }

  return maxSafeDelta;
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

  return {
    deltaX: maxSafeDeltaX,
    deltaY: maxSafeDeltaY
  };
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