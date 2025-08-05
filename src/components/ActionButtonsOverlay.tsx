import React from 'react';
import { Plus, Trash2, Grid3X3, Move, Container, Lock } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ActionButtonsOverlayProps {}

/**
 * Floating action buttons overlay for selected rectangles.
 * Provides quick access to common operations: add child, remove, fit to children, and manual positioning toggle.
 * Hidden during multi-select operations since these actions don't apply to multiple rectangles.
 */
const ActionButtonsOverlay: React.FC<ActionButtonsOverlayProps> = () => {
  const selectedIds = useAppStore(state => state.ui.selectedIds);
  const selectedId = selectedIds.length > 0 ? selectedIds[0] : null;
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
  
  const getChildren = useAppStore(state => state.getters.getChildren);
  
  const selectedRectangle = selectedId ? rectangles.find(r => r.id === selectedId) : null;
  const childCount = selectedId ? getChildren(selectedId).length : 0;
  const isMultiSelectActive = selectedIds.length > 1;
  
  /**
   * Visibility state machine for overlay behavior.
   * 
   * The overlay is hidden during:
   * - Interactive operations (drag, resize, hierarchy drag) to prevent interference
   * - Keyboard movement operations to avoid visual clutter during rapid position changes
   * - Multi-select modes where group operations take precedence over single-rectangle actions
   * - No selection state where context-specific actions are not applicable
   */
  if (!selectedRectangle || isDragging || isResizing || isHierarchyDragging || isKeyboardMoving || isMultiSelectActive) {
    return null;
  }

  const rect = selectedRectangle;
  const hasChildren = childCount > 0;
  const isManualPositioningEnabled = rect.isManualPositioningEnabled ?? false;
  const isLockedAsIs = rect.isLockedAsIs ?? false;

  /**
   * Dynamic positioning algorithm for context-sensitive toolbar placement.
   * 
   * Positioning Strategy:
   * 1. Convert grid coordinates to pixel coordinates for accurate placement
   * 2. Calculate rectangle center point as the toolbar anchor
   * 3. Position toolbar 50px above rectangle top edge to avoid overlap
   * 4. Apply CSS transform to center-align toolbar horizontally over rectangle
   * 
   * The fixed 50px offset ensures consistent spacing while the transform-based
   * centering provides pixel-perfect alignment regardless of rectangle width.
   */
  const rectX = rect.x * gridSize;
  const rectY = rect.y * gridSize;
  const rectWidth = rect.w * gridSize;

  const buttonStyle: React.CSSProperties = {
    position: 'absolute',
    left: rectX + (rectWidth / 2), // Horizontal center anchor point
    top: rectY - 50, // Fixed offset above rectangle
    zIndex: 100000, // Ensure overlay appears above all canvas elements
    pointerEvents: 'auto', // Enable mouse interactions despite canvas transforms
    display: 'flex',
    gap: '2px',
    padding: '4px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transform: 'translateX(-50%)' // Center toolbar horizontally on anchor point
  };

  return (
    <div style={buttonStyle}>
      <button
        className={`p-2 rounded-md transition-colors ${
          isLockedAsIs 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-green-600 hover:bg-gray-100'
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isLockedAsIs) return;
          console.log('Overlay Add Child button clicked for:', rect.id);
          addRectangle(rect.id);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        title={isLockedAsIs ? "Cannot add children - rectangle is locked" : "Add Child"}
        disabled={isLockedAsIs}
      >
        <Plus size={14} />
      </button>
      
      {hasChildren && (
        <button
          className={`px-3 py-2 hover:bg-gray-100 rounded-md transition-colors text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
            isLockedAsIs ? 'text-red-600 bg-red-50' : 
            isManualPositioningEnabled ? 'text-blue-600 bg-blue-50' : 'text-orange-600'
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Overlay Toggle Manual Positioning button clicked for:', rect.id);
            
            // Smart default: always apply the toggle action directly
            // If switching to auto-layout (from manual), it will apply the layout algorithm
            // If switching to manual (from auto), it enables manual positioning
            toggleManualPositioning(rect.id, e.shiftKey);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title={isLockedAsIs 
            ? "Unlock Layout - enable manual positioning or auto layout. Size and position are currently locked." 
            : isManualPositioningEnabled 
              ? "Switch to Auto Layout - children will be repositioned using the layout algorithm. Hold Shift+Click to preserve current positions." 
              : "Switch to Manual Layout - children can be positioned freely"
          }
        >
          {isLockedAsIs ? (
            <>
              <Lock size={12} />
              <span>Unlock</span>
              <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded ml-1">Locked</span>
            </>
          ) : isManualPositioningEnabled ? (
            <>
              <Grid3X3 size={12} />
              <span>Auto Layout</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded ml-1">Manual</span>
            </>
          ) : (
            <>
              <Move size={12} />
              <span>Manual Layout</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded ml-1">Auto</span>
            </>
          )}
        </button>
      )}
      
      {hasChildren && !isManualPositioningEnabled && !rect.isLockedAsIs && (
        <button
          className="px-3 py-2 hover:bg-gray-100 rounded-md text-blue-600 transition-colors text-xs font-medium flex items-center gap-1 whitespace-nowrap"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Overlay Fit Container button clicked for:', rect.id);
            fitToChildren(rect.id);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Resize container to fit all children with proper margins"
        >
          <Container size={12} />
          <span>Fit Container</span>
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
