import React, { useCallback, useEffect } from 'react';
import { useDragAndResize } from './useDragAndResize';
import { useCanvasPanning } from './useCanvasPanning';
import { Rectangle, CanvasInteractionsHook } from '../types';

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
  reparentRectangle,
  canReparent,
  saveToHistory
}: UseCanvasInteractionsProps): CanvasInteractionsHook => {
  
  // Initialize the drag and resize hook
  const {
    dragState,
    resizeState,
    hierarchyDragState,
    handleMouseDown: handleDragResizeMouseDown,
    handleMouseUp: handleDragResizeMouseUp,
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
    reparentRectangle,
    canReparent,
    saveToHistory
  });

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
    
    // Interaction states
    dragState,
    resizeState,
    panState,
    hierarchyDragState,
    isDragging,
    isResizing,
    isPanning: panState !== null,
    isHierarchyDragging,
    
    // Event handlers
    handleCanvasMouseDown,
    handleRectangleMouseDown,
  };
};
