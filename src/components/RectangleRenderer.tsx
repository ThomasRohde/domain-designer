import React from 'react';
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
  // Get data from store
  const rectangles = useAppStore(state => state.rectangles);
  const selectedId = useAppStore(state => state.selectedId);
  const gridSize = useAppStore(state => state.settings.gridSize);
  const fontFamily = useAppStore(state => state.settings.fontFamily);
  const borderRadius = useAppStore(state => state.settings.borderRadius);
  const borderColor = useAppStore(state => state.settings.borderColor);
  const borderWidth = useAppStore(state => state.settings.borderWidth);
  const calculateFontSize = useAppStore(state => state.getters.calculateFontSize);
  // Subscribe to font settings to trigger re-renders when they change
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore TS6133
  const _rootFontSize = useAppStore(state => state.settings.rootFontSize);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore TS6133
  const _dynamicFontSizing = useAppStore(state => state.settings.dynamicFontSizing);
  
  // Get canvas states from store
  const dragState = useAppStore(state => state.canvas.dragState);
  const resizeState = useAppStore(state => state.canvas.resizeState);
  const hierarchyDragState = useAppStore(state => state.canvas.hierarchyDragState);
  const resizeConstraintState = useAppStore(state => state.canvas.resizeConstraintState);
  
  // Get actions from store
  const { setSelectedId, updateRectangleLabel } = useAppStore(state => state.rectangleActions);
  const handleRectangleMouseDown = useAppStore(state => state.canvasActions.handleRectangleMouseDown);
  
  // Create an onMouseDown handler that includes the containerRef
  const onMouseDown = (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => {
    handleRectangleMouseDown(e, rect, action || 'drag', containerRef);
  };
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
            onSelect={setSelectedId}
            onUpdateLabel={updateRectangleLabel}
            canDrag={!rect.parentId || Boolean(rect.parentId && rectangles.find(r => r.id === rect.parentId)?.isManualPositioningEnabled)}
            canResize={!rect.parentId || Boolean(rect.parentId && rectangles.find(r => r.id === rect.parentId)?.isManualPositioningEnabled)}
            childCount={getChildren(rect.id, rectangles).length}
            gridSize={gridSize}
            fontSize={calculateFontSize(rect.id)}
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
