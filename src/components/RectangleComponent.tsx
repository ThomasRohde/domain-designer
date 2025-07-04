import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Minimize2 } from 'lucide-react';
import { Rectangle } from '../types';
import { GRID_SIZE, LABEL_MARGIN } from '../utils/constants';

interface RectangleComponentProps {
  rectangle: Rectangle;
  isSelected: boolean;
  zIndex: number;
  onMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize') => void;
  onContextMenu: (e: React.MouseEvent, rectangleId: string) => void;
  onSelect: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  onFitToChildren: (id: string) => void;
  canDrag: boolean;
  canResize: boolean;
  childCount: number;
  gridSize?: number;
  fontSize?: number;
  panOffset?: { x: number; y: number };
}

const RectangleComponent: React.FC<RectangleComponentProps> = ({
  rectangle,
  isSelected,
  zIndex,
  onMouseDown,
  onContextMenu,
  onSelect,
  onUpdateLabel,
  onAddChild,
  onRemove,
  onFitToChildren,
  canDrag,
  canResize,
  childCount,
  gridSize = GRID_SIZE,
  fontSize = 14,
  panOffset = { x: 0, y: 0 }
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
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  const textColor = getTextColor(rectangle.color);
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: rectangle.x * gridSize + panOffset.x,
    top: rectangle.y * gridSize + panOffset.y,
    width: rectangle.w * gridSize,
    height: rectangle.h * gridSize,
    backgroundColor: rectangle.color,
    border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
    borderRadius: '8px',
    cursor: canDrag ? 'move' : 'pointer',
    zIndex: zIndex,
    opacity: 1,
    boxShadow: isSelected 
      ? '0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 10px 10px -5px rgba(59, 130, 246, 0.04)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  };

  return (
    <div
      style={style}
      className="group"
      onMouseDown={(e) => canDrag && onMouseDown(e, rectangle, 'drag')}
      onContextMenu={(e) => onContextMenu(e, rectangle.id)}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(rectangle.id);
      }}
    >
      {/* Label positioning based on whether rectangle has children */}
      {childCount > 0 ? (
        // Rectangles with children: label at top edge, centered horizontally
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
                className="font-medium cursor-text truncate"
                style={{ color: textColor, fontSize: `${fontSize}px` }}
                title={rectangle.label}
              >
                {rectangle.label}
              </div>
            )}
          </div>
          
          {/* Action buttons for selected rectangles with children */}
          {isSelected && (
            <div 
              className="absolute right-2 flex space-x-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
              style={{ top: `${LABEL_MARGIN * 2}px` }}
            >
              <button
                className="p-1 hover:bg-white hover:bg-opacity-70 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(rectangle.id);
                }}
                title="Add Child"
              >
                <Plus size={12} />
              </button>
              <button
                className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onFitToChildren(rectangle.id);
                }}
                title="Fit to Children"
              >
                <Minimize2 size={12} />
              </button>
              <button
                className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(rectangle.id);
                }}
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
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
          {isSelected && (
            <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              <button
                className="p-1 hover:bg-white hover:bg-opacity-70 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(rectangle.id);
                }}
                title="Add Child"
              >
                <Plus size={10} />
              </button>
              <button
                className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(rectangle.id);
                }}
                title="Remove"
              >
                <Trash2 size={10} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resize handle for resizable rectangles */}
      {canResize && isSelected && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 sm:w-4 sm:h-4 bg-blue-500 cursor-se-resize rounded-tl-lg opacity-80 hover:opacity-100 transition-opacity touch-friendly"
          onMouseDown={(e) => onMouseDown(e, rectangle, 'resize')}
          title="Resize"
        />
      )}
    </div>
  );
};

export default RectangleComponent;