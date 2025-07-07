import { Rectangle } from '../types';
import { GRID_SIZE, MARGIN } from './constants';

/**
 * Pan offset interface
 */
export interface PanOffset {
  x: number;
  y: number;
}

/**
 * Viewport bounds interface
 */
export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert screen coordinates to grid coordinates
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
 * Convert grid coordinates to screen coordinates
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
 * Get viewport bounds in grid coordinates
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
 * Calculate optimal position for a new rectangle to avoid overlaps
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
 * Check if a rectangle is visible in the viewport
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
 * Get rectangles that are visible in the current viewport
 */
export const getVisibleRectangles = (
  rectangles: Rectangle[],
  viewport: ViewportBounds
): Rectangle[] => {
  return rectangles.filter(rect => isRectangleVisible(rect, viewport));
};

/**
 * Calculate the center point of a rectangle
 */
export const getRectangleCenter = (rect: Rectangle): { x: number; y: number } => {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2
  };
};

/**
 * Calculate distance between two points
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
 * Find the closest rectangle to a given point
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
 * Snap a position to the grid
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
 * Get the bounds of all rectangles
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
 * Calculate optimal zoom level to fit all rectangles in viewport
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