import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PanState } from '../types';
import { getMousePosition, shouldStartPan, preventEventDefault, isEventTargetEditable } from '../utils/eventUtils';
import { PanOffset } from '../utils/canvasUtils';

interface UseCanvasPanningProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface UseCanvasPanningReturn {
  panState: PanState | null;
  panOffset: PanOffset;
  panOffsetRef: React.MutableRefObject<PanOffset>;
  isSpacePressed: boolean;
  handleCanvasMouseDown: (e: React.MouseEvent) => void;
  handlePanMove: (e: MouseEvent, containerRect: DOMRect) => void;
  handleMouseUp: () => void;
}

export const useCanvasPanning = ({ containerRef }: UseCanvasPanningProps): UseCanvasPanningReturn => {
  const [panState, setPanState] = useState<PanState | null>(null);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const panOffsetRef = useRef<PanOffset>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<PanOffset | null>(null);

  // Handle canvas mouse down for panning
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Start panning on middle mouse button or space+left click
    if (shouldStartPan(e, isSpacePressed)) {
      preventEventDefault(e);

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const { x: startX, y: startY } = getMousePosition(e, containerRect);

      setPanState({
        startX,
        startY,
        initialOffsetX: panOffsetRef.current.x,
        initialOffsetY: panOffsetRef.current.y
      });
    }
  }, [isSpacePressed, containerRef]);

  // Handle mouse move for panning
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
    
    // Update background position immediately for canvas grid
    if (containerRef.current) {
      containerRef.current.style.backgroundPosition = `${newOffset.x}px ${newOffset.y}px`;
    }
    
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
  }, [panState, containerRef]);

  // Handle mouse up for panning
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

  // Handle keyboard events for space key panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed && !isEventTargetEditable(e)) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (!isEventTargetEditable(e)) {
          e.preventDefault();
        }
        setIsSpacePressed(false);
        setPanState(null); // Stop any active panning
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

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

  return {
    panState,
    panOffset,
    panOffsetRef,
    isSpacePressed,
    handleCanvasMouseDown,
    handlePanMove,
    handleMouseUp,
  };
};
