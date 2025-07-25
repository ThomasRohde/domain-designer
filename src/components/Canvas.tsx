import React, { RefObject } from 'react';
import { PanState, HierarchyDragState, ZoomState } from '../types';

interface CanvasProps {
  containerRef: RefObject<HTMLDivElement | null>;
  gridSize: number;
  panOffset: { x: number; y: number };
  isSpacePressed: boolean;
  panState: PanState | null;
  hierarchyDragState?: HierarchyDragState | null;
  zoomState: ZoomState;
  onMouseDown: (e: React.MouseEvent) => void;
  onSelect: (id: string | null) => void;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}

const Canvas: React.FC<CanvasProps> = ({
  containerRef,
  gridSize,
  panOffset,
  isSpacePressed,
  panState,
  hierarchyDragState,
  zoomState,
  onMouseDown,
  onSelect,
  children,
  overlay,
}) => {
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
            backgroundImage: isCanvasDropTarget 
              ? `radial-gradient(circle, #10b981 1px, transparent 1px)`
              : `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
            backgroundSize: `${gridSize * zoomState.level}px ${gridSize * zoomState.level}px`,
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
            willChange: panState ? 'background-position' : 'auto',
            overflow: 'hidden'
          }}
          onClick={() => onSelect(null)}
          onMouseDown={onMouseDown}
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
