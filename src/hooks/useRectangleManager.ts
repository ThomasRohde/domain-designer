import React, { useState, useCallback, useRef } from 'react';
import { Rectangle } from '../types';
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
}

export interface UseRectangleManagerReturn {
  // State
  rectangles: Rectangle[];
  selectedId: string | null;
  nextId: number;
  
  // Actions
  setSelectedId: (id: string | null) => void;
  generateId: () => string;
  findRectangle: (id: string) => Rectangle | undefined;
  addRectangle: (parentId?: string) => void;
  removeRectangle: (id: string) => void;
  updateRectangleLabel: (id: string, label: string) => void;
  updateRectangleColor: (id: string, color: string) => void;
  fitToChildren: (id: string) => void;
  getAllDescendantsWrapper: (parentId: string) => Rectangle[];
  
  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Internal state setters (for drag/resize operations)
  setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  setRectanglesWithHistory: React.Dispatch<React.SetStateAction<Rectangle[]>>;
}

export const useRectangleManager = ({
  gridSize,
  panOffsetRef,
  containerRef,
  getFixedDimensions
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
      return newRectangles;
    });
  }, [history]);
  
  // Undo/Redo functions
  const undo = useCallback(() => {
    const previousState = history.undo();
    if (previousState) {
      isUndoRedoInProgress.current = true;
      setRectangles(previousState);
      setSelectedId(null); // Clear selection on undo
      setTimeout(() => {
        isUndoRedoInProgress.current = false;
      }, 0);
    }
  }, [history]);
  
  const redo = useCallback(() => {
    const nextState = history.redo();
    if (nextState) {
      isUndoRedoInProgress.current = true;
      setRectangles(nextState);
      setSelectedId(null); // Clear selection on redo
      setTimeout(() => {
        isUndoRedoInProgress.current = false;
      }, 0);
    }
  }, [history]);

  // Generate a unique ID for new rectangles
  const generateId = useCallback(() => {
    const id = `rect-${nextId}`;
    setNextId(prev => prev + 1);
    return id;
  }, [nextId]);

  // Find rectangle by ID
  const findRectangle = useCallback((id: string) => {
    return rectangles.find(rect => rect.id === id);
  }, [rectangles]);

  // Add a new rectangle
  const addRectangle = useCallback((parentId: string | null = null) => {
    const id = generateId();
    
    let { x, y, w, h } = calculateNewRectangleLayout(parentId, rectangles, DEFAULT_RECTANGLE_SIZE);
    
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
          
          // Immediately recalculate layout for all children of this parent
          const allChildren = updated.filter(r => r.parentId === parentId);
          if (allChildren.length > 0) {
            const updatedParent = updated[parentIndex];
            const newChildLayout = calculateChildLayout(updatedParent, allChildren, getFixedDimensions());
            
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
      
      return updated;
    });
    setSelectedId(id);
    
    // Remove the setTimeout since we're doing the layout update immediately above
  }, [generateId, rectangles, gridSize, panOffsetRef, containerRef, getFixedDimensions, setRectanglesWithHistory]);

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

  // Fit rectangle to children
  const fitToChildren = useCallback((id: string) => {
    setRectanglesWithHistory(prev => {
      const parent = prev.find(rect => rect.id === id);
      if (!parent) return prev;

      const children = getChildren(id, prev);
      if (children.length === 0) return prev;

      const newSize = calculateMinimumParentSize(id, prev, getFixedDimensions());

      // Update parent size
      const updated = prev.map(rect => 
        rect.id === id ? { ...rect, w: newSize.w, h: newSize.h } : rect
      );

      // Recalculate children layout after parent resize
      return updateChildrenLayout(updated, getFixedDimensions());
    });
  }, [getFixedDimensions, setRectanglesWithHistory]);

  return {
    // State
    rectangles,
    selectedId,
    nextId,
    
    // Actions
    setSelectedId,
    generateId,
    findRectangle,
    addRectangle,
    removeRectangle,
    updateRectangleLabel,
    updateRectangleColor,
    fitToChildren,
    getAllDescendantsWrapper,
    
    // History actions
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    
    // Internal state setters (for drag/resize operations)
    setRectangles,
    setRectanglesWithHistory,
  };
};
