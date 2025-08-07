import { Rectangle, RectangleType } from '../../types';
import { DEFAULT_RECTANGLE_SIZE } from '../../utils/constants';
import { 
  updateChildrenLayout,
  getAllDescendants,
  getChildren,
  clearDescendantCache
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
import type { SliceCreator, RectangleActions, AppStore } from '../types';

/**
 * Check if a rectangle should be exempt from fixed dimension enforcement.
 * Returns true if the rectangle is in a parent with manual positioning enabled.
 * 
 * @param rect - Rectangle to check
 * @param rectangles - All rectangles for parent lookup  
 * @returns true if dimensions should not be enforced (manual mode)
 */
const shouldExemptFromFixedDimensions = (rect: Rectangle, rectangles: Rectangle[]): boolean => {
  if (!rect.parentId) return false; // Root rectangles are not affected by this
  
  const parent = rectangles.find(r => r.id === rect.parentId);
  return parent?.isManualPositioningEnabled === true;
};

/**
 * Find optimal free space position for a new child in manual positioning mode.
 * 
 * Scans the parent rectangle bounds to find available space that doesn't
 * overlap with existing children, using the global margin setting to ensure
 * proper gaps between children. Prefers positions that utilize newly
 * expanded areas when the parent grows to accommodate the new child.
 * 
 * Search Strategies:
 * 1. Gap-filling priority - detects existing grid patterns and fills gaps first
 *    - Analyzes unique X/Y positions to understand grid structure
 *    - Systematically checks each grid intersection for gaps
 *    - Completes existing rows/columns before extending to new ones
 * 2. Logical extensions - extends grid in most natural direction
 * 3. Edge space scan - searches remaining edge areas  
 * 4. Grid search - systematic scan using margin as step size
 * 5. Fallback - safe position at top-left with margins
 * 
 * @param parentId - ID of parent rectangle in manual positioning mode
 * @param rectangles - Current rectangle array for collision detection
 * @param defaultSizes - Default dimensions for new rectangle
 * @param margins - Spacing configuration (margin used for gaps between children)
 * @returns Position and dimensions for new child in free space with proper gaps
 */
const calculateFreeSpacePosition = (
  parentId: string,
  rectangles: Rectangle[],
  defaultSizes: { root: { w: number; h: number }, leaf: { w: number; h: number } },
  margins: { margin: number; labelMargin: number }
): { x: number; y: number; w: number; h: number } => {
  const parent = rectangles.find(r => r.id === parentId);
  if (!parent) {
    // Fallback to default positioning if parent not found
    return { x: 0, y: 0, w: defaultSizes.leaf.w, h: defaultSizes.leaf.h };
  }

  const existingChildren = rectangles.filter(r => r.parentId === parentId);
  // Use the default rectangle size for the type being added (should be leaf for children)
  const { w: childW, h: childH } = defaultSizes.leaf;
  
  // Parent bounds with margins
  const leftBound = parent.x + margins.margin;
  const topBound = parent.y + margins.labelMargin;
  const rightBound = parent.x + parent.w - margins.margin;
  const bottomBound = parent.y + parent.h - margins.margin;
  
  // Available space dimensions
  const availableW = rightBound - leftBound - childW;
  const availableH = bottomBound - topBound - childH;
  
  // Check if a position conflicts with existing children (including margin gaps)
  const isPositionFree = (testX: number, testY: number): boolean => {
    const testRight = testX + childW;
    const testBottom = testY + childH;
    
    return existingChildren.every(child => {
      const childLeft = child.x;
      const childTop = child.y;
      const childRight = child.x + child.w;
      const childBottom = child.y + child.h;
      
      // Check for overlap including margin gaps
      // New rectangle must be at least 'margin' pixels away from existing children
      return testRight + margins.margin <= childLeft || 
             testX >= childRight + margins.margin || 
             testBottom + margins.margin <= childTop || 
             testY >= childBottom + margins.margin;
    });
  };
  
  // Strategy 1: Fill gaps in existing grid pattern first (most logical placement)
  if (existingChildren.length > 0) {
    // Detect grid pattern by analyzing existing positions
    const uniqueXPositions = [...new Set(existingChildren.map(child => child.x))].sort((a, b) => a - b);
    const uniqueYPositions = [...new Set(existingChildren.map(child => child.y))].sort((a, b) => a - b);
    
    // If we have a clear grid pattern, look for gaps first
    if (uniqueXPositions.length > 1 && uniqueYPositions.length > 1) {
      // Check each grid position to see if it's occupied
      for (const y of uniqueYPositions) {
        for (const x of uniqueXPositions) {
          // Check if this grid position is free and within bounds
          if (x + childW <= rightBound && y + childH <= bottomBound && isPositionFree(x, y)) {
            return { x, y, w: childW, h: childH };
          }
        }
      }
    }
    
    // Strategy 1b: Try logical grid extensions (complete rows/columns)
    const rightmostChild = existingChildren.reduce((max, child) => 
      (child.x + child.w) > (max.x + max.w) ? child : max
    );
    const bottommostChild = existingChildren.reduce((max, child) => 
      (child.y + child.h) > (max.y + max.h) ? child : max
    );
    
    // Try to complete existing rows before adding new columns
    for (const y of uniqueYPositions) {
      const rightX = rightmostChild.x + rightmostChild.w + margins.margin;
      if (rightX + childW <= rightBound && y + childH <= bottomBound && isPositionFree(rightX, y)) {
        return { x: rightX, y, w: childW, h: childH };
      }
    }
    
    // Try to complete existing columns before adding new rows  
    for (const x of uniqueXPositions) {
      const bottomY = bottommostChild.y + bottommostChild.h + margins.margin;
      if (x + childW <= rightBound && bottomY + childH <= bottomBound && isPositionFree(x, bottomY)) {
        return { x, y: bottomY, w: childW, h: childH };
      }
    }
    
    // Fallback: extend to completely new positions
    const rightX = rightmostChild.x + rightmostChild.w + margins.margin;
    if (rightX + childW <= rightBound && isPositionFree(rightX, topBound)) {
      return { x: rightX, y: topBound, w: childW, h: childH };
    }
    
    const bottomY = bottommostChild.y + bottommostChild.h + margins.margin;
    if (bottomY + childH <= bottomBound && isPositionFree(leftBound, bottomY)) {
      return { x: leftBound, y: bottomY, w: childW, h: childH };
    }
  }
  
  // Strategy 2: Try remaining edge spaces (fallback for edge cases)
  // Right edge scan
  for (let y = topBound; y <= topBound + availableH; y += margins.margin) {
    const x = rightBound - childW;
    if (x >= leftBound && isPositionFree(x, y)) {
      return { x, y, w: childW, h: childH };
    }
  }
  
  // Bottom edge scan
  for (let x = leftBound; x <= leftBound + availableW; x += margins.margin) {
    const y = bottomBound - childH;
    if (y >= topBound && isPositionFree(x, y)) {
      return { x, y, w: childW, h: childH };
    }
  }
  
  // Strategy 3: Grid search for any free space, using margin-based steps for consistent spacing
  // Use margin as the search step to ensure we find positions that respect spacing
  const searchStepX = margins.margin;
  const searchStepY = margins.margin;
  
  for (let y = topBound; y <= topBound + availableH; y += searchStepY) {
    for (let x = leftBound; x <= leftBound + availableW; x += searchStepX) {
      if (isPositionFree(x, y)) {
        return { x, y, w: childW, h: childH };
      }
    }
  }
  
  // Strategy 4: Random positioning fallback - if no vacant spot found, pick a random position
  // This ensures children don't all pile up at the same spot when parent is very crowded
  const maxAttempts = 10; // Limit random attempts to prevent infinite loops
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomX = leftBound + Math.floor(Math.random() * Math.max(1, availableW));
    const randomY = topBound + Math.floor(Math.random() * Math.max(1, availableH));
    
    // Check if this random position would fit within parent bounds
    if (randomX + childW <= rightBound && randomY + childH <= bottomBound) {
      return { x: randomX, y: randomY, w: childW, h: childH };
    }
  }
  
  // Ultimate fallback - place at top-left with margin (may overlap, but ensures placement)
  return { 
    x: leftBound, 
    y: topBound, 
    w: childW, 
    h: childH 
  };
};

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
      
      // Constraint: Text label rectangles cannot contain child elements
      if (parentId) {
        const parentRect = rectangles.find(rect => rect.id === parentId);
        if (parentRect?.isTextLabel) {
          console.warn('Cannot add children to text labels');
          return;
        }
      }
      
      // ID generation: Ensure uniqueness across existing rectangles
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
      
      let x: number, y: number, w: number, h: number;
      
      // Positioning strategy differs by parent mode:
      // Manual: Calculate after parent expansion (free space algorithm)
      // Auto: Calculate immediately (layout algorithm handles placement)
      const parentRect = parentId ? rectangles.find(r => r.id === parentId) : null;
      const isManualMode = parentRect?.isManualPositioningEnabled;
      
      if (isManualMode) {
        // Manual mode - use temporary position, will recalculate after parent grows
        x = (parentRect?.x || 0) + (getMargins().margin);
        y = (parentRect?.y || 0) + (getMargins().labelMargin);
        const { w: defaultW, h: defaultH } = parentId ? DEFAULT_RECTANGLE_SIZE.leaf : DEFAULT_RECTANGLE_SIZE.root;
        w = defaultW;
        h = defaultH;
      } else {
        // Auto mode or root rectangle - calculate final position now
        const position = layoutManager.calculateNewRectangleLayout(parentId || null, rectangles, DEFAULT_RECTANGLE_SIZE, getMargins());
        x = position.x;
        y = position.y;
        w = position.w;
        h = position.h;
      }
      
      // Root rectangle positioning: Consider current viewport for user convenience
      if (!parentId) {
        const rootRects = rectangles.filter(rect => !rect.parentId);
        if (rootRects.length === 0) {
          // Initial root: Place within visible area for immediate user access
          const viewportX = Math.round(-canvas.panOffset.x / settings.gridSize);
          const viewportY = Math.round(-canvas.panOffset.y / settings.gridSize);
          x = viewportX + 10;
          y = viewportY + 10;
        }
      }
      
      // Create rectangle
      let newRect = createRectangle(id, x, y, w, h, parentId || undefined);
      
      // Fixed dimension enforcement: Applies to children regardless of positioning mode
      // Manual positioning affects placement strategy, not size constraints
      if (parentId) {
        newRect = applyFixedDimensions(newRect, getFixedDimensions());
      }

      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        let updated = [...currentRectangles, newRect];
        
        // Hierarchy management: Establish parent-child relationships and trigger layout updates
        if (parentId) {
          updated = updateRectangleType(updated, parentId);
          
          // Use shared function to fit parent and all ancestors to children
          const margins: MarginSettings = getMargins();
          const fixedDimensions: FixedDimensions = getFixedDimensions();
          updated = fitParentToChildrenRecursive(parentId, updated, fixedDimensions, margins);
          
          // Manual mode refinement: Recalculate optimal position within expanded parent
          if (isManualMode) {
            // Collision detection preparation: Exclude new rectangle from space calculations
            const rectanglesForPositioning = updated.filter(rect => rect.id !== id);
            const optimalPosition = calculateFreeSpacePosition(parentId, rectanglesForPositioning, DEFAULT_RECTANGLE_SIZE, margins);
            updated = updated.map(rect => 
              rect.id === id ? { 
                ...rect, 
                x: optimalPosition.x, 
                y: optimalPosition.y 
              } : rect
            );
          }
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
          
          // Automatic fixed dimension application for new leaf nodes (only in auto mode)
          if (newType === 'leaf' && rect.type !== 'leaf' && !shouldExemptFromFixedDimensions(rect, updated)) {
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
      
      // Constraint: Rectangles with children cannot convert to text-only mode
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
            const optimalSize = layoutManager.calculateMinimumParentSize(id, updated, getMargins(), getFixedDimensions());
            
            const resizedUpdated = updated.map(rect => 
              rect.id === id 
                ? { ...rect, w: optimalSize.w, h: optimalSize.h }
                : rect
            );
            
            return updateChildrenLayout(resizedUpdated, getMargins(), getFixedDimensions());
          }
        }
        
        return updateChildrenLayout(updated, getMargins(), getFixedDimensions());
      });
    },

    toggleManualPositioning: (id: string, shiftKey: boolean = false) => {
      const state = get();
      const { settings } = state;
      
      const getMargins = () => ({ margin: settings.margin, labelMargin: settings.labelMargin });
      const getFixedDimensions = () => ({
        leafFixedWidth: settings.leafFixedWidth,
        leafFixedHeight: settings.leafFixedHeight,
        leafWidth: settings.leafWidth,
        leafHeight: settings.leafHeight
      });
      
      const currentRect = state.rectangles.find(r => r.id === id);
      if (!currentRect) return;
      
      const isCurrentlyManual = currentRect.isManualPositioningEnabled;
      
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        // Hierarchical unlock cascade: collect all descendants before state changes
        const allDescendants = getAllDescendants(id, currentRectangles);
        
        const updated = currentRectangles.map(rect => {
          if (rect.id === id) {
            if (isCurrentlyManual && shiftKey) {
              // Shift+click when in manual mode: "Lock As-Is" behavior
              return { 
                ...rect, 
                isManualPositioningEnabled: false,
                isLockedAsIs: true  // Preserve current positions
              };
            } else {
              // Normal toggle: Smart default behavior
              return { 
                ...rect, 
                isManualPositioningEnabled: !rect.isManualPositioningEnabled,
                isLockedAsIs: false
              };
            }
          } else if (allDescendants.includes(rect.id)) {
            // Cascade unlock to all descendants for consistency
            return {
              ...rect,
              isLockedAsIs: false
            };
          }
          return rect;
        });
        
        // Apply layout algorithm when switching to automatic positioning (unless locked as-is)
        const parent = updated.find(rect => rect.id === id);
        if (parent && !parent.isManualPositioningEnabled && !parent.isLockedAsIs) {
          // Store layout change flag for undo system
          setTimeout(() => {
            const currentState = get();
            currentState.uiActions.showLayoutUndo?.(id);
          }, 0);
          
          return updateChildrenLayout(updated, getMargins(), getFixedDimensions());
        }
        
        return updated;
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

    unlockLayout: (id: string) => {
      const state = get();
      
      // Unlock the rectangle and its descendants
      state.rectangleActions.updateRectangle(id, { 
        isLockedAsIs: false 
      });
      
      // Cascade unlock to all descendants
      const allDescendants = getAllDescendants(id, state.rectangles);
      allDescendants.forEach(descendantId => {
        state.rectangleActions.updateRectangle(descendantId, { 
          isLockedAsIs: false 
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

      // Verify parent container permits manual child positioning
      if (rect.parentId) {
        const parent = rectangles.find(r => r.id === rect.parentId);
        if (!parent || !parent.isManualPositioningEnabled) {
          return; // Parent must allow manual positioning
        }
      }

      // Coordinated movement: Relocate entire subtree maintaining relative positions
      const descendants = getAllDescendants(id, rectangles);
      const idsToMove = new Set([id, ...descendants]);

      let actualDeltaXPixels = deltaXPixels;
      let actualDeltaYPixels = deltaYPixels;

      // Container constraint: Prevent movement beyond parent boundaries
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
          
          // Boundary enforcement: Prevent movement outside parent container
          newXPixels = Math.max(parentXPixels + margin, newXPixels);
          newYPixels = Math.max(parentYPixels + labelMargin, newYPixels);
          newXPixels = Math.min(parentXPixels + parentWPixels - rectWPixels - margin, newXPixels);
          newYPixels = Math.min(parentYPixels + parentHPixels - rectHPixels - margin, newYPixels);
          
          // Constraint resolution: Calculate actual movement after boundary limiting
          actualDeltaXPixels = newXPixels - currentXPixels;
          actualDeltaYPixels = newYPixels - currentYPixels;
        }
      }

      // Apply validated movement to target rectangle and all descendants
      updateRectanglesWithHistory(set, get, (currentRectangles) => {
        return currentRectangles.map(r => {
          if (idsToMove.has(r.id)) {
            // Convert pixel deltas to grid coordinate system
            const currentXPixels = r.x * settings.gridSize;
            const currentYPixels = r.y * settings.gridSize;
            
            const newXPixels = currentXPixels + actualDeltaXPixels;
            const newYPixels = currentYPixels + actualDeltaYPixels;

            // Normalize final position to grid coordinates
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
        
        // Apply fixed dimensions if the reparented rectangle is now a leaf (only in auto mode)
        const reparentedRect = updated.find(r => r.id === childId);
        if (reparentedRect && reparentedRect.type === 'leaf' && !shouldExemptFromFixedDimensions(reparentedRect, updated)) {
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
            const minParentSize = layoutManager.calculateMinimumParentSize(newParentId, updated, getMargins(), getFixedDimensions());
            
            if (newParent.w < minParentSize.w || newParent.h < minParentSize.h) {
              updated = updated.map(rect => 
                rect.id === newParentId 
                  ? { ...rect, w: Math.max(rect.w, minParentSize.w), h: Math.max(rect.h, minParentSize.h) }
                  : rect
              );
            }
          }
        }
        
        // Preserve relative positions: only update layouts for parent containers, not the reparented subtree
        const reparentedDescendants = new Set(getAllDescendants(childId, updated));
        reparentedDescendants.add(childId); // Include the reparented rectangle itself
        
        // Trigger hierarchical layout update for the source hierarchy (old parent and all ancestors)
        if (currentParentId) {
          // Use fitParentToChildrenRecursive to update all ancestors in the source hierarchy
          // This ensures proper cascading layout updates from deepest level first
          updated = fitParentToChildrenRecursive(currentParentId, updated, getFixedDimensions(), getMargins());
          
          // Additionally, apply full layout algorithm cascade from deepest level first
          // This ensures the selected layout algorithm is properly applied throughout the hierarchy
          updated = updateChildrenLayout(updated, getMargins(), getFixedDimensions());
        }
        
        // Update layout for the destination hierarchy (new parent and all ancestors) 
        if (newParentId) {
          const newParent = updated.find(r => r.id === newParentId);
          const newParentChildren = updated.filter(r => r.parentId === newParentId);
          if (newParent && !newParent.isManualPositioningEnabled && !newParent.isLockedAsIs && newParentChildren.length > 0) {
            // Store original position of reparented rectangle to calculate movement delta
            const originalReparentedRect = updated.find(r => r.id === childId);
            
            const repositionedChildren = layoutManager.calculateChildLayout(newParent, newParentChildren, getMargins(), getFixedDimensions(), updated);
            
            // Find the new position of the reparented rectangle after layout
            const newReparentedRect = repositionedChildren.find(r => r.id === childId);
            
            if (originalReparentedRect && newReparentedRect) {
              // Calculate how much the reparented rectangle moved due to layout
              const deltaX = newReparentedRect.x - originalReparentedRect.x;
              const deltaY = newReparentedRect.y - originalReparentedRect.y;
              
              // Apply the layout changes AND move descendants to preserve relative positions
              updated = updated.map(rect => {
                const repositioned = repositionedChildren.find(r => r.id === rect.id);
                if (repositioned) {
                  // Use the repositioned version from layout manager
                  return repositioned;
                } else if (reparentedDescendants.has(rect.id) && rect.id !== childId) {
                  // Move descendants by the same delta to preserve relative positions
                  const newX = Math.max(0, rect.x + deltaX);
                  const newY = Math.max(0, rect.y + deltaY);
                  return { ...rect, x: newX, y: newY };
                }
                return rect;
              });
            } else {
              // Fallback: just merge repositioned children without descendant handling
              updated = updated.map(rect => {
                const repositioned = repositionedChildren.find(r => r.id === rect.id);
                return repositioned || rect;
              });
            }
            
            // Apply hierarchical layout updates to the destination hierarchy
            // This ensures all ancestors in the destination hierarchy are properly sized and laid out
            updated = fitParentToChildrenRecursive(newParentId, updated, getFixedDimensions(), getMargins());
            
            // Apply full layout algorithm cascade for the destination hierarchy
            updated = updateChildrenLayout(updated, getMargins(), getFixedDimensions());
          }
        }
        
        return updated;
      });
      return true;
    },


    setSelectedIds: (ids: string[]) => {
      set(state => ({
        ui: { ...state.ui, selectedIds: ids },
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
      
      // Preserve selection order - critical for anchor determination
      // First selected rectangle becomes the immutable anchor
      const selectedRectangles = ids.map(id => rectangles.find(r => r.id === id)).filter(Boolean) as Rectangle[];
      
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
      // Clear descendant cache when rectangles change for optimal performance
      clearDescendantCache();
      set({ rectangles });
    },

    setRectanglesWithHistory: (rectangles: Rectangle[]) => {
      // Clear descendant cache when rectangles change for optimal performance
      clearDescendantCache();
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
    },

    /**
     * Move rectangle during drag operations without creating history entries.
     * Used for intermediate drag updates to prevent history pollution.
     * Final position is saved to history on drag end.
     */
    moveRectangleDuringDrag: (id: string, deltaXPixels: number, deltaYPixels: number) => {
      const state = get();
      const { rectangles, settings } = state;
      const rect = rectangles.find(r => r.id === id);
      if (!rect) return;

      // Verify parent container permits manual child positioning
      if (rect.parentId) {
        const parent = rectangles.find(r => r.id === rect.parentId);
        if (!parent || !parent.isManualPositioningEnabled) {
          return; // Parent must allow manual positioning
        }
      }

      // Coordinated movement: Relocate entire subtree maintaining relative positions
      const descendants = getAllDescendants(id, rectangles);
      const idsToMove = new Set([id, ...descendants]);

      let actualDeltaXPixels = deltaXPixels;
      let actualDeltaYPixels = deltaYPixels;

      // Container constraint: Prevent movement beyond parent boundaries
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
          
          // Apply container boundaries to prevent child overflow
          newXPixels = Math.max(parentXPixels + margin, newXPixels);
          newYPixels = Math.max(parentYPixels + labelMargin, newYPixels);
          newXPixels = Math.min(parentXPixels + parentWPixels - rectWPixels - margin, newXPixels);
          newYPixels = Math.min(parentYPixels + parentHPixels - rectHPixels - margin, newYPixels);
          
          // Calculate final movement delta after applying constraints
          actualDeltaXPixels = newXPixels - currentXPixels;
          actualDeltaYPixels = newYPixels - currentYPixels;
        }
      }

      // Execute immediate movement update without history overhead
      get().rectangleActions.updateRectanglesDuringDrag((currentRectangles) => {
        return currentRectangles.map(r => {
          if (idsToMove.has(r.id)) {
            // Convert pixel deltas to grid coordinate system
            const currentXPixels = r.x * settings.gridSize;
            const currentYPixels = r.y * settings.gridSize;
            
            const newXPixels = currentXPixels + actualDeltaXPixels;
            const newYPixels = currentYPixels + actualDeltaYPixels;

            // Normalize final position to grid coordinates
            const newX = newXPixels / settings.gridSize;
            const newY = newYPixels / settings.gridSize;

            return { ...r, x: newX, y: newY };
          }
          return r;
        });
      });
    }
  }
});