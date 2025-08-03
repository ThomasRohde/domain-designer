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
  // Multi-select requirement: only render for group selections
  if (selectedRectangles.length <= 1) {
    return null;
  }

  // Calculate minimal enclosing rectangle for visual feedback
  const bounds = calculateBoundingBox(selectedRectangles);
  if (!bounds) {
    return null;
  }

  // Grid-to-pixel coordinate transformation for rendering
  const pixelBounds = {
    x: bounds.x * gridSize,
    y: bounds.y * gridSize,
    width: bounds.width * gridSize,
    height: bounds.height * gridSize
  };

  /**
   * Coordinate system alignment with rectangle rendering.
   * 
   * The bounding box uses the same grid-based coordinate system as individual rectangles,
   * with pixel conversion handled here rather than relying on CSS transforms. This approach
   * ensures pixel-perfect alignment and eliminates coordinate system conflicts between
   * the canvas transform matrix and bounding box positioning.
   */
  const boundingBoxStyle: React.CSSProperties = {
    position: 'absolute',
    left: pixelBounds.x,
    top: pixelBounds.y,
    width: pixelBounds.width,
    height: pixelBounds.height,
    border: '3px dashed #2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: '8px',
    pointerEvents: 'auto', // Enable mouse interactions for group operations
    cursor: 'move', // Visual cue for drag capability
    zIndex: 999, // Layer between individual rectangles and selection overlay
    transition: 'none', // Prevent animation artifacts during rapid updates
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


/**
 * Performance-optimized memo with deep rectangle comparison.
 * 
 * Custom equality check prevents unnecessary re-renders by comparing:
 * 1. Grid size changes (affects pixel coordinate calculations)
 * 2. Event handler reference stability (prevents callback churn)
 * 3. Rectangle count changes (affects bounding box visibility)
 * 4. Individual rectangle position/dimension changes (affects bounding box geometry)
 * 
 * This optimization is critical for smooth drag operations and prevents
 * expensive bounding box recalculations during unrelated state updates.
 */
export default React.memo(MultiSelectBoundingBox, (prevProps, nextProps) => {
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