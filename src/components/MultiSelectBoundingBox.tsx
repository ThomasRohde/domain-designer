import React from 'react';
import { Rectangle } from '../types';
import { calculateBoundingBox } from '../utils/boundingBoxUtils';

interface MultiSelectBoundingBoxProps {
  /** Selected rectangles to calculate bounding box for */
  selectedRectangles: Rectangle[];
  /** Grid size for coordinate calculations */
  gridSize: number;
  /** Mouse down handler for bounding box interactions */
  onMouseDown?: (e: React.MouseEvent) => void;
  /** Context menu handler for right-click operations */
  onContextMenu?: (e: React.MouseEvent) => void;
}

/**
 * Visual bounding box component for multi-select feedback.
 * Renders a dotted rectangle around all selected rectangles when multiple items are selected.
 * Provides clear visual indication that multiple items are being operated on as a group.
 */
const MultiSelectBoundingBox: React.FC<MultiSelectBoundingBoxProps> = ({
  selectedRectangles,
  gridSize,
  onMouseDown,
  onContextMenu
}) => {
  // Only show bounding box when multiple rectangles are selected
  if (selectedRectangles.length <= 1) {
    return null;
  }

  // Calculate the bounding rectangle that encompasses all selected rectangles
  const bounds = calculateBoundingBox(selectedRectangles);
  if (!bounds) {
    return null;
  }

  // Convert grid coordinates to pixel coordinates
  const pixelBounds = {
    x: bounds.x * gridSize,
    y: bounds.y * gridSize,
    width: bounds.width * gridSize,
    height: bounds.height * gridSize
  };

  // Use same coordinate system as rectangles: grid coordinates converted to pixels
  // No zoom/pan transforms needed - the canvas container handles those transforms
  const boundingBoxStyle: React.CSSProperties = {
    position: 'absolute',
    left: pixelBounds.x,
    top: pixelBounds.y,
    width: pixelBounds.width,
    height: pixelBounds.height,
    border: '3px dashed #2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: '8px',
    pointerEvents: 'auto', // Enable mouse interactions
    cursor: 'move', // Indicate the bounding box is draggable
    zIndex: 999, // Below selection box but above rectangles
    transition: 'none', // Disable transitions for smooth feedback
    boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.2), 0 4px 12px rgba(37, 99, 235, 0.15)',
    outline: '1px solid rgba(37, 99, 235, 0.3)',
    outlineOffset: '2px'
  };

  /**
   * Handle mouse down events on the bounding box.
   * Prevents event bubbling to ensure group interaction behavior.
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onMouseDown) {
      onMouseDown(e);
    }
  };

  /**
   * Handle context menu events on the bounding box.
   * Shows multi-select context menu with group operations.
   */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onContextMenu) {
      onContextMenu(e);
    }
  };

  return (
    <div 
      style={boundingBoxStyle}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      title={`${selectedRectangles.length} rectangles selected`}
    />
  );
};


export default React.memo(MultiSelectBoundingBox, (prevProps, nextProps) => {
  // Custom comparison to ensure re-render when selection, grid size, or handlers change
  return (
    prevProps.gridSize === nextProps.gridSize &&
    prevProps.onMouseDown === nextProps.onMouseDown &&
    prevProps.onContextMenu === nextProps.onContextMenu &&
    prevProps.selectedRectangles.length === nextProps.selectedRectangles.length &&
    prevProps.selectedRectangles.every((rect, index) => {
      const nextRect = nextProps.selectedRectangles[index];
      return nextRect && rect.id === nextRect.id && rect.x === nextRect.x && rect.y === nextRect.y && rect.w === nextRect.w && rect.h === nextRect.h;
    })
  );
});