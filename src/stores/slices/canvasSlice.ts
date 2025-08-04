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
  ResizeConstraintState,
  VirtualDragPosition
} from '../../types';
import type { SliceCreator, CanvasState, CanvasActions } from '../types';
import { getAllDescendants } from '../../utils/layoutUtils';
import { getMousePosition, preventEventDefault, shouldStartPan } from '../../utils/eventUtils';
import { 
  constrainBulkMovement, 
  captureRelativePositions,
  applyRelativePositioning 
} from '../../utils/collisionUtils';

import { throttlePositionUpdate } from '../../utils/throttleUtils';

/**
 * Canvas state slice managing all user interactions with the drawing surface.
 * Handles drag/drop, resize, pan, zoom, and hierarchy operations with
 * coordinate transformations and constraint validation.
 */
export interface CanvasSlice {
  canvas: CanvasState;
  canvasActions: CanvasActions;
}

/**
 * Creates the canvas slice managing all drawing surface interactions.
 * Provides comprehensive state management for mouse/keyboard interactions,
 * coordinate transformations, and visual feedback systems.
 */
export const createCanvasSlice: SliceCreator<CanvasSlice> = (set, get) => {
  // Critical throttled virtual drag update with cancellation support for drag synchronization fixes
  // Limits updates to 120fps (8ms) to prevent excessive state mutations while maintaining smooth feedback
  // The cancellation mechanism prevents children from racing past cursor during drag operations
  const throttledVirtualDragUpdate = throttlePositionUpdate((deltaX: number, deltaY: number) => {
    const state = get();
    const { virtualDragState } = state.canvas;
    if (!virtualDragState.isActive) return;

    // Update all virtual positions with delta movement using precise coordinate transformation
    // Grid-based positioning ensures pixel-perfect alignment and prevents floating-point drift
    const updatedPositions = new Map(virtualDragState.positions);
    
    // Apply delta transformation to all virtual positions while maintaining grid alignment
    virtualDragState.positions.forEach((position, id) => {
      updatedPositions.set(id, {
        ...position,
        x: Math.max(0, Math.round(position.initialX + deltaX)), // Constrain to positive grid coordinates
        y: Math.max(0, Math.round(position.initialY + deltaY))  // Round to prevent sub-pixel positioning
      });
    });

    set(state => ({
      canvas: {
        ...state.canvas,
        virtualDragState: {
          ...virtualDragState,
          positions: updatedPositions
        }
      }
    }));
  }, 8); // 120fps throttling balances performance with visual smoothness during multi-select drags

  return ({
  // Initial canvas state with default viewport and interaction settings
  canvas: {
    panOffset: { x: 0, y: 0 },     // Current viewport pan offset in screen pixels
    zoomState: {                  // Enhanced zoom state with constraints for UI stability
      level: 1.0,
      centerX: 0,
      centerY: 0,
      minLevel: 0.1,              // Prevent excessive zoom-out that breaks interactions
      maxLevel: 3.0               // Prevent excessive zoom-in that impacts performance
    },
    panState: null,               // Active panning operation state
    dragState: null,              // Active drag operation state
    resizeState: null,            // Active resize operation state
    hierarchyDragState: null,     // Active hierarchy reparenting state
    resizeConstraintState: null,  // Resize constraint feedback state
    isSpacePressed: false,        // Space key state for pan mode
    isKeyboardMoving: false,      // Keyboard movement feedback state
    initialPositions: null,       // Cached positions for drag operations
    needsLayoutUpdate: null,      // Layout update requirements
    keyboardTimeoutId: null,      // Debounce timer for keyboard feedback
    multiSelectDragInitialPositions: null,  // Initial positions for bulk drag operations
    multiSelectRelativePositions: null,     // Relative positions for bulk drag operations
    minimapVisible: true,         // Navigation minimap visibility (default: visible for spatial awareness)
    virtualDragState: {           // Virtual drag layer for multi-select performance optimization
      positions: new Map(),       // Maps rectangle IDs to virtual positions during drag
      isActive: false,            // Whether virtual layer is currently handling drag operations
      primaryDraggedId: null      // ID of the primary rectangle being dragged
    }
  },

  // Canvas interaction actions
  canvasActions: {
    /**
     * Drag operation management
     * Handles both regular dragging and hierarchy reparenting operations
     */
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
      // CRITICAL: Cancel pending throttled updates to prevent drag synchronization issues
      // This prevents rectangles from continuing to move after mouse release
      throttledVirtualDragUpdate.cancel();
      
      // Clear virtual drag state only for multi-select operations
      // Single rectangle drags use direct atomic movement and don't need virtual layer cleanup
      const state = get();
      if (state.canvas.virtualDragState.isActive && state.canvas.dragState?.isMultiSelectDrag) {
        set(prevState => ({
          canvas: {
            ...prevState.canvas,
            virtualDragState: {
              positions: new Map(),
              isActive: false,
              primaryDraggedId: null
            }
          }
        }));
      }
      
      set(state => ({
        canvas: {
          ...state.canvas,
          dragState: null,
          initialPositions: null
        }
      }));
    },

    /**
     * Resize operation management
     * Handles rectangle resizing with constraint validation and visual feedback
     */
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

    /**
     * Hierarchy drag operation management
     * Handles reparenting operations with drop target detection and validation
     */
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
      // CRITICAL: Cancel pending throttled updates to prevent coordinate desynchronization
      // Essential for hierarchy drag operations to maintain parent-child positioning accuracy
      throttledVirtualDragUpdate.cancel();
      
      // Hierarchy drag uses direct atomic movement like keyboard input for perfect synchronization
      // No virtual drag state cleanup needed since it operates on actual rectangle positions
      set(state => ({
        canvas: {
          ...state.canvas,
          hierarchyDragState: null,
          dragState: null,
          initialPositions: null
        }
      }));
    },

    /**
     * Viewport panning management
     * Controls canvas pan offset for navigation across large diagrams
     */
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

    /**
     * Zoom level management with constraint enforcement
     * Maintains zoom within usable bounds to prevent UI issues
     */
    setZoomLevel: (level: number) => {
      set(state => ({
        canvas: {
          ...state.canvas,
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
        }
      }));
    },

    /**
     * Mouse-wheel zoom with center-point preservation and coordinate transformation.
     * Implements zoom-to-cursor behavior by transforming screen coordinates to content space,
     * applying zoom transformation, then calculating required pan offset adjustments.
     * 
     * Coordinate transformation process:
     * 1. Transform screen mouse position to content coordinates (pre-zoom)
     * 2. Apply zoom level transformation to content coordinates
     * 3. Calculate pan offset to keep cursor position visually fixed
     */
    updateZoom: (delta: number, mouseX: number, mouseY: number) => {
      set(state => {
        const currentLevel = state.canvas.zoomState.level;
        const newLevel = Math.max(
          state.canvas.zoomState.minLevel, 
          Math.min(state.canvas.zoomState.maxLevel, currentLevel + delta)
        );
        
        // Skip update if zoom level unchanged (performance optimization)
        if (newLevel === currentLevel) return state;
        
        // Critical coordinate transformation: screen space → content space
        // Accounts for current pan offset and zoom level to find actual content position under cursor
        const contentX = (mouseX - state.canvas.panOffset.x) / currentLevel;
        const contentY = (mouseY - state.canvas.panOffset.y) / currentLevel;
        
        // Apply new zoom level to content coordinates to determine new screen position
        // This calculates where the content point will be positioned after zoom transformation
        const newContentX = contentX * newLevel;
        const newContentY = contentY * newLevel;
        
        // Calculate required pan offset adjustment to maintain cursor position
        // Formula: new_pan = mouse_screen_pos - (content_pos * new_zoom_level)
        const newPanOffsetX = mouseX - newContentX;
        const newPanOffsetY = mouseY - newContentY;

        return {
          canvas: {
            ...state.canvas,
            zoomState: {
              ...state.canvas.zoomState,
              level: newLevel,
              centerX: mouseX,
              centerY: mouseY
            },
            panOffset: {
              x: newPanOffsetX,
              y: newPanOffsetY
            }
          }
        };
      });
    },

    /**
     * Space key state management for pan mode activation.
     * Automatically ends panning when space is released to ensure
     * consistent interaction state.
     */
    setIsSpacePressed: (pressed: boolean) => {
      set(state => ({
        canvas: {
          ...state.canvas,
          isSpacePressed: pressed
        }
      }));
      
      // Auto-end panning when space key is released
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

    /**
     * Keyboard movement feedback system with debounced reset.
     * Provides visual feedback during arrow key movement and automatically
     * clears the feedback state after movement stops. Uses debouncing to
     * prevent flickering during rapid key presses.
     */
    startKeyboardMovement: () => {
      const state = get();
      
      // Clear existing timeout to reset debounce timer
      if (state.canvas.keyboardTimeoutId) {
        clearTimeout(state.canvas.keyboardTimeoutId);
      }
      
      // Activate keyboard movement feedback
      set(prevState => ({
        canvas: {
          ...prevState.canvas,
          isKeyboardMoving: true
        }
      }));
      
      // Debounced reset after movement stops
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

    /**
     * Canvas mouse down handler for panning and selection clearing.
     * Manages pan initiation and deselection of rectangles when clicking
     * empty canvas areas. Handles both middle-click and space+click panning.
     */
    handleCanvasMouseDown: (e: React.MouseEvent, containerRef: React.RefObject<HTMLDivElement | null>) => {
      const state = get();
      
      // Initialize panning for middle-click or space+left-click
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
      
      // Clear selection when clicking empty canvas area
      if (e.button === 0 && !state.canvas.isSpacePressed) {
        get().rectangleActions.clearSelection();
      }
    },

    /**
     * Rectangle mouse down handler for drag, resize, and hierarchy operations.
     * Manages coordinate transformation, history saving, and operation-specific
     * initialization. Handles constraint validation and position caching.
     */
    handleRectangleMouseDown: (e: React.MouseEvent, rect: Rectangle, action: 'drag' | 'resize' | 'hierarchy-drag' = 'drag', containerRef: React.RefObject<HTMLDivElement | null>) => {
      preventEventDefault(e);
      
      const state = get();
      
      // Save state to history before starting drag operation (asynchronous to prevent UI blocking)
      get().historyActions.saveToHistory();

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const { x: startX, y: startY } = getMousePosition(e, containerRect);

      if (action === 'drag') {
        // Check if this rectangle is part of a multi-selection
        const selectedIds = state.ui.selectedIds;
        const isMultiSelectDrag = selectedIds.length > 1 && selectedIds.includes(rect.id);
        
        if (isMultiSelectDrag) {
          // Multi-select bulk drag: validate drag permissions for all selected rectangles
          // Ensures all rectangles are in manually-positioned parents or are root rectangles
          const canBulkMove = selectedIds.every(id => {
            const rectangle = state.rectangles.find(r => r.id === id);
            if (!rectangle) return false;
            
            if (rectangle.parentId) {
              const parent = state.rectangles.find(r => r.id === rectangle.parentId);
              return parent?.isManualPositioningEnabled || false;
            }
            return true; // Root rectangles can always be moved
          });
          
          if (!canBulkMove) {
            return; // Cannot perform bulk drag if any rectangle is in auto-layout parent
          }
          
          // Cache initial positions for coordinate system consistency during bulk drag operations
          // Includes descendants to maintain hierarchical group movement integrity
          const positions: Record<string, { x: number; y: number }> = {};
          const allAffectedIds = new Set<string>();
          
          // Collect all rectangles that will be moved (selected + their descendants)
          selectedIds.forEach(id => {
            allAffectedIds.add(id);
            const descendantIds = getAllDescendants(id, state.rectangles);
            descendantIds.forEach(descendantId => allAffectedIds.add(descendantId));
          });
          
          // Store initial positions for all affected rectangles
          state.rectangles.forEach(r => {
            if (allAffectedIds.has(r.id)) {
              positions[r.id] = { x: r.x, y: r.y };
            }
          });
          
          // Start multi-select drag operation with all affected IDs (including descendants)
          const allAffectedIdsArray = Array.from(allAffectedIds);
          get().canvasActions.startMultiSelectDragWithDescendants(positions, allAffectedIdsArray);
          
          // Initialize virtual drag layer for smooth multi-select performance
          // Virtual layer provides immediate visual feedback without expensive state updates
          get().canvasActions.startVirtualDrag(rect.id, allAffectedIdsArray, positions);
          
          // Also set up regular drag state for mouse tracking
          get().canvasActions.startDrag({
            id: rect.id,
            startX,
            startY,
            initialX: rect.x,
            initialY: rect.y,
            isMultiSelectDrag: true // Flag to indicate this is a multi-select drag
          });
        } else {
          // Single rectangle drag: validate drag permissions based on hierarchy and manual positioning
          if (rect.parentId) {
            const parent = state.rectangles.find(r => r.id === rect.parentId);
            if (!parent?.isManualPositioningEnabled) {
              return; // Cannot drag children of auto-layout parents
            }
          }
          
          // Cache initial positions for the entire subtree (for group movement)
          const descendantIds = new Set(getAllDescendants(rect.id, state.rectangles));
          const positions: Record<string, { x: number; y: number }> = {};
          
          // Store position of the primary dragged rectangle
          positions[rect.id] = { x: rect.x, y: rect.y };
          
          // Store positions of all descendants for consistent group movement
          state.rectangles.forEach(r => {
            if (descendantIds.has(r.id)) {
              positions[r.id] = { x: r.x, y: r.y };
            }
          });
          
          get().canvasActions.setInitialPositions(positions);
          
          // CRITICAL CHANGE: Skip virtual drag layer for single rectangles
          // Use direct atomic movement to ensure perfect parent-child synchronization
          // This matches keyboard movement behavior and prevents coordinate drift
          
          get().canvasActions.startDrag({
            id: rect.id,
            startX,
            startY,
            initialX: rect.x, // Grid coordinates for precise positioning
            initialY: rect.y  // Grid coordinates for precise positioning
          });
        }
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
        
        // CRITICAL: Use direct atomic movement for hierarchy drag operations
        // Prevents coordinate desynchronization during reparenting by moving rectangles immediately
        // This approach matches keyboard movement and ensures pixel-perfect parent-child alignment
        
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

    /**
     * Global mouse move handler for all canvas interactions.
     * Manages panning, dragging, resizing, and hierarchy operations with
     * coordinate transformations and real-time visual feedback.
     */
    handleMouseMove: (e: MouseEvent, containerRef: React.RefObject<HTMLDivElement | null>) => {
      const state = get();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const { x: currentX, y: currentY } = getMousePosition(e, containerRect);

      // Handle viewport panning with immediate visual feedback
      if (state.canvas.panState) {
        const deltaX = currentX - state.canvas.panState.startX;
        const deltaY = currentY - state.canvas.panState.startY;
        
        const newOffset = {
          x: state.canvas.panState.initialOffsetX + deltaX,
          y: state.canvas.panState.initialOffsetY + deltaY
        };
        
        get().canvasActions.setPanOffset(newOffset);
        
        // Immediate background grid update for smooth panning feedback
        if (containerRef.current) {
          containerRef.current.style.backgroundPosition = `${newOffset.x}px ${newOffset.y}px`;
        }
      }
      
      // Handle drag movement using virtual drag layer for optimal performance
      if (state.canvas.dragState) {
        const gridSize = state.settings.gridSize;
        const { zoomState } = state.canvas;
        
        // Transform screen-space mouse movement to grid-space coordinate deltas
        // Critical for maintaining precision and preventing coordinate system drift
        const rawDeltaX = currentX - state.canvas.dragState.startX;
        const rawDeltaY = currentY - state.canvas.dragState.startY;
        
        // CRITICAL COORDINATE TRANSFORMATION: pixel deltas → grid deltas
        // Accounts for both grid size and zoom level to maintain positioning accuracy
        // This prevents rectangles from racing past the cursor during drag operations
        const gridDeltaX = rawDeltaX / (gridSize * zoomState.level);
        const gridDeltaY = rawDeltaY / (gridSize * zoomState.level);
        
        // Calculate absolute target position in grid coordinates from drag start position
        // Uses initial position as reference to prevent cumulative coordinate drift
        const newX = Math.max(0, Math.round(state.canvas.dragState.initialX + gridDeltaX));
        const newY = Math.max(0, Math.round(state.canvas.dragState.initialY + gridDeltaY));
        
        if (state.canvas.dragState.isHierarchyDrag) {
          // Hierarchy drag: detect valid drop targets and provide visual feedback
          const potentialTargets = get().canvasActions.detectDropTargets(currentX, currentY, state.canvas.dragState.id);
          
          // Prioritize rectangle targets over canvas background
          let currentDropTarget: DropTarget | null = null;
          const rectTargets = potentialTargets.filter(target => target.targetId !== null && target.isValid);
          if (rectTargets.length > 0) {
            currentDropTarget = rectTargets[0]; // Use deepest valid target
          } else {
            const canvasTarget = potentialTargets.find(target => target.targetId === null);
            if (canvasTarget) {
              currentDropTarget = canvasTarget; // Fallback to canvas (make root)
            }
          }
          
          // Update hierarchy drag state with current drop target information
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
          
          // Move rectangle during hierarchy drag using absolute positioning
          // Calculate incremental pixel delta from current position to prevent coordinate accumulation
          const rect = state.rectangles.find(r => r.id === state.canvas.dragState!.id);
          if (rect) {
            // Convert grid coordinate difference to pixel movement for moveRectangleDuringDrag API
            const pixelDeltaX = (newX - rect.x) * state.settings.gridSize;
            const pixelDeltaY = (newY - rect.y) * state.settings.gridSize;
            get().rectangleActions.moveRectangleDuringDrag(state.canvas.dragState!.id, pixelDeltaX, pixelDeltaY);
          }
        }
        
        // CRITICAL SYNCHRONIZATION FIX: Use direct pixel-based movement like keyboard input
        // This atomic approach ensures parent and children move together perfectly
        // Prevents the coordinate desync issues that occurred with virtual drag layer
        if (state.canvas.dragState.isMultiSelectDrag) {
          // Multi-select drag: use existing bulk movement logic with grid deltas
          if (state.canvas.virtualDragState.isActive) {
            const deltaX = gridDeltaX;
            const deltaY = gridDeltaY;
            throttledVirtualDragUpdate.update(deltaX, deltaY);
          }
        } else {
          // CRITICAL: Single rectangle drag uses atomic movement for perfect synchronization
          // Calculate pixel delta from current position to target position for precise movement
          // This approach prevents parent-child coordinate drift during drag operations
          const rect = state.rectangles.find(r => r.id === state.canvas.dragState!.id);
          if (rect) {
            // Transform grid coordinate delta to pixel delta for moveRectangleDuringDrag API
            // Use during-drag version to prevent history pollution
            const pixelDeltaX = (newX - rect.x) * state.settings.gridSize;
            const pixelDeltaY = (newY - rect.y) * state.settings.gridSize;
            get().rectangleActions.moveRectangleDuringDrag(state.canvas.dragState!.id, pixelDeltaX, pixelDeltaY);
          }
        }
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
      
      // CRITICAL DRAG SYNCHRONIZATION FIX: Cancel all pending throttled updates immediately
      // Prevents rectangles from continuing to move after mouse release due to throttled updates
      // This was the core issue causing children to race past cursor during drag operations
      throttledVirtualDragUpdate.cancel();
      
      // Handle panning mouse up
      if (state.canvas.panState) {
        get().canvasActions.endPan();
      }
      
      // Handle drag/resize mouse up if there's an active operation
      if (state.canvas.dragState || state.canvas.resizeState) {
        // Handle hierarchy drag completion BEFORE saving to history
        if (state.canvas.hierarchyDragState && state.canvas.dragState?.isHierarchyDrag) {
          const { draggedRectangleId, currentDropTarget } = state.canvas.hierarchyDragState;
          
          if (currentDropTarget && currentDropTarget.isValid) {
            // Check if dropping on the original parent (no-op operation)
            const draggedRect = state.rectangles.find(r => r.id === draggedRectangleId);
            const originalParentId = draggedRect?.parentId || null;
            
            if (currentDropTarget.targetId !== originalParentId) {
              // Perform the reparenting operation
              const success = get().rectangleActions.reparentRectangle(draggedRectangleId, currentDropTarget.targetId);
              if (success) {
                console.log(`✅ Reparented ${draggedRectangleId} to ${currentDropTarget.targetId || 'root'}`);
              }
            }
          }
        }
        
        // Handle multi-select drag completion before saving to history
        if (state.canvas.dragState?.isMultiSelectDrag && state.canvas.multiSelectDragInitialPositions) {
          // End multi-select drag and apply final positions
          get().canvasActions.endMultiSelectDrag(true);
        }
        
        // Commit virtual drag positions for multi-select drags only
        // Single rectangle drags use direct atomic movement and don't need virtual layer
        if (state.canvas.virtualDragState.isActive && state.canvas.dragState?.isMultiSelectDrag) {
          get().canvasActions.commitVirtualDrag();
        }
        
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
      // Cancel any pending throttled updates to prevent position desync
      throttledVirtualDragUpdate.cancel();
      
      // Cancel virtual drag without applying changes
      get().canvasActions.cancelVirtualDrag();
      
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

    /**
     * Multi-select drag operations
     * Manages bulk drag state and initial positions for multi-select operations
     */
    startMultiSelectDrag: (initialPositions: Record<string, { x: number; y: number }>) => {
      const state = get();
      const { selectedIds } = state.ui;
      
      // Capture relative positions for preserving spacing
      const relativePositions = captureRelativePositions(selectedIds, state.rectangles);
      
      set(state => ({
        canvas: {
          ...state.canvas,
          multiSelectDragInitialPositions: initialPositions,
          multiSelectRelativePositions: relativePositions
        }
      }));
    },

    startMultiSelectDragWithDescendants: (initialPositions: Record<string, { x: number; y: number }>, allAffectedIds: string[]) => {
      const state = get();
      
      // Capture relative positions for all affected rectangles (including descendants)
      const relativePositions = captureRelativePositions(allAffectedIds, state.rectangles);
      
      set(state => ({
        canvas: {
          ...state.canvas,
          multiSelectDragInitialPositions: initialPositions,
          multiSelectRelativePositions: relativePositions
        }
      }));
    },

    updateMultiSelectDrag: (deltaX: number, deltaY: number) => {
      const state = get();
      const { multiSelectDragInitialPositions, multiSelectRelativePositions } = state.canvas;
      const { selectedIds } = state.ui;
      const { settings } = state;
      
      if (!multiSelectDragInitialPositions || !multiSelectRelativePositions || selectedIds.length === 0) return;

      // Apply collision detection and constraint the movement using initial positions
      const marginSettings = { margin: settings.margin, labelMargin: settings.labelMargin };
      
      // Create rectangles array with initial positions for boundary calculation
      const rectanglesWithInitialPositions = state.rectangles.map(rect => {
        const initialPos = multiSelectDragInitialPositions[rect.id];
        if (initialPos) {
          return { ...rect, x: initialPos.x, y: initialPos.y };
        }
        return rect;
      });
      
      const constrainedMovement = constrainBulkMovement(selectedIds, deltaX, deltaY, rectanglesWithInitialPositions, marginSettings);
      
      const finalDeltaX = constrainedMovement.deltaX;
      const finalDeltaY = constrainedMovement.deltaY;

      // Calculate new reference position from initial positions (not current positions to avoid drift)
      const initialPositions = Object.values(multiSelectDragInitialPositions);
      if (initialPositions.length === 0) return;
      
      const initialMinX = Math.min(...initialPositions.map(pos => pos.x));
      const initialMinY = Math.min(...initialPositions.map(pos => pos.y));
      
      const newReferenceX = initialMinX + finalDeltaX;
      const newReferenceY = initialMinY + finalDeltaY;

      // Apply relative positioning to maintain spacing for all affected rectangles (including descendants)
      const allAffectedIds = Array.from(multiSelectRelativePositions.keys());
      get().rectangleActions.updateRectanglesDuringDrag((rectangles) => {
        return applyRelativePositioning(
          allAffectedIds,
          newReferenceX,
          newReferenceY,
          multiSelectRelativePositions,
          rectangles
        );
      });
    },

    endMultiSelectDrag: (applyChanges: boolean = true) => {
      const state = get();
      const { multiSelectDragInitialPositions } = state.canvas;
      
      if (applyChanges && multiSelectDragInitialPositions) {
        // Apply final positions with history for all affected rectangles (including descendants)
        const allAffectedIds = Object.keys(multiSelectDragInitialPositions);
        const finalPositions = new Map<string, { x: number; y: number }>();
        
        // Calculate final positions for all affected rectangles
        state.rectangles.forEach(rect => {
          if (allAffectedIds.includes(rect.id)) {
            finalPositions.set(rect.id, { x: rect.x, y: rect.y });
          }
        });
        
        // Apply changes to get the final rectangle state with history
        get().rectangleActions.setRectanglesWithHistory(
          state.rectangles.map(rect => {
            const finalPos = finalPositions.get(rect.id);
            return finalPos ? { ...rect, x: finalPos.x, y: finalPos.y } : rect;
          })
        );
      }
      
      // Clear multi-select drag state
      set(state => ({
        canvas: {
          ...state.canvas,
          multiSelectDragInitialPositions: null,
          multiSelectRelativePositions: null
        }
      }));
    },

    /**
     * Drop target detection for hierarchy drag operations.
     * Finds all valid drop targets under the mouse cursor, considering
     * z-order, reparenting constraints, and coordinate transformations.
     * Returns targets sorted by priority (deepest valid targets first).
     */
    detectDropTargets: (mouseX: number, mouseY: number, draggedRectId: string): DropTarget[] => {
      const state = get();
      const targets: DropTarget[] = [];
      
      // Canvas background as root parent option (always available)
      targets.push({
        targetId: null,
        isValid: true,
        dropType: 'root',
        bounds: { x: 0, y: 0, width: 0, height: 0 } // Infinite canvas bounds
      });
      
      // Critical coordinate transformation: screen space → canvas space
      // Accounts for viewport pan offset and zoom level to determine actual content coordinates
      const canvasMouseX = (mouseX - state.canvas.panOffset.x) / state.canvas.zoomState.level;
      const canvasMouseY = (mouseY - state.canvas.panOffset.y) / state.canvas.zoomState.level;
      
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
        
        // Precise hit detection using transformed canvas-space coordinates
        // Ensures accurate drop target detection regardless of zoom/pan state
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
    },

    /**
     * Navigation minimap control actions.
     * 
     * The minimap provides spatial awareness for large diagrams and enables
     * quick navigation to any part of the canvas. These actions manage:
     * - Visibility toggling (M key or toolbar button)
     * - Jump-to-position navigation from minimap clicks
     */
    toggleMinimap: () => {
      set(state => ({
        canvas: {
          ...state.canvas,
          minimapVisible: !state.canvas.minimapVisible
        }
      }));
    },

    /**
     * Navigate to a specific position by centering it in the viewport.
     * 
     * @param x - Target X position in pixel coordinates (grid units * gridSize)
     * @param y - Target Y position in pixel coordinates (grid units * gridSize)
     * @param containerWidth - Optional actual container width (fallback to approximation)
     * @param containerHeight - Optional actual container height (fallback to approximation)
     * 
     * This is called when users click on the minimap. The minimap converts
     * click positions to grid coordinates, then to pixel coordinates before
     * calling this function. The function calculates the pan offset needed
     * to center the target position in the current viewport.
     */
    jumpToPosition: (x: number, y: number, containerWidth?: number, containerHeight?: number) => {
      set(state => {
        // Calculate viewport center position accounting for current zoom level
        // Target position comes in as pixel coordinates from minimap click
        
        // Use actual container dimensions if provided, fallback to approximation
        // This ensures accurate navigation across different screen sizes and layouts
        const viewportWidth = containerWidth || window.innerWidth * 0.7;
        const viewportHeight = containerHeight || window.innerHeight * 0.8;
        
        // Calculate pan offset to place target position at viewport center
        // Formula: pan_offset = (viewport_center) - (target * zoom_level)
        const newPanX = (viewportWidth / 2) - x * state.canvas.zoomState.level;
        const newPanY = (viewportHeight / 2) - y * state.canvas.zoomState.level;
        
        return {
          canvas: {
            ...state.canvas,
            panOffset: {
              x: newPanX,
              y: newPanY
            }
          }
        };
      });
    },

    /**
     * Virtual drag layer actions for performance optimization.
     * 
     * These actions manage a virtual positioning layer that provides immediate
     * visual feedback during drag operations without triggering expensive 
     * state updates and re-renders. The virtual layer uses CSS transforms
     * for smooth 60fps performance regardless of rectangle count.
     */

    /**
     * Initialize virtual drag layer with affected rectangles.
     * 
     * @param primaryId - Main rectangle being dragged (for interaction logic)
     * @param affectedIds - All rectangles that will move (including descendants)
     * @param initialPositions - Starting positions for all affected rectangles
     */
    startVirtualDrag: (primaryId: string, affectedIds: string[], initialPositions: Record<string, { x: number; y: number }>) => {
      set(state => {
        const positions = new Map<string, VirtualDragPosition>();
        
        // Initialize virtual positions for all affected rectangles
        affectedIds.forEach(id => {
          const initialPos = initialPositions[id];
          if (initialPos) {
            positions.set(id, {
              x: initialPos.x,
              y: initialPos.y,
              initialX: initialPos.x,
              initialY: initialPos.y
            });
          }
        });

        return {
          canvas: {
            ...state.canvas,
            virtualDragState: {
              positions,
              isActive: true,
              primaryDraggedId: primaryId
            }
          }
        };
      });
    },

    /**
     * Update virtual positions for all dragged rectangles in real-time.
     * This method provides immediate visual feedback without triggering
     * expensive rectangle state updates or component re-renders.
     * 
     * @param deltaX - Horizontal movement in grid units from initial position
     * @param deltaY - Vertical movement in grid units from initial position
     */
    updateVirtualDragPositions: (deltaX: number, deltaY: number) => {
      set(state => {
        const { virtualDragState } = state.canvas;
        if (!virtualDragState.isActive) return state;

        // Update all virtual positions with the delta movement
        const updatedPositions = new Map(virtualDragState.positions);
        
        virtualDragState.positions.forEach((position, id) => {
          updatedPositions.set(id, {
            ...position,
            x: Math.max(0, Math.round(position.initialX + deltaX)), // Constrain to positive coordinates
            y: Math.max(0, Math.round(position.initialY + deltaY))
          });
        });

        return {
          canvas: {
            ...state.canvas,
            virtualDragState: {
              ...virtualDragState,
              positions: updatedPositions
            }
          }
        };
      });
    },

    /**
     * Apply virtual positions to actual rectangle state and clear virtual layer.
     * This commits the visual changes to the permanent state and triggers
     * a final re-render with the updated positions.
     */
    commitVirtualDrag: () => {
      const state = get();
      const { virtualDragState } = state.canvas;
      
      if (!virtualDragState.isActive || virtualDragState.positions.size === 0) return;

      // Apply virtual positions to actual rectangles
      const updatedRectangles = state.rectangles.map(rect => {
        const virtualPos = virtualDragState.positions.get(rect.id);
        if (virtualPos) {
          return {
            ...rect,
            x: virtualPos.x,
            y: virtualPos.y
          };
        }
        return rect;
      });

      // Update rectangles and clear virtual state in a single operation
      set(state => ({
        rectangles: updatedRectangles,
        canvas: {
          ...state.canvas,
          virtualDragState: {
            positions: new Map(),
            isActive: false,
            primaryDraggedId: null
          }
        }
      }));
    },

    /**
     * Clear virtual drag layer without applying changes.
     * Used when canceling drag operations (e.g., ESC key).
     */
    cancelVirtualDrag: () => {
      set(state => ({
        canvas: {
          ...state.canvas,
          virtualDragState: {
            positions: new Map(),
            isActive: false,
            primaryDraggedId: null
          }
        }
      }));
    },

    /**
     * Get current virtual position for a specific rectangle.
     * Returns null if rectangle is not in virtual drag layer.
     * 
     * @param rectangleId - ID of rectangle to query
     * @returns Virtual position or null if not found
     */
    getVirtualPosition: (rectangleId: string): VirtualDragPosition | null => {
      const state = get();
      return state.canvas.virtualDragState.positions.get(rectangleId) || null;
    }
  }
  });
};