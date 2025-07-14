import React, { RefObject } from 'react';
import { PanState, ZoomState } from '../types';

interface ViewerCanvasProps {
  containerRef: RefObject<HTMLDivElement | null>;
  panOffset: { x: number; y: number };
  panState: PanState | null;
  zoomState: ZoomState;
  onMouseDown: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

const ViewerCanvas: React.FC<ViewerCanvasProps> = ({
  containerRef,
  panOffset,
  panState,
  zoomState,
  onMouseDown,
  children,
}) => {
  return (
    <div className="flex-1 p-2 sm:p-4 overflow-hidden">
      <style>{`
        .viewer-grab, .viewer-grab > * {
          cursor: grab !important;
        }
        .viewer-grabbing, .viewer-grabbing > * {
          cursor: grabbing !important;
        }
      `}</style>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full w-full canvas-container relative">
        <div
          ref={containerRef}
          className={`relative w-full h-full select-none ${
            panState ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ 
            backgroundColor: '#f9fafb',
            willChange: panState ? 'transform' : 'auto',
            overflow: 'hidden'
          }}
          onMouseDown={onMouseDown}
        >
          <div
            className={`w-full h-full relative ${panState ? 'viewer-grabbing' : 'viewer-grab'}`}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomState.level})`,
              transformOrigin: `${zoomState.centerX}px ${zoomState.centerY}px`,
              willChange: panState ? 'transform' : 'auto'
            }}
          >
            {children}
          </div>
        </div>
        
        {/* Zoom indicator - only show when not 100% */}
        {zoomState.level !== 1.0 && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm pointer-events-none">
            Zoom: {Math.round(zoomState.level * 100)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewerCanvas;