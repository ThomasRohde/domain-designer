import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ZoomState, PanState } from '../types';

/**
 * Props for useViewerInteractions hook
 */
interface UseViewerInteractionsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Return interface for useViewerInteractions hook
 * Provides viewer-specific interaction patterns (read-only canvas navigation)
 */
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
  
  /**
   * Viewer-specific panning state management
   * Optimized for read-only canvas navigation
   */
  const [panState, setPanState] = useState<PanState | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * Viewer mouse down handler: enables immediate left-click panning
   * Unlike editor mode, no special key combinations required
   */
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Immediate panning activation on primary mouse button
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

  /**
   * Processes panning movement with performance optimizations
   * Uses requestAnimationFrame batching for smooth navigation
   */
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
    
    // Immediate ref update for synchronous component access
    panOffsetRef.current = newOffset;
    
    // Batch state updates for performance optimization
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

  /**
   * Completes panning operation with proper cleanup
   */
  const handleMouseUp = useCallback(() => {
    // Cancel pending updates to prevent stale state
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Synchronize final state between ref and React state
    setPanOffset(panOffsetRef.current);
    setPanState(null);
    pendingUpdateRef.current = null;
  }, []);

  /**
   * Initialize zoom state with viewer-appropriate defaults
   * Configured for read-only navigation experience
   */
  const [zoomState, setZoomState] = useState<ZoomState>({
    level: 1.0,
    centerX: 0,
    centerY: 0,
    minLevel: 0.1,
    maxLevel: 5.0,
  });

  /**
   * Maintains consistency between React state and ref
   * Ensures immediate access for performance-critical operations
   */
  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  /**
   * Cleanup: prevents memory leaks from pending animation frames
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  /**
   * Wheel event handler for zoom operations
   * Uses stable callback to prevent closure issues
   */
  const handleWheelEvent = useCallback((e: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Boundary check: only zoom when cursor is over canvas
    const containerRect = container.getBoundingClientRect();
    const isOverContainer = e.clientX >= containerRect.left && 
                           e.clientX <= containerRect.right && 
                           e.clientY >= containerRect.top && 
                           e.clientY <= containerRect.bottom;
    
    if (!isOverContainer) return;

    // Override browser scroll to enable custom zoom behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Transform mouse coordinates to container space
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Convert wheel delta to zoom increment/decrement
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

  /**
   * Document-level wheel listener for reliable zoom handling
   * Bypasses potential event blocking from child elements
   */
  useEffect(() => {
    // Document listener ensures wheel events are never blocked
    document.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', handleWheelEvent);
    };
  }, [handleWheelEvent]);

  /**
   * Coordinates mouse movement handling during panning
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Process panning movement when active
    if (panState) {
      handlePanMove(e, containerRect);
    }
  }, [panState, containerRef, handlePanMove]);

  /**
   * Coordinates mouse up event handling
   */
  const handleMouseUpGlobal = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  /**
   * Manages global mouse event listeners during panning operations
   */
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
    isSpacePressed: false, // Viewer mode: no space key visual feedback needed
    zoomState,
    handleCanvasMouseDown,
  };
};