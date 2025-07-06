import React from 'react';
import { Rectangle, DragState, ResizeState, HierarchyDragState } from '../types';
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
  gridSize: number;
  panOffset: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => void;
  onContextMenu: (e: React.MouseEvent, rectangleId: string) => void;
  onSelect: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  onFitToChildren: (id: string) => void;
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;
}

const RectangleRenderer: React.FC<RectangleRendererProps> = ({
  rectangles,
  selectedId,
  dragState,
  resizeState,
  hierarchyDragState,
  gridSize,
  panOffset,
  onMouseDown,
  onContextMenu,
  onSelect,
  onUpdateLabel,
  calculateFontSize,
}) => {
  return (
    <>
      {sortRectanglesByDepth(rectangles).map(rect => {
        // Check if this rectangle is a potential drop target during hierarchy drag
        const isDropTarget = hierarchyDragState?.potentialTargets.some(target => target.targetId === rect.id) || false;
        const isCurrentDropTarget = hierarchyDragState?.currentDropTarget?.targetId === rect.id || false;
        const isBeingDragged = hierarchyDragState?.draggedRectangleId === rect.id || false;
        
        return (
          <RectangleComponent
            key={rect.id}
            rectangle={rect}
            isSelected={selectedId === rect.id}
            zIndex={getZIndex(rect, rectangles, selectedId, dragState, resizeState)}
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
            onSelect={onSelect}
            onUpdateLabel={onUpdateLabel}
            canDrag={!rect.parentId}
            canResize={!rect.parentId}
            childCount={getChildren(rect.id, rectangles).length}
            gridSize={gridSize}
            fontSize={calculateFontSize(rect.id, rectangles)}
            panOffset={panOffset}
            isDropTarget={isDropTarget}
            isCurrentDropTarget={isCurrentDropTarget}
            isBeingDragged={isBeingDragged}
            isHierarchyDragActive={hierarchyDragState !== null}
          />
        );
      })}
    </>
  );
};

export default React.memo(RectangleRenderer);
