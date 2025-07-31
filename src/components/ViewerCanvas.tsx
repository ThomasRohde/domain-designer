import React, { RefObject } from 'react';
import { PanState, ZoomState } from '../types';

interface ViewerCanvasProps {
  /** Reference to container element for pan/zoom calculations */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Current pan offset coordinates */
  panOffset: { x: number; y: number };
  /** Active pan operation state */
  panState: PanState | null;
  /** Current zoom level and center point */
  zoomState: ZoomState;
  /** Mouse interaction handler for pan operations */
  onMouseDown: (e: React.MouseEvent) => void;
  /** Rectangle content to render within the canvas */
  children: React.ReactNode;
}

/**
 * Read-only canvas component for diagram viewing with pan and zoom capabilities.
 * Simplified version of main Canvas without editing features or drop targets.
 * Features consistent cursor styling and performance-optimized transforms.
 */
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
      {/* Global cursor styling for consistent grab/grabbing states across all child elements */}
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
            // Performance hint for smooth panning
            willChange: panState ? 'transform' : 'auto',
            overflow: 'hidden'
          }}
          onMouseDown={onMouseDown}
        >
          {/* Transformed content container with optimized cursor inheritance */}
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
        
        {/* Floating zoom level display - only visible when zoomed */}
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