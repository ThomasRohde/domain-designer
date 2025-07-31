import React from 'react';

interface SelectionBoxProps {
  /** Start X coordinate in canvas space */
  startX: number;
  /** Start Y coordinate in canvas space */
  startY: number;
  /** Current X coordinate in canvas space */
  currentX: number;
  /** Current Y coordinate in canvas space */
  currentY: number;
  /** Current zoom level for coordinate calculations */
  zoom: number;
  /** Pan offset for coordinate transformations */
  panOffset: { x: number; y: number };
}

/**
 * Visual selection box component for drag selection operations.
 * Renders a dashed rectangle overlay that shows the current selection area
 * during drag operations. Automatically handles coordinate transformations
 * for zoom and pan states.
 */
const SelectionBox: React.FC<SelectionBoxProps> = ({
  startX,
  startY,
  currentX,
  currentY,
  zoom,
  panOffset
}) => {
  // Calculate normalized selection bounds (top-left to bottom-right)
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  // Apply zoom and pan transformations to match canvas coordinate system
  const transformedStyle: React.CSSProperties = {
    position: 'absolute',
    left: (left * zoom) + panOffset.x,
    top: (top * zoom) + panOffset.y,
    width: width * zoom,
    height: height * zoom,
    border: '2px dashed #3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: 1000, // Above rectangles but below UI elements
    transition: 'none' // Disable transitions for smooth drag feedback
  };

  // Only render if the selection box has meaningful dimensions
  if (width < 2 || height < 2) {
    return null;
  }

  return (
    <div
      className="selection-box"
      style={transformedStyle}
      data-testid="selection-box"
    />
  );
};

export default React.memo(SelectionBox);