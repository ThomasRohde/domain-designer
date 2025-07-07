import React, { useState, useRef, useEffect } from 'react';
import { Rectangle } from '../types';
import { GRID_SIZE, LABEL_MARGIN } from '../utils/constants';

interface RectangleComponentProps {
  rectangle: Rectangle;
  isSelected: boolean;
  zIndex: number;
  onMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => void;
  onContextMenu: (e: React.MouseEvent, rectangleId: string) => void;
  onSelect: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  canDrag: boolean;
  canResize: boolean;
  childCount: number;
  gridSize?: number;
  fontSize?: number;
  isDropTarget?: boolean;
  isValidDropTarget?: boolean;
  isCurrentDropTarget?: boolean;
  isBeingDragged?: boolean;
  isHierarchyDragActive?: boolean;
  isDragActive?: boolean;
  isResizeActive?: boolean;
  isBeingResized?: boolean;
  isAtMinSize?: boolean;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
}

const RectangleComponent: React.FC<RectangleComponentProps> = ({
  rectangle,
  isSelected,
  zIndex,
  onMouseDown,
  onContextMenu,
  onSelect,
  onUpdateLabel,
  canDrag,
  canResize,
  childCount,
  gridSize = GRID_SIZE,
  fontSize = 14,
  isDropTarget = false,
  isValidDropTarget = true,
  isCurrentDropTarget = false,
  isBeingDragged = false,
  isHierarchyDragActive = false,
  isDragActive = false,
  isResizeActive = false,
  isBeingResized = false,
  isAtMinSize = false,
  borderRadius = 8,
  borderColor = '#374151',
  borderWidth = 2
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(rectangle.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(rectangle.label);
  };

  const handleInputSubmit = () => {
    onUpdateLabel(rectangle.id, editValue);
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(rectangle.label);
    }
  };

  // Helper function to determine text color based on background
  const getTextColor = (backgroundColor: string) => {
    // Simple contrast calculation - in a real app you might want something more sophisticated
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  const textColor = getTextColor(rectangle.color);
  
  // Determine border color and style based on state
  let finalBorderColor = borderColor; // Use global setting as default
  let borderStyle = 'solid';
  let finalBorderWidth = `${borderWidth}px`;
  let boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
  let opacity = 1;
  
  if (isBeingResized) {
    // Make rectangle semi-transparent during resize to show children underneath
    opacity = 0.3;
    finalBorderColor = '#8b5cf6';
    finalBorderWidth = `${borderWidth + 2}px`;
    boxShadow = '0 10px 25px -5px rgba(139, 92, 246, 0.5), 0 10px 10px -5px rgba(139, 92, 246, 0.2)';
  } else if (isBeingDragged) {
    finalBorderColor = '#6366f1';
    finalBorderWidth = `${borderWidth + 1}px`;
    opacity = 0.8;
    boxShadow = '0 20px 25px -5px rgba(99, 102, 241, 0.4), 0 10px 10px -5px rgba(99, 102, 241, 0.1)';
  } else if (isSelected && !isHierarchyDragActive) {
    finalBorderColor = '#3b82f6';
    boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 10px 10px -5px rgba(59, 130, 246, 0.04)';
  } else if (isCurrentDropTarget) {
    if (isValidDropTarget) {
      finalBorderColor = '#10b981';
      finalBorderWidth = `${borderWidth + 1}px`;
      borderStyle = 'solid';
      boxShadow = '0 10px 25px -5px rgba(16, 185, 129, 0.4), 0 10px 10px -5px rgba(16, 185, 129, 0.1)';
    } else {
      finalBorderColor = '#ef4444';
      finalBorderWidth = `${borderWidth + 1}px`;
      borderStyle = 'solid';
      boxShadow = '0 10px 25px -5px rgba(239, 68, 68, 0.4), 0 10px 10px -5px rgba(239, 68, 68, 0.1)';
    }
  } else if (isDropTarget) {
    if (isValidDropTarget) {
      finalBorderColor = '#10b981';
      finalBorderWidth = `${borderWidth}px`;
      borderStyle = 'dashed';
      boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)';
    } else {
      finalBorderColor = '#ef4444';
      finalBorderWidth = `${borderWidth}px`;
      borderStyle = 'dashed';
      boxShadow = '0 4px 6px -1px rgba(239, 68, 68, 0.2), 0 2px 4px -1px rgba(239, 68, 68, 0.1)';
    }
  } else if (isAtMinSize && isResizeActive) {
    // Show warning when at minimum size during resize
    finalBorderColor = '#f59e0b';
    finalBorderWidth = `${borderWidth + 1}px`;
    borderStyle = 'solid';
    boxShadow = '0 10px 25px -5px rgba(245, 158, 11, 0.4), 0 10px 10px -5px rgba(245, 158, 11, 0.1)';
  }
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: rectangle.x * gridSize,
    top: rectangle.y * gridSize,
    width: rectangle.w * gridSize,
    height: rectangle.h * gridSize,
    backgroundColor: rectangle.color,
    border: `${finalBorderWidth} ${borderStyle} ${finalBorderColor}`,
    borderRadius: `${borderRadius}px`,
    cursor: isHierarchyDragActive ? 'pointer' : (canDrag ? 'move' : 'default'),
    zIndex: zIndex,
    opacity,
    boxShadow,
    transition: (isDragActive || isResizeActive || isBeingDragged) ? 'none' : 'all 0.2s ease-in-out',
    // Hide children that overflow parent bounds during resize
    overflow: childCount > 0 ? 'hidden' : 'visible'
  };

  // Handle mouse down with support for hierarchy drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + drag = hierarchy rearrangement
      onMouseDown(e, rectangle, 'hierarchy-drag');
    } else if (canDrag) {
      // Regular drag
      onMouseDown(e, rectangle, 'drag');
    }
  };

  return (
    <div
      style={style}
      className="group"
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => onContextMenu(e, rectangle.id)}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(rectangle.id);
      }}
    >
      {/* Label positioning based on whether rectangle has children OR is a drop target */}
      {childCount > 0 || isCurrentDropTarget || isDropTarget ? (
        // Rectangles with children OR drop targets: label at top edge, centered horizontally
        <div className="relative h-full">
          <div 
            className="absolute left-0 right-0 text-center px-2"
            style={{ top: `${LABEL_MARGIN * 2}px` }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleInputSubmit}
                onKeyDown={handleInputKeyDown}
                className="w-full px-1 py-0.5 font-medium bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                style={{ color: textColor, fontSize: `${fontSize}px` }}
              />
            ) : (
              <div 
                className="font-medium truncate"
                style={{ 
                  color: textColor, 
                  fontSize: `${fontSize}px`,
                  cursor: isHierarchyDragActive ? 'pointer' : (canDrag ? 'move' : 'text')
                }}
                title={rectangle.label}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown(e);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleDoubleClick(e);
                }}
              >
                {rectangle.label}
              </div>
            )}
          </div>
          
          {/* Action buttons for selected rectangles with children */}
          {/* Action buttons moved to ActionButtonsOverlay component for better z-index handling */}
        </div>
      ) : (
        // Leaf rectangles: label centered and word wrapped in both dimensions
        <div className="h-full flex items-center justify-center p-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleInputSubmit}
              onKeyDown={handleInputKeyDown}
              className="w-full px-1 py-0.5 font-medium bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              style={{ color: textColor, fontSize: `${fontSize}px` }}
            />
          ) : (
            <div 
              className="font-medium cursor-text text-center break-words leading-tight"
              style={{ 
                color: textColor,
                fontSize: `${fontSize}px`,
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto'
              }}
              title={rectangle.label}
            >
              {rectangle.label}
            </div>
          )}
          
          {/* Action buttons for selected leaf rectangles */}
          {/* Action buttons moved to ActionButtonsOverlay component for better z-index handling */}
        </div>
      )}

      {/* Resize handle for resizable rectangles */}
      {canResize && isSelected && !isHierarchyDragActive && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 sm:w-4 sm:h-4 bg-blue-500 cursor-se-resize rounded-tl-lg opacity-80 hover:opacity-100 transition-opacity touch-friendly"
          onMouseDown={(e) => onMouseDown(e, rectangle, 'resize')}
          title="Resize"
        />
      )}
      
      {/* Hierarchy drag indicator */}
      {isSelected && !isHierarchyDragActive && (
        <div
          className="absolute top-1 left-1 w-4 h-4 bg-purple-500 rounded-full opacity-70 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
          title="Drag to rearrange hierarchy"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, rectangle, 'hierarchy-drag');
          }}
        >
          <svg width="8" height="8" viewBox="0 0 16 16" fill="white">
            <path d="M8 2L10 6H6L8 2Z M8 14L6 10H10L8 14Z M2 8L6 6V10L2 8Z M14 8L10 10V6L14 8Z" />
          </svg>
        </div>
      )}
      
      {/* Drop zone indicator for current drop target */}
      {isCurrentDropTarget && (
        <div className="absolute inset-0 bg-green-200 bg-opacity-30 rounded-lg flex items-center justify-center">
          <div className="text-green-800 font-bold text-sm">Drop Here</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(RectangleComponent);