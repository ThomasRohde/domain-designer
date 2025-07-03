import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Rectangle } from '../types';
import { GRID_SIZE, CATEGORY_CONFIGS } from '../utils/constants';

interface RectangleComponentProps {
  rectangle: Rectangle;
  isSelected: boolean;
  zIndex: number;
  onMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize') => void;
  onContextMenu: (e: React.MouseEvent, rectangleId: string) => void;
  onSelect: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onAddChild: (parentId: string, category?: any) => void;
  onRemove: (id: string) => void;
  canDrag: boolean;
  canResize: boolean;
  childCount: number;
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
  canDrag,
  canResize,
  childCount
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(rectangle.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = CATEGORY_CONFIGS[rectangle.category];
  const isLeaf = childCount === 0;

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

  const style: React.CSSProperties = {
    position: 'absolute',
    left: rectangle.x * GRID_SIZE,
    top: rectangle.y * GRID_SIZE,
    width: rectangle.w * GRID_SIZE,
    height: rectangle.h * GRID_SIZE,
    backgroundColor: config.backgroundColor,
    border: `2px solid ${isSelected ? '#3b82f6' : config.borderColor}`,
    borderRadius: '8px',
    cursor: canDrag ? 'move' : 'pointer',
    zIndex: zIndex,
    opacity: 1,
    transition: 'all 0.2s ease-in-out',
    boxShadow: isSelected 
      ? '0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 10px 10px -5px rgba(59, 130, 246, 0.04)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  };

  return (
    <div
      style={style}
      className="group hover:shadow-lg transition-shadow duration-200"
      onMouseDown={(e) => canDrag && onMouseDown(e, rectangle, 'drag')}
      onContextMenu={(e) => onContextMenu(e, rectangle.id)}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(rectangle.id);
      }}
    >
      <div className="p-3 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <span className="text-lg">{config.icon}</span>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleInputSubmit}
                  onKeyDown={handleInputKeyDown}
                  className="w-full px-1 py-0.5 text-sm font-medium bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ color: config.textColor }}
                />
              ) : (
                <div 
                  className="text-sm font-medium truncate cursor-text"
                  style={{ color: config.textColor }}
                  title={rectangle.label}
                >
                  {rectangle.label}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isSelected && (
              <>
                <button
                  className="p-1 hover:bg-white hover:bg-opacity-70 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(rectangle.id, rectangle.category);
                  }}
                  title="Add Child"
                >
                  <Plus size={12} />
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
              </>
            )}
          </div>
        </div>
        
        <div className="text-xs opacity-75 mb-1" style={{ color: config.textColor }}>
          {rectangle.parentId ? `Child of ${rectangle.parentId}` : 'Root'}
        </div>
        
        {childCount > 0 && (
          <div className="text-xs opacity-75 mb-1" style={{ color: config.textColor }}>
            {childCount} child{childCount !== 1 ? 'ren' : ''}
          </div>
        )}
        
        {isLeaf && (
          <div className="text-xs font-medium mb-1" style={{ color: config.textColor }}>
            Leaf (fixed size)
          </div>
        )}

        {!isLeaf && !rectangle.parentId && (
          <div className="text-xs font-medium mb-1" style={{ color: config.textColor }}>
            Resizable parent
          </div>
        )}

        <div className="flex-1"></div>
        
        <div className="text-xs opacity-60 text-right" style={{ color: config.textColor }}>
          {rectangle.w}×{rectangle.h}
        </div>
      </div>

      {/* Resize handle for resizable rectangles */}
      {canResize && isSelected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-tl-lg opacity-80 hover:opacity-100 transition-opacity"
          onMouseDown={(e) => onMouseDown(e, rectangle, 'resize')}
          title="Resize"
        />
      )}
    </div>
  );
};

export default RectangleComponent;