import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PanState } from '../types';
import { getMousePosition, shouldStartPan, preventEventDefault } from '../utils/eventUtils';
import { PanOffset } from '../utils/canvasUtils';

interface UseCanvasPanningProps {
  containerRef: React.RefObject<HTMLDivElement>;
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
    
    // Update both ref and state for immediate and persistent updates
    panOffsetRef.current = newOffset;
    setPanOffset(newOffset);
  }, [panState]);

  // Handle mouse up for panning
  const handleMouseUp = useCallback(() => {
    setPanState(null);
  }, []);

  // Handle keyboard events for space key panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
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
