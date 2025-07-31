import React from 'react';
import { Rectangle } from '../types';
import { AlignmentType } from '../stores/types';

interface AlignmentPreviewProps {
  /** Currently selected rectangles to show alignment for */
  selectedRectangles: Rectangle[];
  /** Type of alignment being previewed */
  alignmentType: AlignmentType;
  /** Grid size for coordinate calculations */
  gridSize: number;
  /** Current zoom level for proper scaling */
  zoom: number;
  /** Pan offset for proper positioning */
  panOffset: { x: number; y: number };
}

/**
 * Visual preview component showing alignment guides before applying alignment operations.
 * Displays dashed lines indicating where rectangles will be aligned.
 */
const AlignmentPreview: React.FC<AlignmentPreviewProps> = ({
  selectedRectangles,
  alignmentType,
  gridSize,
  zoom,
  panOffset
}) => {
  if (selectedRectangles.length < 2) return null;

  // Calculate the alignment line position based on alignment type
  const getBoundingBox = () => {
    const left = Math.min(...selectedRectangles.map(r => r.x));
    const right = Math.max(...selectedRectangles.map(r => r.x + r.w));
    const top = Math.min(...selectedRectangles.map(r => r.y));
    const bottom = Math.max(...selectedRectangles.map(r => r.y + r.h));
    const centerX = left + (right - left) / 2;
    const centerY = top + (bottom - top) / 2;

    return { left, right, top, bottom, centerX, centerY };
  };

  const bounds = getBoundingBox();
  let lineProps: React.CSSProperties = {};

  // Apply zoom and pan transformations
  const transform = (value: number) => (value * gridSize * zoom) + (alignmentType.includes('X') ? panOffset.x : panOffset.y);

  switch (alignmentType) {
    case 'left':
      lineProps = {
        position: 'absolute',
        left: transform(bounds.left),
        top: transform(bounds.top),
        height: (bounds.bottom - bounds.top) * gridSize * zoom,
        width: '2px',
        backgroundColor: '#3b82f6',
        opacity: 0.7,
        zIndex: 1000
      };
      break;
    case 'center':
      lineProps = {
        position: 'absolute',
        left: transform(bounds.centerX),
        top: transform(bounds.top),
        height: (bounds.bottom - bounds.top) * gridSize * zoom,
        width: '2px',
        backgroundColor: '#3b82f6',
        opacity: 0.7,
        zIndex: 1000
      };
      break;
    case 'right':
      lineProps = {
        position: 'absolute',
        left: transform(bounds.right),
        top: transform(bounds.top),
        height: (bounds.bottom - bounds.top) * gridSize * zoom,
        width: '2px',
        backgroundColor: '#3b82f6',
        opacity: 0.7,
        zIndex: 1000
      };
      break;
    case 'top':
      lineProps = {
        position: 'absolute',
        left: transform(bounds.left),
        top: transform(bounds.top),
        width: (bounds.right - bounds.left) * gridSize * zoom,
        height: '2px',
        backgroundColor: '#3b82f6',
        opacity: 0.7,
        zIndex: 1000
      };
      break;
    case 'middle':
      lineProps = {
        position: 'absolute',
        left: transform(bounds.left),
        top: transform(bounds.centerY),
        width: (bounds.right - bounds.left) * gridSize * zoom,
        height: '2px',
        backgroundColor: '#3b82f6',
        opacity: 0.7,
        zIndex: 1000
      };
      break;
    case 'bottom':
      lineProps = {
        position: 'absolute',
        left: transform(bounds.left),
        top: transform(bounds.bottom),
        width: (bounds.right - bounds.left) * gridSize * zoom,
        height: '2px',
        backgroundColor: '#3b82f6',
        opacity: 0.7,
        zIndex: 1000
      };
      break;
  }

  return (
    <div
      style={{
        ...lineProps,
        borderStyle: 'dashed',
        borderWidth: '1px',
        borderColor: '#3b82f6',
        backgroundColor: 'transparent'
      }}
    />
  );
};

export default AlignmentPreview;