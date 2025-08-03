import { Rectangle } from '../types';

/**
 * Geometric algorithms for bounding box calculations and spatial containment analysis.
 * 
 * These functions implement axis-aligned bounding box (AABB) operations essential for:
 * - Multi-select drag box calculations
 * - Spatial query optimization for large rectangle collections
 * - Collision detection and containment validation
 * - Selection expansion based on spatial proximity
 */

/**
 * AABB containment test using complete geometric inclusion.
 * 
 * Algorithm: Tests that all four corners of the rectangle are within the bounding box.
 * Uses strict inequality to ensure the rectangle is completely inside, not touching edges.
 * Essential for multi-select operations where partial overlap should not trigger inclusion.
 * 
 * Time complexity: O(1) - constant time geometric comparison
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
 * Minimum bounding rectangle calculation using coordinate extrema algorithm.
 * 
 * Algorithm:
 * 1. Initialize bounds with first rectangle's coordinates
 * 2. Iterate through remaining rectangles, expanding bounds to include each
 * 3. Track min/max X and Y coordinates across all rectangles
 * 4. Return enclosing rectangle with computed width and height
 * 
 * Handles edge cases:
 * - Empty input returns null (no bounding box possible)
 * - Single rectangle returns tight bounds around that rectangle
 * - Multiple rectangles return minimal enclosing rectangle
 * 
 * Time complexity: O(n) where n is the number of rectangles
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

  // Seed bounds with first rectangle's extrema
  const first = rectangles[0];
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.w;
  let maxY = first.y + first.h;

  // Iteratively expand bounds to encompass all rectangles
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
 * Spatial query for rectangle containment within dynamic bounding box.
 * 
 * Two-phase algorithm:
 * 1. Calculate minimal bounding box of the currently selected rectangles
 * 2. Filter all rectangles to find those completely contained within this bounding box
 * 
 * Use cases:
 * - Automatic selection expansion during drag operations
 * - Finding rectangles within a user-defined selection area
 * - Spatial clustering and grouping operations
 * 
 * Performance: O(n) for bounding box calculation + O(m) for containment testing
 * where n = selected rectangles, m = total rectangles
 */
export function findRectanglesInBoundingBox(
  selectedRectangles: Rectangle[],
  allRectangles: Rectangle[]
): Rectangle[] {
  if (selectedRectangles.length === 0) {
    return [];
  }

  // Compute enclosing bounds for spatial query
  const bounds = calculateBoundingBox(selectedRectangles);
  if (!bounds) {
    return selectedRectangles;
  }

  // Apply containment filter to find all enclosed rectangles
  const containedRectangles = allRectangles.filter(rect => 
    isRectangleContainedInBounds(rect, bounds)
  );

  return containedRectangles;
}

/**
 * Selection expansion orchestrator for intuitive multi-select behavior.
 * 
 * Implements PowerPoint-style selection expansion where selecting multiple rectangles
 * automatically includes any rectangles that fall completely within the selection's
 * bounding box. This provides intuitive behavior for users who expect spatial
 * containment to determine which elements are affected by operations.
 * 
 * Algorithm:
 * 1. Skip expansion for single selections (no bounding box needed)
 * 2. Find all rectangles within the bounding box of current selection
 * 3. Return IDs of all contained rectangles for uniform selection state
 */
export function getExpandedSelectionIds(
  currentSelectedIds: string[],
  allRectangles: Rectangle[]
): string[] {
  if (currentSelectedIds.length <= 1) {
    return currentSelectedIds; // Single selections don't need spatial expansion
  }

  // Extract rectangle objects for bounding box calculation
  const selectedRectangles = allRectangles.filter(rect => 
    currentSelectedIds.includes(rect.id)
  );

  // Execute spatial containment query
  const containedRectangles = findRectanglesInBoundingBox(selectedRectangles, allRectangles);

  // Return expanded selection as ID array for state consistency
  return containedRectangles.map(rect => rect.id);
}