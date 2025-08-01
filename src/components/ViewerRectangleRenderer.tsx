import React from 'react';
import { Rectangle } from '../types';
import { 
  getChildren,
  getZIndex,
  sortRectanglesByDepth,
} from '../utils/layoutUtils';
import RectangleComponent from './RectangleComponent';

interface ViewerRectangleRendererProps {
  /** Array of rectangles to render in read-only mode */
  rectangles: Rectangle[];
  /** Grid size for coordinate calculations */
  gridSize: number;
  /** Font size calculation function based on hierarchy depth */
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;
  /** Font family for text rendering */
  fontFamily: string;
  /** Border radius setting */
  borderRadius: number;
  /** Border color setting */
  borderColor: string;
  /** Border width setting */
  borderWidth: number;
}

/**
 * Read-only rectangle renderer for viewer mode.
 * Renders all rectangles with disabled interactions and editing capabilities.
 * Uses the same RectangleComponent but with all interactive features turned off.
 */
const ViewerRectangleRenderer: React.FC<ViewerRectangleRendererProps> = ({
  rectangles,
  gridSize,
  calculateFontSize,
  fontFamily,
  borderRadius,
  borderColor,
  borderWidth,
}) => {
  // Disabled interaction handlers for read-only mode
  const handleSelect = () => {};
  const handleMouseDown = () => {};
  const handleContextMenu = () => {};
  const handleUpdateLabel = () => {};

  return (
    <>
      {sortRectanglesByDepth(rectangles).map(rect => {
        return (
          <RectangleComponent
            key={rect.id}
            rectangle={rect}
            isSelected={false}
            isMultiSelected={false}
            zIndex={getZIndex(rect, rectangles, null, null, null, null)}
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
            onSelect={handleSelect}
            onUpdateLabel={handleUpdateLabel}
            canDrag={false}
            canResize={false}
            childCount={getChildren(rect.id, rectangles).length}
            gridSize={gridSize}
            fontSize={calculateFontSize(rect.id, rectangles)}
            fontFamily={fontFamily}
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