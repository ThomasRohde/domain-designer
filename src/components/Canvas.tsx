import React, { RefObject } from 'react';
import { useAppStore } from '../stores/useAppStore';

interface CanvasProps {
  containerRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}

const Canvas: React.FC<CanvasProps> = ({
  containerRef,
  children,
  overlay,
}) => {
  // Get canvas state from store
  const gridSize = useAppStore(state => state.settings.gridSize);
  const showGrid = useAppStore(state => state.settings.showGrid);
  const panOffset = useAppStore(state => state.canvas.panOffset);
  const isSpacePressed = useAppStore(state => state.canvas.isSpacePressed);
  const panState = useAppStore(state => state.canvas.panState);
  const hierarchyDragState = useAppStore(state => state.canvas.hierarchyDragState);
  const zoomState = useAppStore(state => state.canvas.zoomState);
  
  // Get actions from store
  const handleCanvasMouseDown = useAppStore(state => state.canvasActions.handleCanvasMouseDown);
  const setSelectedId = useAppStore(state => state.rectangleActions.setSelectedId);
  
  // Check if the canvas background is a potential drop target
  const isCanvasDropTarget = hierarchyDragState && 
    hierarchyDragState.potentialTargets.some(target => target.targetId === null);
  const isCanvasCurrentDropTarget = hierarchyDragState?.currentDropTarget?.targetId === null;
  return (
    <div className="flex-1 p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full w-full canvas-container relative">
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
            backgroundImage: showGrid ? (
              isCanvasDropTarget 
                ? `radial-gradient(circle, #10b981 1px, transparent 1px)`
                : `radial-gradient(circle, #d1d5db 1px, transparent 1px)`
            ) : 'none',
            backgroundSize: showGrid ? `${gridSize * zoomState.level}px ${gridSize * zoomState.level}px` : 'auto',
            backgroundPosition: showGrid ? `${panOffset.x}px ${panOffset.y}px` : 'auto',
            willChange: panState ? 'background-position' : 'auto',
            overflow: 'hidden'
          }}
          onClick={() => setSelectedId(null)}
          onMouseDown={(e) => handleCanvasMouseDown(e, containerRef)}
        >
          <div
            className="w-full h-full relative"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomState.level})`,
              transformOrigin: `${zoomState.centerX}px ${zoomState.centerY}px`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            {children}
            {/* Action buttons overlay moved inside zoomed content */}
            {overlay}
          </div>
          
          {/* Canvas drop zone indicator */}
          {isCanvasCurrentDropTarget && (
            <div className="absolute inset-4 border-4 border-green-400 border-dashed rounded-lg bg-green-100 bg-opacity-50 flex items-center justify-center pointer-events-none">
              <div className="text-green-800 font-bold text-lg">Drop here to make root</div>
            </div>
          )}
        </div>
        
        {/* Zoom indicator */}
        {zoomState.level !== 1.0 && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm pointer-events-none">
            Zoom: {Math.round(zoomState.level * 100)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Canvas);
