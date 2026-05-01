import type { PanOffset, Rectangle } from '../types';

export interface RectangleBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface FitViewOptions {
  containerWidth: number;
  containerHeight: number;
  gridSize: number;
  paddingPx?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface FitViewResult {
  bounds: RectangleBounds;
  zoomLevel: number;
  panOffset: PanOffset;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const calculateRectanglesBounds = (rectangles: Rectangle[]): RectangleBounds | null => {
  if (rectangles.length === 0) return null;

  const bounds = rectangles.reduce(
    (acc, rect) => ({
      minX: Math.min(acc.minX, rect.x),
      minY: Math.min(acc.minY, rect.y),
      maxX: Math.max(acc.maxX, rect.x + rect.w),
      maxY: Math.max(acc.maxY, rect.y + rect.h),
    }),
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
  );

  return {
    ...bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
};

export const calculateFitView = (
  rectangles: Rectangle[],
  options: FitViewOptions
): FitViewResult | null => {
  const bounds = calculateRectanglesBounds(rectangles);
  if (!bounds) return null;

  const {
    containerWidth,
    containerHeight,
    gridSize,
    paddingPx = 48,
    minZoom = 0.1,
    maxZoom = 3,
  } = options;

  const contentWidthPx = Math.max(bounds.width * gridSize, 1);
  const contentHeightPx = Math.max(bounds.height * gridSize, 1);
  const availableWidth = Math.max(containerWidth - paddingPx * 2, 1);
  const availableHeight = Math.max(containerHeight - paddingPx * 2, 1);
  const zoomLevel = clamp(
    Math.min(availableWidth / contentWidthPx, availableHeight / contentHeightPx),
    minZoom,
    maxZoom
  );

  const contentCenterX = (bounds.minX + bounds.width / 2) * gridSize;
  const contentCenterY = (bounds.minY + bounds.height / 2) * gridSize;

  return {
    bounds,
    zoomLevel,
    panOffset: {
      x: containerWidth / 2 - contentCenterX * zoomLevel,
      y: containerHeight / 2 - contentCenterY * zoomLevel,
    },
  };
};
