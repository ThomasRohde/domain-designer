import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ZoomState, PanState } from '../types';

interface UseViewerInteractionsProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

interface UseViewerInteractionsReturn {
  panState: PanState | null;
  panOffset: { x: number; y: number };
  isSpacePressed: boolean;
  zoomState: ZoomState;
  handleCanvasMouseDown: (e: React.MouseEvent) => void;
}

export const useViewerInteractions = ({
  containerRef,
}: UseViewerInteractionsProps): UseViewerInteractionsReturn => {
  
  // Custom panning state for viewer
  const [panState, setPanState] = useState<PanState | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ x: number; y: number } | null>(null);

  // Custom mouse down handler for viewer - always allow left click panning
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Start panning on left click (button 0)
    if (e.button === 0) {
      e.preventDefault();
      e.stopPropagation();

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const startX = e.clientX - containerRect.left;
      const startY = e.clientY - containerRect.top;

      setPanState({
        startX,
        startY,
        initialOffsetX: panOffsetRef.current.x,
        initialOffsetY: panOffsetRef.current.y
      });
    }
  }, [containerRef]);

  // Handle pan move
  const handlePanMove = useCallback((e: MouseEvent, containerRect: DOMRect) => {
    if (!panState) return;

    const currentX = e.clientX - containerRect.left;
    const currentY = e.clientY - containerRect.top;

    const deltaX = currentX - panState.startX;
    const deltaY = currentY - panState.startY;
    
    const newOffset = {
      x: panState.initialOffsetX + deltaX,
      y: panState.initialOffsetY + deltaY
    };
    
    // Always update the ref for immediate access
    panOffsetRef.current = newOffset;
    
    // Schedule React state update using requestAnimationFrame
    pendingUpdateRef.current = newOffset;
    
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setPanOffset(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        animationFrameRef.current = null;
      });
    }
  }, [panState]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Ensure final state sync when dragging ends
    setPanOffset(panOffsetRef.current);
    setPanState(null);
    pendingUpdateRef.current = null;
  }, []);

  // Initialize zoom state
  const [zoomState, setZoomState] = useState<ZoomState>({
    level: 1.0,
    centerX: 0,
    centerY: 0,
    minLevel: 0.1,
    maxLevel: 5.0,
  });

  // Sync panOffset state with ref for immediate updates
  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Stable wheel event handler using useCallback to prevent stale closures
  const handleWheelEvent = useCallback((e: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Check if mouse is over the container bounds
    const containerRect = container.getBoundingClientRect();
    const isOverContainer = e.clientX >= containerRect.left && 
                           e.clientX <= containerRect.right && 
                           e.clientY >= containerRect.top && 
                           e.clientY <= containerRect.bottom;
    
    if (!isOverContainer) return;

    // Prevent default browser scroll behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate mouse position relative to container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Calculate zoom delta (positive for zoom in, negative for zoom out)
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    
    setZoomState(prev => {
      const newLevel = Math.max(prev.minLevel, Math.min(prev.maxLevel, prev.level + delta));
      
      return {
        ...prev,
        level: newLevel,
        centerX: mouseX,
        centerY: mouseY,
      };
    });
  }, [containerRef]);

  // Single document wheel event listener - more reliable than container listener
  useEffect(() => {
    // Use document listener to bypass any child element event blocking
    document.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', handleWheelEvent);
    };
  }, [handleWheelEvent]);

  // Coordinate mouse move events
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Handle panning movement
    if (panState) {
      handlePanMove(e, containerRect);
    }
  }, [panState, containerRef, handlePanMove]);

  // Coordinate mouse up events
  const handleMouseUpGlobal = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  // Set up global mouse event listeners
  useEffect(() => {
    if (panState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUpGlobal);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUpGlobal);
      };
    }
  }, [panState, handleMouseMove, handleMouseUpGlobal]);

  return {
    panState,
    panOffset,
    isSpacePressed: false, // Never show space cursor for viewer
    zoomState,
    handleCanvasMouseDown,
  };
};