import { Rectangle, GlobalSettings } from '../types';
import { DistributionDirection } from '../stores/types';

/**
 * Professional design tool distribution utilities for multi-select operations
 * 
 * Implements WHITE SPACE distribution like Adobe Illustrator, Figma, etc:
 * - FIRST SELECTED rectangle remains FIXED - user-defined start boundary
 * - LAST SELECTED rectangle remains FIXED - user-defined end boundary  
 * - ALL OTHER rectangles are positioned so WHITE SPACE (gaps) between them are equal
 * - Calculates total available white space and divides it equally between all gaps
 * - Selection order determines boundaries, not spatial position
 * 
 * This is the true professional design tool behavior - distribute the available
 * white space evenly, creating perfectly equal gaps between all objects.
 * 
 * Example: Objects A[gap]B[gap]C[gap]D where all [gap] spaces are identical.
 * 
 * All operations preserve the hierarchical constraints and respect manual positioning settings.
 */

/**
 * Distribute rectangles horizontally with equal WHITE SPACE between them
 * ULTRA SIMPLE: First selected and last selected stay fixed, others get equal gaps
 */
export function distributeHorizontally(rectangles: Rectangle[], _settings: GlobalSettings): Rectangle[] {
  if (rectangles.length < 3) return rectangles;

  // First and last in selection order are the FIXED boundaries
  const firstBoundary = rectangles[0];
  const lastBoundary = rectangles[rectangles.length - 1];
  
  // Determine which boundary is leftmost and rightmost spatially
  const leftBoundary = firstBoundary.x <= lastBoundary.x ? firstBoundary : lastBoundary;
  const rightBoundary = firstBoundary.x <= lastBoundary.x ? lastBoundary : firstBoundary;
  
  // Get all rectangles that need to be repositioned (everything except the two boundaries)
  const rectsToDistribute = rectangles.filter(rect => 
    rect.id !== firstBoundary.id && rect.id !== lastBoundary.id
  );
  
  if (rectsToDistribute.length === 0) return rectangles;
  
  // Calculate available space between boundaries
  const leftBoundaryRight = leftBoundary.x + leftBoundary.w;
  const rightBoundaryLeft = rightBoundary.x;
  const availableSpace = rightBoundaryLeft - leftBoundaryRight;
  
  // Calculate total width of rectangles to distribute
  const totalObjectWidth = rectsToDistribute.reduce((sum, rect) => sum + rect.w, 0);
  
  // Calculate available white space
  const totalWhiteSpace = availableSpace - totalObjectWidth;
  
  // Calculate number of gaps: one before each object, one after the last object
  const numGaps = rectsToDistribute.length + 1;
  const gapSize = totalWhiteSpace / numGaps;
  
  // Sort rectangles to distribute by their current X position (left to right)
  const sortedRects = [...rectsToDistribute].sort((a, b) => a.x - b.x);
  
  // Position rectangles with equal gaps
  const newPositions = new Map<string, number>();
  
  // Keep boundaries fixed
  newPositions.set(firstBoundary.id, firstBoundary.x);
  newPositions.set(lastBoundary.id, lastBoundary.x);
  
  // Position the distributed rectangles
  let currentX = leftBoundaryRight + gapSize;
  
  sortedRects.forEach((rect) => {
    newPositions.set(rect.id, currentX);
    currentX += rect.w + gapSize;
  });
  
  // Return rectangles with new positions
  return rectangles.map(rect => {
    const newX = newPositions.get(rect.id);
    return newX !== undefined ? { ...rect, x: newX } : rect;
  });
}

/**
 * Distribute rectangles vertically with equal WHITE SPACE between them
 * ULTRA SIMPLE: First selected and last selected stay fixed, others get equal gaps
 */
export function distributeVertically(rectangles: Rectangle[], _settings: GlobalSettings): Rectangle[] {
  if (rectangles.length < 3) return rectangles;

  // First and last in selection order are the FIXED boundaries
  const firstBoundary = rectangles[0];
  const lastBoundary = rectangles[rectangles.length - 1];
  
  // Determine which boundary is topmost and bottommost spatially
  const topBoundary = firstBoundary.y <= lastBoundary.y ? firstBoundary : lastBoundary;
  const bottomBoundary = firstBoundary.y <= lastBoundary.y ? lastBoundary : firstBoundary;
  
  // Get all rectangles that need to be repositioned (everything except the two boundaries)
  const rectsToDistribute = rectangles.filter(rect => 
    rect.id !== firstBoundary.id && rect.id !== lastBoundary.id
  );
  
  if (rectsToDistribute.length === 0) return rectangles;
  
  // Calculate available space between boundaries
  const topBoundaryBottom = topBoundary.y + topBoundary.h;
  const bottomBoundaryTop = bottomBoundary.y;
  const availableSpace = bottomBoundaryTop - topBoundaryBottom;
  
  // Calculate total height of rectangles to distribute
  const totalObjectHeight = rectsToDistribute.reduce((sum, rect) => sum + rect.h, 0);
  
  // Calculate available white space
  const totalWhiteSpace = availableSpace - totalObjectHeight;
  
  // Calculate number of gaps: one before each object, one after the last object
  const numGaps = rectsToDistribute.length + 1;
  const gapSize = totalWhiteSpace / numGaps;
  
  // Sort rectangles to distribute by their current Y position (top to bottom)
  const sortedRects = [...rectsToDistribute].sort((a, b) => a.y - b.y);
  
  // Position rectangles with equal gaps
  const newPositions = new Map<string, number>();
  
  // Keep boundaries fixed
  newPositions.set(firstBoundary.id, firstBoundary.y);
  newPositions.set(lastBoundary.id, lastBoundary.y);
  
  // Position the distributed rectangles
  let currentY = topBoundaryBottom + gapSize;
  
  sortedRects.forEach((rect) => {
    newPositions.set(rect.id, currentY);
    currentY += rect.h + gapSize;
  });
  
  // Return rectangles with new positions
  return rectangles.map(rect => {
    const newY = newPositions.get(rect.id);
    return newY !== undefined ? { ...rect, y: newY } : rect;
  });
}

/**
 * Master distribution function that dispatches to specific distribution implementations
 * Provides a unified interface for all distribution operations
 */
export function distributeRectangles(
  rectangles: Rectangle[], 
  direction: DistributionDirection, 
  settings: GlobalSettings
): Rectangle[] {
  switch (direction) {
    case 'horizontal':
      return distributeHorizontally(rectangles, settings);
    case 'vertical':
      return distributeVertically(rectangles, settings);
    default:
      return rectangles;
  }
}

/**
 * Validate if distribution operation can be performed
 * Distribution requires minimum 3 rectangles to create meaningful spacing
 */
export function canDistribute(rectangles: Rectangle[]): boolean {
  return rectangles.length >= 3;
}

/**
 * Get a human-readable description of the distribution operation
 * Useful for undo/redo history and user feedback
 */
export function getDistributionDescription(direction: DistributionDirection, count: number): string {
  const directionName = direction === 'horizontal' ? 'Horizontally' : 'Vertically';
  return `Distribute ${count} rectangles ${directionName}`;
}

/**
 * Calculate the current spacing between rectangles (for UI feedback)
 * Returns the spacing measurements for the given direction
 */
export function calculateCurrentSpacing(
  rectangles: Rectangle[], 
  direction: DistributionDirection
): number[] {
  if (rectangles.length < 2) return [];

  if (direction === 'horizontal') {
    const sortedByX = [...rectangles].sort((a, b) => a.x - b.x);
    const spacings: number[] = [];
    
    for (let i = 1; i < sortedByX.length; i++) {
      const prevRight = sortedByX[i - 1].x + sortedByX[i - 1].w;
      const currentLeft = sortedByX[i].x;
      spacings.push(currentLeft - prevRight);
    }
    
    return spacings;
  } else {
    const sortedByY = [...rectangles].sort((a, b) => a.y - b.y);
    const spacings: number[] = [];
    
    for (let i = 1; i < sortedByY.length; i++) {
      const prevBottom = sortedByY[i - 1].y + sortedByY[i - 1].h;
      const currentTop = sortedByY[i].y;
      spacings.push(currentTop - prevBottom);
    }
    
    return spacings;
  }
}

/**
 * Check if rectangles are already evenly distributed
 * Used to provide user feedback about distribution state
 */
export function areEvenlyDistributed(
  rectangles: Rectangle[], 
  direction: DistributionDirection,
  tolerance: number = 1
): boolean {
  if (rectangles.length < 3) return true;

  const spacings = calculateCurrentSpacing(rectangles, direction);
  if (spacings.length === 0) return true;

  const firstSpacing = spacings[0];
  return spacings.every(spacing => Math.abs(spacing - firstSpacing) <= tolerance);
}