import React, { useMemo, useCallback } from 'react';
import { Rectangle, PanOffset, ZoomState } from '../types';
import { Eye, EyeOff } from 'lucide-react';

interface MinimapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface MinimapProps {
  /** All rectangles to display in the minimap */
  rectangles: Rectangle[];
  /** Currently selected rectangle IDs */
  selectedIds: string[];
  /** Current canvas pan offset */
  panOffset: PanOffset;
  /** Current zoom state */
  zoomState: ZoomState;
  /** Grid size for coordinate calculations */
  gridSize: number;
  /** Container dimensions for viewport calculation */
  containerWidth: number;
  containerHeight: number;
  /** Whether minimap is visible */
  visible: boolean;
  /** Callback to toggle minimap visibility */
  onToggleVisibility: () => void;
  /** Callback to jump to a specific position */
  onJumpToPosition: (x: number, y: number, containerWidth?: number, containerHeight?: number) => void;
  /** Callback to start pan operation from minimap */
  onStartPan?: (startX: number, startY: number) => void;
}

/**
 * Navigation minimap component for infinite canvas navigation.
 * Provides spatial awareness, click-to-navigate, and viewport visualization
 * following best practices from Figma, Miro, and other infinite canvas tools.
 */
const Minimap: React.FC<MinimapProps> = ({
  rectangles,
  selectedIds,
  panOffset,
  zoomState,
  gridSize,
  containerWidth,
  containerHeight,
  visible,
  onToggleVisibility,
  onJumpToPosition,
  onStartPan
}) => {
  // Minimap dimensions (fixed size for consistent UX)
  const MINIMAP_WIDTH = 200;
  const MINIMAP_HEIGHT = 150;
  const MINIMAP_PADDING = 10;

  /**
   * Create a stable dependency string for rectangle positions and dimensions
   * This ensures useMemo recalculates when rectangle properties change, not just the array reference
   */
  const rectangleBoundsKey = useMemo(() => {
    return rectangles
      .map(rect => `${rect.id}:${rect.x},${rect.y},${rect.w},${rect.h}`)
      .sort() // Sort to handle array reordering
      .join('|');
  }, [rectangles]);

  /**
   * Calculate the bounding box that encompasses all rectangles
   */
  const minimapBounds = useMemo((): MinimapBounds => {
    if (rectangles.length === 0) {
      // Default bounds when no rectangles exist
      return {
        minX: -50,
        minY: -50,
        maxX: 50,
        maxY: 50,
        width: 100,
        height: 100
      };
    }

    // Find the bounding box of all rectangles (in grid coordinates)
    const bounds = rectangles.reduce(
      (acc, rect) => ({
        minX: Math.min(acc.minX, rect.x),
        minY: Math.min(acc.minY, rect.y),
        maxX: Math.max(acc.maxX, rect.x + rect.w),
        maxY: Math.max(acc.maxY, rect.y + rect.h)
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    // Add padding around the content
    const padding = 5; // grid units
    const minX = bounds.minX - padding;
    const minY = bounds.minY - padding;
    const maxX = bounds.maxX + padding;
    const maxY = bounds.maxY + padding;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
    // Use rectangleBoundsKey for deep dependency tracking of rectangle positions/dimensions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rectangleBoundsKey]);

  /**
   * Convert grid coordinates to minimap pixel coordinates
   */
  const gridToMinimap = useCallback((gridX: number, gridY: number) => {
    const scaleX = (MINIMAP_WIDTH - 2 * MINIMAP_PADDING) / minimapBounds.width;
    const scaleY = (MINIMAP_HEIGHT - 2 * MINIMAP_PADDING) / minimapBounds.height;
    
    return {
      x: (gridX - minimapBounds.minX) * scaleX + MINIMAP_PADDING,
      y: (gridY - minimapBounds.minY) * scaleY + MINIMAP_PADDING
    };
  }, [minimapBounds]);

  /**
   * Convert minimap pixel coordinates to grid coordinates
   */
  const minimapToGrid = useCallback((minimapX: number, minimapY: number) => {
    const scaleX = minimapBounds.width / (MINIMAP_WIDTH - 2 * MINIMAP_PADDING);
    const scaleY = minimapBounds.height / (MINIMAP_HEIGHT - 2 * MINIMAP_PADDING);
    
    return {
      x: (minimapX - MINIMAP_PADDING) * scaleX + minimapBounds.minX,
      y: (minimapY - MINIMAP_PADDING) * scaleY + minimapBounds.minY
    };
  }, [minimapBounds]);

  /**
   * Calculate current viewport bounds in grid coordinates
   */
  const viewportBounds = useMemo(() => {
    // Convert screen space to grid space
    const topLeft = {
      x: (-panOffset.x) / (gridSize * zoomState.level),
      y: (-panOffset.y) / (gridSize * zoomState.level)
    };
    
    const bottomRight = {
      x: (containerWidth - panOffset.x) / (gridSize * zoomState.level),
      y: (containerHeight - panOffset.y) / (gridSize * zoomState.level)
    };

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }, [panOffset, zoomState.level, gridSize, containerWidth, containerHeight]);

  /**
   * Handle click on minimap to navigate
   */
  const handleMinimapClick = useCallback((e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minimapX = e.clientX - rect.left;
    const minimapY = e.clientY - rect.top;
    
    const gridPos = minimapToGrid(minimapX, minimapY);
    // Pass actual container dimensions for accurate navigation
    onJumpToPosition(gridPos.x * gridSize, gridPos.y * gridSize, containerWidth, containerHeight);
  }, [minimapToGrid, gridSize, onJumpToPosition, containerWidth, containerHeight]);

  /**
   * Handle drag start on viewport indicator
   */
  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStartPan) {
      const rect = e.currentTarget.getBoundingClientRect();
      const minimapX = e.clientX - rect.left;
      const minimapY = e.clientY - rect.top;
      onStartPan(minimapX, minimapY);
    }
  }, [onStartPan]);

  if (!visible) {
    return (
      <div className="absolute bottom-4 left-4 z-20">
        <button
          onClick={onToggleVisibility}
          className="bg-white bg-opacity-90 hover:bg-opacity-100 border border-gray-300 rounded-lg p-2 shadow-lg transition-all duration-200"
          title="Show Navigation Map"
        >
          <Eye className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-20">
      <div className="bg-white bg-opacity-95 border border-gray-300 rounded-lg shadow-lg">
        {/* Minimap Header */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600">Navigation</span>
          <button
            onClick={onToggleVisibility}
            className="p-1 hover:bg-gray-100 rounded transition-colors duration-150"
            title="Hide Navigation Map"
          >
            <EyeOff className="w-3 h-3 text-gray-500" />
          </button>
        </div>

        {/* Minimap Content */}
        <div className="relative">
          <svg
            width={MINIMAP_WIDTH}
            height={MINIMAP_HEIGHT}
            className="cursor-pointer"
            onClick={handleMinimapClick}
          >
            <rect
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              fill="#f9fafb"
              stroke="#e5e7eb"
              strokeWidth={1}
            />

            {/* Subtle grid pattern for visual context */}
            <defs>
              <pattern
                id="minimap-grid"
                width={20}
                height={20}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth={0.5}
                />
              </pattern>
            </defs>
            <rect
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              fill="url(#minimap-grid)"
            />

            {/* Rectangles */}
            {rectangles.map(rect => {
              const pos = gridToMinimap(rect.x, rect.y);
              const size = {
                width: Math.max(2, (rect.w / minimapBounds.width) * (MINIMAP_WIDTH - 2 * MINIMAP_PADDING)),
                height: Math.max(2, (rect.h / minimapBounds.height) * (MINIMAP_HEIGHT - 2 * MINIMAP_PADDING))
              };

              const isSelected = selectedIds.includes(rect.id);
              const isRoot = !rect.parentId;

              return (
                <rect
                  key={rect.id}
                  x={pos.x}
                  y={pos.y}
                  width={size.width}
                  height={size.height}
                  fill={isSelected ? '#3b82f6' : rect.color}
                  stroke={isSelected ? '#1d4ed8' : isRoot ? '#374151' : '#9CA3AF'}
                  strokeWidth={isSelected ? 1.5 : isRoot ? 1 : 0.5}
                  opacity={0.8}
                  className="transition-all duration-150"
                />
              );
            })}

            {/* Viewport Indicator with accurate positioning */}
            {(() => {
              const viewportTopLeft = gridToMinimap(viewportBounds.x, viewportBounds.y);
              const viewportBottomRight = gridToMinimap(
                viewportBounds.x + viewportBounds.width,
                viewportBounds.y + viewportBounds.height
              );
              
              const viewportWidth = Math.max(10, viewportBottomRight.x - viewportTopLeft.x);
              const viewportHeight = Math.max(10, viewportBottomRight.y - viewportTopLeft.y);

              return (
                <g>
                  <defs>
                    <clipPath id="minimap-viewport-bounds">
                      <rect x="0" y="0" width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} />
                    </clipPath>
                  </defs>
                  <rect
                    // Show actual viewport position without artificial constraints
                    x={viewportTopLeft.x}
                    y={viewportTopLeft.y}
                    width={viewportWidth}
                    height={viewportHeight}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4,2"
                    clipPath="url(#minimap-viewport-bounds)"
                    className="cursor-move transition-all duration-300 ease-out"
                    onMouseDown={handleViewportMouseDown}
                  />
                </g>
              );
            })()}
          </svg>

          {/* Zoom level indicator */}
          <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
            {Math.round(zoomState.level * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Minimap);