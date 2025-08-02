import React from 'react';
import { Rectangle } from '../types';
import { 
  getChildren,
  getZIndex,
  sortRectanglesByDepth,
} from '../utils/layoutUtils';
import { useAppStore } from '../stores/useAppStore';
import RectangleComponent from './RectangleComponent';
import MultiSelectBoundingBox from './MultiSelectBoundingBox';

interface RectangleRendererProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onContextMenu: (e: React.MouseEvent, rectangleId: string) => void;
}

const RectangleRenderer: React.FC<RectangleRendererProps> = ({
  containerRef,
  onContextMenu,
}) => {
  // Core data from centralized store
  const rectangles = useAppStore(state => state.rectangles);
  const selectedId = useAppStore(state => state.selectedId);
  const selectedIds = useAppStore(state => state.ui.selectedIds);
  // Performance optimization: Convert selectedIds to Set for O(1) lookup
  const selectedIdsSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const gridSize = useAppStore(state => state.settings.gridSize);
  
  const fontFamily = useAppStore(state => state.settings.fontFamily);
  const borderRadius = useAppStore(state => state.settings.borderRadius);
  const borderColor = useAppStore(state => state.settings.borderColor);
  const borderWidth = useAppStore(state => state.settings.borderWidth);
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
   * These states control visual indicators like drag highlights, resize handles,
   * and hierarchy drag drop targets for enhanced user experience.
   */
  const dragState = useAppStore(state => state.canvas.dragState);
  const resizeState = useAppStore(state => state.canvas.resizeState);
  const hierarchyDragState = useAppStore(state => state.canvas.hierarchyDragState);
  const resizeConstraintState = useAppStore(state => state.canvas.resizeConstraintState);
  
  // Rectangle manipulation actions from store
  const { setSelectedId, updateRectangleLabel, toggleSelection } = useAppStore(state => state.rectangleActions);
  const handleRectangleMouseDown = useAppStore(state => state.canvasActions.handleRectangleMouseDown);
  
  // Calculate selected rectangles for multi-select bounding box
  const selectedRectangles = React.useMemo(() => {
    return rectangles.filter(rect => selectedIdsSet.has(rect.id));
  }, [rectangles, selectedIdsSet]);

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
      setSelectedId(idOrToggle);
    }
  };

  /**
   * Bounding box mouse down handler for multi-select group interactions.
   * Enables dragging the entire selection group by clicking on the bounding box.
   */
  const handleBoundingBoxMouseDown = (e: React.MouseEvent) => {
    if (selectedRectangles.length === 0) return;
    
    // Use the first selected rectangle as the drag anchor
    const anchorRect = selectedRectangles[0];
    handleRectangleMouseDown(e, anchorRect, 'drag', containerRef);
  };

  /**
   * Bounding box context menu handler for multi-select operations.
   * Shows the multi-select context menu for group operations.
   */
  const handleBoundingBoxContextMenu = (e: React.MouseEvent) => {
    if (selectedRectangles.length === 0) return;
    
    // Show multi-select context menu at the click position
    onContextMenu(e, selectedRectangles[0].id);
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
        
        // Multi-select state calculation (optimized with Set for O(1) lookup)
        const isMultiSelected = selectedIdsSet.has(rect.id);
        
        return (
          <RectangleComponent
            key={rect.id}
            rectangle={rect}
            isSelected={selectedId === rect.id}
            isMultiSelected={isMultiSelected}
            selectedCount={selectedIds.length}
            zIndex={getZIndex(rect, rectangles, selectedId, dragState, resizeState, hierarchyDragState)}
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
      
      {/* Multi-select bounding box for enhanced visual feedback */}
      <MultiSelectBoundingBox
        selectedRectangles={selectedRectangles}
        gridSize={gridSize}
        onMouseDown={handleBoundingBoxMouseDown}
        onContextMenu={handleBoundingBoxContextMenu}
      />
    </>
  );
};

export default React.memo(RectangleRenderer);
