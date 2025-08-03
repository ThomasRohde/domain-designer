import { Rectangle } from '../../types';
import type { SliceCreator, ClipboardState, ClipboardActions, ClipboardData } from '../types';

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
     */
    pasteRectangles: (targetParentId?: string) => {
      const { clipboard, rectangles, rectangleActions, historyActions } = get();
      
      if (!clipboard.clipboardData) {
        return;
      }

      const { rectangles: clipboardRectangles, relativeBounds } = clipboard.clipboardData;
      
      // Generate new IDs for all rectangles
      const idMapping = new Map<string, string>();
      clipboardRectangles.forEach(rect => {
        idMapping.set(rect.id, rectangleActions.generateId());
      });
      
      // Calculate paste position
      const pastePosition = calculatePastePosition(
        relativeBounds,
        targetParentId,
        rectangles
      );
      
      // Create new rectangles with updated IDs and positions
      const newRectangles = clipboardRectangles.map(rect => {
        const newId = idMapping.get(rect.id)!;
        const newParentId = rect.parentId ? idMapping.get(rect.parentId) : targetParentId;
        
        // Calculate new position
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
      
      // Update rectangles and save to history after the state update
      set(state => ({
        rectangles: [...state.rectangles, ...newRectangles],
      }));
      
      // Save to history after the state update (following the same pattern as other rectangle operations)
      setTimeout(() => {
        historyActions.saveToHistory();
      }, 0);
      
      // Select the newly pasted rectangles
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