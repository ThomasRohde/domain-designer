import React, { useState, useRef, useEffect } from 'react';
import { Rectangle } from '../types';
import { GRID_SIZE, LABEL_MARGIN } from '../utils/constants';
import CustomTooltip from './CustomTooltip';

interface RectangleComponentProps {
  /** Rectangle data including position, size, label, and styling */
  rectangle: Rectangle;
  /** Whether this rectangle is currently selected */
  isSelected: boolean;
  /** Whether this rectangle is part of a multi-selection */
  isMultiSelected: boolean;
  /** Total number of selected rectangles (for determining if resize handle should show) */
  selectedCount?: number;
  /** Z-index for proper layering (calculated based on hierarchy depth) */
  zIndex: number;
  /** Mouse interaction handler supporting drag, resize, and hierarchy-drag modes */
  onMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => void;
  /** Right-click context menu handler */
  onContextMenu: (e: React.MouseEvent, rectangleId: string) => void;
  /** Selection handler for click events */
  onSelect: (id: string) => void;
  /** Label update handler for in-place editing */
  onUpdateLabel: (id: string, label: string) => void;
  /** Whether drag operations are enabled */
  canDrag: boolean;
  /** Whether resize operations are enabled */
  canResize: boolean;
  /** Number of child rectangles (affects label positioning and action button visibility) */
  childCount: number;
  /** Grid size for coordinate calculations */
  gridSize?: number;
  /** Base font size (may be overridden by text label settings) */
  fontSize?: number;
  /** Base font family (may be overridden by text label settings) */
  fontFamily?: string;
  /** Whether this rectangle is a potential drop target during hierarchy drag */
  isDropTarget?: boolean;
  /** Whether this drop target would create a valid parent-child relationship */
  isValidDropTarget?: boolean;
  /** Whether this is the currently highlighted drop target */
  isCurrentDropTarget?: boolean;
  /** Whether this rectangle is currently being dragged */
  isBeingDragged?: boolean;
  /** Whether any hierarchy drag operation is active (affects cursor styles) */
  isHierarchyDragActive?: boolean;
  /** Whether any drag operation is active globally */
  isDragActive?: boolean;
  /** Whether any resize operation is active globally */
  isResizeActive?: boolean;
  /** Whether this specific rectangle is being resized */
  isBeingResized?: boolean;
  /** Whether this rectangle has reached its minimum size during resize */
  isAtMinSize?: boolean;
  /** Border radius from global settings */
  borderRadius?: number;
  /** Border color from global settings */
  borderColor?: string;
  /** Border width from global settings */
  borderWidth?: number;
  /** Whether to disable in-place label editing (used in viewer mode) */
  disableEditing?: boolean;
}

/**
 * Individual rectangle component with comprehensive interaction support:
 * - In-place label editing with keyboard shortcuts (Enter/Escape)
 * - Multiple drag modes: regular drag, resize, and hierarchy rearrangement
 * - Complex visual state system with priority-based styling for different states
 * - Adaptive text label rendering with contrast-based color calculation
 * - Drop target visual feedback with validation
 * - Performance optimized with conditional transitions and overflow handling
 */
const RectangleComponent: React.FC<RectangleComponentProps> = ({
  rectangle,
  isSelected,
  isMultiSelected,
  selectedCount = 1,
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
  fontFamily = 'Inter',
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
  borderWidth = 2,
  disableEditing = false
}) => {
  // In-place editing state management
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(rectangle.label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableEditing) return;
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

  /**
   * Calculate optimal text color based on background brightness for accessibility.
   * Uses relative luminance formula to determine if white or black text provides better contrast.
   */
  const getTextColor = (backgroundColor: string) => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate relative luminance using ITU-R BT.709 formula
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  const textColor = getTextColor(rectangle.color);
  
  // Text label mode configuration - overrides normal rectangle styling for typography-focused elements
  const isTextLabel = rectangle.isTextLabel || rectangle.type === 'textLabel';
  const textLabelFontSize = isTextLabel ? (rectangle.textFontSize || 14) : fontSize;
  const textLabelFontFamily = isTextLabel ? (rectangle.textFontFamily || fontFamily) : fontFamily;
  const textLabelFontWeight = isTextLabel ? (rectangle.fontWeight || 'normal') : 'normal';
  const textLabelAlignment = isTextLabel ? (rectangle.textAlign || 'center') : 'center';
  
  /**
   * Complex state-based styling system with priority hierarchy:
   * 1. Active interactions (resize, drag) - highest priority
   * 2. Drop target states - validation-based colors
   * 3. Selection state - when not in drag mode
   * 4. Default appearance
   */
  let finalBorderColor = borderColor;
  let borderStyle = 'solid';
  let finalBorderWidth = `${borderWidth}px`;
  let boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
  let opacity = 1;
  
  // Text labels are transparent by default unless they're interactive targets
  let backgroundColor = rectangle.color;
  if (isTextLabel && !isSelected && !isDropTarget && !isCurrentDropTarget) {
    finalBorderWidth = '0px';
    borderStyle = 'none';
    finalBorderColor = 'transparent';
    boxShadow = 'none';
    backgroundColor = 'transparent';
  }
  
  // State-based visual styling with clear priority order
  if (isBeingResized) {
    // Semi-transparent during resize to reveal children underneath for layout context
    opacity = 0.3;
    finalBorderColor = '#8b5cf6';
    finalBorderWidth = `${borderWidth + 2}px`;
    boxShadow = '0 10px 25px -5px rgba(139, 92, 246, 0.5), 0 10px 10px -5px rgba(139, 92, 246, 0.2)';
  } else if (isBeingDragged) {
    // Elevated shadow and slight transparency for active drag feedback
    finalBorderColor = '#6366f1';
    finalBorderWidth = `${borderWidth + 1}px`;
    opacity = 0.8;
    boxShadow = '0 20px 25px -5px rgba(99, 102, 241, 0.4), 0 10px 10px -5px rgba(99, 102, 241, 0.1)';
  } else if ((isSelected || isMultiSelected) && !isHierarchyDragActive) {
    // Standard selection highlight - same styling for both single and multi-select
    finalBorderColor = '#3b82f6';
    finalBorderWidth = `${borderWidth + 1}px`;
    boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.1)';
  } else if (isCurrentDropTarget) {
    // Active drop target - solid border with enhanced shadow
    if (isValidDropTarget) {
      finalBorderColor = '#10b981';
      finalBorderWidth = `${borderWidth + 1}px`;
      borderStyle = 'solid';
      boxShadow = '0 10px 25px -5px rgba(16, 185, 129, 0.4), 0 10px 10px -5px rgba(16, 185, 129, 0.1)';
    } else {
      // Invalid drop target - red warning style
      finalBorderColor = '#ef4444';
      finalBorderWidth = `${borderWidth + 1}px`;
      borderStyle = 'solid';
      boxShadow = '0 10px 25px -5px rgba(239, 68, 68, 0.4), 0 10px 10px -5px rgba(239, 68, 68, 0.1)';
    }
  } else if (isDropTarget) {
    // Potential drop target - dashed border for subtle indication
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
    // Warning indication when rectangle has reached minimum size constraints
    finalBorderColor = '#f59e0b';
    finalBorderWidth = `${borderWidth + 1}px`;
    borderStyle = 'solid';
    boxShadow = '0 10px 25px -5px rgba(245, 158, 11, 0.4), 0 10px 10px -5px rgba(245, 158, 11, 0.1)';
  }
  
  // Computed style object with grid-based positioning and state-driven appearance
  const style: React.CSSProperties = {
    position: 'absolute',
    left: rectangle.x * gridSize,
    top: rectangle.y * gridSize,
    width: rectangle.w * gridSize,
    height: rectangle.h * gridSize,
    backgroundColor: backgroundColor,
    border: `${finalBorderWidth} ${borderStyle} ${finalBorderColor}`,
    borderRadius: `${borderRadius}px`,
    cursor: isHierarchyDragActive ? 'pointer' : (canDrag ? 'move' : 'default'),
    zIndex: zIndex,
    opacity,
    boxShadow,
    // Disable transitions during active interactions for immediate visual feedback
    transition: (isDragActive || isResizeActive || isBeingDragged) ? 'none' : 'all 0.2s ease-in-out',
    // Clip child content during resize to prevent visual overflow issues, but allow resize handle to be visible
    overflow: childCount > 0 && !isSelected ? 'hidden' : 'visible'
  };

  /**
   * Enhanced mouse interaction handler supporting multiple drag modes:
   * - Ctrl/Cmd + drag: Hierarchy rearrangement (moves rectangles between parents)
   * - Regular drag: Position adjustment within current parent
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onMouseDown(e, rectangle, 'hierarchy-drag');
    } else if (canDrag) {
      onMouseDown(e, rectangle, 'drag');
    }
  };

  return (
    <div
      style={style}
      className="group select-none"
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => onContextMenu(e, rectangle.id)}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        
        // Handle Ctrl+Click for multi-select toggle
        if (e.ctrlKey || e.metaKey) {
          // For multi-select, we need to toggle selection instead of direct select
          // This will be handled by the parent component through onSelect
          onSelect(rectangle.id + '|toggle');
        } else {
          onSelect(rectangle.id);
        }
      }}
    >
      {/* Adaptive label positioning: parent rectangles vs leaf rectangles have different layouts */}
      {childCount > 0 || isCurrentDropTarget || isDropTarget ? (
        // Parent rectangles and drop targets: label positioned at top to leave space for children
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
                className="w-full px-1 py-0.5 font-medium bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center select-text"
                style={{ color: textColor, fontSize: `${textLabelFontSize}px`, fontFamily: textLabelFontFamily }}
              />
            ) : (
              <CustomTooltip content={rectangle.description || rectangle.label}>
                <div 
                  className="font-medium truncate"
                  style={{ 
                    color: textColor, 
                    fontSize: `${textLabelFontSize}px`,
                    fontFamily: textLabelFontFamily,
                    fontWeight: textLabelFontWeight,
                    textAlign: textLabelAlignment,
                    cursor: isHierarchyDragActive ? 'pointer' : (canDrag ? 'move' : 'text')
                  }}
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
              </CustomTooltip>
            )}
          </div>
          
          {/* Action buttons handled by external ActionButtonsOverlay for proper z-index layering */}
        </div>
      ) : (
        // Leaf rectangles: center-aligned label with text wrapping and alignment support
        <div className={`h-full flex items-center p-2 ${
          isTextLabel && textLabelAlignment === 'left' ? 'justify-start' :
          isTextLabel && textLabelAlignment === 'right' ? 'justify-end' :
          'justify-center'
        }`}>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleInputSubmit}
              onKeyDown={handleInputKeyDown}
              className="w-full px-1 py-0.5 font-medium bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center select-text"
              style={{ color: textColor, fontSize: `${textLabelFontSize}px`, fontFamily: textLabelFontFamily }}
            />
          ) : (
            <CustomTooltip content={rectangle.description || rectangle.label}>
              <div 
                className="font-medium cursor-text break-words leading-tight"
                style={{ 
                  color: textColor,
                  fontSize: `${textLabelFontSize}px`,
                  fontFamily: textLabelFontFamily,
                  fontWeight: textLabelFontWeight,
                  textAlign: textLabelAlignment,
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto'
                }}
              >
                {rectangle.label}
              </div>
            </CustomTooltip>
          )}
          
          {/* Action buttons handled by external ActionButtonsOverlay for proper z-index layering */}
        </div>
      )}

      {/* Interactive resize handle - only visible when exactly one rectangle is selected */}
      {canResize && isSelected && selectedCount === 1 && !isHierarchyDragActive && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 sm:w-4 sm:h-4 bg-blue-500 cursor-se-resize rounded-tl-lg opacity-80 hover:opacity-100 transition-opacity touch-friendly"
          onMouseDown={(e) => onMouseDown(e, rectangle, 'resize')}
          title="Resize"
        />
      )}
      
      {/* Hierarchy rearrangement drag handle with directional arrow icon */}
      {isSelected && selectedCount === 1 && !isHierarchyDragActive && (
        <div
          className="absolute top-1 left-1 w-4 h-4 bg-purple-500 rounded-full opacity-70 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
          title="Drag to rearrange hierarchy"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, rectangle, 'hierarchy-drag');
          }}
        >
          {/* Four-way arrow icon indicating multi-directional drag capability */}
          <svg width="8" height="8" viewBox="0 0 16 16" fill="white">
            <path d="M8 2L10 6H6L8 2Z M8 14L6 10H10L8 14Z M2 8L6 6V10L2 8Z M14 8L10 10V6L14 8Z" />
          </svg>
        </div>
      )}
      
      {/* Active drop zone overlay with clear call-to-action text */}
      {isCurrentDropTarget && (
        <div className="absolute inset-0 bg-green-200 bg-opacity-30 rounded-lg flex items-center justify-center">
          <div className="text-green-800 font-bold text-sm">Drop Here</div>
        </div>
      )}
      
    </div>
  );
};

export default React.memo(RectangleComponent);