import React from 'react';
import { Rectangle, DragState, ResizeState, HierarchyDragState, ResizeConstraintState } from '../types';
import { 
  getChildren,
  getZIndex,
  sortRectanglesByDepth,
} from '../utils/layoutUtils';
import RectangleComponent from './RectangleComponent';

interface RectangleRendererProps {
  rectangles: Rectangle[];
  selectedId: string | null;
  dragState: DragState | null;
  resizeState: ResizeState | null;
  hierarchyDragState: HierarchyDragState | null;
  resizeConstraintState: ResizeConstraintState | null;
  gridSize: number;
  onMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => void;
  onContextMenu: (e: React.MouseEvent, rectangleId: string) => void;
  onSelect: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  onFitToChildren: (id: string) => void;
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;
  fontFamily: string;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
}

const RectangleRenderer: React.FC<RectangleRendererProps> = ({
  rectangles,
  selectedId,
  dragState,
  resizeState,
  hierarchyDragState,
  resizeConstraintState,
  gridSize,
  onMouseDown,
  onContextMenu,
  onSelect,
  onUpdateLabel,
  calculateFontSize,
  fontFamily,
  borderRadius,
  borderColor,
  borderWidth,
}) => {
  return (
    <>
      {sortRectanglesByDepth(rectangles).map(rect => {
        // Check if this rectangle is a potential drop target during hierarchy drag
        const dropTarget = hierarchyDragState?.potentialTargets.find(target => target.targetId === rect.id);
        const isDropTarget = dropTarget !== undefined;
        const isValidDropTarget = dropTarget?.isValid || false;
        const isCurrentDropTarget = hierarchyDragState?.currentDropTarget?.targetId === rect.id || false;
        const isBeingDragged = hierarchyDragState?.draggedRectangleId === rect.id || false;
        const isDragActive = dragState !== null || hierarchyDragState !== null;
        const isResizeActive = resizeState !== null;
        const isBeingResized = resizeState?.id === rect.id;
        const isAtMinSize = resizeConstraintState?.rectangleId === rect.id && 
                           (resizeConstraintState?.isAtMinWidth || resizeConstraintState?.isAtMinHeight);
        
        return (
          <RectangleComponent
            key={rect.id}
            rectangle={rect}
            isSelected={selectedId === rect.id}
            zIndex={getZIndex(rect, rectangles, selectedId, dragState, resizeState, hierarchyDragState)}
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
            onSelect={onSelect}
            onUpdateLabel={onUpdateLabel}
            canDrag={!rect.parentId || Boolean(rect.parentId && rectangles.find(r => r.id === rect.parentId)?.isManualPositioningEnabled)}
            canResize={!rect.parentId || Boolean(rect.parentId && rectangles.find(r => r.id === rect.parentId)?.isManualPositioningEnabled)}
            childCount={getChildren(rect.id, rectangles).length}
            gridSize={gridSize}
            fontSize={calculateFontSize(rect.id, rectangles)}
            fontFamily={fontFamily}
            isDropTarget={isDropTarget}
            isValidDropTarget={isValidDropTarget}
            isCurrentDropTarget={isCurrentDropTarget}
            isBeingDragged={isBeingDragged}
            isHierarchyDragActive={hierarchyDragState !== null}
            isDragActive={isDragActive}
            isResizeActive={isResizeActive}
            isBeingResized={isBeingResized}
            isAtMinSize={isAtMinSize}
            borderRadius={borderRadius}
            borderColor={borderColor}
            borderWidth={borderWidth}
          />
        );
      })}
    </>
  );
};

export default React.memo(RectangleRenderer);
