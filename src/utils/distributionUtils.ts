import { Rectangle, GlobalSettings } from '../types';
import { DistributionDirection } from '../stores/types';

/**
 * Professional design tool distribution utilities for multi-select operations
 * 
 * Implements white space distribution behavior matching Adobe Illustrator and Figma:
 * - First and last selected rectangles remain fixed as user-defined boundaries
 * - Intermediate rectangles are repositioned to create equal gaps between all objects
 * - Selection order (not spatial position) determines which rectangles act as boundaries
 * - Total available white space is calculated and divided equally among all gaps
 * 
 * This differs from typical "evenly space centers" distribution by focusing on gap uniformity,
 * which is the standard behavior users expect from professional design tools.
 */

/**
 * Distributes rectangles horizontally with equal spacing between objects.
 * Uses selection order to determine fixed boundary rectangles.
 */
export function distributeHorizontally(rectangles: Rectangle[], _settings: GlobalSettings): Rectangle[] {
  if (rectangles.length < 3) return rectangles;

  const firstBoundary = rectangles[0];
  const lastBoundary = rectangles[rectangles.length - 1];
  
  // Determine spatial positioning regardless of selection order
  const leftBoundary = firstBoundary.x <= lastBoundary.x ? firstBoundary : lastBoundary;
  const rightBoundary = firstBoundary.x <= lastBoundary.x ? lastBoundary : firstBoundary;
  
  const rectsToDistribute = rectangles.filter(rect => 
    rect.id !== firstBoundary.id && rect.id !== lastBoundary.id
  );
  
  if (rectsToDistribute.length === 0) return rectangles;
  
  const leftBoundaryRight = leftBoundary.x + leftBoundary.w;
  const rightBoundaryLeft = rightBoundary.x;
  const availableSpace = rightBoundaryLeft - leftBoundaryRight;
  
  const totalObjectWidth = rectsToDistribute.reduce((sum, rect) => sum + rect.w, 0);
  const totalWhiteSpace = availableSpace - totalObjectWidth;
  
  // Distribute white space equally: one gap before each object, one after the last
  const numGaps = rectsToDistribute.length + 1;
  const gapSize = totalWhiteSpace / numGaps;
  
  const sortedRects = [...rectsToDistribute].sort((a, b) => a.x - b.x);
  const newPositions = new Map<string, number>();
  
  // Preserve boundary positions
  newPositions.set(firstBoundary.id, firstBoundary.x);
  newPositions.set(lastBoundary.id, lastBoundary.x);
  
  // Position intermediate rectangles with calculated equal gaps
  let currentX = leftBoundaryRight + gapSize;
  sortedRects.forEach((rect) => {
    newPositions.set(rect.id, currentX);
    currentX += rect.w + gapSize;
  });
  
  return rectangles.map(rect => {
    const newX = newPositions.get(rect.id);
    return newX !== undefined ? { ...rect, x: newX } : rect;
  });
}

/**
 * Distributes rectangles vertically with equal spacing between objects.
 * Uses selection order to determine fixed boundary rectangles.
 */
export function distributeVertically(rectangles: Rectangle[], _settings: GlobalSettings): Rectangle[] {
  if (rectangles.length < 3) return rectangles;

  const firstBoundary = rectangles[0];
  const lastBoundary = rectangles[rectangles.length - 1];
  
  // Determine spatial positioning regardless of selection order
  const topBoundary = firstBoundary.y <= lastBoundary.y ? firstBoundary : lastBoundary;
  const bottomBoundary = firstBoundary.y <= lastBoundary.y ? lastBoundary : firstBoundary;
  
  const rectsToDistribute = rectangles.filter(rect => 
    rect.id !== firstBoundary.id && rect.id !== lastBoundary.id
  );
  
  if (rectsToDistribute.length === 0) return rectangles;
  
  const topBoundaryBottom = topBoundary.y + topBoundary.h;
  const bottomBoundaryTop = bottomBoundary.y;
  const availableSpace = bottomBoundaryTop - topBoundaryBottom;
  
  const totalObjectHeight = rectsToDistribute.reduce((sum, rect) => sum + rect.h, 0);
  const totalWhiteSpace = availableSpace - totalObjectHeight;
  
  // Distribute white space equally: one gap before each object, one after the last
  const numGaps = rectsToDistribute.length + 1;
  const gapSize = totalWhiteSpace / numGaps;
  
  const sortedRects = [...rectsToDistribute].sort((a, b) => a.y - b.y);
  const newPositions = new Map<string, number>();
  
  // Preserve boundary positions
  newPositions.set(firstBoundary.id, firstBoundary.y);
  newPositions.set(lastBoundary.id, lastBoundary.y);
  
  // Position intermediate rectangles with calculated equal gaps
  let currentY = topBoundaryBottom + gapSize;
  sortedRects.forEach((rect) => {
    newPositions.set(rect.id, currentY);
    currentY += rect.h + gapSize;
  });
  
  return rectangles.map(rect => {
    const newY = newPositions.get(rect.id);
    return newY !== undefined ? { ...rect, y: newY } : rect;
  });
}

/**
 * Dispatches distribution operations to the appropriate algorithm implementation.
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
 * Validates if distribution can be performed (requires minimum 3 rectangles).
 */
export function canDistribute(rectangles: Rectangle[]): boolean {
  return rectangles.length >= 3;
}

/**
 * Generates description text for undo/redo history and user feedback.
 */
export function getDistributionDescription(direction: DistributionDirection, count: number): string {
  const directionName = direction === 'horizontal' ? 'Horizontally' : 'Vertically';
  return `Distribute ${count} rectangles ${directionName}`;
}

/**
 * Calculates current gap sizes between rectangles for UI feedback and validation.
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
 * Determines if rectangles already have uniform spacing within tolerance.
 * Used for UI state indication and preventing redundant operations.
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