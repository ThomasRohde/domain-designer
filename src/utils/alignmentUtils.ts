import { Rectangle, GlobalSettings } from '../types';
import { AlignmentType } from '../stores/types';

/**
 * Professional alignment utilities for multi-select operations
 * 
 * Implements alignment algorithms matching PowerPoint and design tool behavior:
 * - Edge alignments use the extremes of the selection bounding box
 * - Center alignments use the mathematical center of the selection bounding box
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
 * Aligns all rectangles to the leftmost edge of the selection bounds.
 */
export function alignLeft(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const bounds = calculateSelectionBounds(rectangles);
  const targetX = snapToGrid(bounds.left, settings.gridSize);
  
  return rectangles.map(rect => ({
    ...rect,
    x: targetX
  }));
}

/**
 * Aligns all rectangles to the horizontal center of the selection bounds.
 */
export function alignCenter(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const bounds = calculateSelectionBounds(rectangles);
  const targetCenterX = snapToGrid(bounds.centerX, settings.gridSize);
  
  return rectangles.map(rect => ({
    ...rect,
    x: targetCenterX - rect.w / 2
  }));
}

/**
 * Aligns all rectangles to the rightmost edge of the selection bounds.
 */
export function alignRight(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const bounds = calculateSelectionBounds(rectangles);
  const targetRight = snapToGrid(bounds.right, settings.gridSize);
  
  return rectangles.map(rect => ({
    ...rect,
    x: targetRight - rect.w
  }));
}

/**
 * Aligns all rectangles to the topmost edge of the selection bounds.
 */
export function alignTop(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const bounds = calculateSelectionBounds(rectangles);
  const targetY = snapToGrid(bounds.top, settings.gridSize);
  
  return rectangles.map(rect => ({
    ...rect,
    y: targetY
  }));
}

/**
 * Aligns all rectangles to the vertical center of the selection bounds.
 */
export function alignMiddle(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const bounds = calculateSelectionBounds(rectangles);
  const targetCenterY = snapToGrid(bounds.centerY, settings.gridSize);
  
  return rectangles.map(rect => ({
    ...rect,
    y: targetCenterY - rect.h / 2
  }));
}

/**
 * Aligns all rectangles to the bottommost edge of the selection bounds.
 */
export function alignBottom(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const bounds = calculateSelectionBounds(rectangles);
  const targetBottom = snapToGrid(bounds.bottom, settings.gridSize);
  
  return rectangles.map(rect => ({
    ...rect,
    y: targetBottom - rect.h
  }));
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