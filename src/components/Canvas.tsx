import React, { RefObject } from 'react';
import { PanState } from '../types';

interface CanvasProps {
  containerRef: RefObject<HTMLDivElement>;
  gridSize: number;
  panOffset: { x: number; y: number };
  isSpacePressed: boolean;
  panState: PanState | null;
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
  onMouseDown,
  onSelect,
  children,
  overlay,
}) => {
  return (
    <div className="flex-1 p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full w-full canvas-container relative">
        <div
          ref={containerRef}
          className={`relative bg-gray-50 w-full h-full ${isSpacePressed ? 'cursor-grab' : ''} ${panState ? 'cursor-grabbing' : ''}`}
          style={{ 
            backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
          }}
          onClick={() => onSelect(null)}
          onMouseDown={onMouseDown}
        >
          {children}
        </div>
        
        {/* Action buttons overlay rendered outside the canvas but within the same container */}
        {overlay}
      </div>
    </div>
  );
};

export default Canvas;
