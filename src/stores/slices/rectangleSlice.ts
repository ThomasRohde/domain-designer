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
  applyFixedDimensions,
  fitParentToChildren,
  fitParentToChildrenRecursive,
  type FixedDimensions,
  type MarginSettings
} from '../../utils/rectangleOperations';
import { alignRectangles } from '../../utils/alignmentUtils';
import { distributeRectangles } from '../../utils/distributionUtils';
import { 
  detectBulkMovementCollisions, 
  constrainBulkMovement
} from '../../utils/collisionUtils';
import {
  validateBulkOperationConstraints,
  triggerLayoutRecalculation
} from '../../utils/bulkOperationUtils';
import { getExpandedSelectionIds } from '../../utils/boundingBoxUtils';
import { validateSelection } from '../../utils/selectionUtils';
import type { SliceCreator, RectangleActions, AppStore } from '../types';

/**
 * Rectangle state slice interface
 */
export interface RectangleSlice {
  // State
  rectangles: Rectangle[];
  nextId: number;
  
  // Actions
  rectangleActions: RectangleActions;
}

/**
 * Multi-select spatial expansion system with bounding box analysis and constraint validation.
 * 
 * This system implements PowerPoint-style spatial selection where rectangles
 * that are completely contained within the bounding box of the current selection
 * are automatically included, but only if they respect multi-select constraints.
 * 
 * Constraint Integration:
 * - Only includes rectangles that can be validly selected together (same parent)
 * - Prevents automatic inclusion of child/grandchild rectangles that break hierarchy rules
 * - Maintains the original selection if expansion would violate constraints
 */
const expandSelectionToBoundingBox = (selectedIds: string[], rectangles: Rectangle[]): string[] => {
  if (selectedIds.length <= 1) {
    return selectedIds; // No expansion needed for single or no selection
  }

  // Get the potentially expanded selection
  const expandedIds = getExpandedSelectionIds(selectedIds, rectangles);
  
  // Check if the expanded selection is valid according to multi-select constraints
  if (validateSelection(expandedIds, rectangles)) {
    return expandedIds; // Safe to use expanded selection
  } else {
    // Fall back to original selection if expansion breaks constraints
    console.log('Selection expansion blocked due to multi-select constraints');
    return selectedIds;
  }
};

/**
 * Atomic rectangle update with integrated history management.
 * 
 * This function ensures that all rectangle modifications follow a consistent pattern:
 * 1. Apply the update function to the current rectangle state
 * 2. Update the store state atomically
 * 3. Automatically save the change to the undo/redo history
 * 
 * The setTimeout with 0 delay ensures history saving occurs after the state update
 * is fully committed, preventing race conditions and ensuring consistent history entries.
 */
const updateRectanglesWithHistory = (
  set: (partial: object | ((state: AppStore) => object)) => void, 
  get: () => AppStore, 
  updater: (current: Rectangle[]) => Rectangle[]) => {
  const state = get();
  const currentRectangles = state.rectangles;
  const updated = updater(currentRectangles);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set((state: any) => ({
    rectangles: updated,
    nextId: state.nextId
  }));
  
  // Save to history after the state update
  setTimeout(() => {
    get().historyActions.saveToHistory();
  }, 0);
};

/**
 * Rectangle slice factory with comprehensive CRUD operations and advanced multi-select features.
 * 
 * This slice manages the complete rectangle lifecycle including:
 * - Hierarchical creation with automatic parent-child relationships
 * - Smart removal with cascade deletion of descendants
 * - Layout-aware positioning and constraint enforcement
 * - Multi-select operations with validation and bulk processing
 * - Advanced positioning controls with manual override capabilities
 * - Integration with layout algorithms and dimension management
 */
export const createRectangleSlice: SliceCreator<RectangleSlice> = (set, get) => ({
  // Initial state
  rectangles: [],
  nextId: 1,

  // Actions
  rectangleActions: {
    addRectangle: (parentId?: string) => {
      const state = get();
      const { rectangles, nextId, settings, canvas } = state;
      
      // Business rule: Text labels cannot have children
      if (parentId) {
        const parentRect = rectangles.find(rect => rect.id === parentId);
        if (parentRect?.isTextLabel) {
          console.warn('Cannot add children to text labels');
          return;
        }
      }
      
      // Generate collision-free unique identifier
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
      
      // Viewport-aware positioning for root rectangles
      if (!parentId) {
        const rootRects = rectangles.filter(rect => !rect.parentId);
        if (rootRects.length === 0) {
          // Position first rectangle within current viewport bounds
          const viewportX = Math.round(-canvas.panOffset.x / settings.gridSize);
          const viewportY = Math.round(-canvas.panOffset.y / settings.gridSize);
          x = viewportX + 10;
          y = viewportY + 10;
        }
      }
      
      // Create rectangle
      let newRect = createRectangle(id, x, y, w, h, parentId || undefined);
      
      // Apply global fixed dimensions to child rectangles
      if (parentId) {
        newRect = applyFixedDimensions(newRect, getFixedDimensions());
      }

      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        let updated = [...currentRectangles, newRect];
        
        // Parent relationship management and layout recalculation
        if (parentId) {
          updated = updateRectangleType(updated, parentId);
          
          // Use shared function to fit parent and all ancestors to children
          const margins: MarginSettings = getMargins();
          const fixedDimensions: FixedDimensions = getFixedDimensions();
          updated = fitParentToChildrenRecursive(parentId, updated, fixedDimensions, margins);
        }
        
        return updated;
      });
      
      // Increment ID counter for future rectangle creation
      set(() => ({ nextId: candidate }));
    },

    removeRectangle: (id: string) => {
      const state = get();
      const { settings } = state;
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        // Cascade deletion: remove target and all descendants
        const descendantIds = getAllDescendants(id, currentRectangles);
        const toRemove = [id, ...descendantIds];
        
        let updated = currentRectangles.filter(rect => !toRemove.includes(rect.id));
        
        // Hierarchy type recalculation after removal
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
          
          // Automatic fixed dimension application for new leaf nodes
          if (newType === 'leaf' && rect.type !== 'leaf') {
            const fixedDims = {
              leafFixedWidth: settings.leafFixedWidth,
              leafFixedHeight: settings.leafFixedHeight,
              leafWidth: settings.leafWidth,
              leafHeight: settings.leafHeight
            };
            return applyFixedDimensions({ ...rect, type: newType }, fixedDims);
          }
          
          return { ...rect, type: newType };
        });
        
        return updated;
      });
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
      
      // Business rule: Parent rectangles cannot become text labels
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
        
        // Automatic parent resizing when layout preferences change
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
        // Hierarchical unlock cascade: collect all descendants before state changes
        const allDescendants = getAllDescendants(id, currentRectangles);
        
        const updated = currentRectangles.map(rect => {
          if (rect.id === id) {
            // Toggle manual positioning for target rectangle
            return { 
              ...rect, 
              isManualPositioningEnabled: !rect.isManualPositioningEnabled,
              isLockedAsIs: false
            };
          } else if (allDescendants.includes(rect.id)) {
            // Cascade unlock to all descendants for consistency
            return {
              ...rect,
              isLockedAsIs: false
            };
          }
          return rect;
        });
        
        // Apply layout algorithm when returning to automatic positioning
        const parent = updated.find(rect => rect.id === id);
        return (parent && !parent.isManualPositioningEnabled) 
          ? updateChildrenLayout(updated, getFixedDimensions(), getMargins())
          : updated;
      });
    },

    lockAsIs: (id: string) => {
      const state = get();
      
      // Hierarchical lock-as-is: preserve exact dimensions throughout subtree
      state.rectangleActions.updateRectangle(id, { 
        isLockedAsIs: true,
        isManualPositioningEnabled: false 
      });
      
      // Cascade lock to all descendants to prevent dimension drift
      const allDescendants = getAllDescendants(id, state.rectangles);
      allDescendants.forEach(descendantId => {
        state.rectangleActions.updateRectangle(descendantId, { 
          isLockedAsIs: true,
          isManualPositioningEnabled: false 
        });
      });
    },

    fitToChildren: (id: string) => {
      const state = get();
      const { rectangles, settings } = state;
      
      const children = getChildren(id, rectangles);
      if (children.length === 0) return;
      
      const rectangle = rectangles.find(r => r.id === id);
      if (rectangle?.isLockedAsIs) return;
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        const margins: MarginSettings = { margin: settings.margin, labelMargin: settings.labelMargin };
        const fixedDimensions: FixedDimensions = {
          leafFixedWidth: settings.leafFixedWidth,
          leafFixedHeight: settings.leafFixedHeight,
          leafWidth: settings.leafWidth,
          leafHeight: settings.leafHeight
        };
        
        // Use shared function to fit parent to children
        return fitParentToChildren(id, currentRectangles, fixedDimensions, margins);
      });
    },

    moveRectangle: (id: string, deltaXPixels: number, deltaYPixels: number) => {
      const state = get();
      const { rectangles, settings } = state;
      const rect = rectangles.find(r => r.id === id);
      if (!rect) return;

      // Movement permission validation
      if (rect.parentId) {
        const parent = rectangles.find(r => r.id === rect.parentId);
        if (!parent || !parent.isManualPositioningEnabled) {
          return; // Parent must allow manual positioning
        }
      }

      // Cascade movement: include all descendants in movement operation
      const descendants = getAllDescendants(id, rectangles);
      const idsToMove = new Set([id, ...descendants]);

      let actualDeltaXPixels = deltaXPixels;
      let actualDeltaYPixels = deltaYPixels;

      // Parent boundary constraint enforcement
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
          
          // Clip movement to keep rectangle within parent boundaries
          newXPixels = Math.max(parentXPixels + margin, newXPixels);
          newYPixels = Math.max(parentYPixels + labelMargin, newYPixels);
          newXPixels = Math.min(parentXPixels + parentWPixels - rectWPixels - margin, newXPixels);
          newYPixels = Math.min(parentYPixels + parentHPixels - rectHPixels - margin, newYPixels);
          
          // Calculate constrained movement delta
          actualDeltaXPixels = newXPixels - currentXPixels;
          actualDeltaYPixels = newYPixels - currentYPixels;
        }
      }

      // Coordinated movement: apply same delta to target and all descendants
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        return currentRectangles.map(r => {
          if (idsToMove.has(r.id)) {
            // Pixel-precise coordinate transformation
            const currentXPixels = r.x * settings.gridSize;
            const currentYPixels = r.y * settings.gridSize;
            
            const newXPixels = currentXPixels + actualDeltaXPixels;
            const newYPixels = currentYPixels + actualDeltaYPixels;

            // Convert back to grid coordinate system
            const newX = newXPixels / settings.gridSize;
            const newY = newYPixels / settings.gridSize;

            return { ...r, x: newX, y: newY };
          }
          return r;
        });
      });
    },

    /**
     * Complex hierarchy reparenting with circular dependency prevention.
     * 
     * Reparenting Algorithm:
     * 1. Validates move prevents circular dependencies (child cannot become ancestor of itself)
     * 2. Updates parentId relationship and recalculates hierarchy types
     * 3. Applies fixed dimensions to rectangles that become leaves
     * 4. Resizes target parent to accommodate new child if necessary
     * 5. Triggers layout recalculation for both source and destination hierarchies
     * 
     * Critical safeguards:
     * - Prevents infinite loops through ancestor chain validation
     * - Maintains referential integrity throughout the operation
     * - Preserves locked rectangle constraints during hierarchy changes
     */
    reparentRectangle: (childId: string, newParentId: string | null): boolean => {
      const state = get();
      const { rectangles, settings } = state;
      
      // Comprehensive validation including circular dependency checks
      if (!get().getters.canReparent(childId, newParentId)) {
        return false;
      }
      
      const childRect = rectangles.find(r => r.id === childId);
      if (!childRect) return false;
      
      // Early exit for no-op reparenting operations
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
        // Atomic hierarchy relationship update
        let updated = currentRectangles.map(rect => 
          rect.id === childId ? { ...rect, parentId: newParentId || undefined } : rect
        );
        
        // Recalculate all rectangle types after hierarchy change
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
        
        // Adaptive parent resizing for new child accommodation
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


    setSelectedIds: (ids: string[]) => {
      const state = get();
      
      // Spatial selection expansion for intuitive multi-select behavior
      const expandedSelection = expandSelectionToBoundingBox(ids, state.rectangles);
      
      set(state => ({
        ui: { ...state.ui, selectedIds: expandedSelection },
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
        const newSelection = [...currentSelection, id];
        
        // For individual Ctrl+click selections, don't expand to bounding box
        // Only add the specifically clicked rectangle
        set(state => ({
          ui: { ...state.ui, selectedIds: newSelection }
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
      }));
    },

    clearSelection: () => {
      set(state => ({
        ui: { ...state.ui, selectedIds: [] },
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
      const state = get();
      const { rectangles, settings } = state;
      
      // Validate the color update operation
      const validation = validateBulkOperationConstraints('color', ids, rectangles, {
        margin: settings.margin,
        labelMargin: settings.labelMargin,
        gridSize: settings.gridSize
      });
      
      if (!validation.isValid) {
        console.warn('Bulk color update failed validation:', validation.errorMessage);
        return false;
      }
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        return currentRectangles.map(rect => 
          ids.includes(rect.id) ? { ...rect, color } : rect
        );
      });
      
      return true;
    },

    bulkDelete: (ids: string[]) => {
      const state = get();
      const { rectangles, settings } = state;
      
      // Validate the delete operation
      const validation = validateBulkOperationConstraints('delete', ids, rectangles, {
        margin: settings.margin,
        labelMargin: settings.labelMargin,
        gridSize: settings.gridSize
      });
      
      if (!validation.isValid) {
        console.warn('Bulk delete failed validation:', validation.errorMessage);
        return false;
      }
      
      // Validate that all rectangles to be deleted exist
      const existingIds = ids.filter(id => rectangles.some(r => r.id === id));
      if (existingIds.length === 0) {
        console.warn('No valid rectangles found for bulk delete');
        return false;
      }
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        // Get all descendants of rectangles to be deleted (cascade delete)
        let toDelete = new Set(existingIds);
        
        for (const id of existingIds) {
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
        
        // Trigger layout recalculation for affected parents
        const affectedParentIds = [...new Set(existingIds.map(id => {
          const rect = currentRectangles.find(r => r.id === id);
          return rect?.parentId;
        }).filter(Boolean) as string[])];
        
        updated = triggerLayoutRecalculation(affectedParentIds, updated, {
          margin: settings.margin,
          labelMargin: settings.labelMargin,
          leafFixedWidth: settings.leafFixedWidth,
          leafFixedHeight: settings.leafFixedHeight,
          leafWidth: settings.leafWidth,
          leafHeight: settings.leafHeight
        });
        
        return updated;
      });
      
      // Clear selection after bulk delete
      get().rectangleActions.clearSelection();
      return true;
    },

    bulkMove: (ids: string[], deltaX: number, deltaY: number) => {
      const state = get();
      const { rectangles, settings } = state;
      
      // Validate the move operation
      const validation = validateBulkOperationConstraints('move', ids, rectangles, {
        margin: settings.margin,
        labelMargin: settings.labelMargin,
        gridSize: settings.gridSize
      });
      
      if (!validation.isValid) {
        console.warn('Bulk move failed validation:', validation.errorMessage);
        return false;
      }
      
      // Check if bulk movement is allowed (all parents must have manual positioning enabled)
      const selectedRects = rectangles.filter(r => ids.includes(r.id));
      const parentIds = [...new Set(selectedRects.map(r => r.parentId).filter(Boolean))];
      
      for (const parentId of parentIds) {
        const parent = rectangles.find(r => r.id === parentId);
        if (parent && !parent.isManualPositioningEnabled) {
          return false; // Parent doesn't allow manual positioning
        }
      }
      
      // Detect collisions and constrain movement if necessary
      const marginSettings = { margin: settings.margin, labelMargin: settings.labelMargin };
      const collision = detectBulkMovementCollisions(ids, deltaX, deltaY, rectangles, marginSettings);
      
      let finalDeltaX = deltaX;
      let finalDeltaY = deltaY;
      
      if (collision.hasCollision) {
        // Constrain movement to avoid collisions
        const constrainedMovement = constrainBulkMovement(ids, deltaX, deltaY, rectangles, marginSettings);
        finalDeltaX = constrainedMovement.deltaX;
        finalDeltaY = constrainedMovement.deltaY;
        
        // If no movement is possible, return false
        if (finalDeltaX === 0 && finalDeltaY === 0) {
          return false;
        }
      }
      
      // Apply grid snapping to final movement
      finalDeltaX = Math.round(finalDeltaX);
      finalDeltaY = Math.round(finalDeltaY);
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        // Create a set of all rectangles that need to be moved (selected + their descendants)
        const rectanglesToMove = new Set(ids);
        ids.forEach(id => {
          const descendants = getAllDescendants(id, currentRectangles);
          descendants.forEach(descendantId => rectanglesToMove.add(descendantId));
        });
        
        return currentRectangles.map(rect => 
          rectanglesToMove.has(rect.id) 
            ? { ...rect, x: rect.x + finalDeltaX, y: rect.y + finalDeltaY }
            : rect
        );
      });
      
      return true;
    },

    alignRectangles: (ids: string[], type: import('../types').AlignmentType) => {
      const state = get();
      const { rectangles, settings } = state;
      
      // Validate the alignment operation
      const validation = validateBulkOperationConstraints('align', ids, rectangles, {
        margin: settings.margin,
        labelMargin: settings.labelMargin,
        gridSize: settings.gridSize
      });
      
      if (!validation.isValid) {
        console.warn('Alignment operation failed validation:', validation.errorMessage);
        return false;
      }
      
      const selectedRectangles = rectangles.filter(r => ids.includes(r.id));
      
      if (selectedRectangles.length < 2) return false;
      
      // Apply professional alignment algorithms with grid snapping
      const alignedRectangles = alignRectangles(selectedRectangles, type, settings);
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        const alignedMap = new Map(alignedRectangles.map(r => [r.id, r]));
        
        // Calculate position deltas for aligned rectangles
        const positionDeltas = new Map<string, { deltaX: number; deltaY: number }>();
        alignedRectangles.forEach(alignedRect => {
          const originalRect = currentRectangles.find(r => r.id === alignedRect.id);
          if (originalRect) {
            positionDeltas.set(alignedRect.id, {
              deltaX: alignedRect.x - originalRect.x,
              deltaY: alignedRect.y - originalRect.y
            });
          }
        });
        
        // Create a set of all rectangles that need to be moved (selected + their descendants)
        const rectanglesToMove = new Set(ids);
        ids.forEach(id => {
          const descendants = getAllDescendants(id, currentRectangles);
          descendants.forEach(descendantId => rectanglesToMove.add(descendantId));
        });
        
        let updated = currentRectangles.map(rect => {
          if (alignedMap.has(rect.id)) {
            // Apply alignment to selected rectangles
            return alignedMap.get(rect.id)!;
          } else if (rectanglesToMove.has(rect.id)) {
            // Move children/descendants with their aligned parents
            const parentId = rect.parentId;
            if (parentId && positionDeltas.has(parentId)) {
              const delta = positionDeltas.get(parentId)!;
              return {
                ...rect,
                x: rect.x + delta.deltaX,
                y: rect.y + delta.deltaY
              };
            }
            // Check if any ancestor was moved
            let currentParentId = parentId;
            while (currentParentId) {
              if (positionDeltas.has(currentParentId)) {
                const delta = positionDeltas.get(currentParentId)!;
                return {
                  ...rect,
                  x: rect.x + delta.deltaX,
                  y: rect.y + delta.deltaY
                };
              }
              const parentRect = currentRectangles.find(r => r.id === currentParentId);
              currentParentId = parentRect?.parentId;
            }
          }
          return rect;
        });
        
        // Trigger layout recalculation if needed
        updated = triggerLayoutRecalculation(ids, updated, {
          margin: settings.margin,
          labelMargin: settings.labelMargin,
          leafFixedWidth: settings.leafFixedWidth,
          leafFixedHeight: settings.leafFixedHeight,
          leafWidth: settings.leafWidth,
          leafHeight: settings.leafHeight
        });
        
        return updated;
      });
      
      return true;
    },

    distributeRectangles: (ids: string[], direction: import('../types').DistributionDirection) => {
      const state = get();
      const { rectangles, settings } = state;
      
      // Validate the distribution operation
      const validation = validateBulkOperationConstraints('distribute', ids, rectangles, {
        margin: settings.margin,
        labelMargin: settings.labelMargin,
        gridSize: settings.gridSize
      });
      
      if (!validation.isValid) {
        console.warn('Distribution operation failed validation:', validation.errorMessage);
        return false;
      }
      
      // Preserve selection order - critical for boundary determination
      // First and last selected rectangles become fixed boundaries
      const selectedRectangles = ids.map(id => rectangles.find(r => r.id === id)).filter(Boolean) as Rectangle[];
      
      if (selectedRectangles.length < 3) return false;
      
      // Apply professional distribution algorithms with white space focus
      const distributedRectangles = distributeRectangles(selectedRectangles, direction, settings);
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        const distributedMap = new Map(distributedRectangles.map(r => [r.id, r]));
        
        // Calculate position deltas for distributed rectangles
        const positionDeltas = new Map<string, { deltaX: number; deltaY: number }>();
        distributedRectangles.forEach(distributedRect => {
          const originalRect = currentRectangles.find(r => r.id === distributedRect.id);
          if (originalRect) {
            positionDeltas.set(distributedRect.id, {
              deltaX: distributedRect.x - originalRect.x,
              deltaY: distributedRect.y - originalRect.y
            });
          }
        });
        
        // Create a set of all rectangles that need to be moved (selected + their descendants)
        const rectanglesToMove = new Set(ids);
        ids.forEach(id => {
          const descendants = getAllDescendants(id, currentRectangles);
          descendants.forEach(descendantId => rectanglesToMove.add(descendantId));
        });
        
        let updated = currentRectangles.map(rect => {
          if (distributedMap.has(rect.id)) {
            // Apply distribution to selected rectangles
            return distributedMap.get(rect.id)!;
          } else if (rectanglesToMove.has(rect.id)) {
            // Move children/descendants with their distributed parents
            const parentId = rect.parentId;
            if (parentId && positionDeltas.has(parentId)) {
              const delta = positionDeltas.get(parentId)!;
              return {
                ...rect,
                x: rect.x + delta.deltaX,
                y: rect.y + delta.deltaY
              };
            }
            // Check if any ancestor was moved
            let currentParentId = parentId;
            while (currentParentId) {
              if (positionDeltas.has(currentParentId)) {
                const delta = positionDeltas.get(currentParentId)!;
                return {
                  ...rect,
                  x: rect.x + delta.deltaX,
                  y: rect.y + delta.deltaY
                };
              }
              const parentRect = currentRectangles.find(r => r.id === currentParentId);
              currentParentId = parentRect?.parentId;
            }
          }
          return rect;
        });
        
        // Trigger layout recalculation if needed
        updated = triggerLayoutRecalculation(ids, updated, {
          margin: settings.margin,
          labelMargin: settings.labelMargin,
          leafFixedWidth: settings.leafFixedWidth,
          leafFixedHeight: settings.leafFixedHeight,
          leafWidth: settings.leafWidth,
          leafHeight: settings.leafHeight
        });
        
        return updated;
      });
      
      return true;
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

    // Real-time updates during drag operations (bypasses history for performance)
    updateRectanglesDuringDrag: (updateFn: (rectangles: Rectangle[]) => Rectangle[]) => {
      const state = get();
      const updatedRectangles = updateFn(state.rectangles);
      set({ rectangles: updatedRectangles });
    }
  }
});