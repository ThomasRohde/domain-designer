import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PanState } from '../types';
import { getMousePosition, shouldStartPan, preventEventDefault, isEventTargetEditable } from '../utils/eventUtils';
import { PanOffset } from '../utils/canvasUtils';

/**
 * Props for useCanvasPanning hook
 */
interface UseCanvasPanningProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Return interface for useCanvasPanning hook
 * Provides panning state and handlers for canvas navigation
 */
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

  /**
   * Initiates panning operation on middle mouse or space+left click
   * Records initial position and offset for delta calculations
   */
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Panning triggers: middle mouse or space+left click combination
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

  /**
   * Processes mouse movement during panning operations
   * Uses performance optimizations: ref updates and requestAnimationFrame batching
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
    
    // Immediate ref update for synchronous access by other components
    panOffsetRef.current = newOffset;
    
    // Apply background position immediately for smooth grid movement
    if (containerRef.current) {
      containerRef.current.style.backgroundPosition = `${newOffset.x}px ${newOffset.y}px`;
    }
    
    // Batch React state updates using requestAnimationFrame for performance
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

  /**
   * Completes panning operation and ensures final state synchronization
   */
  const handleMouseUp = useCallback(() => {
    // Cancel pending frame to prevent stale updates
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Ensure React state matches ref for consistency
    setPanOffset(panOffsetRef.current);
    setPanState(null);
    pendingUpdateRef.current = null;
  }, []);

  /**
   * Manages space key state for space+drag panning mode
   * Includes editable element detection to prevent interference
   */
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

  /**
   * Synchronizes React state with ref to maintain consistency
   * Ensures ref always has current offset for immediate access
   */
  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  /**
   * Cleanup: cancels pending animation frames to prevent memory leaks
   */
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
