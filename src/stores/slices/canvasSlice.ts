import React from 'react';
import type { 
  PanOffset, 
  DragState, 
  ResizeState, 
  HierarchyDragState,
  PanState,
  ZoomState,
  Rectangle,
  DropTarget,
  ResizeConstraintState
} from '../../types';
import type { SliceCreator, CanvasState, CanvasActions } from '../types';
import { getAllDescendants } from '../../utils/layoutUtils';
import { getMousePosition, preventEventDefault, shouldStartPan } from '../../utils/eventUtils';

/**
 * Canvas state slice interface
 */
export interface CanvasSlice {
  canvas: CanvasState;
  canvasActions: CanvasActions;
}

/**
 * Creates the canvas slice for the store
 */
export const createCanvasSlice: SliceCreator<CanvasSlice> = (set, get) => ({
  // Initial state
  canvas: {
    panOffset: { x: 0, y: 0 },
    zoomLevel: 1.0,
    zoomState: {
      level: 1.0,
      centerX: 0,
      centerY: 0,
      minLevel: 0.1,
      maxLevel: 3.0
    },
    panState: null,
    dragState: null,
    resizeState: null,
    hierarchyDragState: null,
    resizeConstraintState: null,
    isSpacePressed: false,
    isKeyboardMoving: false,
    initialPositions: null,
    needsLayoutUpdate: null,
    keyboardTimeoutId: null
  },

  // Actions
  canvasActions: {
    // Drag actions
    startDrag: (dragState: DragState) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          dragState
        }
      }));
    },

    updateDrag: (updates: Partial<DragState>) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          dragState: state.canvas.dragState ? { ...state.canvas.dragState, ...updates } : null
        }
      }));
    },

    endDrag: () => {
      set(state => ({
        canvas: {
          ...state.canvas,
          dragState: null,
          initialPositions: null
        }
      }));
    },

    // Resize actions
    startResize: (resizeState: ResizeState) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          resizeState
        }
      }));
    },

    updateResize: (updates: Partial<ResizeState>) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          resizeState: state.canvas.resizeState ? { ...state.canvas.resizeState, ...updates } : null
        }
      }));
    },

    endResize: () => {
      set(state => ({
        canvas: {
          ...state.canvas,
          resizeState: null,
          resizeConstraintState: null
        }
      }));
    },

    // Hierarchy drag actions
    startHierarchyDrag: (hierarchyDragState: HierarchyDragState) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          hierarchyDragState
        }
      }));
    },

    updateHierarchyDrag: (updates: Partial<HierarchyDragState>) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          hierarchyDragState: state.canvas.hierarchyDragState ? { ...state.canvas.hierarchyDragState, ...updates } : null
        }
      }));
    },

    endHierarchyDrag: () => {
      set(state => ({
        canvas: {
          ...state.canvas,
          hierarchyDragState: null,
          dragState: null,
          initialPositions: null
        }
      }));
    },

    // Pan actions
    setPanOffset: (offset: PanOffset) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          panOffset: offset
        }
      }));
    },

    startPan: (panState: PanState) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          panState
        }
      }));
    },

    updatePan: (updates: Partial<PanState>) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          panState: state.canvas.panState ? { ...state.canvas.panState, ...updates } : null
        }
      }));
    },

    endPan: () => {
      set(state => ({
        canvas: {
          ...state.canvas,
          panState: null
        }
      }));
    },

    // Zoom actions
    setZoomLevel: (level: number) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          zoomLevel: Math.max(0.1, Math.min(3.0, level)),
          zoomState: {
            ...state.canvas.zoomState,
            level: Math.max(0.1, Math.min(3.0, level))
          }
        }
      }));
    },

    setZoomState: (zoomState: ZoomState) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          zoomState,
          zoomLevel: zoomState.level
        }
      }));
    },

    updateZoom: (delta: number, mouseX: number, mouseY: number) => {
      set(state => {
        const newLevel = Math.max(
          state.canvas.zoomState.minLevel, 
          Math.min(state.canvas.zoomState.maxLevel, state.canvas.zoomState.level + delta)
        );
        
        // Only update if zoom level actually changed
        if (newLevel === state.canvas.zoomState.level) return state;
        
        const newZoomState = {
          ...state.canvas.zoomState,
          level: newLevel,
          centerX: mouseX,
          centerY: mouseY
        };

        return {
          canvas: {
            ...state.canvas,
            zoomState: newZoomState,
            zoomLevel: newLevel
          }
        };
      });
    },

    // Keyboard and interaction state
    setIsSpacePressed: (pressed: boolean) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          isSpacePressed: pressed
        }
      }));
      
      // If space is released, end any active pan
      if (!pressed) {
        get().canvasActions.endPan();
      }
    },

    setIsKeyboardMoving: (moving: boolean) => {
      set(state => {
        // Clear existing timeout if there is one
        if (state.canvas.keyboardTimeoutId) {
          clearTimeout(state.canvas.keyboardTimeoutId);
        }

        return {
          canvas: {
            ...state.canvas,
            isKeyboardMoving: moving,
            keyboardTimeoutId: null
          }
        };
      });
    },

    startKeyboardMovement: () => {
      const state = get();
      
      // Clear any existing timeout
      if (state.canvas.keyboardTimeoutId) {
        clearTimeout(state.canvas.keyboardTimeoutId);
      }
      
      // Set keyboard moving state
      set(prevState => ({
        canvas: {
          ...prevState.canvas,
          isKeyboardMoving: true
        }
      }));
      
      // Set a debounced timeout to reset the state
      const timeoutId = window.setTimeout(() => {
        get().canvasActions.setIsKeyboardMoving(false);
      }, 150); // 150ms delay after last arrow key press
      
      set(prevState => ({
        canvas: {
          ...prevState.canvas,
          keyboardTimeoutId: timeoutId
        }
      }));
    },

    // Complex interaction handlers
    handleCanvasMouseDown: (e: React.MouseEvent, containerRef: React.RefObject<HTMLDivElement | null>) => {
      const state = get();
      
      // Handle panning on middle mouse button or space+left click
      if (shouldStartPan(e, state.canvas.isSpacePressed)) {
        preventEventDefault(e);

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const { x: startX, y: startY } = getMousePosition(e, containerRect);

        get().canvasActions.startPan({
          startX,
          startY,
          initialOffsetX: state.canvas.panOffset.x,
          initialOffsetY: state.canvas.panOffset.y
        });
      }
      
      // Handle selection clearing for normal left clicks
      if (e.button === 0 && !state.canvas.isSpacePressed) {
        get().rectangleActions.setSelectedId(null);
      }
    },

    handleRectangleMouseDown: (e: React.MouseEvent, rect: Rectangle, action: 'drag' | 'resize' | 'hierarchy-drag' = 'drag', containerRef: React.RefObject<HTMLDivElement | null>) => {
      preventEventDefault(e);
      
      const state = get();
      
      // Save current state to history before starting drag/resize operation
      get().historyActions.saveToHistory();

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const { x: startX, y: startY } = getMousePosition(e, containerRect);

      if (action === 'drag') {
        // Regular drag - allow for root rectangles and child rectangles when parent has manual positioning enabled
        if (rect.parentId) {
          const parent = state.rectangles.find(r => r.id === rect.parentId);
          if (!parent?.isManualPositioningEnabled) {
            return;
          }
        }
        
        // Store initial positions for regular drag too (in case of descendants)
        const descendantIds = new Set(getAllDescendants(rect.id, state.rectangles));
        const positions: Record<string, { x: number; y: number }> = {};
        
        // Store position of the dragged rectangle itself
        positions[rect.id] = { x: rect.x, y: rect.y };
        
        // Store positions of all descendants
        state.rectangles.forEach(r => {
          if (descendantIds.has(r.id)) {
            positions[r.id] = { x: r.x, y: r.y };
          }
        });
        
        get().canvasActions.setInitialPositions(positions);
        
        get().canvasActions.startDrag({
          id: rect.id,
          startX,
          startY,
          initialX: rect.x, // Store as grid coordinates
          initialY: rect.y  // Store as grid coordinates
        });
      } else if (action === 'hierarchy-drag') {
        // Hierarchy drag - allow for any rectangle
        const descendantIds = new Set(getAllDescendants(rect.id, state.rectangles));
        const positions: Record<string, { x: number; y: number }> = {};
        
        // Store position of the dragged rectangle itself
        positions[rect.id] = { x: rect.x, y: rect.y };
        
        // Store positions of all descendants
        state.rectangles.forEach(r => {
          if (descendantIds.has(r.id)) {
            positions[r.id] = { x: r.x, y: r.y };
          }
        });
        
        get().canvasActions.setInitialPositions(positions);
        
        get().canvasActions.startDrag({
          id: rect.id,
          startX,
          startY,
          initialX: rect.x, // Store as grid coordinates
          initialY: rect.y, // Store as grid coordinates
          isHierarchyDrag: true
        });
        
        // Initialize hierarchy drag state
        get().canvasActions.startHierarchyDrag({
          draggedRectangleId: rect.id,
          currentDropTarget: null,
          potentialTargets: [],
          mousePosition: { x: startX, y: startY }
        });
      } else if (action === 'resize') {
        get().canvasActions.startResize({
          id: rect.id,
          startX,
          startY,
          initialW: rect.w,
          initialH: rect.h
        });
      }
    },

    handleMouseMove: (e: MouseEvent, containerRef: React.RefObject<HTMLDivElement | null>) => {
      const state = get();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const { x: currentX, y: currentY } = getMousePosition(e, containerRect);

      // Handle panning movement
      if (state.canvas.panState) {
        const deltaX = currentX - state.canvas.panState.startX;
        const deltaY = currentY - state.canvas.panState.startY;
        
        const newOffset = {
          x: state.canvas.panState.initialOffsetX + deltaX,
          y: state.canvas.panState.initialOffsetY + deltaY
        };
        
        get().canvasActions.setPanOffset(newOffset);
        
        // Update background position immediately for canvas grid
        if (containerRef.current) {
          containerRef.current.style.backgroundPosition = `${newOffset.x}px ${newOffset.y}px`;
        }
      }
      
      // Handle drag movement
      if (state.canvas.dragState) {
        const gridSize = state.settings.gridSize;
        const { zoomState } = state.canvas;
        
        // Calculate new position in grid coordinates
        const rawDeltaX = currentX - state.canvas.dragState.startX;
        const rawDeltaY = currentY - state.canvas.dragState.startY;
        
        // Convert pixel deltas to grid deltas, accounting for zoom
        const gridDeltaX = rawDeltaX / (gridSize * zoomState.level);
        const gridDeltaY = rawDeltaY / (gridSize * zoomState.level);
        
        const newX = Math.round(state.canvas.dragState.initialX + gridDeltaX);
        const newY = Math.round(state.canvas.dragState.initialY + gridDeltaY);
        
        if (state.canvas.dragState.isHierarchyDrag) {
          // Hierarchy drag - detect drop targets and update hierarchy state
          const potentialTargets = get().canvasActions.detectDropTargets(currentX, currentY, state.canvas.dragState.id);
          
          // Find the best drop target
          let currentDropTarget: DropTarget | null = null;
          const rectTargets = potentialTargets.filter(target => target.targetId !== null && target.isValid);
          if (rectTargets.length > 0) {
            currentDropTarget = rectTargets[0];
          } else {
            const canvasTarget = potentialTargets.find(target => target.targetId === null);
            if (canvasTarget) {
              currentDropTarget = canvasTarget;
            }
          }
          
          // Update hierarchy drag state
          set(state => ({
            canvas: {
              ...state.canvas,
              hierarchyDragState: state.canvas.hierarchyDragState ? {
                ...state.canvas.hierarchyDragState,
                mousePosition: { x: currentX, y: currentY },
                potentialTargets,
                currentDropTarget
              } : null
            }
          }));
        }
        
        // Move the rectangle (and descendants) using efficient temporary update
        get().rectangleActions.updateRectanglesDuringDrag(rectangles => {
          const draggedRect = rectangles.find(r => r.id === state.canvas.dragState!.id);
          if (!draggedRect) return rectangles;
          
          const actualDeltaX = newX - draggedRect.x;
          const actualDeltaY = newY - draggedRect.y;
          
          // Move entire subtree together
          const descendantIds = new Set(getAllDescendants(state.canvas.dragState!.id, rectangles));
          
          return rectangles.map(rect => {
            if (rect.id === state.canvas.dragState!.id || descendantIds.has(rect.id)) {
              return {
                ...rect,
                x: rect.x + actualDeltaX,
                y: rect.y + actualDeltaY
              };
            }
            return rect;
          });
        });
      }
      
      // Handle resize movement
      if (state.canvas.resizeState) {
        const gridSize = state.settings.gridSize;
        const { zoomState } = state.canvas;
        
        // Calculate new size in grid coordinates
        const rawDeltaX = currentX - state.canvas.resizeState.startX;
        const rawDeltaY = currentY - state.canvas.resizeState.startY;
        
        // Convert pixel deltas to grid deltas, accounting for zoom
        const gridDeltaW = rawDeltaX / (gridSize * zoomState.level);
        const gridDeltaH = rawDeltaY / (gridSize * zoomState.level);
        
        const newW = Math.max(1, Math.round(state.canvas.resizeState.initialW + gridDeltaW));
        const newH = Math.max(1, Math.round(state.canvas.resizeState.initialH + gridDeltaH));
        
        // Update rectangle dimensions using efficient temporary update
        get().rectangleActions.updateRectanglesDuringDrag(rectangles => {
          return rectangles.map(rect => 
            rect.id === state.canvas.resizeState!.id 
              ? { ...rect, w: newW, h: newH }
              : rect
          );
        });
      }
    },

    handleMouseUp: () => {
      const state = get();
      
      // Handle panning mouse up
      if (state.canvas.panState) {
        get().canvasActions.endPan();
      }
      
      // Handle drag/resize mouse up if there's an active operation
      if (state.canvas.dragState || state.canvas.resizeState) {
        // Save final state to history after drag/resize operation
        get().historyActions.saveToHistory();
        
        if (state.canvas.dragState) {
          get().canvasActions.endDrag();
        }
        if (state.canvas.resizeState) {
          get().canvasActions.endResize();
        }
        if (state.canvas.hierarchyDragState) {
          get().canvasActions.endHierarchyDrag();
        }
      }
    },

    handleWheel: (e: WheelEvent, containerRef: React.RefObject<HTMLDivElement | null>) => {
      // Only handle zoom when Ctrl is pressed
      if (!e.ctrlKey) return;
      
      // Prevent default browser zoom behavior
      e.preventDefault();
      e.stopPropagation();
      
      const container = containerRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      
      // Calculate mouse position relative to container
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      // Calculate zoom delta (positive for zoom in, negative for zoom out)
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      
      get().canvasActions.updateZoom(delta, mouseX, mouseY);
    },

    cancelDrag: () => {
      set(state => ({
        canvas: {
          ...state.canvas,
          dragState: null,
          resizeState: null,
          hierarchyDragState: null,
          resizeConstraintState: null,
          initialPositions: null
        }
      }));
    },

    // Internal state management
    setInitialPositions: (positions: Record<string, { x: number; y: number }> | null) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          initialPositions: positions
        }
      }));
    },

    setNeedsLayoutUpdate: (update: { type: 'reparent' | 'resize'; rectangleId?: string } | null) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          needsLayoutUpdate: update
        }
      }));
    },

    setResizeConstraintState: (constraintState: ResizeConstraintState | null) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          resizeConstraintState: constraintState
        }
      }));
    },

    // Computed values for interactions
    isDragging: () => {
      return get().canvas.dragState !== null;
    },

    isResizing: () => {
      return get().canvas.resizeState !== null;
    },

    isPanning: () => {
      return get().canvas.panState !== null;
    },

    isHierarchyDragging: () => {
      return get().canvas.hierarchyDragState !== null;
    },

    // Drop target detection (for hierarchy drag)
    detectDropTargets: (mouseX: number, mouseY: number, draggedRectId: string): DropTarget[] => {
      const state = get();
      const targets: DropTarget[] = [];
      
      // Add canvas background as a potential drop target (makes rectangle a root)
      targets.push({
        targetId: null,
        isValid: true,
        dropType: 'root',
        bounds: { x: 0, y: 0, width: 0, height: 0 } // Canvas background bounds
      });
      
      // Transform mouse coordinates to canvas space (accounting for pan and zoom)
      const canvasMouseX = (mouseX - state.canvas.panOffset.x) / state.canvas.zoomLevel;
      const canvasMouseY = (mouseY - state.canvas.panOffset.y) / state.canvas.zoomLevel;
      
      // Find all rectangles that the mouse is over, sorted by z-index (deepest first)
      const mouseOverRects: Array<{ rect: Rectangle; bounds: { x: number; y: number; width: number; height: number }; zIndex: number }> = [];
      
      state.rectangles.forEach(rect => {
        if (rect.id === draggedRectId) return; // Can't drop on self
        
        // Calculate rectangle bounds in canvas coordinates
        const rectBounds = {
          x: rect.x * state.settings.gridSize,
          y: rect.y * state.settings.gridSize,
          width: rect.w * state.settings.gridSize,
          height: rect.h * state.settings.gridSize
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
            const parent = state.rectangles.find(r => r.id === current.parentId);
            if (!parent) break;
            depth++;
            current = parent;
          }
          
          mouseOverRects.push({ rect, bounds: rectBounds, zIndex: depth });
        }
      });
      
      // Sort by z-index (deepest first) to prioritize nested rectangles
      mouseOverRects.sort((a, b) => b.zIndex - a.zIndex);
      
      // Add valid drop targets
      mouseOverRects.forEach(({ rect, bounds }) => {
        const canReparent = get().getters.canReparent(draggedRectId, rect.id);
        
        targets.push({
          targetId: rect.id,
          isValid: canReparent,
          dropType: 'parent',
          bounds
        });
      });
      
      return targets;
    }
  }
});