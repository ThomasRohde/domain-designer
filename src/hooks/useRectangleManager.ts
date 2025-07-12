import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Rectangle, LayoutPreferences } from '../types';
import { DEFAULT_RECTANGLE_SIZE } from '../utils/constants';
import { 
  updateChildrenLayout, 
  calculateNewRectangleLayout,
  getAllDescendants,
  getChildren,
  calculateMinimumParentSize,
  calculateChildLayout
} from '../utils/layoutUtils';
import { 
  createRectangle,
  updateRectangleType,
  applyFixedDimensions,
  FixedDimensions
} from '../utils/rectangleOperations';
import { useHistory } from './useHistory';

// Use the FixedDimensions from rectangleOperations
export type { FixedDimensions } from '../utils/rectangleOperations';

export interface UseRectangleManagerProps {
  gridSize: number;
  panOffsetRef: React.RefObject<{ x: number; y: number }>;
  containerRef: React.RefObject<HTMLDivElement>;
  getFixedDimensions: () => FixedDimensions;
  getMargins: () => { margin: number; labelMargin: number };
  triggerSave?: () => void;
}

export interface UseRectangleManagerReturn {
  // State
  rectangles: Rectangle[];
  selectedId: string | null;
  nextId: number;
  
  // Actions
  setSelectedId: (id: string | null) => void;
  generateId: () => string;
  updateNextId: (newNextId: number) => void;
  findRectangle: (id: string) => Rectangle | undefined;
  addRectangle: (parentId?: string) => void;
  removeRectangle: (id: string) => void;
  updateRectangleLabel: (id: string, label: string) => void;
  updateRectangleDescription: (id: string, description: string) => void;
  updateRectangleColor: (id: string, color: string) => void;
  updateRectangleLayoutPreferences: (id: string, preferences: LayoutPreferences) => void;
  toggleManualPositioning: (id: string) => void;
  fitToChildren: (id: string) => void;
  getAllDescendantsWrapper: (parentId: string) => Rectangle[];
  
  // Hierarchy actions
  reparentRectangle: (childId: string, newParentId: string | null) => boolean;
  canReparent: (childId: string, newParentId: string | null) => boolean;
  recalculateZOrder: () => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: (rectangles: Rectangle[]) => void;
  
  // Internal state setters (for drag/resize operations)
  setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  setRectanglesWithHistory: React.Dispatch<React.SetStateAction<Rectangle[]>>;
}

export const useRectangleManager = ({
  gridSize,
  panOffsetRef,
  containerRef,
  getFixedDimensions,
  getMargins,
  triggerSave
}: UseRectangleManagerProps): UseRectangleManagerReturn => {
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);
  
  // History management
  const history = useHistory();
  const isUndoRedoInProgress = useRef(false);
  
  // Note: History management is handled by setRectanglesWithHistory, not here
  // to avoid double history entries
  
  // Wrapper for setRectangles that saves history
  const setRectanglesWithHistory = useCallback((value: React.SetStateAction<Rectangle[]>) => {
    setRectangles(prev => {
      // Save the previous state to history before making the change
      if (!isUndoRedoInProgress.current) {
        history.pushState(prev);
      }
      const newRectangles = typeof value === 'function' ? value(prev) : value;
      // Schedule save after state update completes
      setTimeout(() => triggerSave?.(), 0);
      return newRectangles;
    });
  }, [history, triggerSave]);
  
  // Track undo/redo operations for proper cleanup
  const [undoRedoInProgress, setUndoRedoInProgress] = useState(false);
  
  // Effect to reset undo/redo flag after state updates
  useEffect(() => {
    if (undoRedoInProgress) {
      isUndoRedoInProgress.current = false;
      setUndoRedoInProgress(false);
    }
  }, [undoRedoInProgress, rectangles]);
  
  // Undo/Redo functions
  const undo = useCallback(() => {
    const previousState = history.undo();
    if (previousState) {
      isUndoRedoInProgress.current = true;
      setRectangles(previousState);
      setSelectedId(null); // Clear selection on undo
      setUndoRedoInProgress(true);
    }
  }, [history]);
  
  const redo = useCallback(() => {
    const nextState = history.redo();
    if (nextState) {
      isUndoRedoInProgress.current = true;
      setRectangles(nextState);
      setSelectedId(null); // Clear selection on redo
      setUndoRedoInProgress(true);
    }
  }, [history]);

  // Save current state to history
  const saveToHistory = useCallback((rectangles: Rectangle[]) => {
    if (!isUndoRedoInProgress.current) {
      history.pushState(rectangles);
    }
  }, [history]);

  // Generate a unique ID for new rectangles
  const generateId = useCallback(() => {
    const id = `rect-${nextId}`;
    setNextId(prev => prev + 1);
    return id;
  }, [nextId]);

  // Update the nextId counter (used for import operations)
  const updateNextId = useCallback((newNextId: number) => {
    setNextId(newNextId);
  }, []);

  // Find rectangle by ID
  const findRectangle = useCallback((id: string) => {
    return rectangles.find(rect => rect.id === id);
  }, [rectangles]);

  // Add a new rectangle
  const addRectangle = useCallback((parentId: string | null = null) => {
    const id = generateId();
    
    let { x, y, w, h } = calculateNewRectangleLayout(parentId, rectangles, DEFAULT_RECTANGLE_SIZE, getMargins());
    
    // If creating a root rectangle, ensure it's positioned in a visible and accessible area
    if (!parentId) {
      const rootRects = rectangles.filter(rect => !rect.parentId);
      if (rootRects.length === 0) {
        // For the very first rectangle, place it in an easily accessible area
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          // Position it at about 20% from top-left of the viewport, accounting for current pan
          const viewportX = Math.round(-panOffsetRef.current!.x / gridSize);
          const viewportY = Math.round(-panOffsetRef.current!.y / gridSize);
          const marginX = Math.max(5, Math.round(containerRect.width * 0.2 / gridSize));
          const marginY = Math.max(5, Math.round(containerRect.height * 0.2 / gridSize));
          x = viewportX + marginX;
          y = viewportY + marginY;
        } else {
          // Fallback: position it away from the edge
          x = Math.round(-panOffsetRef.current!.x / gridSize) + 10;
          y = Math.round(-panOffsetRef.current!.y / gridSize) + 10;
        }
      } else {
        // For subsequent root rectangles, ensure they're also in a visible area
        // If the calculated position would be outside the current viewport, adjust it
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const viewportX = Math.round(-panOffsetRef.current!.x / gridSize);
          const viewportY = Math.round(-panOffsetRef.current!.y / gridSize);
          const viewportWidth = Math.round(containerRect.width / gridSize);
          const viewportHeight = Math.round(containerRect.height / gridSize);
          
          // Check if the calculated position is outside the viewport
          if (x < viewportX || x > viewportX + viewportWidth - w || 
              y < viewportY || y > viewportY + viewportHeight - h) {
            // Position it in the viewport with some margin
            x = viewportX + Math.max(5, Math.round(viewportWidth * 0.1));
            y = viewportY + Math.max(5, Math.round(viewportHeight * 0.1));
          }
        }
      }
    }
    
    // Create rectangle using utility function
    let newRect = createRectangle(id, x, y, w, h, parentId || undefined);
    
    // Apply fixed dimensions if this is a leaf rectangle
    if (parentId) {
      newRect = applyFixedDimensions(newRect, getFixedDimensions());
    }

    setRectanglesWithHistory(prev => {
      let updated = [...prev, newRect];
      
      // Update parent type using utility function
      if (parentId) {
        updated = updateRectangleType(updated, parentId);
        const parentIndex = updated.findIndex(r => r.id === parentId);
        if (parentIndex !== -1) {
          
          // Check if parent needs to be resized to accommodate all children
          const parent = updated[parentIndex];
          const allChildren = updated.filter(r => r.parentId === parentId);
          
          // Always check if parent needs to be resized, especially for restrictive layout preferences
          if (allChildren.length > 0) {
            // Calculate minimum size needed for the parent to accommodate all children
            const minParentSize = calculateMinimumParentSize(parentId, updated, getFixedDimensions(), getMargins());
            
            // Resize parent if it's too small to accommodate its children
            if (parent.w < minParentSize.w || parent.h < minParentSize.h) {
              updated = updated.map(rect => 
                rect.id === parentId 
                  ? { ...rect, w: Math.max(rect.w, minParentSize.w), h: Math.max(rect.h, minParentSize.h) }
                  : rect
              );
            }
          }
          
          // Immediately recalculate layout for all children of this parent
          if (allChildren.length > 0) {
            const updatedParent = updated.find(r => r.id === parentId);
            if (updatedParent) {
              const newChildLayout = calculateChildLayout(updatedParent, allChildren, getFixedDimensions(), getMargins(), updated);
              
              // Apply the new layout to all children
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
    });
    setSelectedId(id);
    
    // Remove the setTimeout since we're doing the layout update immediately above
  }, [generateId, rectangles, gridSize, panOffsetRef, containerRef, getFixedDimensions, getMargins, setRectanglesWithHistory]);

  // Get all descendants of a rectangle (recursive)
  const getAllDescendantsWrapper = useCallback((parentId: string): Rectangle[] => {
    return getAllDescendants(parentId, rectangles).map(id => rectangles.find(r => r.id === id)!).filter(Boolean);
  }, [rectangles]);

  // Remove a rectangle and its children
  const removeRectangle = useCallback((id: string) => {
    const toRemove = [id, ...getAllDescendantsWrapper(id).map(r => r.id)];
    setRectanglesWithHistory(prev => {
      const updated = prev.filter(rect => !toRemove.includes(rect.id));
      return updated;
    });
    setSelectedId(null);
  }, [getAllDescendantsWrapper, setRectanglesWithHistory]);

  // Update rectangle label
  const updateRectangleLabel = useCallback((id: string, label: string) => {
    setRectanglesWithHistory(prev => 
      prev.map(rect => 
        rect.id === id ? { ...rect, label } : rect
      )
    );
  }, [setRectanglesWithHistory]);

  // Update rectangle description
  const updateRectangleDescription = useCallback((id: string, description: string) => {
    setRectanglesWithHistory(prev => 
      prev.map(rect => 
        rect.id === id ? { ...rect, description } : rect
      )
    );
  }, [setRectanglesWithHistory]);

  // Update rectangle color
  const updateRectangleColor = useCallback((id: string, color: string) => {
    setRectanglesWithHistory(prev => {
      const updated = prev.map(rect => 
        rect.id === id ? { 
          ...rect, 
          color
        } : rect
      );
      return updated;
    });
  }, [setRectanglesWithHistory]);

  // Update rectangle layout preferences
  const updateRectangleLayoutPreferences = useCallback((id: string, preferences: LayoutPreferences) => {
    setRectanglesWithHistory(prev => {
      const updated = prev.map(rect => 
        rect.id === id ? { 
          ...rect, 
          layoutPreferences: preferences
        } : rect
      );
      
      // Always resize parent to optimal size when layout preferences change
      const parent = updated.find(rect => rect.id === id);
      if (parent) {
        const children = getChildren(id, updated);
        if (children.length > 0) {
          // Calculate optimal size for the new layout (same logic as fitToChildren)
          const optimalSize = calculateMinimumParentSize(id, updated, getFixedDimensions(), getMargins());
          
          // Always resize parent to optimal size for best layout
          const resizedUpdated = updated.map(rect => 
            rect.id === id 
              ? { ...rect, w: optimalSize.w, h: optimalSize.h }
              : rect
          );
          
          // Recalculate layout for all children after parent resize
          return updateChildrenLayout(resizedUpdated, getFixedDimensions(), getMargins());
        }
      }
      
      // Recalculate layout for all children after preferences change
      return updateChildrenLayout(updated, getFixedDimensions(), getMargins());
    });
  }, [setRectanglesWithHistory, getFixedDimensions, getMargins]);

  // Toggle manual positioning for a rectangle
  const toggleManualPositioning = useCallback((id: string) => {
    setRectanglesWithHistory(prev => {
      const updated = prev.map(rect => 
        rect.id === id ? { 
          ...rect, 
          isManualPositioningEnabled: !rect.isManualPositioningEnabled
        } : rect
      );
      
      // If we're re-enabling auto layout, recalculate children positions
      const parent = updated.find(rect => rect.id === id);
      if (parent && !parent.isManualPositioningEnabled) {
        return updateChildrenLayout(updated, getFixedDimensions(), getMargins());
      }
      
      return updated;
    });
  }, [setRectanglesWithHistory, getFixedDimensions, getMargins]);

  // Fit rectangle to children
  const fitToChildren = useCallback((id: string) => {
    setRectanglesWithHistory(prev => {
      const parent = prev.find(rect => rect.id === id);
      if (!parent) return prev;

      const children = getChildren(id, prev);
      if (children.length === 0) return prev;

      const newSize = calculateMinimumParentSize(id, prev, getFixedDimensions(), getMargins());

      // Update parent size
      const updated = prev.map(rect => 
        rect.id === id ? { ...rect, w: newSize.w, h: newSize.h } : rect
      );

      // Recalculate children layout after parent resize
      return updateChildrenLayout(updated, getFixedDimensions(), getMargins());
    });
  }, [getFixedDimensions, getMargins, setRectanglesWithHistory]);

  // Check if reparenting is allowed (prevents circular hierarchies)
  const canReparent = useCallback((childId: string, newParentId: string | null): boolean => {
    if (newParentId === null) {
      // Always allow making something a root
      return true;
    }
    
    if (childId === newParentId) {
      // Can't make something its own parent
      return false;
    }
    
    // Check if newParentId is a descendant of childId (would create circular hierarchy)
    const childDescendants = getAllDescendantsWrapper(childId);
    return !childDescendants.some(desc => desc.id === newParentId);
  }, [getAllDescendantsWrapper]);

  // Reparent a rectangle (change its parent)
  const reparentRectangle = useCallback((childId: string, newParentId: string | null): boolean => {
    if (!canReparent(childId, newParentId)) {
      return false;
    }
    
    setRectanglesWithHistory(prev => {
      const child = prev.find(rect => rect.id === childId);
      if (!child) return prev;
      
      // Guard against no-op reparenting (dropping on same parent)
      const currentParentId = child.parentId || null;
      if (currentParentId === newParentId) {
        return prev; // No change needed, avoid unnecessary history entry
      }
      
      // Update the child's parentId
      let updated = prev.map(rect => 
        rect.id === childId 
          ? { ...rect, parentId: newParentId || undefined }
          : rect
      );
      
      // Update rectangle types based on new hierarchy
      updated = updated.map(rect => {
        const hasChildren = updated.some(r => r.parentId === rect.id);
        const hasParent = rect.parentId !== undefined;
        
        // Clearly handle the three cases for type assignment
        let newType: 'root' | 'parent' | 'leaf';
        if (!hasParent) {
          // No parent => root (regardless of whether it has children)
          newType = 'root';
        } else if (hasChildren) {
          // Has parent and children => parent
          newType = 'parent';
        } else {
          // Has parent but no children => leaf
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
        
        // Always check if parent needs to be resized, especially for restrictive layout preferences
        if (newParentChildren.length > 0 && newParent) {
          // Calculate minimum size needed for the parent to accommodate all children
          const minParentSize = calculateMinimumParentSize(newParentId, updated, getFixedDimensions(), getMargins());
          
          // Resize parent if it's too small to accommodate its children
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
  }, [canReparent, setRectanglesWithHistory, getFixedDimensions, getMargins]);

  // Recalculate z-order after hierarchy changes
  const recalculateZOrder = useCallback(() => {
    // This is handled automatically by the getZIndex function in layoutUtils
    // which calculates z-index based on hierarchy depth
    // We could force a re-render here if needed, but the existing system should handle it
  }, []);

  return {
    // State
    rectangles,
    selectedId,
    nextId,
    
    // Actions
    setSelectedId,
    generateId,
    updateNextId,
    findRectangle,
    addRectangle,
    removeRectangle,
    updateRectangleLabel,
    updateRectangleDescription,
    updateRectangleColor,
    updateRectangleLayoutPreferences,
    toggleManualPositioning,
    fitToChildren,
    getAllDescendantsWrapper,
    
    // Hierarchy actions
    reparentRectangle,
    canReparent,
    recalculateZOrder,
    
    // History actions
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    saveToHistory,
    
    // Internal state setters (for drag/resize operations)
    setRectangles,
    setRectanglesWithHistory,
  };
};
