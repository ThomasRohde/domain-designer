import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Rectangle, DragState, ResizeState, HierarchyDragState, DropTarget, ResizeConstraintState } from '../types';
import { MIN_WIDTH, MIN_HEIGHT } from '../utils/constants';
import { updateChildrenLayout, getAllDescendants, getChildren } from '../utils/layoutUtils';
import { layoutManager } from '../utils/layout';
import { getMousePosition, preventEventDefault } from '../utils/eventUtils';

/**
 * Props for the useDragAndResize hook
 * Manages complex drag, resize, and hierarchy operations for rectangles
 */
interface UseDragAndResizeProps {
  rectangles: Rectangle[];
  setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  setRectanglesWithHistory: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  gridSize: number;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  getFixedDimensions: () => { leafFixedWidth: boolean; leafFixedHeight: boolean; leafWidth: number; leafHeight: number };
  getMargins: () => { margin: number; labelMargin: number };
  reparentRectangle?: (childId: string, newParentId: string | null) => boolean;
  canReparent?: (childId: string, newParentId: string | null) => boolean;
  saveToHistory?: (rectangles: Rectangle[]) => void;
  panOffset: { x: number; y: number };
  zoomLevel: number;
  triggerSave?: () => void;
}

/**
 * Return interface for useDragAndResize hook
 * Provides state and handlers for drag/resize operations
 */
interface UseDragAndResizeReturn {
  dragState: DragState | null;
  resizeState: ResizeState | null;
  hierarchyDragState: HierarchyDragState | null;
  resizeConstraintState: ResizeConstraintState | null;
  handleMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => void;
  handleMouseUp: () => void;
  cancelDrag: () => void;
  isDragging: boolean;
  isResizing: boolean;
  isHierarchyDragging: boolean;
}

export const useDragAndResize = ({
  rectangles,
  setRectangles,
  setRectanglesWithHistory: _setRectanglesWithHistory,
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
  zoomLevel,
  triggerSave
}: UseDragAndResizeProps): UseDragAndResizeReturn => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [hierarchyDragState, setHierarchyDragState] = useState<HierarchyDragState | null>(null);
  const [resizeConstraintState, setResizeConstraintState] = useState<ResizeConstraintState | null>(null);
  const [needsLayoutUpdate, setNeedsLayoutUpdate] = useState<{ type: 'reparent' | 'resize'; rectangleId?: string } | null>(null);
  const [initialPositions, setInitialPositions] = useState<Map<string, { x: number; y: number }> | null>(null);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent, panOffset: { x: number; y: number }, zoomLevel: number) => void) | null>(null);

  /**
   * Initiates drag or resize operations based on action type
   * - 'drag': Standard position movement for root rectangles
   * - 'resize': Size adjustment with constraint enforcement
   * - 'hierarchy-drag': Reparenting operation with visual feedback
   */
  const handleMouseDown = useCallback((e: React.MouseEvent, rect: Rectangle, action: 'drag' | 'resize' | 'hierarchy-drag' = 'drag') => {
    preventEventDefault(e);

    // Save current state to history before starting drag/resize operation
    if (saveToHistory) {
      saveToHistory(rectangles);
    }

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const { x: startX, y: startY } = getMousePosition(e, containerRect);

    if (action === 'drag') {
      // Regular drag - allow for root rectangles and child rectangles when parent has manual positioning enabled
      if (rect.parentId) {
        const parent = rectangles.find(r => r.id === rect.parentId);
        if (!parent?.isManualPositioningEnabled) {
          return;
        }
      }
      
      // Store initial positions for regular drag too (in case of descendants)
      const descendantIds = new Set(getAllDescendants(rect.id, rectangles));
      const positions = new Map<string, { x: number; y: number }>();
      
      // Store position of the dragged rectangle itself
      positions.set(rect.id, { x: rect.x, y: rect.y });
      
      // Store positions of all descendants
      rectangles.forEach(r => {
        if (descendantIds.has(r.id)) {
          positions.set(r.id, { x: r.x, y: r.y });
        }
      });
      
      setInitialPositions(positions);
      
      setDragState({
        id: rect.id,
        startX,
        startY,
        initialX: rect.x, // Store as grid coordinates
        initialY: rect.y  // Store as grid coordinates
      });
    } else if (action === 'hierarchy-drag') {
      // Hierarchy drag - allow for any rectangle
      // Store initial positions of the dragged rectangle and all its descendants
      const descendantIds = new Set(getAllDescendants(rect.id, rectangles));
      const positions = new Map<string, { x: number; y: number }>();
      
      // Store position of the dragged rectangle itself
      positions.set(rect.id, { x: rect.x, y: rect.y });
      
      // Store positions of all descendants
      rectangles.forEach(r => {
        if (descendantIds.has(r.id)) {
          positions.set(r.id, { x: r.x, y: r.y });
        }
      });
      
      setInitialPositions(positions);
      
      setDragState({
        id: rect.id,
        startX,
        startY,
        initialX: rect.x, // Store as grid coordinates
        initialY: rect.y, // Store as grid coordinates
        isHierarchyDrag: true
      });
      
      // Initialize hierarchy drag state
      setHierarchyDragState({
        draggedRectangleId: rect.id,
        currentDropTarget: null,
        potentialTargets: [],
        mousePosition: { x: startX, y: startY }
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
  }, [containerRef, rectangles, saveToHistory]);

  /**
   * Detects valid drop targets during hierarchy drag operations
   * Uses z-index calculation to prioritize deepest rectangles
   * Prevents circular hierarchy relationships
   */
  const detectDropTargets = useCallback((mouseX: number, mouseY: number, draggedRectId: string, panOffset: { x: number; y: number }, zoomLevel: number): DropTarget[] => {
    const targets: DropTarget[] = [];
    
    // Add canvas background as a potential drop target (makes rectangle a root)
    targets.push({
      targetId: null,
      isValid: true,
      dropType: 'root',
      bounds: { x: 0, y: 0, width: 0, height: 0 } // Canvas background bounds
    });
    
    // Transform mouse coordinates to canvas space (accounting for pan and zoom)
    const canvasMouseX = (mouseX - panOffset.x) / zoomLevel;
    const canvasMouseY = (mouseY - panOffset.y) / zoomLevel;
    
    // Find all rectangles that the mouse is over, sorted by z-index (deepest first)
    const mouseOverRects: Array<{ rect: Rectangle; bounds: { x: number; y: number; width: number; height: number }; zIndex: number }> = [];
    
    rectangles.forEach(rect => {
      if (rect.id === draggedRectId) return; // Can't drop on self
      
      // Calculate rectangle bounds in canvas coordinates
      const rectBounds = {
        x: rect.x * gridSize,
        y: rect.y * gridSize,
        width: rect.w * gridSize,
        height: rect.h * gridSize
      };
      
      // Check if mouse is over this rectangle using canvas-space coordinates
      const isMouseOver = canvasMouseX >= rectBounds.x && 
                         canvasMouseX <= rectBounds.x + rectBounds.width &&
                         canvasMouseY >= rectBounds.y && 
                         canvasMouseY <= rectBounds.y + rectBounds.height;
      
      if (isMouseOver) {
        // Calculate z-index for this rectangle to determine stacking order
        let depth = 0;
        let current = rect;
        while (current && current.parentId) {
          depth++;
          current = rectangles.find(r => r.id === current!.parentId) || rect;
          if (depth > 10) break; // Prevent infinite loops
        }
        const zIndex = 10 + (depth * 10);
        
        mouseOverRects.push({ rect, bounds: rectBounds, zIndex });
      }
    });
    
    // Sort by z-index (highest first) to prioritize children over parents
    mouseOverRects.sort((a, b) => b.zIndex - a.zIndex);
    
    // Add all overlapping rectangles as potential targets
    mouseOverRects.forEach(({ rect, bounds }) => {
      // Check if we can reparent (avoid circular hierarchies)
      const canDrop = canReparent ? canReparent(draggedRectId, rect.id) : true;
      
      targets.push({
        targetId: rect.id,
        isValid: canDrop,
        dropType: 'parent',
        bounds
      });
    });
    
    return targets;
  }, [rectangles, gridSize, canReparent]);

  /**
   * Moves rectangle and all descendants as a cohesive unit
   * Maintains spatial relationships during drag operations
   */
  const moveRectangleWithDescendants = useCallback((
    draggedId: string,
    newX: number, 
    newY: number,
    rectangles: Rectangle[]
  ) => {
    // Calculate actual movement needed from current position
    const draggedRect = rectangles.find(r => r.id === draggedId);
    if (!draggedRect) return rectangles;
    
    const actualDeltaX = newX - draggedRect.x;
    const actualDeltaY = newY - draggedRect.y;
    
    // Move entire subtree together
    const descendantIds = new Set(getAllDescendants(draggedId, rectangles));

    return rectangles.map(rect => {
      if (rect.id === draggedId) {
        // Update the dragged rectangle
        return { ...rect, x: newX, y: newY };
      } else if (descendantIds.has(rect.id)) {
        // Move all descendants by the same delta
        return { 
          ...rect, 
          x: Math.max(0, rect.x + actualDeltaX), 
          y: Math.max(0, rect.y + actualDeltaY) 
        };
      }
      return rect;
    });
  }, []);

  /**
   * Converts mouse movement to grid-aligned position changes
   * Accounts for zoom level and pan offset transformations
   */
  const calculateNewPosition = useCallback((
    currentX: number,
    currentY: number,
    dragState: DragState
  ) => {
    const deltaX = currentX - dragState.startX;
    const deltaY = currentY - dragState.startY;
    
    // Scale mouse movement by zoom level for consistent behavior
    const zoomAdjustedDeltaX = deltaX / zoomLevel;
    const zoomAdjustedDeltaY = deltaY / zoomLevel;
    
    const gridDeltaX = zoomAdjustedDeltaX / gridSize;
    const gridDeltaY = zoomAdjustedDeltaY / gridSize;
    const newX = Math.max(0, Math.round(dragState.initialX + gridDeltaX));
    const newY = Math.max(0, Math.round(dragState.initialY + gridDeltaY));
    
    return { newX, newY };
  }, [gridSize, zoomLevel]);

  /**
   * Processes mouse movement during drag operations
   * 
   * Regular drag: Real-time position updates for root rectangles
   * Hierarchy drag: Position updates with drop target detection for reparenting
   */
  const handleDragMove = useCallback((e: MouseEvent, containerRect: DOMRect, panOffset: { x: number; y: number }, zoomLevel: number) => {
    if (!dragState) return;

    const { x: currentX, y: currentY } = getMousePosition(e, containerRect);

    if (dragState.isHierarchyDrag) {
      // === HIERARCHY DRAG MODE ===
      // Used for reparenting operations (Ctrl+drag)
      // Updates rectangle position AND detects potential drop targets
      
      // Detect all potential drop targets under the mouse cursor
      const potentialTargets = detectDropTargets(currentX, currentY, dragState.id, panOffset, zoomLevel);
      
      // Find the best drop target - prioritize valid rectangle targets over canvas
      let currentDropTarget: DropTarget | null = null;
      
      // First try to find a valid rectangle target (excluding canvas background)
      // These are sorted by z-index, so first = topmost/deepest
      const rectTargets = potentialTargets.filter(target => target.targetId !== null && target.isValid);
      if (rectTargets.length > 0) {
        currentDropTarget = rectTargets[0]; // Highest z-index (deepest/topmost)
      } else {
        // Fall back to canvas background for "make root" operation
        const canvasTarget = potentialTargets.find(target => target.targetId === null);
        if (canvasTarget) {
          currentDropTarget = canvasTarget;
        }
      }
      
      setHierarchyDragState(prev => prev ? {
        ...prev,
        mousePosition: { x: currentX, y: currentY },
        potentialTargets,
        currentDropTarget
      } : null);
      
      // Move the rectangle for visual feedback during hierarchy drag
      // This provides real-time preview of where the rectangle will be positioned
      const { newX, newY } = calculateNewPosition(currentX, currentY, dragState);
      
      // Move entire subtree together during hierarchy drag
      // This ensures children follow their parent during reparenting preview
      setRectangles(prev => moveRectangleWithDescendants(dragState.id, newX, newY, prev));
    } else {
      // === REGULAR DRAG MODE ===
      // Used for moving root rectangles within the canvas (no reparenting)
      // Moves the entire subtree as a unit to maintain hierarchy relationships
      
      const { newX, newY } = calculateNewPosition(currentX, currentY, dragState);
      
      // Move entire subtree together during regular drag
      // This maintains the visual hierarchy when moving root containers
      setRectangles(prev => moveRectangleWithDescendants(dragState.id, newX, newY, prev));
    }
  }, [dragState, setRectangles, detectDropTargets, calculateNewPosition, moveRectangleWithDescendants]);

  /**
   * Processes mouse movement during resize operations
   * Enforces size constraints and updates visual feedback
   */
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
    
    // For parent rectangles, enforce minimum size needed for children (unless manual positioning is enabled)
    const children = getChildren(rect.id, rectangles);
    let minRequiredW = MIN_WIDTH;
    let minRequiredH = MIN_HEIGHT;
    
    if (children.length > 0 && !rect.isManualPositioningEnabled && !rect.isLockedAsIs) {
      const minSize = layoutManager.calculateMinimumParentSize(rect.id, rectangles, getMargins(), getFixedDimensions());
      minRequiredW = minSize.w;
      minRequiredH = minSize.h;
      // Only enforce minimum if the new size would be too small
      // Allow free resizing as long as children still fit
      if (newW < minSize.w) {
        newW = minSize.w;
      }
      if (newH < minSize.h) {
        newH = minSize.h;
      }
    }
    
    // Provide visual feedback for size constraints
    setResizeConstraintState({
      rectangleId: rect.id,
      isAtMinWidth: !rect.isManualPositioningEnabled && !rect.isLockedAsIs && newW <= minRequiredW + 1,
      isAtMinHeight: !rect.isManualPositioningEnabled && !rect.isLockedAsIs && newH <= minRequiredH + 1,
      minRequiredWidth: minRequiredW,
      minRequiredHeight: minRequiredH
    });

    setRectangles(prev => prev.map(r => 
      r.id === resizeState.id ? { ...r, w: newW, h: newH } : r
    ));
  }, [resizeState, rectangles, gridSize, leafFixedWidth, leafFixedHeight, leafWidth, leafHeight, setRectangles, getFixedDimensions, getMargins]);

  /**
   * Coordinates mouse movement handling between drag and resize modes
   */
  const handleMouseMove = useCallback((e: MouseEvent, panOffset: { x: number; y: number }, zoomLevel: number) => {
    if (!dragState && !resizeState) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    if (dragState) {
      handleDragMove(e, containerRect, panOffset, zoomLevel);
    } else if (resizeState) {
      handleResizeMove(e, containerRect);
    }
  }, [dragState, resizeState, handleDragMove, handleResizeMove, containerRef]);

  /**
   * Completes drag/resize operations and manages state cleanup
   * Handles reparenting, layout updates, and history tracking
   */
  const handleMouseUp = useCallback(() => {
    const wasResizing = resizeState;
    const wasHierarchyDrag = dragState?.isHierarchyDrag;
    const currentHierarchyState = hierarchyDragState;
    
    // Handle hierarchy drag completion
    if (wasHierarchyDrag && currentHierarchyState && reparentRectangle) {
      const { draggedRectangleId, currentDropTarget } = currentHierarchyState;
      
      if (currentDropTarget && currentDropTarget.isValid) {
        // Check if dropping on the original parent (no-op operation)
        const draggedRect = rectangles.find(r => r.id === draggedRectangleId);
        const originalParentId = draggedRect?.parentId || null;
        
        if (currentDropTarget.targetId === originalParentId) {
          // No-op: dropping on original parent, reset position without state changes
          setRectangles(prev => prev.map(rect => {
            if (rect.id === draggedRectangleId) {
              return { ...rect, x: dragState?.initialX || rect.x, y: dragState?.initialY || rect.y };
            }
            // Reset descendants if needed
            if (dragState?.initialX !== undefined && dragState?.initialY !== undefined) {
              const descendantIds = new Set(getAllDescendants(draggedRectangleId, prev));
              if (descendantIds.has(rect.id)) {
                const currentRect = prev.find(r => r.id === draggedRectangleId);
                if (currentRect) {
                  const parentDeltaX = currentRect.x - dragState.initialX;
                  const parentDeltaY = currentRect.y - dragState.initialY;
                  return { 
                    ...rect, 
                    x: rect.x - parentDeltaX, 
                    y: rect.y - parentDeltaY 
                  };
                }
              }
            }
            return rect;
          }));
        } else {
          // Perform the reparenting operation
          const success = reparentRectangle(draggedRectangleId, currentDropTarget.targetId);
          if (success) {
            // Schedule layout update after reparenting
            setNeedsLayoutUpdate({ type: 'reparent' });
          }
        }
      }
    }
    
    // Clear all drag states
    setDragState(null);
    setResizeState(null);
    setHierarchyDragState(null);
    setResizeConstraintState(null);
    setInitialPositions(null);
    
    if (wasResizing) {
      // Only update children layout after resize operations
      // Drag operations now handle children positioning in real-time
      const rectId = wasResizing.id;
      if (rectId) {
        const rect = rectangles.find(r => r.id === rectId);
        if (rect) {
          const hasDescendants = getAllDescendants(rect.id, rectangles).length > 0;
          if (hasDescendants && !rect.isManualPositioningEnabled && !rect.isLockedAsIs) {
            // For deep hierarchies, we need to trigger layout updates to ensure proper containment
            // But only if manual positioning is not enabled and rectangle is not locked as-is
            setNeedsLayoutUpdate({ type: 'resize', rectangleId: rectId });
          }
          
          // Additionally, if this rectangle has a parent, we should check if the parent
          // needs to be resized to accommodate the resized child
          if (rect.parentId) {
            const parent = rectangles.find(r => r.id === rect.parentId);
            if (parent && !parent.isManualPositioningEnabled && !parent.isLockedAsIs) {
              // Only auto-resize parent if manual positioning is not enabled and parent is not locked as-is
              const minParentSize = layoutManager.calculateMinimumParentSize(rect.parentId, rectangles, getMargins(), getFixedDimensions());
              if (parent.w < minParentSize.w || parent.h < minParentSize.h) {
                // Parent needs to be resized too, trigger a broader layout update
                setNeedsLayoutUpdate({ type: 'resize', rectangleId: rect.parentId });
              }
            }
          }
        }
      }
    }
    
    // Save final state to history after any drag/resize completion
    if (saveToHistory) {
      saveToHistory(rectangles);
    }
    
    // Trigger save after any drag/resize completion
    triggerSave?.();
  }, [resizeState, dragState, hierarchyDragState, rectangles, setRectangles, reparentRectangle, saveToHistory, triggerSave, getFixedDimensions, getMargins]);

  // Maintain stable reference for event cleanup
  React.useEffect(() => {
    mouseMoveHandlerRef.current = handleMouseMove;
  }, [handleMouseMove]);

  /**
   * Manages global mouse event listeners during drag/resize operations
   * Uses closure to capture current pan/zoom state
   */
  useEffect(() => {
    if (dragState || resizeState) {
      const currentHandler = (e: MouseEvent) => {
        if (mouseMoveHandlerRef.current) {
          mouseMoveHandlerRef.current(e, panOffset, zoomLevel);
        }
      };
      
      document.addEventListener('mousemove', currentHandler);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', currentHandler);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, resizeState, handleMouseUp, panOffset, zoomLevel]);

  /**
   * Cancels active drag operation and restores original positions
   * Provides escape mechanism for unwanted operations
   */
  const cancelDrag = useCallback(() => {
    if (dragState && initialPositions) {
      // Reset all rectangles to their stored initial positions
      setRectangles(prev => prev.map(rect => {
        const storedPosition = initialPositions.get(rect.id);
        if (storedPosition) {
          return { ...rect, x: storedPosition.x, y: storedPosition.y };
        }
        return rect;
      }));
    }
    
    // Clear all drag states
    setDragState(null);
    setResizeState(null);
    setHierarchyDragState(null);
    setResizeConstraintState(null);
    setInitialPositions(null);
    
    // Save final state to history after cancel (position reset)
    if (saveToHistory) {
      saveToHistory(rectangles);
    }
    
    // Trigger save after cancel (position reset)
    triggerSave?.();
  }, [dragState, initialPositions, rectangles, setRectangles, saveToHistory, triggerSave]);

  /**
   * Manages deferred layout updates after state-changing operations
   * Uses microtask scheduling to ensure state consistency
   */
  useEffect(() => {
    if (needsLayoutUpdate) {
      // Defer layout calculation until state stabilizes
      Promise.resolve().then(() => {
        setRectangles(prev => updateChildrenLayout(prev, getMargins(), getFixedDimensions()));
        setNeedsLayoutUpdate(null);
      });
    }
  }, [needsLayoutUpdate, setRectangles, getFixedDimensions, getMargins]);

  return {
    dragState,
    resizeState,
    hierarchyDragState,
    resizeConstraintState,
    handleMouseDown,
    handleMouseUp,
    cancelDrag,
    isDragging: dragState !== null,
    isResizing: resizeState !== null,
    isHierarchyDragging: hierarchyDragState !== null
  };
};
