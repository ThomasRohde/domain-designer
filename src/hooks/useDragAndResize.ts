import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Rectangle, DragState, ResizeState, HierarchyDragState, DropTarget } from '../types';
import { MIN_WIDTH, MIN_HEIGHT } from '../utils/constants';
import { updateChildrenLayout, getAllDescendants, calculateMinimumParentSize, getChildren } from '../utils/layoutUtils';
import { getMousePosition, preventEventDefault } from '../utils/eventUtils';

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
  reparentRectangle?: (childId: string, newParentId: string | null) => boolean;
  canReparent?: (childId: string, newParentId: string | null) => boolean;
  saveToHistory?: (rectangles: Rectangle[]) => void;
}

interface UseDragAndResizeReturn {
  dragState: DragState | null;
  resizeState: ResizeState | null;
  hierarchyDragState: HierarchyDragState | null;
  handleMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => void;
  handleMouseUp: () => void;
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
  reparentRectangle,
  canReparent,
  saveToHistory
}: UseDragAndResizeProps): UseDragAndResizeReturn => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [hierarchyDragState, setHierarchyDragState] = useState<HierarchyDragState | null>(null);
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  // Handle mouse down for dragging and resizing
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
      // Regular drag - only allow for root rectangles
      if (rect.parentId) {
        return;
      }
      setDragState({
        id: rect.id,
        startX,
        startY,
        initialX: rect.x, // Store as grid coordinates
        initialY: rect.y  // Store as grid coordinates
      });
    } else if (action === 'hierarchy-drag') {
      // Hierarchy drag - allow for any rectangle
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

  // Detect drop targets during hierarchy drag
  const detectDropTargets = useCallback((mouseX: number, mouseY: number, draggedRectId: string): DropTarget[] => {
    const targets: DropTarget[] = [];
    
    // Add canvas background as a potential drop target (makes rectangle a root)
    targets.push({
      targetId: null,
      isValid: true,
      dropType: 'root',
      bounds: { x: 0, y: 0, width: 0, height: 0 } // Canvas background bounds
    });
    
    // Find all rectangles that the mouse is over, sorted by z-index (deepest first)
    const mouseOverRects: Array<{ rect: Rectangle; bounds: { x: number; y: number; width: number; height: number }; zIndex: number }> = [];
    
    rectangles.forEach(rect => {
      if (rect.id === draggedRectId) return; // Can't drop on self
      
      // Calculate rectangle bounds in screen coordinates
      const rectBounds = {
        x: rect.x * gridSize,
        y: rect.y * gridSize,
        width: rect.w * gridSize,
        height: rect.h * gridSize
      };
      
      // Check if mouse is over this rectangle
      const isMouseOver = mouseX >= rectBounds.x && 
                         mouseX <= rectBounds.x + rectBounds.width &&
                         mouseY >= rectBounds.y && 
                         mouseY <= rectBounds.y + rectBounds.height;
      
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

  // Handle drag movement
  const handleDragMove = useCallback((e: MouseEvent, containerRect: DOMRect) => {
    if (!dragState) return;

    const { x: currentX, y: currentY } = getMousePosition(e, containerRect);

    if (dragState.isHierarchyDrag) {
      // Handle hierarchy drag - update mouse position and detect drop targets
      const potentialTargets = detectDropTargets(currentX, currentY, dragState.id);
      
      // Find the best drop target - prioritize the first valid target (highest z-index)
      let currentDropTarget: DropTarget | null = null;
      
      // First try to find a valid rectangle target (excluding canvas background)
      const rectTargets = potentialTargets.filter(target => target.targetId !== null && target.isValid);
      if (rectTargets.length > 0) {
        currentDropTarget = rectTargets[0]; // First one is highest z-index
      } else {
        // Fall back to canvas background if no valid rectangle targets
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
      
      // Still move the rectangle for visual feedback
      const deltaX = currentX - dragState.startX;
      const deltaY = currentY - dragState.startY;
      
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
    } else {
      // Handle regular drag movement
      const deltaX = currentX - dragState.startX;
      const deltaY = currentY - dragState.startY;
      
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
    }
  }, [dragState, gridSize, setRectangles, rectangles, detectDropTargets]);

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
    
    // For parent rectangles, enforce minimum size needed for children
    const children = getChildren(rect.id, rectangles);
    if (children.length > 0) {
      const minSize = calculateMinimumParentSize(rect.id, rectangles, getFixedDimensions());
      newW = Math.max(newW, minSize.w);
      newH = Math.max(newH, minSize.h);
    }

    setRectangles(prev => prev.map(r => 
      r.id === resizeState.id ? { ...r, w: newW, h: newH } : r
    ));
  }, [resizeState, rectangles, gridSize, leafFixedWidth, leafFixedHeight, leafWidth, leafHeight, setRectangles, getFixedDimensions]);

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
    const wasHierarchyDrag = dragState?.isHierarchyDrag;
    const currentHierarchyState = hierarchyDragState;
    
    // Handle hierarchy drag completion
    if (wasHierarchyDrag && currentHierarchyState && reparentRectangle) {
      const { draggedRectangleId, currentDropTarget } = currentHierarchyState;
      
      if (currentDropTarget && currentDropTarget.isValid) {
        // Perform the reparenting operation
        const success = reparentRectangle(draggedRectangleId, currentDropTarget.targetId);
        if (success) {
          // Update the layout after reparenting
          setTimeout(() => {
            setRectangles(prev => updateChildrenLayout(prev, getFixedDimensions()));
          }, 10);
        }
      }
    }
    
    // Clear all drag states
    setDragState(null);
    setResizeState(null);
    setHierarchyDragState(null);
    
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
  }, [resizeState, dragState, hierarchyDragState, rectangles, setRectangles, getFixedDimensions, reparentRectangle]);

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
    hierarchyDragState,
    handleMouseDown,
    handleMouseUp,
    isDragging: dragState !== null,
    isResizing: resizeState !== null,
    isHierarchyDragging: hierarchyDragState !== null
  };
};
