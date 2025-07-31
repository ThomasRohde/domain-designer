import { Rectangle } from '../types';
import { GRID_SIZE, MARGIN } from './constants';

/**
 * Canvas viewport translation coordinates
 */
export interface PanOffset {
  x: number;
  y: number;
}

/**
 * Visible area boundaries in grid coordinate space
 */
export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Transform screen pixel coordinates to logical grid coordinates
 * 
 * Applies pan offset compensation and zoom level scaling before
 * converting to discrete grid units. Essential for mouse interaction
 * and drag/drop operations.
 * 
 * @param screenX - Mouse X coordinate in screen pixels
 * @param screenY - Mouse Y coordinate in screen pixels
 * @param gridSize - Size of one grid unit in pixels
 * @param panOffset - Current canvas pan offset
 * @param zoomLevel - Current zoom multiplier
 * @returns Grid coordinates for logical positioning
 */
export const screenToGrid = (
  screenX: number,
  screenY: number,
  gridSize: number,
  panOffset: PanOffset = { x: 0, y: 0 },
  zoomLevel: number = 1.0
): { x: number; y: number } => {
  const adjustedX = (screenX - panOffset.x) / zoomLevel;
  const adjustedY = (screenY - panOffset.y) / zoomLevel;
  
  return {
    x: Math.floor(adjustedX / gridSize),
    y: Math.floor(adjustedY / gridSize)
  };
};

/**
 * Transform logical grid coordinates to screen pixel coordinates
 * 
 * Inverse of screenToGrid transformation. Used for rendering
 * rectangles at correct screen positions.
 * 
 * @param gridX - Logical grid X coordinate
 * @param gridY - Logical grid Y coordinate
 * @param gridSize - Size of one grid unit in pixels
 * @param panOffset - Current canvas pan offset
 * @param zoomLevel - Current zoom multiplier
 * @returns Screen pixel coordinates for rendering
 */
export const gridToScreen = (
  gridX: number,
  gridY: number,
  gridSize: number,
  panOffset: PanOffset = { x: 0, y: 0 },
  zoomLevel: number = 1.0
): { x: number; y: number } => {
  return {
    x: (gridX * gridSize + panOffset.x) * zoomLevel,
    y: (gridY * gridSize + panOffset.y) * zoomLevel
  };
};

/**
 * Calculate visible area boundaries in grid coordinate space
 * 
 * Determines which grid cells are currently visible on screen.
 * Used for viewport culling and optimized rendering of large diagrams.
 * 
 * @param containerRect - Canvas container dimensions
 * @param panOffset - Current pan offset
 * @param gridSize - Grid unit size in pixels
 * @param zoomLevel - Current zoom level
 * @returns Viewport boundaries in grid coordinates
 */
export const getViewportBounds = (
  containerRect: DOMRect,
  panOffset: PanOffset,
  gridSize: number,
  zoomLevel: number = 1.0
): ViewportBounds => {
  const topLeft = screenToGrid(0, 0, gridSize, panOffset, zoomLevel);
  const bottomRight = screenToGrid(containerRect.width, containerRect.height, gridSize, panOffset, zoomLevel);
  
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y
  };
};

/**
 * Find optimal placement for new rectangles using collision avoidance
 * 
 * Implements a grid-based placement algorithm that tries to find
 * non-overlapping positions starting from the top-left of the viewport.
 * Falls back to slightly offset positions if no perfect placement is found.
 * 
 * Algorithm complexity: O(attempts × existingRectangles)
 * 
 * @param existingRectangles - Rectangles to avoid overlapping
 * @param containerRect - Container boundaries for viewport calculation
 * @param panOffset - Current pan offset
 * @param gridSize - Grid unit size for positioning
 * @param newRectSize - Dimensions of rectangle to place
 * @param zoomLevel - Current zoom level
 * @returns Optimal position with minimal overlaps
 */
export const calculateOptimalPosition = (
  existingRectangles: Rectangle[],
  containerRect: DOMRect,
  panOffset: PanOffset,
  gridSize: number,
  newRectSize: { w: number; h: number },
  zoomLevel: number = 1.0
): { x: number; y: number } => {
  const viewport = getViewportBounds(containerRect, panOffset, gridSize, zoomLevel);
  
  // Start from top-left of viewport
  let x = viewport.x;
  let y = viewport.y;
  
  // Try to find a position that doesn't overlap with existing rectangles
  const maxAttempts = 100;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const hasOverlap = existingRectangles.some(rect => 
      !(x >= rect.x + rect.w || 
        x + newRectSize.w <= rect.x || 
        y >= rect.y + rect.h || 
        y + newRectSize.h <= rect.y)
    );
    
    if (!hasOverlap) {
      return { x, y };
    }
    
    // Move to next position
    x += newRectSize.w + MARGIN;
    
    // If we reach the right edge, move to next row
    if (x + newRectSize.w > viewport.x + viewport.width) {
      x = viewport.x;
      y += newRectSize.h + MARGIN;
      
      // If we reach the bottom edge, start over with a small offset
      if (y + newRectSize.h > viewport.y + viewport.height) {
        x = viewport.x + (attempts % 5) * MARGIN;
        y = viewport.y + (attempts % 5) * MARGIN;
      }
    }
    
    attempts++;
  }
  
  // If no optimal position found, return viewport top-left
  return { x: viewport.x, y: viewport.y };
};

/**
 * Test rectangle visibility within viewport bounds
 * 
 * Uses bounding box intersection test to determine if any part
 * of the rectangle overlaps with the visible viewport area.
 * 
 * @param rect - Rectangle to test
 * @param viewport - Current viewport boundaries
 * @returns true if rectangle is at least partially visible
 */
export const isRectangleVisible = (
  rect: Rectangle,
  viewport: ViewportBounds
): boolean => {
  return !(
    rect.x >= viewport.x + viewport.width ||
    rect.x + rect.w <= viewport.x ||
    rect.y >= viewport.y + viewport.height ||
    rect.y + rect.h <= viewport.y
  );
};

/**
 * Filter rectangles to only those visible in viewport
 * 
 * Viewport culling optimization for large diagrams.
 * Only returns rectangles that intersect with the visible area.
 * 
 * @param rectangles - All rectangles to filter
 * @param viewport - Current viewport boundaries
 * @returns Array of visible rectangles
 */
export const getVisibleRectangles = (
  rectangles: Rectangle[],
  viewport: ViewportBounds
): Rectangle[] => {
  return rectangles.filter(rect => isRectangleVisible(rect, viewport));
};

/**
 * Calculate geometric center of a rectangle
 * 
 * @param rect - Rectangle to find center of
 * @returns Center point coordinates
 */
export const getRectangleCenter = (rect: Rectangle): { x: number; y: number } => {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2
  };
};

/**
 * Calculate Euclidean distance between two points
 * 
 * @param point1 - First point coordinates
 * @param point2 - Second point coordinates
 * @returns Distance in grid units
 */
export const getDistance = (
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Find rectangle with center point closest to given coordinates
 * 
 * Uses center-to-center distance calculation. Useful for
 * smart selection and proximity-based interactions.
 * 
 * @param point - Reference point coordinates
 * @param rectangles - Rectangles to search
 * @returns Closest rectangle or null if array is empty
 */
export const findClosestRectangle = (
  point: { x: number; y: number },
  rectangles: Rectangle[]
): Rectangle | null => {
  if (rectangles.length === 0) return null;
  
  let closestRect = rectangles[0];
  let minDistance = getDistance(point, getRectangleCenter(closestRect));
  
  for (let i = 1; i < rectangles.length; i++) {
    const rect = rectangles[i];
    const distance = getDistance(point, getRectangleCenter(rect));
    
    if (distance < minDistance) {
      minDistance = distance;
      closestRect = rect;
    }
  }
  
  return closestRect;
};

/**
 * Snap coordinates to nearest grid intersection
 * 
 * Ensures positions align with grid boundaries for consistent
 * visual appearance and precise positioning.
 * 
 * @param x - X coordinate to snap
 * @param y - Y coordinate to snap  
 * @param gridSize - Grid unit size for snapping
 * @returns Grid-aligned coordinates
 */
export const snapToGrid = (
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } => {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
};

/**
 * Calculate minimal bounding box containing all rectangles
 * 
 * Computes the smallest rectangle that encompasses all provided
 * rectangles. Used for export bounds calculation and fit-to-view operations.
 * 
 * @param rectangles - Rectangles to bound
 * @returns Minimal bounding box coordinates and dimensions
 */
export const getAllRectanglesBounds = (
  rectangles: Rectangle[]
): { x: number; y: number; w: number; h: number } => {
  if (rectangles.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  
  let minX = rectangles[0].x;
  let minY = rectangles[0].y;
  let maxX = rectangles[0].x + rectangles[0].w;
  let maxY = rectangles[0].y + rectangles[0].h;
  
  for (const rect of rectangles) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
};

/**
 * Calculate zoom level to fit all content within viewport
 * 
 * Determines the maximum zoom level that displays all rectangles
 * within the container with specified padding. Used for "fit to view"
 * functionality.
 * 
 * @param rectangles - All rectangles to fit
 * @param containerRect - Container dimensions
 * @param padding - Minimum padding around content in pixels
 * @returns Optimal zoom level (capped at 2x)
 */
export const calculateFitZoom = (
  rectangles: Rectangle[],
  containerRect: DOMRect,
  padding: number = 50
): number => {
  if (rectangles.length === 0) return 1;
  
  const bounds = getAllRectanglesBounds(rectangles);
  const availableWidth = containerRect.width - padding * 2;
  const availableHeight = containerRect.height - padding * 2;
  
  const zoomX = availableWidth / (bounds.w * GRID_SIZE);
  const zoomY = availableHeight / (bounds.h * GRID_SIZE);
  
  return Math.min(zoomX, zoomY, 2); // Cap at 2x zoom
};