import { Rectangle } from '../types';

/**
 * Utility functions for bounding box operations and rectangle containment
 */

/**
 * Checks if a rectangle is completely contained within a bounding box
 */
export function isRectangleContainedInBounds(
  rectangle: Rectangle,
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
): boolean {
  const rectRight = rectangle.x + rectangle.w;
  const rectBottom = rectangle.y + rectangle.h;
  const boundsRight = bounds.x + bounds.width;
  const boundsBottom = bounds.y + bounds.height;

  return (
    rectangle.x >= bounds.x &&
    rectangle.y >= bounds.y &&
    rectRight <= boundsRight &&
    rectBottom <= boundsBottom
  );
}

/**
 * Calculates the bounding box that encompasses the given rectangles
 */
export function calculateBoundingBox(rectangles: Rectangle[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (rectangles.length === 0) {
    return null;
  }

  // Initialize with first rectangle's bounds
  const first = rectangles[0];
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.w;
  let maxY = first.y + first.h;

  // Expand bounds to include all rectangles
  for (let i = 1; i < rectangles.length; i++) {
    const rect = rectangles[i];
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Finds all rectangles that are contained within the bounding box of the selected rectangles
 */
export function findRectanglesInBoundingBox(
  selectedRectangles: Rectangle[],
  allRectangles: Rectangle[]
): Rectangle[] {
  if (selectedRectangles.length === 0) {
    return [];
  }

  // Calculate the bounding box of the currently selected rectangles
  const bounds = calculateBoundingBox(selectedRectangles);
  if (!bounds) {
    return selectedRectangles;
  }

  // Find all rectangles that are completely contained within this bounding box
  const containedRectangles = allRectangles.filter(rect => 
    isRectangleContainedInBounds(rect, bounds)
  );

  return containedRectangles;
}

/**
 * Gets all rectangle IDs that should be selected based on bounding box containment
 */
export function getExpandedSelectionIds(
  currentSelectedIds: string[],
  allRectangles: Rectangle[]
): string[] {
  if (currentSelectedIds.length <= 1) {
    return currentSelectedIds; // No expansion needed for single or no selection
  }

  // Get the currently selected rectangles
  const selectedRectangles = allRectangles.filter(rect => 
    currentSelectedIds.includes(rect.id)
  );

  // Find all rectangles within the bounding box
  const containedRectangles = findRectanglesInBoundingBox(selectedRectangles, allRectangles);

  // Return the IDs of all contained rectangles
  return containedRectangles.map(rect => rect.id);
}