import React, { RefObject } from 'react';
import { PanState, HierarchyDragState } from '../types';

interface CanvasProps {
  containerRef: RefObject<HTMLDivElement>;
  gridSize: number;
  panOffset: { x: number; y: number };
  isSpacePressed: boolean;
  panState: PanState | null;
  hierarchyDragState?: HierarchyDragState | null;
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
          className={`relative w-full h-full transition-all duration-200 ${
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
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
            willChange: panState ? 'background-position' : 'auto'
          }}
          onClick={() => onSelect(null)}
          onMouseDown={onMouseDown}
        >
          {children}
          
          {/* Canvas drop zone indicator */}
          {isCanvasCurrentDropTarget && (
            <div className="absolute inset-4 border-4 border-green-400 border-dashed rounded-lg bg-green-100 bg-opacity-50 flex items-center justify-center pointer-events-none">
              <div className="text-green-800 font-bold text-lg">Drop here to make root</div>
            </div>
          )}
        </div>
        
        {/* Action buttons overlay rendered outside the canvas but within the same container */}
        {overlay}
      </div>
    </div>
  );
};

export default React.memo(Canvas);
