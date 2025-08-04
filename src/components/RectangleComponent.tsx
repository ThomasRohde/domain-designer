import React, { useState, useRef, useEffect } from 'react';
import { Rectangle, VirtualDragPosition } from '../types';
import { GRID_SIZE, LABEL_MARGIN } from '../utils/constants';
import CustomTooltip from './CustomTooltip';

interface RectangleComponentProps {
  /** Rectangle data including position, size, label, and styling */
  rectangle: Rectangle;
  /** Whether this rectangle is currently selected */
  isSelected: boolean;
  /** Whether this rectangle is part of a multi-selection (affects styling and interaction) */
  isMultiSelected: boolean;
  /** Total count of selected rectangles (controls resize handle visibility: only shown for single selection) */
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
  /** Virtual drag position for performance optimization during drag operations */
  virtualPosition?: VirtualDragPosition | null;
}

/**
 * Advanced rectangle component with full multi-select and interaction support.
 * 
 * Core Interaction Systems:
 * - Multi-Select Integration: Supports both single and multi-selection with visual differentiation
 * - Ctrl+Click Handling: Toggle selection state for building multi-selections
 * - In-Place Editing: Double-click label editing with keyboard shortcuts (Enter/Escape)
 * - Multiple Drag Modes: Position drag, resize, and hierarchy rearrangement
 * - Visual State Management: Priority-based styling system for different interaction states
 * 
 * Multi-Select Features:
 * - Selection Count Badges: Visual indicators for multi-selection state
 * - Unified Styling: Same visual treatment for single and multi-selection
 * - Handle Visibility Logic: Resize handle only shown for single selection (selectedCount === 1)
 * - Event Propagation: Proper handling of Ctrl+Click for selection toggle
 * 
 * Performance Optimizations:
 * - Conditional Transitions: Disabled during active interactions for immediate feedback
 * - Smart Overflow Handling: Clips child content during resize, allows handles to show
 * - Memoized Component: React.memo wrapper prevents unnecessary re-renders
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
  disableEditing = false,
  virtualPosition = null
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
   * Calculates optimal text color using relative luminance for accessibility compliance.
   * 
   * Algorithm: ITU-R BT.709 relative luminance formula
   * - Converts hex color to RGB values
   * - Applies luminance weights: R(299) + G(587) + B(114) / 1000
   * - Returns white text for dark backgrounds, black text for light backgrounds
   * - Ensures WCAG contrast compliance for text readability
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
   * Advanced visual state system with multi-select integration and priority-based styling.
   * 
   * State Priority Hierarchy (highest to lowest):
   * 1. Active Interactions: Resize/drag operations with enhanced visual feedback
   * 2. Drop Target States: Hierarchy drag with validation-based color coding
   * 3. Selection States: Both single (isSelected) and multi-selection (isMultiSelected) styling
   * 4. Constraint Warnings: Visual feedback for size/positioning limitations
   * 5. Default Appearance: Base styling when no special states active
   * 
   * Multi-Select Visual Integration:
   * - Unified selection styling: Same visual treatment for single and multi-selection
   * - Blue border and shadow: #3b82f6 color scheme for selection indication
   * - Hierarchy drag compatibility: Selection styling disabled during hierarchy operations
   * - Text label transparency: Special handling for text-only rectangles
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
    // Enhanced selection styling: stronger visual feedback for multi-select clarity
    // Brighter blue with thicker border and stronger glow for clear selection indication
    finalBorderColor = '#2563eb'; // Brighter blue
    finalBorderWidth = `${borderWidth + 2}px`; // Thicker border
    boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.3), 0 10px 25px -5px rgba(37, 99, 235, 0.5), 0 10px 10px -5px rgba(37, 99, 235, 0.2)'; // Glow + shadow
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
  
  // Calculate actual position for rendering (virtual position takes precedence for performance)
  const actualX = virtualPosition ? virtualPosition.x : rectangle.x;
  const actualY = virtualPosition ? virtualPosition.y : rectangle.y;
  
  // Computed style object with grid-based positioning and state-driven appearance
  const style: React.CSSProperties = {
    position: 'absolute',
    left: actualX * gridSize,
    top: actualY * gridSize,
    width: rectangle.w * gridSize,
    height: rectangle.h * gridSize,
    backgroundColor: backgroundColor,
    border: `${finalBorderWidth} ${borderStyle} ${finalBorderColor}`,
    borderRadius: `${borderRadius}px`,
    cursor: isHierarchyDragActive ? 'pointer' : (canDrag ? 'move' : 'default'),
    zIndex: zIndex,
    opacity,
    boxShadow,
    // Disable transitions during virtual drag for immediate visual feedback
    transition: (isDragActive || isResizeActive || isBeingDragged || virtualPosition) ? 'none' : 'all 0.2s ease-in-out',
    // Clip child content during resize to prevent visual overflow issues, but allow resize handle and badges to be visible
    overflow: childCount > 0 && !isSelected && !isMultiSelected ? 'hidden' : 'visible'
  };

  /**
   * Multi-modal mouse interaction system with keyboard modifier support.
   * 
   * Interaction Modes:
   * - Ctrl/Cmd + Click: Hierarchy rearrangement mode (purple drag handle visual)
   * - Regular Click: Standard position drag within current parent container
   * - Double Click: Enters in-place label editing mode
   * 
   * Multi-Select Integration:
   * - Preserves existing drag behavior for both single and multi-selection
   * - Keyboard modifiers work consistently across selection types
   * - Proper event propagation ensures parent components handle selection logic
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
        
        // Multi-select toggle: Ctrl/Cmd+Click for building selections
        if (e.ctrlKey || e.metaKey) {
          // Toggle mode: Add/remove rectangle from current selection
          // Special '|toggle' suffix signals parent component to toggle selection state
          // This enables building multi-selections via Ctrl+Click interactions
          onSelect(rectangle.id + '|toggle');
        } else {
          // Standard selection: Replace current selection with this rectangle
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

      {/* Resize handle: Only shown for single selection to avoid confusion with multi-select operations */}
      {canResize && isSelected && selectedCount === 1 && !isHierarchyDragActive && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-orange-500 cursor-se-resize rounded-tl-md opacity-90 hover:opacity-100 transition-all hover:scale-110 border-2 border-white shadow-sm"
          onMouseDown={(e) => onMouseDown(e, rectangle, 'resize')}
          title="Resize"
        />
      )}
      
      {/* Multi-selection count badge: Shows selection position in group */}
      {isMultiSelected && !isHierarchyDragActive && (
        <div
          className="absolute w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full border-2 border-white shadow-xl flex items-center justify-center"
          style={{ 
            top: '-8px', // Position outside the rectangle's border
            right: '-8px', // Position outside the rectangle's border
            zIndex: 100001, // Higher than ActionButtonsOverlay (100000)
            lineHeight: '1' // Ensure text doesn't have extra line spacing
          }}
          title={`${selectedCount} rectangles selected`}
        >
          {selectedCount}
        </div>
      )}

      {/* Hierarchy drag handle: Orange circle matching resize handle, single selection only */}
      {isSelected && selectedCount === 1 && !isHierarchyDragActive && (
        <div
          className="absolute top-1 left-1 w-4 h-4 bg-orange-500 rounded-full opacity-90 hover:opacity-100 transition-all hover:scale-110 cursor-pointer border-2 border-white shadow-sm"
          title="Drag to rearrange hierarchy"
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, rectangle, 'hierarchy-drag');
          }}
        />
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

// Optimized React.memo with focused comparison for essential props
export default React.memo(RectangleComponent, (prevProps, nextProps) => {
  // Critical state changes that must trigger re-render
  if (prevProps.isSelected !== nextProps.isSelected ||
      prevProps.isMultiSelected !== nextProps.isMultiSelected ||
      prevProps.selectedCount !== nextProps.selectedCount ||
      prevProps.virtualPosition !== nextProps.virtualPosition ||
      prevProps.isCurrentDropTarget !== nextProps.isCurrentDropTarget ||
      prevProps.rectangle !== nextProps.rectangle || // Reference equality check for rectangle object
      // Visual property changes that must trigger re-render
      prevProps.fontSize !== nextProps.fontSize ||
      prevProps.fontFamily !== nextProps.fontFamily ||
      prevProps.borderRadius !== nextProps.borderRadius ||
      prevProps.borderColor !== nextProps.borderColor ||
      prevProps.borderWidth !== nextProps.borderWidth) {
    return false;
  }
  
  // Skip re-render if core properties unchanged
  return true;
});