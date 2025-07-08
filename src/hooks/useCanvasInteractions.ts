import React, { useCallback, useEffect, useState } from 'react';
import { useDragAndResize } from './useDragAndResize';
import { useCanvasPanning } from './useCanvasPanning';
import { Rectangle, CanvasInteractionsHook, ZoomState } from '../types';

interface UseCanvasInteractionsProps {
  rectangles: Rectangle[];
  setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  setRectanglesWithHistory: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  gridSize: number;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  getFixedDimensions: () => { leafFixedWidth: boolean; leafFixedHeight: boolean; leafWidth: number; leafHeight: number };
  getMargins: () => { margin: number; labelMargin: number };
  reparentRectangle: (childId: string, newParentId: string | null) => boolean;
  canReparent: (childId: string, newParentId: string | null) => boolean;
  saveToHistory: (rectangles: Rectangle[]) => void;
}


export const useCanvasInteractions = ({
  rectangles,
  setRectangles,
  setRectanglesWithHistory,
  setSelectedId,
  gridSize,
  leafFixedWidth,
  leafFixedHeight,
  leafWidth,
  leafHeight,
  containerRef,
  getFixedDimensions,
  getMargins,
  reparentRectangle,
  canReparent,
  saveToHistory
}: UseCanvasInteractionsProps): CanvasInteractionsHook => {
  
  // Initialize the canvas panning hook
  const {
    panState,
    panOffset,
    panOffsetRef,
    isSpacePressed,
    handleCanvasMouseDown: handlePanMouseDown,
    handlePanMove,
    handleMouseUp: handlePanMouseUp
  } = useCanvasPanning({ containerRef });

  // Initialize zoom state
  const [zoomState, setZoomState] = useState<ZoomState>({
    level: 1.0,
    centerX: 0,
    centerY: 0,
    minLevel: 0.1,
    maxLevel: 3.0
  });

  // Initialize the drag and resize hook
  const {
    dragState,
    resizeState,
    hierarchyDragState,
    resizeConstraintState,
    handleMouseDown: handleDragResizeMouseDown,
    handleMouseUp: handleDragResizeMouseUp,
    cancelDrag,
    isDragging,
    isResizing,
    isHierarchyDragging
  } = useDragAndResize({
    rectangles,
    setRectangles,
    setRectanglesWithHistory,
    gridSize,
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight,
    containerRef,
    getFixedDimensions,
    getMargins,
    reparentRectangle,
    canReparent,
    saveToHistory,
    panOffset,
    zoomLevel: zoomState.level
  });

  // Handle wheel events for zooming with native event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle zoom when Ctrl is pressed
      if (!e.ctrlKey) return;
      
      // Prevent default browser zoom behavior
      e.preventDefault();
      e.stopPropagation();
      
      const containerRect = container.getBoundingClientRect();
      
      // Calculate mouse position relative to container
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      // Calculate zoom delta (positive for zoom in, negative for zoom out)
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      
      setZoomState(prev => {
        const newLevel = Math.max(prev.minLevel, Math.min(prev.maxLevel, prev.level + delta));
        
        // Only update if zoom level actually changed
        if (newLevel === prev.level) return prev;
        
        return {
          ...prev,
          level: newLevel,
          centerX: mouseX,
          centerY: mouseY
        };
      });
    };

    // Add passive: false to ensure preventDefault works
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef]);

  // Coordinate mouse move events
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Handle panning movement
    if (panState) {
      handlePanMove(e, containerRect);
    }
    
    // Note: Drag and resize movements are handled internally by their hooks
    // through their own event listeners to avoid conflicts
  }, [panState, handlePanMove, containerRef]);

  // Coordinate mouse up events
  const handleMouseUp = useCallback(() => {
    // Handle panning mouse up
    handlePanMouseUp();
    
    // Handle drag/resize mouse up if there's an active drag or resize operation
    if (dragState || resizeState) {
      handleDragResizeMouseUp();
    }
  }, [handlePanMouseUp, dragState, resizeState, handleDragResizeMouseUp]);

  // Enhanced canvas mouse down handler that combines panning and selection
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // First, handle panning
    handlePanMouseDown(e);
    
    // Then, handle selection clearing for normal left clicks
    if (e.button === 0 && !isSpacePressed) {
      setSelectedId(null);
    }
  }, [handlePanMouseDown, isSpacePressed, setSelectedId]);

  // Rectangle mouse down handler that delegates to drag/resize
  const handleRectangleMouseDown = useCallback((e: React.MouseEvent, rect: Rectangle, action: 'drag' | 'resize' | 'hierarchy-drag' = 'drag') => {
    handleDragResizeMouseDown(e, rect, action);
  }, [handleDragResizeMouseDown]);

  // Add global mouse event listeners for coordinated interactions
  useEffect(() => {
    // Only add global listeners when panning is active
    // Drag/resize hooks handle their own global listeners
    if (panState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [panState, handleMouseMove, handleMouseUp]);

  return {
    // Canvas state
    panOffset,
    panOffsetRef,
    isSpacePressed,
    zoomState,
    
    // Interaction states
    dragState,
    resizeState,
    panState,
    hierarchyDragState,
    resizeConstraintState,
    isDragging,
    isResizing,
    isPanning: panState !== null,
    isHierarchyDragging,
    
    // Event handlers
    handleCanvasMouseDown,
    handleRectangleMouseDown,
    cancelDrag,
  };
};
