import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Rectangle } from '../types';
import {
  buildRectangleRenderIndex,
  getIndexedZIndex,
} from '../utils/rectangleIndexUtils';
import { calculateHeatmapColor } from '../utils/heatmapColors';
import { useAppStore } from '../stores/useAppStore';
import type { HeatmapState } from '../stores/types';
import RectangleComponent from './RectangleComponent';

interface ViewerRectangleRendererProps {
  /** Array of rectangles to render in read-only mode */
  rectangles: Rectangle[];
  /** Grid size for coordinate calculations */
  gridSize: number;
  /** Label margin for positioning labels within parent rectangles */
  labelMargin: number;
  /** Root font size from global settings */
  rootFontSize: number;
  /** Whether hierarchy depth should scale font size */
  dynamicFontSizing: boolean;
  /** Font family for text rendering */
  fontFamily: string;
  /** Border radius setting */
  borderRadius: number;
  /** Border color setting */
  borderColor: string;
  /** Border width setting */
  borderWidth: number;
  /** Heatmap state for this viewed diagram. Undefined falls back to the editor store; null disables heatmap. */
  heatmapState?: HeatmapState | null;
}

/**
 * Read-only rectangle renderer for viewer mode.
 * Renders all rectangles with disabled interactions and editing capabilities.
 * Uses the same RectangleComponent but with all interactive features turned off.
 */
const ViewerRectangleRenderer: React.FC<ViewerRectangleRendererProps> = ({
  rectangles,
  gridSize,
  labelMargin,
  rootFontSize,
  dynamicFontSizing,
  fontFamily,
  borderRadius,
  borderColor,
  borderWidth,
  heatmapState,
}) => {
  const renderIndex = React.useMemo(() => buildRectangleRenderIndex(rectangles), [rectangles]);
  const storeHeatmap = useAppStore(useShallow(state => ({
    enabled: state.heatmap.enabled,
    selectedPaletteId: state.heatmap.selectedPaletteId,
    palettes: state.heatmap.palettes,
    undefinedValueColor: state.heatmap.undefinedValueColor
  })));
  const heatmap = heatmapState === undefined ? storeHeatmap : heatmapState;
  const selectedPalette = React.useMemo(
    () => heatmap?.palettes.find(palette => palette.id === heatmap.selectedPaletteId),
    [heatmap]
  );

  // Disabled interaction handlers for read-only mode
  const handleSelect = () => {};
  const handleMouseDown = () => {};
  const handleContextMenu = () => {};
  const handleUpdateLabel = () => {};

  return (
    <>
      {renderIndex.sortedByDepth.map(rect => {
        const depth = renderIndex.depthById.get(rect.id) ?? 0;
        const fontSize = dynamicFontSizing
          ? Math.max(8, Math.round(rootFontSize * Math.pow(0.9, depth)))
          : rootFontSize;

        return (
          <RectangleComponent
            key={rect.id}
            rectangle={rect}
            isSelected={false}
            isMultiSelected={false}
            selectedCount={0}
            zIndex={getIndexedZIndex(rect, renderIndex, null, null, null, null)}
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
            onSelect={handleSelect}
            onUpdateLabel={handleUpdateLabel}
            canDrag={false}
            canResize={false}
            childCount={renderIndex.childCountById.get(rect.id) ?? 0}
            gridSize={gridSize}
            labelMargin={labelMargin}
            fontSize={fontSize}
            fontFamily={fontFamily}
            heatmapColor={heatmap?.enabled ? calculateHeatmapColor(rect.heatmapValue, selectedPalette, heatmap.undefinedValueColor) : null}
            isDropTarget={false}
            isValidDropTarget={false}
            isCurrentDropTarget={false}
            isBeingDragged={false}
            isHierarchyDragActive={false}
            isDragActive={false}
            isResizeActive={false}
            isBeingResized={false}
            isAtMinSize={false}
            borderRadius={borderRadius}
            borderColor={borderColor}
            borderWidth={borderWidth}
            disableEditing={true}
          />
        );
      })}
    </>
  );
};

export default ViewerRectangleRenderer;
