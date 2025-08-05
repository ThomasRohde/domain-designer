import { Rectangle } from '../../types';
import type { SliceCreator, ClipboardState, ClipboardActions, ClipboardData } from '../types';
import { fitParentToChildren, type FixedDimensions, type MarginSettings } from '../../utils/rectangleOperations';

/**
 * Default positioning offset when pasting rectangles to avoid overlaps
 */
const PASTE_OFFSET = 20;

/**
 * Clipboard slice interface - extends the base types with implementation details
 */
export interface ClipboardSlice {
  clipboard: ClipboardState;
  clipboardActions: ClipboardActions;
}

/**
 * Creates the clipboard slice for copy/paste functionality
 * Handles hierarchy preservation and intelligent positioning
 */
export const createClipboardSlice: SliceCreator<ClipboardSlice> = (set, get) => ({
  clipboard: {
    clipboardData: null,
  },

  clipboardActions: {
    /**
     * Duplicate rectangles in-place by copying and pasting as siblings
     * This creates a single history entry instead of separate copy/paste entries
     */
    duplicateRectangles: (ids: string[]) => {
      const { rectangles, rectangleActions, historyActions } = get();
      
      if (ids.length === 0) {
        return;
      }

      // Determine target parent ID (where to paste as siblings)
      let targetParentId: string | undefined;
      
      if (ids.length > 1) {
        // Multi-select: use common parent of selected rectangles
        const firstRect = rectangles.find(r => r.id === ids[0]);
        targetParentId = firstRect?.parentId;
      } else {
        // Single-select: use parent of selected rectangle
        const selectedRect = rectangles.find(r => r.id === ids[0]);
        targetParentId = selectedRect?.parentId;
      }

      // Get all rectangles to copy (including descendants)
      const rectanglesToCopy = new Set<string>(ids);
      
      // Add all descendants of selected rectangles
      const addDescendants = (parentId: string) => {
        const children = rectangles.filter(r => r.parentId === parentId);
        children.forEach(child => {
          rectanglesToCopy.add(child.id);
          addDescendants(child.id);
        });
      };
      
      ids.forEach(addDescendants);
      
      // Extract the rectangle data
      const rectangleData = Array.from(rectanglesToCopy)
        .map(id => rectangles.find(r => r.id === id))
        .filter((r): r is Rectangle => r !== undefined);

      if (rectangleData.length === 0) {
        return;
      }

      // Calculate relative bounds for positioning
      const bounds = calculateBounds(rectangleData);
      
      // Generate new IDs for all rectangles
      const idMapping = new Map<string, string>();
      rectangleData.forEach(rect => {
        idMapping.set(rect.id, rectangleActions.generateId());
      });
      
      // Calculate paste position
      const pastePosition = calculatePastePosition(
        bounds,
        targetParentId,
        rectangles
      );
      
      // Create new rectangles with updated IDs and positions
      const newRectangles = rectangleData.map(rect => {
        const newId = idMapping.get(rect.id)!;
        // If the rectangle had a parent and that parent was also copied, use the mapped parent ID
        // Otherwise, use the target parent ID (the rectangle we're pasting into)
        const mappedParentId = rect.parentId ? idMapping.get(rect.parentId) : undefined;
        const newParentId = mappedParentId !== undefined ? mappedParentId : targetParentId;
        
        // Calculate new position
        const offsetX = rect.x - bounds.minX + pastePosition.x;
        const offsetY = rect.y - bounds.minY + pastePosition.y;
        
        return {
          ...rect,
          id: newId,
          parentId: newParentId,
          x: offsetX,
          y: offsetY,
        };
      });
      
      // Get parent rectangle for potential auto-resize
      const targetParent = targetParentId ? rectangles.find(r => r.id === targetParentId) : null;
      
      // Update rectangles, optionally fit parent, then save single history entry
      set(state => ({
        rectangles: [...state.rectangles, ...newRectangles],
      }));
      
      // Select the newly duplicated rectangles
      const topLevelDuplicatedIds = newRectangles
        .filter(rect => rect.parentId === targetParentId)
        .map(rect => rect.id);
      
      rectangleActions.setSelectedIds(topLevelDuplicatedIds);
      
      // If duplicated into a parent, fit to children AND save to history as a single operation
      if (targetParentId && targetParent && !targetParent.isLockedAsIs) {
        setTimeout(() => {
          // Use shared fitParentToChildren function without its own history save
          const { rectangles: currentRectangles, settings } = get();
          const margins: MarginSettings = { margin: settings.margin, labelMargin: settings.labelMargin };
          const fixedDimensions: FixedDimensions = {
            leafFixedWidth: settings.leafFixedWidth,
            leafFixedHeight: settings.leafFixedHeight,
            leafWidth: settings.leafWidth,
            leafHeight: settings.leafHeight
          };
          
          // Use the shared utility function to fit parent to children
          const finalRectangles = fitParentToChildren(targetParentId, currentRectangles, fixedDimensions, margins);
          
          // Update state without triggering another history save
          set(() => ({
            rectangles: finalRectangles,
          }));
          
          // Save single history entry for the entire duplication + fit operation
          historyActions.saveToHistory();
        }, 50);
      } else {
        // Save single history entry for just the duplication
        setTimeout(() => {
          historyActions.saveToHistory();
        }, 0);
      }
    },

    /**
     * Copy selected rectangles to clipboard with full hierarchy preservation
     */
    copyRectangles: (ids: string[]) => {
      const { rectangles } = get();
      
      if (ids.length === 0) {
        return;
      }

      // Get all rectangles to copy (including descendants)
      const rectanglesToCopy = new Set<string>(ids);
      
      // Add all descendants of selected rectangles
      const addDescendants = (parentId: string) => {
        const children = rectangles.filter(r => r.parentId === parentId);
        children.forEach(child => {
          rectanglesToCopy.add(child.id);
          addDescendants(child.id);
        });
      };
      
      ids.forEach(addDescendants);
      
      // Extract the rectangle data
      const rectangleData = Array.from(rectanglesToCopy)
        .map(id => rectangles.find(r => r.id === id))
        .filter((r): r is Rectangle => r !== undefined);

      if (rectangleData.length === 0) {
        return;
      }

      // Calculate relative bounds for positioning
      const bounds = calculateBounds(rectangleData);
      
      // Determine source parent (common parent of top-level selected items)
      const topLevelIds = ids.filter(id => {
        const rect = rectangles.find(r => r.id === id);
        return rect && !ids.some(otherId => 
          rectangles.find(r => r.id === otherId && rect.parentId === r.id)
        );
      });
      
      const sourceParentId = topLevelIds.length > 0 
        ? rectangles.find(r => r.id === topLevelIds[0])?.parentId
        : undefined;

      const clipboardData: ClipboardData = {
        rectangles: rectangleData,
        timestamp: Date.now(),
        sourceParentId,
        relativeBounds: bounds,
      };

      set(() => ({
        clipboard: {
          clipboardData,
        },
      }));
    },

    /**
     * Paste rectangles from clipboard to target location
     * Uses context-aware strategy: exact layout for root, hierarchical mode for parents
     */
    pasteRectangles: (targetParentId?: string) => {
      const { clipboard, rectangles, rectangleActions, historyActions } = get();
      
      if (!clipboard.clipboardData) {
        return;
      }

      const { rectangles: clipboardRectangles, relativeBounds } = clipboard.clipboardData;
      
      const idMapping = new Map<string, string>();
      clipboardRectangles.forEach(rect => {
        idMapping.set(rect.id, rectangleActions.generateId());
      });
      
      let newRectangles: Rectangle[];
      
      if (targetParentId) {
        // Hierarchical mode: Replay sequence of addRectangle operations
        const createdIds: string[] = [];
        const clipboardIds = new Set(clipboardRectangles.map(r => r.id));
        const rootRectangles = clipboardRectangles.filter(rect => 
          !rect.parentId || !clipboardIds.has(rect.parentId)
        );
        
        const processLevel = (parentRectangles: Rectangle[], currentParentId: string) => {
          parentRectangles.forEach(rect => {
            rectangleActions.addRectangle(currentParentId);
            
            const currentState = get();
            const lastCreated = currentState.rectangles[currentState.rectangles.length - 1];
            const newId = lastCreated.id;
            
            idMapping.set(rect.id, newId);
            createdIds.push(newId);
            
            rectangleActions.updateRectangleLabel(newId, rect.label);
            if (rect.description) {
              rectangleActions.updateRectangleDescription(newId, rect.description);
            }
            rectangleActions.updateRectangleColor(newId, rect.color);
            
            const children = clipboardRectangles.filter(child => child.parentId === rect.id);
            if (children.length > 0) {
              processLevel(children, newId);
            }
          });
        };
        
        processLevel(rootRectangles, targetParentId);
        
        const currentState = get();
        newRectangles = currentState.rectangles.filter(r => createdIds.includes(r.id));
      } else {
        // Exact layout mode: Preserve positioning and sizing
        const pastePosition = calculatePastePosition(relativeBounds, targetParentId, rectangles);
        
        newRectangles = clipboardRectangles.map(rect => {
          const newId = idMapping.get(rect.id)!;
          const mappedParentId = rect.parentId ? idMapping.get(rect.parentId) : undefined;
          const newParentId = mappedParentId !== undefined ? mappedParentId : targetParentId;
          
          const offsetX = rect.x - relativeBounds.minX + pastePosition.x;
          const offsetY = rect.y - relativeBounds.minY + pastePosition.y;
          
          return {
            ...rect,
            id: newId,
            parentId: newParentId,
            x: offsetX,
            y: offsetY,
          };
        });
        
        set(state => ({
          rectangles: [...state.rectangles, ...newRectangles],
        }));
        
        setTimeout(() => {
          historyActions.saveToHistory();
        }, 0);
      }
      
      const topLevelPastedIds = newRectangles
        .filter(rect => rect.parentId === targetParentId)
        .map(rect => rect.id);
      
      rectangleActions.setSelectedIds(topLevelPastedIds);
    },

    /**
     * Check if paste operation is currently possible
     */
    canPaste: () => {
      const { clipboard } = get();
      return clipboard.clipboardData !== null;
    },

    /**
     * Clear clipboard data
     */
    clearClipboard: () => {
      set(() => ({
        clipboard: {
          clipboardData: null,
        },
      }));
    },
  },
});

/**
 * Calculate bounding box for a set of rectangles
 */
function calculateBounds(rectangles: Rectangle[]): ClipboardData['relativeBounds'] {
  if (rectangles.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  rectangles.forEach(rect => {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  });

  return { minX, minY, maxX, maxY };
}

/**
 * Calculate appropriate position for pasting rectangles
 * Uses incremental offsets to avoid overlapping with existing rectangles
 */
function calculatePastePosition(
  bounds: ClipboardData['relativeBounds'],
  targetParentId: string | undefined,
  existingRectangles: Rectangle[]
): { x: number; y: number } {
  const pasteWidth = bounds.maxX - bounds.minX;
  const pasteHeight = bounds.maxY - bounds.minY;
  
  // If pasting to root level, find available position with incremental offsets
  if (!targetParentId) {
    let baseX = bounds.minX;
    let baseY = bounds.minY;
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      const candidateX = baseX + (attempts * PASTE_OFFSET);
      const candidateY = baseY + (attempts * PASTE_OFFSET);
      
      // Check if this position would overlap with existing rectangles
      const wouldOverlap = existingRectangles
        .filter(r => !r.parentId) // Only check root-level rectangles
        .some(rect => {
          return !(
            candidateX + pasteWidth < rect.x ||
            candidateX > rect.x + rect.w ||
            candidateY + pasteHeight < rect.y ||
            candidateY > rect.y + rect.h
          );
        });
      
      if (!wouldOverlap) {
        return { x: candidateX, y: candidateY };
      }
      
      attempts++;
    }
    
    // Fallback to simple offset if no clear position found
    return {
      x: baseX + (maxAttempts * PASTE_OFFSET),
      y: baseY + (maxAttempts * PASTE_OFFSET),
    };
  }

  // Find target parent rectangle
  const targetParent = existingRectangles.find(r => r.id === targetParentId);
  if (!targetParent) {
    return { x: PASTE_OFFSET, y: PASTE_OFFSET };
  }

  // For parent containers, find available position within bounds
  const margin = 20;
  const children = existingRectangles.filter(r => r.parentId === targetParentId);
  
  let candidateX = targetParent.x + margin;
  let candidateY = targetParent.y + margin;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const testX = candidateX + (attempts * PASTE_OFFSET);
    const testY = candidateY + (attempts * PASTE_OFFSET);
    
    // Check if this position would overlap with existing children
    const wouldOverlap = children.some(child => {
      return !(
        testX + pasteWidth < child.x ||
        testX > child.x + child.w ||
        testY + pasteHeight < child.y ||
        testY > child.y + child.h
      );
    });
    
    if (!wouldOverlap) {
      return { x: testX, y: testY };
    }
    
    attempts++;
  }
  
  // Fallback position
  return {
    x: candidateX + (maxAttempts * PASTE_OFFSET),
    y: candidateY + (maxAttempts * PASTE_OFFSET),
  };
}