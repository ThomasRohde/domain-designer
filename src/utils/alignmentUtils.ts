import { Rectangle, GlobalSettings } from '../types';
import { AlignmentType } from '../stores/types';

/**
 * Professional alignment utilities for multi-select rectangle operations
 * 
 * Core Design Philosophy:
 * This module implements PowerPoint-style alignment using the anchor-based approach where
 * the first selected rectangle serves as the immutable reference point. This differs from
 * traditional bounding-box alignment and provides more predictable user experience.
 * 
 * Key Features:
 * - Anchor-based alignment: First selected rectangle never moves, others align to it
 * - Six alignment modes: Left, Center, Right (horizontal) + Top, Middle, Bottom (vertical)
 * - Grid system integration: All calculations respect the application's coordinate system
 * - Hierarchical constraints: Operations validated against parent-child relationships
 * - Layout algorithm agnostic: Works with Grid, Flow, and Mixed Flow layout systems
 * 
 * Algorithm Behavior:
 * - Left/Right/Top/Bottom: Align to anchor's corresponding edge coordinate
 * - Center/Middle: Align to anchor's calculated center point (edge + half-dimension)
 * - Minimum requirement: 2+ rectangles (anchor + at least one target)
 * - Constraint validation: Only same-parent siblings can be aligned together
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
 * Calculates the overall bounding box of a rectangle selection.
 * 
 * NOTE: This function is currently unused due to anchor-based alignment approach.
 * Kept for potential future features like "distribute to bounds" or group operations.
 * 
 * In anchor-based alignment, we align to the first rectangle rather than selection bounds,
 * providing more predictable and user-controlled results.
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
 * Snaps coordinate values to the grid system for consistent positioning.
 * 
 * NOTE: Grid snapping currently disabled in alignment operations to preserve
 * anchor rectangle's exact position. Future enhancement could add optional
 * grid snapping for non-anchor rectangles while keeping anchor fixed.
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Aligns all rectangles to the left edge of the anchor rectangle.
 * 
 * Behavior:
 * - Anchor (first rectangle): Position unchanged
 * - Target rectangles: Left edge (x coordinate) set to match anchor's left edge
 * - Width and height: Preserved for all rectangles
 * - Vertical positioning: Unchanged (only horizontal alignment affected)
 * 
 * Example: Anchor at x=100, targets move so their x coordinates become 100
 */
export function alignLeft(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const targetX = anchor.x;
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, x: targetX }
  );
}

/**
 * Aligns all rectangles to the horizontal center of the anchor rectangle.
 * 
 * Behavior:
 * - Anchor (first rectangle): Position unchanged
 * - Target rectangles: Horizontal center aligned to anchor's center
 * - Center calculation: anchor.x + (anchor.width / 2)
 * - Target positioning: center_x - (target.width / 2) to center the target
 * 
 * Example: Anchor center at x=150 (x=100, w=100), target with w=50 moves to x=125
 */
export function alignCenter(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const anchorCenterX = anchor.x + anchor.w / 2;
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, x: anchorCenterX - rect.w / 2 }
  );
}

/**
 * Aligns all rectangles to the right edge of the anchor rectangle.
 * 
 * Behavior:
 * - Anchor (first rectangle): Position unchanged
 * - Target rectangles: Right edge aligned to anchor's right edge
 * - Right edge calculation: anchor.x + anchor.width
 * - Target positioning: right_edge - target.width to align right edges
 * 
 * Example: Anchor right edge at x=200 (x=100, w=100), target with w=50 moves to x=150
 */
export function alignRight(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const anchorRight = anchor.x + anchor.w;
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, x: anchorRight - rect.w }
  );
}

/**
 * Aligns all rectangles to the top edge of the anchor rectangle.
 * 
 * Behavior:
 * - Anchor (first rectangle): Position unchanged
 * - Target rectangles: Top edge (y coordinate) set to match anchor's top edge
 * - Width and height: Preserved for all rectangles
 * - Horizontal positioning: Unchanged (only vertical alignment affected)
 * 
 * Example: Anchor at y=50, targets move so their y coordinates become 50
 */
export function alignTop(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const targetY = anchor.y;
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, y: targetY }
  );
}

/**
 * Aligns all rectangles to the vertical center of the anchor rectangle.
 * 
 * Behavior:
 * - Anchor (first rectangle): Position unchanged
 * - Target rectangles: Vertical center aligned to anchor's center
 * - Center calculation: anchor.y + (anchor.height / 2)
 * - Target positioning: center_y - (target.height / 2) to center the target
 * 
 * Example: Anchor center at y=100 (y=50, h=100), target with h=30 moves to y=85
 */
export function alignMiddle(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const anchorCenterY = anchor.y + anchor.h / 2;
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, y: anchorCenterY - rect.h / 2 }
  );
}

/**
 * Aligns all rectangles to the bottom edge of the anchor rectangle.
 * 
 * Behavior:
 * - Anchor (first rectangle): Position unchanged
 * - Target rectangles: Bottom edge aligned to anchor's bottom edge
 * - Bottom edge calculation: anchor.y + anchor.height
 * - Target positioning: bottom_edge - target.height to align bottom edges
 * 
 * Example: Anchor bottom edge at y=150 (y=50, h=100), target with h=30 moves to y=120
 */
export function alignBottom(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[] {
  if (rectangles.length <= 1) return rectangles;
  
  const anchor = rectangles[0];
  const anchorBottom = anchor.y + anchor.h;
  
  return rectangles.map((rect, index) => 
    index === 0 ? rect : { ...rect, y: anchorBottom - rect.h }
  );
}

/**
 * Main alignment dispatcher that routes requests to specific alignment algorithms.
 * 
 * This is the primary public interface for alignment operations, providing
 * type-safe routing and consistent parameter handling across all alignment modes.
 * 
 * @param rectangles - Array of rectangles to align (first = anchor, rest = targets)
 * @param alignmentType - Specific alignment operation to perform
 * @param settings - Global settings (currently unused but maintained for future features)
 * @returns New array with aligned rectangle positions
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
 * Validates if alignment operation is possible with the current selection.
 * 
 * Alignment requires at least 2 rectangles: one anchor + one target.
 * Additional validation (same-parent, non-text-label) handled by selectionUtils.
 */
export function canAlign(rectangles: Rectangle[]): boolean {
  return rectangles.length >= 2;
}

/**
 * Generates human-readable descriptions for alignment operations.
 * 
 * Used in:
 * - Undo/redo history entries
 * - User confirmation dialogs
 * - Operation logging and debugging
 * 
 * @param alignmentType - The alignment operation performed
 * @param count - Total number of rectangles in the operation (includes anchor)
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