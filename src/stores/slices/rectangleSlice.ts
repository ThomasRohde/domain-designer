import { Rectangle, RectangleType } from '../../types';
import { DEFAULT_RECTANGLE_SIZE } from '../../utils/constants';
import { 
  updateChildrenLayout,
  getAllDescendants,
  getChildren
} from '../../utils/layoutUtils';
import { layoutManager } from '../../utils/layout';
import { 
  createRectangle,
  updateRectangleType,
  applyFixedDimensions
} from '../../utils/rectangleOperations';
import { alignRectangles } from '../../utils/alignmentUtils';
import { distributeRectangles } from '../../utils/distributionUtils';
import type { SliceCreator, RectangleActions } from '../types';

/**
 * Rectangle state slice interface
 */
export interface RectangleSlice {
  // State
  rectangles: Rectangle[];
  selectedId: string | null;
  nextId: number;
  
  // Actions
  rectangleActions: RectangleActions;
}

/**
 * Helper function to update rectangles and save to history
 */
const updateRectanglesWithHistory = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: (partial: object | ((state: any) => object)) => void, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: () => any, 
  updater: (current: Rectangle[]) => Rectangle[], 
  selectedId?: string | null
) => {
  const state = get();
  const currentRectangles = state.rectangles;
  const updated = updater(currentRectangles);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set((state: any) => ({
    rectangles: updated,
    ...(selectedId !== undefined && { selectedId }),
    nextId: state.nextId
  }));
  
  // Save to history after the state update
  setTimeout(() => {
    get().historyActions.saveToHistory();
  }, 0);
};

/**
 * Creates the rectangle slice for the store
 */
export const createRectangleSlice: SliceCreator<RectangleSlice> = (set, get) => ({
  // Initial state
  rectangles: [],
  selectedId: null,
  nextId: 1,

  // Actions
  rectangleActions: {
    addRectangle: (parentId?: string) => {
      const state = get();
      const { rectangles, nextId, settings, canvas } = state;
      
      // Prevent adding children to text labels
      if (parentId) {
        const parentRect = rectangles.find(rect => rect.id === parentId);
        if (parentRect?.isTextLabel) {
          console.warn('Cannot add children to text labels');
          return;
        }
      }
      
      // Generate unique ID
      let candidateId: string;
      let candidate = nextId;
      
      do {
        candidateId = `rect-${candidate}`;
        candidate++;
      } while (rectangles.some(rect => rect.id === candidateId));
      
      const id = candidateId;
      
      const getMargins = () => ({ margin: settings.margin, labelMargin: settings.labelMargin });
      const getFixedDimensions = () => ({
        leafFixedWidth: settings.leafFixedWidth,
        leafFixedHeight: settings.leafFixedHeight,
        leafWidth: settings.leafWidth,
        leafHeight: settings.leafHeight
      });
      
      let { x, y, w, h } = layoutManager.calculateNewRectangleLayout(parentId || null, rectangles, DEFAULT_RECTANGLE_SIZE, getMargins());
      
      // Position root rectangles in visible area
      if (!parentId) {
        const rootRects = rectangles.filter(rect => !rect.parentId);
        if (rootRects.length === 0) {
          // For the first rectangle, position it considering current pan
          const viewportX = Math.round(-canvas.panOffset.x / settings.gridSize);
          const viewportY = Math.round(-canvas.panOffset.y / settings.gridSize);
          x = viewportX + 10;
          y = viewportY + 10;
        }
      }
      
      // Create rectangle
      let newRect = createRectangle(id, x, y, w, h, parentId || undefined);
      
      // Apply fixed dimensions if this is a leaf rectangle
      if (parentId) {
        newRect = applyFixedDimensions(newRect, getFixedDimensions());
      }

      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        let updated = [...currentRectangles, newRect];
        
        // Update parent type and layout
        if (parentId) {
          updated = updateRectangleType(updated, parentId);
          const parentIndex = updated.findIndex(r => r.id === parentId);
          if (parentIndex !== -1) {
            const parent = updated[parentIndex];
            const allChildren = updated.filter(r => r.parentId === parentId);
            
            // Resize parent if needed
            if (allChildren.length > 0) {
              const minParentSize = layoutManager.calculateMinimumParentSize(parentId, updated, getFixedDimensions(), getMargins());
              
              if (parent.w < minParentSize.w || parent.h < minParentSize.h) {
                updated = updated.map(rect => 
                  rect.id === parentId 
                    ? { ...rect, w: Math.max(rect.w, minParentSize.w), h: Math.max(rect.h, minParentSize.h) }
                    : rect
                );
              }
            }
            
            // Recalculate layout for all children
            if (allChildren.length > 0) {
              const updatedParent = updated.find(r => r.id === parentId);
              if (updatedParent) {
                const newChildLayout = layoutManager.calculateChildLayout(updatedParent, allChildren, getFixedDimensions(), getMargins(), updated);
                
                newChildLayout.forEach(layoutChild => {
                  const childIndex = updated.findIndex(r => r.id === layoutChild.id);
                  if (childIndex !== -1) {
                    updated[childIndex] = {
                      ...updated[childIndex],
                      x: layoutChild.x,
                      y: layoutChild.y,
                      w: layoutChild.w,
                      h: layoutChild.h
                    };
                  }
                });
              }
            }
          }
        }
        
        return updated;
      }, id);
      
      // Update nextId separately
      set(() => ({ nextId: candidate }));
    },

    removeRectangle: (id: string) => {
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        // Get all descendants to remove
        const descendantIds = getAllDescendants(id, currentRectangles);
        const toRemove = [id, ...descendantIds];
        
        return currentRectangles.filter(rect => !toRemove.includes(rect.id));
      }, null);
    },

    updateRectangle: (id: string, updates: Partial<Rectangle>) => {
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        return currentRectangles.map(rect => 
          rect.id === id ? { ...rect, ...updates } : rect
        );
      });
    },

    updateRectangleLabel: (id: string, label: string) => {
      get().rectangleActions.updateRectangle(id, { label });
    },

    updateRectangleColor: (id: string, color: string) => {
      get().rectangleActions.updateRectangle(id, { color });
    },

    updateRectangleDescription: (id: string, description: string) => {
      get().rectangleActions.updateRectangle(id, { description });
    },

    toggleTextLabel: (id: string) => {
      const state = get();
      const { rectangles } = state;
      const rect = rectangles.find(r => r.id === id);
      if (!rect) return;
      
      // Can't convert parent rectangles to text labels
      const hasChildren = getChildren(id, rectangles).length > 0;
      if (hasChildren && !rect.isTextLabel) {
        console.warn('Cannot convert parent rectangles to text labels');
        return;
      }
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        const isTextLabel = !rect.isTextLabel;
        return currentRectangles.map(r => 
          r.id === id ? {
            ...r,
            isTextLabel,
            type: isTextLabel ? 'textLabel' as RectangleType : (r.parentId ? 'leaf' as RectangleType : 'root' as RectangleType),
            textFontFamily: isTextLabel ? (r.textFontFamily || 'Arial, sans-serif') : r.textFontFamily,
            textFontSize: isTextLabel ? (r.textFontSize || 14) : r.textFontSize,
            fontWeight: isTextLabel ? (r.fontWeight || 'normal') : r.fontWeight,
            textAlign: isTextLabel ? (r.textAlign || 'center') : r.textAlign
          } : r
        );
      });
    },

    updateTextLabelProperties: (id: string, properties: Partial<Rectangle>) => {
      get().rectangleActions.updateRectangle(id, properties);
    },

    updateRectangleLayoutPreferences: (id: string, preferences: Partial<Rectangle['layoutPreferences']>) => {
      const state = get();
      const { settings } = state;
      
      const getMargins = () => ({ margin: settings.margin, labelMargin: settings.labelMargin });
      const getFixedDimensions = () => ({
        leafFixedWidth: settings.leafFixedWidth,
        leafFixedHeight: settings.leafFixedHeight,
        leafWidth: settings.leafWidth,
        leafHeight: settings.leafHeight
      });
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        const updated = currentRectangles.map(rect => 
          rect.id === id ? { 
            ...rect, 
            layoutPreferences: rect.layoutPreferences ? { ...rect.layoutPreferences, ...preferences } : preferences as Rectangle['layoutPreferences']
          } : rect
        );
        
        // Resize parent to optimal size when layout preferences change (unless locked as-is)
        const parent = updated.find(rect => rect.id === id);
        if (parent && !parent.isLockedAsIs) {
          const children = getChildren(id, updated);
          if (children.length > 0) {
            const optimalSize = layoutManager.calculateMinimumParentSize(id, updated, getFixedDimensions(), getMargins());
            
            const resizedUpdated = updated.map(rect => 
              rect.id === id 
                ? { ...rect, w: optimalSize.w, h: optimalSize.h }
                : rect
            );
            
            return updateChildrenLayout(resizedUpdated, getFixedDimensions(), getMargins());
          }
        }
        
        return updateChildrenLayout(updated, getFixedDimensions(), getMargins());
      });
    },

    toggleManualPositioning: (id: string) => {
      const state = get();
      const { settings } = state;
      
      const getMargins = () => ({ margin: settings.margin, labelMargin: settings.labelMargin });
      const getFixedDimensions = () => ({
        leafFixedWidth: settings.leafFixedWidth,
        leafFixedHeight: settings.leafFixedHeight,
        leafWidth: settings.leafWidth,
        leafHeight: settings.leafHeight
      });
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        const updated = currentRectangles.map(rect => 
          rect.id === id ? { 
            ...rect, 
            isManualPositioningEnabled: !rect.isManualPositioningEnabled,
            isLockedAsIs: false
          } : rect
        );
        
        const parent = updated.find(rect => rect.id === id);
        return (parent && !parent.isManualPositioningEnabled) 
          ? updateChildrenLayout(updated, getFixedDimensions(), getMargins())
          : updated;
      });
    },

    lockAsIs: (id: string) => {
      get().rectangleActions.updateRectangle(id, { 
        isLockedAsIs: true,
        isManualPositioningEnabled: false 
      });
    },

    fitToChildren: (id: string) => {
      const state = get();
      const { rectangles, settings } = state;
      
      const getMargins = () => ({ margin: settings.margin, labelMargin: settings.labelMargin });
      const getFixedDimensions = () => ({
        leafFixedWidth: settings.leafFixedWidth,
        leafFixedHeight: settings.leafFixedHeight,
        leafWidth: settings.leafWidth,
        leafHeight: settings.leafHeight
      });
      
      const children = getChildren(id, rectangles);
      if (children.length === 0) return;
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        const optimalSize = layoutManager.calculateMinimumParentSize(id, currentRectangles, getFixedDimensions(), getMargins());
        const updated = currentRectangles.map(rect => 
          rect.id === id ? { 
            ...rect, 
            w: optimalSize.w, 
            h: optimalSize.h,
            isLockedAsIs: false,
            isManualPositioningEnabled: false
          } : rect
        );
        
        return updateChildrenLayout(updated, getFixedDimensions(), getMargins());
      });
    },

    moveRectangle: (id: string, deltaXPixels: number, deltaYPixels: number) => {
      const state = get();
      const { rectangles, settings } = state;
      const rect = rectangles.find(r => r.id === id);
      if (!rect) return;

      // Check movement constraints
      if (rect.parentId) {
        const parent = rectangles.find(r => r.id === rect.parentId);
        if (!parent || !parent.isManualPositioningEnabled) {
          // Cannot move children of locked parents
          return;
        }
      }

      // Get all descendants of the rectangle being moved
      const descendants = getAllDescendants(id, rectangles);
      const idsToMove = new Set([id, ...descendants]);

      let actualDeltaXPixels = deltaXPixels;
      let actualDeltaYPixels = deltaYPixels;

      // Check constraints for the main rectangle if it has a parent
      if (rect.parentId) {
        const parent = rectangles.find(p => p.id === rect.parentId);
        if (parent) {
          const { margin, labelMargin } = { margin: settings.margin, labelMargin: settings.labelMargin };
          const gridSize = settings.gridSize;
          const currentXPixels = rect.x * gridSize;
          const currentYPixels = rect.y * gridSize;
          const parentXPixels = parent.x * gridSize;
          const parentYPixels = parent.y * gridSize;
          const parentWPixels = parent.w * gridSize;
          const parentHPixels = parent.h * gridSize;
          const rectWPixels = rect.w * gridSize;
          const rectHPixels = rect.h * gridSize;
          
          let newXPixels = currentXPixels + deltaXPixels;
          let newYPixels = currentYPixels + deltaYPixels;
          
          // Ensure rectangle stays within parent bounds with margins
          newXPixels = Math.max(parentXPixels + margin, newXPixels);
          newYPixels = Math.max(parentYPixels + labelMargin, newYPixels);
          newXPixels = Math.min(parentXPixels + parentWPixels - rectWPixels - margin, newXPixels);
          newYPixels = Math.min(parentYPixels + parentHPixels - rectHPixels - margin, newYPixels);
          
          // Calculate the actual constrained movement
          actualDeltaXPixels = newXPixels - currentXPixels;
          actualDeltaYPixels = newYPixels - currentYPixels;
        }
      }

      // Apply the same delta to all rectangles (main + descendants)
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        return currentRectangles.map(r => {
          if (idsToMove.has(r.id)) {
            // Convert current grid coordinates to pixels, apply actual delta, then back to grid units
            const currentXPixels = r.x * settings.gridSize;
            const currentYPixels = r.y * settings.gridSize;
            
            const newXPixels = currentXPixels + actualDeltaXPixels;
            const newYPixels = currentYPixels + actualDeltaYPixels;

            // Convert back to grid units
            const newX = newXPixels / settings.gridSize;
            const newY = newYPixels / settings.gridSize;

            return { ...r, x: newX, y: newY };
          }
          return r;
        });
      });
    },

    /**
     * Reparent a rectangle to a new parent with comprehensive validation.
     * Handles hierarchy changes, type updates, layout recalculation, and
     * constraint enforcement. Prevents circular dependencies and maintains
     * data integrity throughout the reparenting operation.
     */
    reparentRectangle: (childId: string, newParentId: string | null): boolean => {
      const state = get();
      const { rectangles, settings } = state;
      
      // Validate reparenting operation using business rules
      if (!get().getters.canReparent(childId, newParentId)) {
        return false;
      }
      
      const childRect = rectangles.find(r => r.id === childId);
      if (!childRect) return false;
      
      // Skip no-op reparenting operations
      const currentParentId = childRect.parentId || null;
      if (currentParentId === newParentId) {
        return true; // No change needed
      }
      
      const getMargins = () => ({ margin: settings.margin, labelMargin: settings.labelMargin });
      const getFixedDimensions = () => ({
        leafFixedWidth: settings.leafFixedWidth,
        leafFixedHeight: settings.leafFixedHeight,
        leafWidth: settings.leafWidth,
        leafHeight: settings.leafHeight
      });
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        // Update the child's parentId
        let updated = currentRectangles.map(rect => 
          rect.id === childId ? { ...rect, parentId: newParentId || undefined } : rect
        );
        
        // Update rectangle types based on new hierarchy
        updated = updated.map(rect => {
          const hasChildren = updated.some(r => r.parentId === rect.id);
          const hasParent = rect.parentId !== undefined;
          
          let newType: 'root' | 'parent' | 'leaf';
          if (!hasParent) {
            newType = 'root';
          } else if (hasChildren) {
            newType = 'parent';
          } else {
            newType = 'leaf';
          }
          
          return { ...rect, type: newType };
        });
        
        // Apply fixed dimensions if the reparented rectangle is now a leaf
        const reparentedRect = updated.find(r => r.id === childId);
        if (reparentedRect && reparentedRect.type === 'leaf') {
          const fixedDims = getFixedDimensions();
          updated = updated.map(rect => 
            rect.id === childId 
              ? applyFixedDimensions(rect, fixedDims)
              : rect
          );
        }
        
        // Check if new parent needs to be resized to accommodate all children
        if (newParentId) {
          const newParent = updated.find(r => r.id === newParentId);
          const newParentChildren = updated.filter(r => r.parentId === newParentId);
          
          if (newParentChildren.length > 0 && newParent && !newParent.isLockedAsIs) {
            const minParentSize = layoutManager.calculateMinimumParentSize(newParentId, updated, getFixedDimensions(), getMargins());
            
            if (newParent.w < minParentSize.w || newParent.h < minParentSize.h) {
              updated = updated.map(rect => 
                rect.id === newParentId 
                  ? { ...rect, w: Math.max(rect.w, minParentSize.w), h: Math.max(rect.h, minParentSize.h) }
                  : rect
              );
            }
          }
        }
        
        // Update layout for both old and new parents
        return updateChildrenLayout(updated, getFixedDimensions(), getMargins());
      });
      
      return true;
    },

    setSelectedId: (id: string | null) => {
      set({ selectedId: id });
      // Also update UI selectedIds for consistency
      if (id) {
        set(state => ({
          ui: { ...state.ui, selectedIds: [id] }
        }));
      } else {
        set(state => ({
          ui: { ...state.ui, selectedIds: [] }
        }));
      }
    },

    setSelectedIds: (ids: string[]) => {
      set(state => ({
        ui: { ...state.ui, selectedIds: ids },
        // For backward compatibility, set selectedId to first item or null
        selectedId: ids.length > 0 ? ids[0] : null
      }));
    },

    addToSelection: (id: string) => {
      const state = get();
      const { rectangles, ui } = state;
      
      // Validate selection constraints before adding
      const currentSelection = ui.selectedIds;
      if (currentSelection.length === 0) {
        // First selection, just add it
        set(state => ({
          ui: { ...state.ui, selectedIds: [id] },
          selectedId: id
        }));
        return true;
      }
      
      // Check if we can add this rectangle to the current selection
      const targetRect = rectangles.find(r => r.id === id);
      if (!targetRect) return false;
      
      // Check same parent constraint
      const firstSelectedRect = rectangles.find(r => r.id === currentSelection[0]);
      if (!firstSelectedRect) return false;
      
      if (targetRect.parentId !== firstSelectedRect.parentId) {
        return false; // Different parents, cannot multi-select
      }
      
      // Check text label constraint
      if (targetRect.isTextLabel) {
        return false; // Text labels cannot be multi-selected
      }
      
      // Add to selection if not already selected
      if (!currentSelection.includes(id)) {
        set(state => ({
          ui: { ...state.ui, selectedIds: [...currentSelection, id] }
        }));
      }
      return true;
    },

    removeFromSelection: (id: string) => {
      const state = get();
      const currentSelection = state.ui.selectedIds;
      const newSelection = currentSelection.filter(selectedId => selectedId !== id);
      
      set(state => ({
        ui: { ...state.ui, selectedIds: newSelection },
        selectedId: newSelection.length > 0 ? newSelection[0] : null
      }));
    },

    clearSelection: () => {
      set(state => ({
        ui: { ...state.ui, selectedIds: [] },
        selectedId: null
      }));
    },

    toggleSelection: (id: string) => {
      const state = get();
      const currentSelection = state.ui.selectedIds;
      
      if (currentSelection.includes(id)) {
        get().rectangleActions.removeFromSelection(id);
      } else {
        get().rectangleActions.addToSelection(id);
      }
    },

    bulkUpdateColor: (ids: string[], color: string) => {
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        return currentRectangles.map(rect => 
          ids.includes(rect.id) ? { ...rect, color } : rect
        );
      });
    },

    bulkDelete: (ids: string[]) => {
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        // Get all descendants of rectangles to be deleted
        let toDelete = new Set(ids);
        
        for (const id of ids) {
          const descendants = getAllDescendants(id, currentRectangles);
          descendants.forEach(descId => toDelete.add(descId));
        }
        
        // Remove all rectangles and their descendants
        const remaining = currentRectangles.filter(rect => !toDelete.has(rect.id));
        
        // Update parent types for any parents that no longer have children
        let updated = remaining;
        for (const rect of remaining) {
          if (rect.type === 'parent') {
            const hasChildren = remaining.some(r => r.parentId === rect.id);
            if (!hasChildren) {
              updated = updated.map(r => r.id === rect.id ? { ...r, type: 'leaf' as RectangleType } : r);
            }
          }
        }
        
        return updated;
      });
      
      // Clear selection after bulk delete
      get().rectangleActions.clearSelection();
    },

    bulkMove: (ids: string[], deltaX: number, deltaY: number) => {
      const state = get();
      const { rectangles } = state;
      
      // Check if bulk movement is allowed (all parents must have manual positioning enabled)
      const selectedRects = rectangles.filter(r => ids.includes(r.id));
      const parentIds = [...new Set(selectedRects.map(r => r.parentId).filter(Boolean))];
      
      for (const parentId of parentIds) {
        const parent = rectangles.find(r => r.id === parentId);
        if (parent && !parent.isManualPositioningEnabled) {
          return false; // Parent doesn't allow manual positioning
        }
      }
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        return currentRectangles.map(rect => 
          ids.includes(rect.id) 
            ? { ...rect, x: rect.x + deltaX, y: rect.y + deltaY }
            : rect
        );
      });
      
      return true;
    },

    alignRectangles: (ids: string[], type: import('../types').AlignmentType) => {
      const state = get();
      const rectangles = state.rectangles.filter(r => ids.includes(r.id));
      
      if (rectangles.length < 2) return;
      
      // Use the sophisticated alignment utility with grid snapping
      const alignedRectangles = alignRectangles(rectangles, type, state.settings);
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        const alignedMap = new Map(alignedRectangles.map(r => [r.id, r]));
        return currentRectangles.map(rect => 
          alignedMap.get(rect.id) || rect
        );
      });
    },

    distributeRectangles: (ids: string[], direction: import('../types').DistributionDirection) => {
      const state = get();
      
      // Get rectangles in SELECTION ORDER - this is crucial for determining boundaries
      // The first and last selected rectangles will be the fixed boundaries
      const rectangles = ids.map(id => state.rectangles.find(r => r.id === id)).filter(Boolean) as Rectangle[];
      
      if (rectangles.length < 3) return;
      
      // Use the sophisticated distribution utility with selection-order boundaries
      const distributedRectangles = distributeRectangles(rectangles, direction, state.settings);
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        const distributedMap = new Map(distributedRectangles.map(r => [r.id, r]));
        return currentRectangles.map(rect => 
          distributedMap.get(rect.id) || rect
        );
      });
    },

    setRectangles: (rectangles: Rectangle[]) => {
      set({ rectangles });
    },

    setRectanglesWithHistory: (rectangles: Rectangle[]) => {
      set({ rectangles });
      // Save to history after the state update
      setTimeout(() => {
        get().historyActions.pushState(rectangles);
      }, 0);
    },

    generateId: () => {
      const state = get();
      const { rectangles, nextId } = state;
      
      let candidateId: string;
      let candidate = nextId;
      
      do {
        candidateId = `rect-${candidate}`;
        candidate++;
      } while (rectangles.some(rect => rect.id === candidateId));
      
      // Update nextId for future use
      set({ nextId: candidate });
      return candidateId;
    },

    updateNextId: (newNextId: number) => {
      set({ nextId: newNextId });
    },

    recalculateZOrder: () => {
      // Z-order recalculation logic if needed
      // This might be handled by the rendering layer
    },

    // Temporary updates for drag operations (no history saving)
    updateRectanglesDuringDrag: (updateFn: (rectangles: Rectangle[]) => Rectangle[]) => {
      const state = get();
      const updatedRectangles = updateFn(state.rectangles);
      set({ rectangles: updatedRectangles });
    }
  }
});