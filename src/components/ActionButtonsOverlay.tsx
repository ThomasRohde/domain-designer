import React from 'react';
import { Plus, Trash2, Minimize2, Lock, Unlock } from 'lucide-react';
import { Rectangle } from '../types';
import { LABEL_MARGIN } from '../utils/constants';

interface ActionButtonsOverlayProps {
  selectedRectangle: Rectangle | null;
  childCount: number;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  onFitToChildren: (id: string) => void;
  onToggleManualPositioning: (id: string) => void;
  onShowLockConfirmation: (rectangleId: string, rectangleLabel: string) => void;
  gridSize: number;
  isDragging?: boolean;
  isResizing?: boolean;
  isHierarchyDragging?: boolean;
  isKeyboardMoving?: boolean;
}

const ActionButtonsOverlay: React.FC<ActionButtonsOverlayProps> = ({
  selectedRectangle,
  childCount,
  onAddChild,
  onRemove,
  onFitToChildren,
  onToggleManualPositioning,
  onShowLockConfirmation,
  gridSize,
  isDragging = false,
  isResizing = false,
  isHierarchyDragging = false,
  isKeyboardMoving = false
}) => {
  // Hide action buttons during any drag/resize/keyboard movement operation
  if (!selectedRectangle || isDragging || isResizing || isHierarchyDragging || isKeyboardMoving) {
    return null;
  }

  const rect = selectedRectangle;
  const hasChildren = childCount > 0;
  const isManualPositioningEnabled = rect.isManualPositioningEnabled ?? false;

  // Calculate button position (panOffset is now handled by CSS transform)
  const rectX = rect.x * gridSize;
  const rectY = rect.y * gridSize;
  const rectWidth = rect.w * gridSize;

  const buttonStyle: React.CSSProperties = {
    position: 'absolute',
    left: rectX + rectWidth - 8, // Position 8px from the right edge of the rectangle
    top: hasChildren ? rectY + (LABEL_MARGIN * 2) : rectY + 4, // 4px from top for leaf nodes
    zIndex: 100000, // Very high z-index to ensure visibility
    pointerEvents: 'auto',
    display: 'flex',
    gap: '4px',
    transform: 'translateX(-100%)' // Move the buttons to align their right edge with the positioning point
  };

  return (
    <div style={buttonStyle}>
      <button
        className="p-1 hover:bg-white hover:bg-opacity-70 rounded transition-colors bg-white bg-opacity-80 shadow-sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Overlay Add Child button clicked for:', rect.id);
          onAddChild(rect.id);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        title="Add Child"
      >
        <Plus size={hasChildren ? 12 : 10} />
      </button>
      
      {hasChildren && (
        <button
          className={`p-1 hover:bg-opacity-70 rounded transition-colors bg-white bg-opacity-80 shadow-sm ${
            isManualPositioningEnabled ? 'text-green-600 hover:bg-green-100' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Overlay Toggle Manual Positioning button clicked for:', rect.id);
            
            if (isManualPositioningEnabled) {
              // Show confirmation modal when locking (going from unlocked to locked)
              onShowLockConfirmation(rect.id, rect.label);
            } else {
              // Allow unlocking without confirmation
              onToggleManualPositioning(rect.id);
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title={isManualPositioningEnabled ? "Lock automatic layout" : "Unlock for manual positioning"}
        >
          {isManualPositioningEnabled ? <Unlock size={12} /> : <Lock size={12} />}
        </button>
      )}
      
      {hasChildren && !isManualPositioningEnabled && (
        <button
          className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors bg-white bg-opacity-80 shadow-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Overlay Fit to Children button clicked for:', rect.id);
            onFitToChildren(rect.id);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Fit to Children"
        >
          <Minimize2 size={12} />
        </button>
      )}
      
      <button
        className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors bg-white bg-opacity-80 shadow-sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Overlay Remove button clicked for:', rect.id);
          onRemove(rect.id);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        title="Remove"
      >
        <Trash2 size={hasChildren ? 12 : 10} />
      </button>
    </div>
  );
};

export default ActionButtonsOverlay;
