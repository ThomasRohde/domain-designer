import { Rectangle, GlobalSettings } from '../types';
import { DistributionDirection } from '../stores/types';

/**
 * Professional white space distribution utilities for multi-select rectangle operations
 * 
 * Core Algorithm Philosophy:
 * Implements equal-gap distribution where the focus is on uniform spacing between objects
 * rather than uniform center-to-center distances. This matches Adobe Illustrator, Figma,
 * and PowerPoint behavior where users expect consistent visual gaps.
 * 
 * Key Features:
 * - Boundary preservation: First and last selected rectangles define the distribution area
 * - Equal gap calculation: Available white space divided evenly between all objects
 * - Selection order matters: Selection sequence determines boundary rectangles, not spatial position
 * - Spatial sorting: Intermediate objects sorted by position for logical distribution
 * - Object size awareness: Distribution accounts for varying rectangle dimensions
 * 
 * Algorithm Steps:
 * 1. Identify boundary rectangles (first/last selected)
 * 2. Determine spatial boundaries (leftmost/rightmost or topmost/bottommost)
 * 3. Calculate available white space (boundary span minus total object dimensions)
 * 4. Distribute white space equally among gaps (n+1 gaps for n intermediate objects)
 * 5. Position intermediate objects with calculated gap spacing
 * 
 * Example: 4 rectangles selected, 100px total span, 60px total object width
 * → 40px white space ÷ 3 gaps = 13.33px per gap (rounded to nearest pixel)
 */

/**
 * Distributes rectangles horizontally with equal white space gaps.
 * 
 * Detailed Algorithm:
 * 1. Boundary Setup: First/last selected rectangles become immutable anchors
 * 2. Spatial Analysis: Determine which boundary is leftmost vs rightmost
 * 3. Gap Calculation: (rightBoundary.x - leftBoundary.rightEdge - totalIntermediateWidth) ÷ gapCount
 * 4. Sequential Positioning: Place intermediate rectangles left-to-right with calculated gaps
 * 
 * Boundary Handling:
 * - Selection order defines boundaries: rectangles[0] and rectangles[n-1]
 * - Spatial order determines layout: leftmost boundary → intermediate objects → rightmost boundary
 * - If first selected is rightmost, it still acts as boundary but positioned on right side
 * 
 * @param rectangles - Array of rectangles in selection order
 * @param _settings - Global settings (unused but maintained for API consistency)
 */
export function distributeHorizontally(rectangles: Rectangle[], _settings: GlobalSettings): Rectangle[] {
  if (rectangles.length < 3) return rectangles;

  const firstBoundary = rectangles[0];
  const lastBoundary = rectangles[rectangles.length - 1];
  
  // Determine spatial left/right boundaries regardless of selection sequence
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
  
  // Equal gap distribution: n intermediate objects create n+1 gaps in the available space
  const numGaps = rectsToDistribute.length + 1;
  const gapSize = totalWhiteSpace / numGaps;
  
  const sortedRects = [...rectsToDistribute].sort((a, b) => a.x - b.x);
  const newPositions = new Map<string, number>();
  
  // Preserve boundary positions
  newPositions.set(firstBoundary.id, firstBoundary.x);
  newPositions.set(lastBoundary.id, lastBoundary.x);
  
  // Sequential positioning: place each intermediate rectangle with consistent gap spacing
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
 * Distributes rectangles vertically with equal white space gaps.
 * 
 * Detailed Algorithm:
 * 1. Boundary Setup: First/last selected rectangles become immutable anchors
 * 2. Spatial Analysis: Determine which boundary is topmost vs bottommost
 * 3. Gap Calculation: (bottomBoundary.y - topBoundary.bottomEdge - totalIntermediateHeight) ÷ gapCount
 * 4. Sequential Positioning: Place intermediate rectangles top-to-bottom with calculated gaps
 * 
 * Boundary Handling:
 * - Selection order defines boundaries: rectangles[0] and rectangles[n-1]
 * - Spatial order determines layout: topmost boundary → intermediate objects → bottommost boundary
 * - If first selected is bottommost, it still acts as boundary but positioned on bottom side
 * 
 * @param rectangles - Array of rectangles in selection order
 * @param _settings - Global settings (unused but maintained for API consistency)
 */
export function distributeVertically(rectangles: Rectangle[], _settings: GlobalSettings): Rectangle[] {
  if (rectangles.length < 3) return rectangles;

  const firstBoundary = rectangles[0];
  const lastBoundary = rectangles[rectangles.length - 1];
  
  // Determine spatial top/bottom boundaries regardless of selection sequence
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
  
  // Equal gap distribution: n intermediate objects create n+1 gaps in the available space
  const numGaps = rectsToDistribute.length + 1;
  const gapSize = totalWhiteSpace / numGaps;
  
  const sortedRects = [...rectsToDistribute].sort((a, b) => a.y - b.y);
  const newPositions = new Map<string, number>();
  
  // Preserve boundary positions
  newPositions.set(firstBoundary.id, firstBoundary.y);
  newPositions.set(lastBoundary.id, lastBoundary.y);
  
  // Sequential positioning: place each intermediate rectangle with consistent gap spacing
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
 * Main distribution dispatcher that routes requests to specific distribution algorithms.
 * 
 * Provides type-safe routing between horizontal and vertical distribution modes
 * while maintaining consistent parameter handling and return value formatting.
 * 
 * @param rectangles - Array of rectangles to distribute (min 3 required)
 * @param direction - Distribution axis: 'horizontal' or 'vertical'
 * @param settings - Global settings (future: grid snapping, margin constraints)
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
 * Validates if distribution operation is possible with current selection.
 * 
 * Distribution requires minimum 3 rectangles: 2 boundaries + 1 intermediate.
 * Additional validation (same-parent, non-text-label) handled by selectionUtils.
 */
export function canDistribute(rectangles: Rectangle[]): boolean {
  return rectangles.length >= 3;
}

/**
 * Generates human-readable descriptions for distribution operations.
 * 
 * Used in:
 * - Undo/redo history entries
 * - User confirmation dialogs
 * - Operation logging and debugging
 */
export function getDistributionDescription(direction: DistributionDirection, count: number): string {
  const directionName = direction === 'horizontal' ? 'Horizontally' : 'Vertically';
  return `Distribute ${count} rectangles ${directionName}`;
}

/**
 * Calculates current spacing between adjacent rectangles in the selection.
 * 
 * Purpose:
 * - UI feedback: Show current gap sizes before/after distribution
 * - Validation: Detect if rectangles are already evenly distributed
 * - Analysis: Provide spacing metrics for layout optimization
 * 
 * Returns array of gap sizes in spatial order (left-to-right or top-to-bottom).
 * Gap calculation: distance between rectangle edges (not center-to-center).
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
 * Checks if rectangles already have uniform spacing within acceptable tolerance.
 * 
 * Use Cases:
 * - UI state indication: Disable distribute button if already distributed
 * - Operation optimization: Skip redundant calculations
 * - User feedback: Show "already distributed" status
 * 
 * Algorithm:
 * - Calculate all gaps between adjacent rectangles
 * - Compare gap variance against tolerance threshold
 * - Return true if all gaps are within tolerance of each other
 * 
 * @param tolerance - Maximum allowed difference between gaps (default: 1px)
 */
export function areEvenlyDistributed(
  rectangles: Rectangle[], 
  direction: DistributionDirection,
  tolerance: number = 1
): boolean {
  // Edge case: fewer than 3 rectangles are considered "evenly distributed" by definition
  if (rectangles.length < 3) return true;

  const spacings = calculateCurrentSpacing(rectangles, direction);
  if (spacings.length === 0) return true;

  const firstSpacing = spacings[0];
  return spacings.every(spacing => Math.abs(spacing - firstSpacing) <= tolerance);
}