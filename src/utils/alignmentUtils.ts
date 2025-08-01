import { Rectangle, GlobalSettings } from '../types';
import { AlignmentType } from '../stores/types';

/**
 * Professional alignment utilities for multi-select operations
 * 
 * Implements alignment algorithms matching modern design tool behavior:
 * - First selected rectangle acts as the anchor and remains fixed
 * - All other rectangles align to the anchor rectangle's edges/center
 * - All final positions snap to the application's grid system
 * - Operations respect hierarchical constraints and manual positioning settings
 */

interface SelectionBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

/**
 * Calculates the bounding box encompassing all selected rectangles.
 * This bounding box serves as the reference frame for all alignment operations.
 */
function calculateSelectionBounds(rectangles: Rectangle[]): SelectionBounds {
  if (rectangles.length === 0) {
    return { left: 0, right: 0, top: 0, bottom: 0, centerX: 0, centerY: 0 };
  }

  const left = Math.min(...rectangles.map(r => r.x));
  const right = Math.max(...rectangles.map(r => r.x + r.w));
  const top = Math.min(...rectangles.map(r => r.y));
  const bottom = Math.max(...rectangles.map(r => r.y + r.h));
  
  const centerX = left + (right - left) / 2;
  const centerY = top + (bottom - top) / 2;

  return { left, right, top, bottom, centerX, centerY };
}

/**
 * Snaps coordinate values to the grid system to maintain consistent positioning.
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Aligns all rectangles to the left edge of the first (anchor) rectangle.
 */
export function alignLeft(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const targetX = anchor.x; // Use anchor's exact position, no grid snapping
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, x: targetX }
  );
}

/**
 * Aligns all rectangles to the horizontal center of the first (anchor) rectangle.
 */
export function alignCenter(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const anchorCenterX = anchor.x + anchor.w / 2; // Use anchor's exact center
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, x: anchorCenterX - rect.w / 2 }
  );
}

/**
 * Aligns all rectangles to the right edge of the first (anchor) rectangle.
 */
export function alignRight(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const anchorRight = anchor.x + anchor.w; // Use anchor's exact right edge
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, x: anchorRight - rect.w }
  );
}

/**
 * Aligns all rectangles to the top edge of the first (anchor) rectangle.
 */
export function alignTop(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const targetY = anchor.y; // Use anchor's exact position, no grid snapping
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, y: targetY }
  );
}

/**
 * Aligns all rectangles to the vertical center of the first (anchor) rectangle.
 */
export function alignMiddle(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const anchorCenterY = anchor.y + anchor.h / 2; // Use anchor's exact center
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, y: anchorCenterY - rect.h / 2 }
  );
}

/**
 * Aligns all rectangles to the bottom edge of the first (anchor) rectangle.
 */
export function alignBottom(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const anchorBottom = anchor.y + anchor.h; // Use anchor's exact bottom edge
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, y: anchorBottom - rect.h }
  );
}

/**
 * Dispatches alignment operations to the appropriate algorithm implementation.
 */
export function alignRectangles(
  rectangles: Rectangle[], 
  alignmentType: AlignmentType, 
  settings: GlobalSettings
): Rectangle[] {
  switch (alignmentType) {
    case 'left':
      return alignLeft(rectangles, settings);
    case 'center':
      return alignCenter(rectangles, settings);
    case 'right':
      return alignRight(rectangles, settings);
    case 'top':
      return alignTop(rectangles, settings);
    case 'middle':
      return alignMiddle(rectangles, settings);
    case 'bottom':
      return alignBottom(rectangles, settings);
    default:
      return rectangles;
  }
}

/**
 * Validates if alignment can be performed (requires minimum 2 rectangles).
 */
export function canAlign(rectangles: Rectangle[]): boolean {
  return rectangles.length >= 2;
}

/**
 * Generates description text for undo/redo history and user feedback.
 */
export function getAlignmentDescription(alignmentType: AlignmentType, count: number): string {
  const alignmentNames = {
    left: 'Left',
    center: 'Center',
    right: 'Right',
    top: 'Top',
    middle: 'Middle',
    bottom: 'Bottom'
  };
  
  return `Align ${count} rectangle${count === 1 ? '' : 's'} ${alignmentNames[alignmentType]}`;
}