import React from 'react';
import { Rectangle } from '../types';
import { 
  getChildren,
  getZIndex,
  sortRectanglesByDepth,
} from '../utils/layoutUtils';
import RectangleComponent from './RectangleComponent';

interface ViewerRectangleRendererProps {
  rectangles: Rectangle[];
  gridSize: number;
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;
  fontFamily: string;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
}

const ViewerRectangleRenderer: React.FC<ViewerRectangleRendererProps> = ({
  rectangles,
  gridSize,
  calculateFontSize,
  fontFamily,
  borderRadius,
  borderColor,
  borderWidth,
}) => {
  // No-op handlers for viewer mode
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