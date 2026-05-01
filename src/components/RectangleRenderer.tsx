import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Rectangle } from '../types';
import {
  buildRectangleRenderIndex,
  calculateIndexedFontSize,
  getIndexedZIndex,
} from '../utils/rectangleIndexUtils';
import { calculateHeatmapColor } from '../utils/heatmapColors';
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
  const { rectangles, selectedIds, gridSize, labelMargin } = useAppStore(useShallow(state => ({
    rectangles: state.rectangles,
    selectedIds: state.ui.selectedIds,
    gridSize: state.settings.gridSize,
    labelMargin: state.settings.labelMargin
  })));
  
  const selectedId = selectedIds.length > 0 ? selectedIds[0] : null;
  // Performance optimization: Convert selectedIds to Set for O(1) lookup
  const selectedIdsSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const renderIndex = React.useMemo(() => buildRectangleRenderIndex(rectangles), [rectangles]);
  
  // Separate subscriptions for styling to prevent re-renders when only rectangles change
  const { 
    fontFamily, borderRadius, borderColor, borderWidth
  } = useAppStore(useShallow(state => ({
    fontFamily: state.settings.fontFamily,
    borderRadius: state.settings.borderRadius,
    borderColor: state.settings.borderColor,
    borderWidth: state.settings.borderWidth
  })));
  
  // Direct subscriptions to font settings for reactive calculations
  const rootFontSize = useAppStore(state => state.settings.rootFontSize);
  const dynamicFontSizing = useAppStore(state => state.settings.dynamicFontSizing);

  const heatmap = useAppStore(useShallow(state => ({
    enabled: state.heatmap.enabled,
    selectedPaletteId: state.heatmap.selectedPaletteId,
    palettes: state.heatmap.palettes,
    undefinedValueColor: state.heatmap.undefinedValueColor
  })));

  const selectedPalette = React.useMemo(
    () => heatmap.palettes.find(palette => palette.id === heatmap.selectedPaletteId),
    [heatmap.palettes, heatmap.selectedPaletteId]
  );

  const getHeatmapColorForRectangle = React.useCallback((rect: Rectangle) => {
    if (!heatmap.enabled) return null;
    return calculateHeatmapColor(rect.heatmapValue, selectedPalette, heatmap.undefinedValueColor);
  }, [heatmap.enabled, heatmap.undefinedValueColor, selectedPalette]);
  
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
      {renderIndex.sortedByDepth.map(rect => {
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
        const childCount = renderIndex.childCountById.get(rect.id) ?? 0;
        const parent = rect.parentId ? renderIndex.rectById.get(rect.parentId) : undefined;
        
        return (
          <RectangleComponent
            key={rect.id}
            rectangle={rect}
            isSelected={selectedId === rect.id}
            isMultiSelected={isMultiSelected}
            selectedCount={selectedIds.length}
            zIndex={getIndexedZIndex(rect, renderIndex, selectedId, canvasState.dragState, canvasState.resizeState, canvasState.hierarchyDragState)}
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
            onSelect={handleRectangleSelect}
            onUpdateLabel={updateRectangleLabel}
            // Drag/resize permissions based on hierarchy and manual positioning settings
            canDrag={!rect.parentId || Boolean(parent?.isManualPositioningEnabled)}
            canResize={
              !rect.parentId ||
              (childCount === 0 && Boolean(parent?.isManualPositioningEnabled)) ||
              (childCount > 0 && Boolean(rect.isManualPositioningEnabled))
            }
            childCount={childCount}
            gridSize={gridSize}
            labelMargin={labelMargin}
            fontSize={calculateIndexedFontSize(rect.id, renderIndex, rootFontSize, dynamicFontSizing)}
            fontFamily={fontFamily}
            heatmapColor={getHeatmapColorForRectangle(rect)}
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
            rearrangeDisabled={rect.isLockedAsIs || (renderIndex.hasLockedAncestorById.get(rect.id) ?? false)}
          />
        );
      })}
    </>
  );
};

export default React.memo(RectangleRenderer);
