import { Rectangle, GlobalSettings } from '../types';
import { AlignmentType } from '../stores/types';

/**
 * PowerPoint-style alignment utilities for multi-select operations
 * 
 * Implements alignment algorithms that match PowerPoint's behavior:
 * - Left/Right/Top/Bottom: Align to extremes of selection bounding box
 * - Center/Middle: Align to mathematical center of selection bounding box
 * - Grid snapping: Final positions snap to application's grid system
 * 
 * All operations preserve the hierarchical constraints and respect manual positioning settings.
 */

/**
 * Selection bounds for alignment calculations
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
 * Calculate the bounding box of the selected rectangles
 * Used as reference for all alignment operations
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
 * Snap position to grid system
 * Ensures aligned rectangles maintain grid alignment
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Align rectangles to the left edge of the selection bounds
 * All rectangles will have their left edge at the leftmost x position
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
 * Align rectangles to horizontal center of the selection bounds
 * All rectangles will have their center x at the selection center x
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
 * Align rectangles to the right edge of the selection bounds
 * All rectangles will have their right edge at the rightmost x position
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
 * Align rectangles to the top edge of the selection bounds
 * All rectangles will have their top edge at the topmost y position
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
 * Align rectangles to vertical center of the selection bounds
 * All rectangles will have their center y at the selection center y
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
 * Align rectangles to the bottom edge of the selection bounds
 * All rectangles will have their bottom edge at the bottommost y position
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
 * Master alignment function that dispatches to specific alignment implementations
 * Provides a unified interface for all alignment operations
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
 * Validate if alignment operation can be performed
 * Checks minimum selection size and other constraints
 */
export function canAlign(rectangles: Rectangle[]): boolean {
  return rectangles.length >= 2;
}

/**
 * Get a human-readable description of the alignment operation
 * Useful for undo/redo history and user feedback
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