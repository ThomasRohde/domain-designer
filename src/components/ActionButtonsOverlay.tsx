import React from 'react';
import { Plus, Trash2, Minimize2, Lock, Unlock } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ActionButtonsOverlayProps {}

/**
 * Floating action buttons overlay for selected rectangles.
 * Provides quick access to common operations: add child, remove, fit to children, and manual positioning toggle.
 * Hidden during multi-select operations since these actions don't apply to multiple rectangles.
 */
const ActionButtonsOverlay: React.FC<ActionButtonsOverlayProps> = () => {
  const selectedId = useAppStore(state => state.selectedId);
  const selectedIds = useAppStore(state => state.ui.selectedIds);
  const rectangles = useAppStore(state => state.rectangles);
  const gridSize = useAppStore(state => state.settings.gridSize);
  const isDragging = useAppStore(state => state.canvasActions.isDragging());
  const isResizing = useAppStore(state => state.canvasActions.isResizing());
  const isHierarchyDragging = useAppStore(state => state.canvasActions.isHierarchyDragging());
  const isKeyboardMoving = useAppStore(state => state.canvas.isKeyboardMoving);
  
  const addRectangle = useAppStore(state => state.rectangleActions.addRectangle);
  const removeRectangle = useAppStore(state => state.rectangleActions.removeRectangle);
  const fitToChildren = useAppStore(state => state.rectangleActions.fitToChildren);
  const toggleManualPositioning = useAppStore(state => state.rectangleActions.toggleManualPositioning);
  const showLockConfirmationModal = useAppStore(state => state.uiActions.showLockConfirmationModal);
  
  const getChildren = useAppStore(state => state.getters.getChildren);
  
  const selectedRectangle = selectedId ? rectangles.find(r => r.id === selectedId) : null;
  const childCount = selectedId ? getChildren(selectedId).length : 0;
  const isMultiSelectActive = selectedIds.length > 1;
  
  // Hide overlay during interactive operations or when multi-select is active
  if (!selectedRectangle || isDragging || isResizing || isHierarchyDragging || isKeyboardMoving || isMultiSelectActive) {
    return null;
  }

  const rect = selectedRectangle;
  const hasChildren = childCount > 0;
  const isManualPositioningEnabled = rect.isManualPositioningEnabled ?? false;

  // Position floating toolbar above rectangle center
  const rectX = rect.x * gridSize;
  const rectY = rect.y * gridSize;
  const rectWidth = rect.w * gridSize;

  const buttonStyle: React.CSSProperties = {
    position: 'absolute',
    left: rectX + (rectWidth / 2),
    top: rectY - 50, // Float above rectangle
    zIndex: 100000, // Above all other elements
    pointerEvents: 'auto',
    display: 'flex',
    gap: '2px',
    padding: '4px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transform: 'translateX(-50%)' // Center-align above rectangle
  };

  return (
    <div style={buttonStyle}>
      <button
        className="p-2 hover:bg-gray-100 rounded-md transition-colors text-green-600"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Overlay Add Child button clicked for:', rect.id);
          addRectangle(rect.id);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        title="Add Child"
      >
        <Plus size={14} />
      </button>
      
      {hasChildren && (
        <button
          className={`p-2 hover:bg-gray-100 rounded-md transition-colors ${
            isManualPositioningEnabled ? 'text-green-600' : 'text-orange-600'
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Overlay Toggle Manual Positioning button clicked for:', rect.id);
            
            if (isManualPositioningEnabled) {
              // Show confirmation modal when locking (going from unlocked to locked)
              showLockConfirmationModal(rect.id, rect.label);
            } else {
              // Allow unlocking without confirmation
              toggleManualPositioning(rect.id);
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title={isManualPositioningEnabled ? "Lock automatic layout" : "Unlock for manual positioning"}
        >
          {isManualPositioningEnabled ? <Unlock size={14} /> : <Lock size={14} />}
        </button>
      )}
      
      {hasChildren && !isManualPositioningEnabled && !rect.isLockedAsIs && (
        <button
          className="p-2 hover:bg-gray-100 rounded-md text-blue-600 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Overlay Fit to Children button clicked for:', rect.id);
            fitToChildren(rect.id);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Fit to Children"
        >
          <Minimize2 size={14} />
        </button>
      )}
      
      <button
        className="p-2 hover:bg-gray-100 rounded-md text-red-600 transition-colors"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Overlay Remove button clicked for:', rect.id);
          removeRectangle(rect.id);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        title="Remove"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export default ActionButtonsOverlay;
