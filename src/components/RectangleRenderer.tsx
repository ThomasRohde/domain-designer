import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Rectangle } from '../types';
import { 
  getChildren,
  getZIndex,
  sortRectanglesByDepth,
} from '../utils/layoutUtils';
import { useAppStore } from '../stores/useAppStore';
import RectangleComponent from './RectangleComponent';

interface RectangleRendererProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onContextMenu: (e: React.MouseEvent, rectangleId: string) => void;
}

const RectangleRenderer: React.FC<RectangleRendererProps> = ({
  containerRef,
  onContextMenu,
}) => {
  // Optimized subscriptions using shallow comparison to prevent unnecessary re-renders
  const { rectangles, selectedIds, gridSize } = useAppStore(useShallow(state => ({
    rectangles: state.rectangles,
    selectedIds: state.ui.selectedIds,
    gridSize: state.settings.gridSize
  })));
  
  const selectedId = selectedIds.length > 0 ? selectedIds[0] : null;
  // Performance optimization: Convert selectedIds to Set for O(1) lookup
  const selectedIdsSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  
  // Separate subscriptions for styling to prevent re-renders when only rectangles change
  const { fontFamily, borderRadius, borderColor, borderWidth } = useAppStore(useShallow(state => ({
    fontFamily: state.settings.fontFamily,
    borderRadius: state.settings.borderRadius,
    borderColor: state.settings.borderColor,
    borderWidth: state.settings.borderWidth
  })));
  
  const calculateFontSize = useAppStore(state => state.getters.calculateFontSize);
  
  /**
   * Font settings subscriptions for reactive re-rendering.
   * These subscriptions ensure the component re-renders when font settings change,
   * enabling dynamic font size recalculation across all rectangles.
   */
  const _rootFontSize = useAppStore(state => state.settings.rootFontSize);
  const _dynamicFontSizing = useAppStore(state => state.settings.dynamicFontSizing);
  // Void usage prevents ESLint unused variable warnings while maintaining subscriptions
  void _rootFontSize;
  void _dynamicFontSizing;
  
  /**
   * Canvas interaction states for visual feedback during operations.
   * Optimized with shallow comparison to prevent unnecessary re-renders.
   */
  const canvasState = useAppStore(useShallow(state => ({
    dragState: state.canvas.dragState,
    resizeState: state.canvas.resizeState,
    hierarchyDragState: state.canvas.hierarchyDragState,
    resizeConstraintState: state.canvas.resizeConstraintState,
    virtualDragState: state.canvas.virtualDragState
  })));
  
  const getVirtualPosition = useAppStore(state => state.canvasActions.getVirtualPosition);
  
  // Rectangle manipulation actions from store
  const { setSelectedIds, updateRectangleLabel, toggleSelection } = useAppStore(state => state.rectangleActions);
  const handleRectangleMouseDown = useAppStore(state => state.canvasActions.handleRectangleMouseDown);
  

  /**
   * Mouse event handler factory that injects containerRef for coordinate calculations.
   * Bridges component-level containerRef with store-level mouse handling logic,
   * enabling accurate screen-to-canvas coordinate transformations.
   */
  const onMouseDown = (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => {
    handleRectangleMouseDown(e, rect, action || 'drag', containerRef);
  };
  
  /**
   * Selection handler that supports both regular selection and multi-select toggle.
   * Handles the special case where rectangle ID has "|toggle" suffix for Ctrl+Click.
   */
  const handleRectangleSelect = (idOrToggle: string) => {
    if (idOrToggle.endsWith('|toggle')) {
      const id = idOrToggle.replace('|toggle', '');
      toggleSelection(id);
    } else {
      setSelectedIds([idOrToggle]);
    }
  };

  return (
    <>
      {/* Render all rectangles */}
      {sortRectanglesByDepth(rectangles).map(rect => {
        /**
         * Calculate rectangle interaction states for visual feedback.
         * These states determine visual appearance during drag operations,
         * hierarchy reparenting, and resize constraints.
         */
        const dropTarget = canvasState.hierarchyDragState?.potentialTargets.find(target => target.targetId === rect.id);
        const isDropTarget = dropTarget !== undefined;
        const isValidDropTarget = dropTarget?.isValid || false;
        const isCurrentDropTarget = canvasState.hierarchyDragState?.currentDropTarget?.targetId === rect.id || false;
        const isBeingDragged = canvasState.hierarchyDragState?.draggedRectangleId === rect.id || false;
        const isDragActive = canvasState.dragState !== null || canvasState.hierarchyDragState !== null;
        const isResizeActive = canvasState.resizeState !== null;
        const isBeingResized = canvasState.resizeState?.id === rect.id;
        const isAtMinSize = canvasState.resizeConstraintState?.rectangleId === rect.id && 
                           (canvasState.resizeConstraintState?.isAtMinWidth || canvasState.resizeConstraintState?.isAtMinHeight);
        
        // Selection state calculation (optimized with Set for O(1) lookup)
        const isInSelection = selectedIdsSet.has(rect.id);
        const isMultiSelected = isInSelection && selectedIds.length > 1;
        
        // Get virtual position for performance optimization during drag operations
        const virtualPosition = canvasState.virtualDragState?.isActive ? getVirtualPosition(rect.id) : null;
        
        return (
          <RectangleComponent
            key={rect.id}
            rectangle={rect}
            isSelected={isInSelection && selectedIds.length === 1}
            isMultiSelected={isMultiSelected}
            selectedCount={selectedIds.length}
            zIndex={getZIndex(rect, rectangles, selectedId, canvasState.dragState, canvasState.resizeState, canvasState.hierarchyDragState)}
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
            onSelect={handleRectangleSelect}
            onUpdateLabel={updateRectangleLabel}
            // Drag/resize permissions based on hierarchy and manual positioning settings
            canDrag={!rect.parentId || Boolean(rect.parentId && rectangles.find(r => r.id === rect.parentId)?.isManualPositioningEnabled)}
            canResize={(() => {
              const hasChildren = getChildren(rect.id, rectangles).length > 0;
              return (
                !rect.parentId || // Root rectangles can always be resized
                (!hasChildren && rect.parentId && Boolean(rectangles.find(r => r.id === rect.parentId)?.isManualPositioningEnabled)) || // Leaf rectangles under unlocked parents
                (hasChildren && Boolean(rect.isManualPositioningEnabled)) // Parent rectangles that are themselves unlocked
              );
            })()}
            childCount={getChildren(rect.id, rectangles).length}
            gridSize={gridSize}
            fontSize={calculateFontSize(rect.id)}
            fontFamily={fontFamily}
            isDropTarget={isDropTarget}
            isValidDropTarget={isValidDropTarget}
            isCurrentDropTarget={isCurrentDropTarget}
            isBeingDragged={isBeingDragged}
            isHierarchyDragActive={canvasState.hierarchyDragState !== null}
            isDragActive={isDragActive}
            isResizeActive={isResizeActive}
            isBeingResized={isBeingResized}
            isAtMinSize={isAtMinSize}
            borderRadius={borderRadius}
            borderColor={borderColor}
            borderWidth={borderWidth}
            virtualPosition={virtualPosition}
          />
        );
      })}
    </>
  );
};

export default React.memo(RectangleRenderer);
