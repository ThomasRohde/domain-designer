import React, { RefObject, useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import SelectionBox from './SelectionBox';
import Minimap from './Minimap';

interface CanvasProps {
  /** Reference to the canvas container element for drag/pan operations */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Rectangle components to render within the canvas */
  children: React.ReactNode;
  /** Action buttons or overlays positioned within the zoomed content area */
  overlay?: React.ReactNode;
}

/**
 * Main drawing canvas component managing the infinite drawing surface.
 * 
 * Core Responsibilities:
 * - Viewport management: Pan/zoom transformations with precision transform origins
 * - Dynamic grid rendering: Background grid that scales and translates with viewport
 * - Navigation minimap: Integrated spatial navigation with click-to-jump functionality
 * - Hierarchy operations: Visual feedback for drag-and-drop reparenting to root level
 * - Performance optimization: Strategic willChange hints during active interactions
 * - Event coordination: Canvas-level mouse handling for deselection and pan initiation
 * 
 * Coordinate Systems:
 * - Screen space: Browser viewport coordinates (mouse events, container bounds)
 * - Canvas space: Transformed coordinates accounting for pan offset and zoom level
 * - Grid space: Logical rectangle positions (rect.x, rect.y in grid units)
 */
const Canvas: React.FC<CanvasProps> = ({
  containerRef,
  children,
  overlay,
}) => {
  // Dynamic container dimensions tracking for accurate minimap viewport calculation
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });

  // Canvas visual settings and interaction state
  const gridSize = useAppStore(state => state.settings.gridSize);
  const showGrid = useAppStore(state => state.settings.showGrid);
  const panOffset = useAppStore(state => state.canvas.panOffset);
  const isSpacePressed = useAppStore(state => state.canvas.isSpacePressed);
  const panState = useAppStore(state => state.canvas.panState);
  const hierarchyDragState = useAppStore(state => state.canvas.hierarchyDragState);
  const zoomState = useAppStore(state => state.canvas.zoomState);
  
  // Multi-select and selection box state
  const selectionBoxState = useAppStore(state => state.ui.selectionBoxState);
  
  // Minimap state and data
  const minimapVisible = useAppStore(state => state.canvas.minimapVisible);
  const rectangles = useAppStore(state => state.rectangles);
  const selectedIds = useAppStore(state => state.ui.selectedIds);
  
  // Canvas interaction handlers
  const handleCanvasMouseDown = useAppStore(state => state.canvasActions.handleCanvasMouseDown);
  const clearSelection = useAppStore(state => state.rectangleActions.clearSelection);
  
  // Minimap actions
  const toggleMinimap = useAppStore(state => state.canvasActions.toggleMinimap);
  const jumpToPosition = useAppStore(state => state.canvasActions.jumpToPosition);

  // Track container dimensions for accurate minimap viewport representation
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ 
          width: rect.width, 
          height: rect.height 
        });
      }
    };

    // Initial measurement and responsive updates
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);
  
  // Drop target detection - canvas background can accept drops to create root rectangles
  const isCanvasDropTarget = hierarchyDragState && 
    hierarchyDragState.potentialTargets.some(target => target.targetId === null);
  const isCanvasCurrentDropTarget = hierarchyDragState?.currentDropTarget?.targetId === null;
  return (
    <div className="flex-1 p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full w-full canvas-container relative">
        {/* Main canvas with dynamic styling for interactions and drag operations */}
        <div
          ref={containerRef}
          className={`relative w-full h-full transition-all duration-200 select-none ${
            isSpacePressed ? 'cursor-grab' : ''
          } ${panState ? 'cursor-grabbing' : ''} ${
            isCanvasCurrentDropTarget 
              ? 'bg-green-100 border-2 border-green-400 border-dashed' 
              : isCanvasDropTarget 
                ? 'bg-green-50 border-2 border-green-300 border-dashed' 
                : 'bg-gray-50'
          }`}
          style={{ 
            // Dynamic grid background that scales with zoom and moves with pan offset
            backgroundImage: showGrid ? (
              isCanvasDropTarget 
                ? `radial-gradient(circle, #10b981 1px, transparent 1px)`
                : `radial-gradient(circle, #d1d5db 1px, transparent 1px)`
            ) : 'none',
            backgroundSize: showGrid ? `${gridSize * zoomState.level}px ${gridSize * zoomState.level}px` : 'auto',
            backgroundPosition: showGrid ? `${panOffset.x}px ${panOffset.y}px` : 'auto',
            // Performance optimization: hint browser to optimize background-position changes during panning
            willChange: panState ? 'background-position' : 'auto',
            overflow: 'hidden'
          }}
          onClick={() => clearSelection()}
          onMouseDown={(e) => handleCanvasMouseDown(e, containerRef)}
        >
          {/* Content layer with synchronized pan/zoom transformations */}
          <div
            className="w-full h-full relative"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomState.level})`,
              transformOrigin: '0 0',
              transition: 'transform 0.1s ease-out'
            }}
          >
            {children}
            {/* Action buttons and overlays positioned in transformed coordinate space */}
            {overlay}
          </div>
          
          {/* Selection box for drag selection - positioned outside transformed container */}
          {selectionBoxState && selectionBoxState.isActive && (
            <SelectionBox
              startX={selectionBoxState.startX}
              startY={selectionBoxState.startY}
              currentX={selectionBoxState.currentX}
              currentY={selectionBoxState.currentY}
              zoom={zoomState.level}
              panOffset={panOffset}
            />
          )}
          
          {/* Active drop zone visual feedback for hierarchy rearrangement */}
          {isCanvasCurrentDropTarget && (
            <div className="absolute inset-4 border-4 border-green-400 border-dashed rounded-lg bg-green-100 bg-opacity-50 flex items-center justify-center pointer-events-none">
              <div className="text-green-800 font-bold text-lg">Drop here to make root</div>
            </div>
          )}
        </div>
        
        {/* Floating zoom level indicator - only visible when zoomed */}
        {zoomState.level !== 1.0 && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm pointer-events-none">
            Zoom: {Math.round(zoomState.level * 100)}%
          </div>
        )}

        {/* Navigation Minimap - provides spatial awareness and click-to-navigate functionality */}
        <Minimap
          rectangles={rectangles}
          selectedIds={selectedIds}
          panOffset={panOffset}
          zoomState={zoomState}
          gridSize={gridSize}
          containerWidth={containerDimensions.width}
          containerHeight={containerDimensions.height}
          visible={minimapVisible}
          onToggleVisibility={toggleMinimap}
          onJumpToPosition={jumpToPosition}
        />
      </div>
    </div>
  );
};

export default React.memo(Canvas);
