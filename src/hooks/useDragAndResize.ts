import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Rectangle, DragState, ResizeState } from '../types';
import { MIN_WIDTH, MIN_HEIGHT } from '../utils/constants';
import { updateChildrenLayout, getAllDescendants } from '../utils/layoutUtils';

interface UseDragAndResizeProps {
  rectangles: Rectangle[];
  setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  setRectanglesWithHistory: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  gridSize: number;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  getFixedDimensions: () => { leafFixedWidth: boolean; leafFixedHeight: boolean; leafWidth: number; leafHeight: number };
}

interface UseDragAndResizeReturn {
  dragState: DragState | null;
  resizeState: ResizeState | null;
  handleMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize') => void;
  handleMouseUp: () => void;
  isDragging: boolean;
  isResizing: boolean;
}

export const useDragAndResize = ({
  rectangles,
  setRectangles,
  setRectanglesWithHistory,
  gridSize,
  leafFixedWidth,
  leafFixedHeight,
  leafWidth,
  leafHeight,
  containerRef,
  getFixedDimensions
}: UseDragAndResizeProps): UseDragAndResizeReturn => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  // Handle mouse down for dragging and resizing
  const handleMouseDown = useCallback((e: React.MouseEvent, rect: Rectangle, action: 'drag' | 'resize' = 'drag') => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent dragging child rectangles
    if (rect.parentId && action === 'drag') {
      return;
    }

    // Save current state to history before starting drag/resize operation
    setRectanglesWithHistory(prev => prev);

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const startX = e.clientX - containerRect.left;
    const startY = e.clientY - containerRect.top;

    if (action === 'drag') {
      setDragState({
        id: rect.id,
        startX,
        startY,
        initialX: rect.x, // Store as grid coordinates
        initialY: rect.y  // Store as grid coordinates
      });
    } else if (action === 'resize') {
      setResizeState({
        id: rect.id,
        startX,
        startY,
        initialW: rect.w,
        initialH: rect.h
      });
    }
  }, [containerRef, setRectanglesWithHistory]);

  // Handle drag movement
  const handleDragMove = useCallback((e: MouseEvent, containerRect: DOMRect) => {
    if (!dragState) return;

    const currentX = e.clientX - containerRect.left;
    const currentY = e.clientY - containerRect.top;

    const deltaX = currentX - dragState.startX;
    const deltaY = currentY - dragState.startY;
    
    // Convert screen delta to grid delta and add to initial grid position
    const gridDeltaX = deltaX / gridSize;
    const gridDeltaY = deltaY / gridSize;
    const newX = Math.max(0, Math.round(dragState.initialX + gridDeltaX));
    const newY = Math.max(0, Math.round(dragState.initialY + gridDeltaY));

    // Calculate the actual movement delta from the dragged rectangle's current position
    const draggedRect = rectangles.find(r => r.id === dragState.id);
    if (!draggedRect) return;
    
    const actualDeltaX = newX - draggedRect.x;
    const actualDeltaY = newY - draggedRect.y;
    
    // Get all descendants of the dragged rectangle
    const descendantIds = new Set(getAllDescendants(dragState.id, rectangles));

    setRectangles(prev => prev.map(rect => {
      if (rect.id === dragState.id) {
        // Update the dragged rectangle
        return { ...rect, x: newX, y: newY };
      } else if (descendantIds.has(rect.id)) {
        // Update all descendants with the same delta
        return { 
          ...rect, 
          x: Math.max(0, rect.x + actualDeltaX), 
          y: Math.max(0, rect.y + actualDeltaY) 
        };
      }
      return rect;
    }));
  }, [dragState, gridSize, setRectangles, rectangles]);

  // Handle resize movement
  const handleResizeMove = useCallback((e: MouseEvent, containerRect: DOMRect) => {
    if (!resizeState) return;

    const currentX = e.clientX - containerRect.left;
    const currentY = e.clientY - containerRect.top;

    const deltaX = currentX - resizeState.startX;
    const deltaY = currentY - resizeState.startY;
    
    // Find the rectangle being resized
    const rect = rectangles.find(r => r.id === resizeState.id);
    if (!rect) return;
    
    let newW = Math.max(MIN_WIDTH, Math.round(resizeState.initialW + deltaX / gridSize));
    let newH = Math.max(MIN_HEIGHT, Math.round(resizeState.initialH + deltaY / gridSize));
    
    // Apply fixed dimension constraints for leaf nodes
    if (rect.type === 'leaf') {
      if (leafFixedWidth) {
        newW = leafWidth;
      }
      if (leafFixedHeight) {
        newH = leafHeight;
      }
    }

    setRectangles(prev => prev.map(r => 
      r.id === resizeState.id ? { ...r, w: newW, h: newH } : r
    ));
  }, [resizeState, rectangles, gridSize, leafFixedWidth, leafFixedHeight, leafWidth, leafHeight, setRectangles]);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState && !resizeState) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    if (dragState) {
      handleDragMove(e, containerRect);
    } else if (resizeState) {
      handleResizeMove(e, containerRect);
    }
  }, [dragState, resizeState, handleDragMove, handleResizeMove, containerRef]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    const wasResizing = resizeState;
    
    setDragState(null);
    setResizeState(null);
    
    if (wasResizing) {
      // Only update children layout after resize operations
      // Drag operations now handle children positioning in real-time
      const rectId = wasResizing.id;
      if (rectId) {
        const rect = rectangles.find(r => r.id === rectId);
        if (rect) {
          const hasDescendants = getAllDescendants(rect.id, rectangles).length > 0;
          if (hasDescendants) {
            // Update children layout after resize operation
            setTimeout(() => {
              setRectangles(prev => updateChildrenLayout(prev, getFixedDimensions()));
            }, 10);
          }
        }
      }
    }
  }, [resizeState, rectangles, setRectangles, getFixedDimensions]);

  // Store the mouse move handler in a ref to ensure proper cleanup
  React.useEffect(() => {
    mouseMoveHandlerRef.current = handleMouseMove;
  }, [handleMouseMove]);

  // Add and remove global mouse event listeners
  useEffect(() => {
    if (dragState || resizeState) {
      const currentHandler = mouseMoveHandlerRef.current;
      if (currentHandler) {
        document.addEventListener('mousemove', currentHandler);
        document.addEventListener('mouseup', handleMouseUp);
        
        return () => {
          document.removeEventListener('mousemove', currentHandler);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }
  }, [dragState, resizeState, handleMouseUp]);

  return {
    dragState,
    resizeState,
    handleMouseDown,
    handleMouseUp,
    isDragging: dragState !== null,
    isResizing: resizeState !== null
  };
};
