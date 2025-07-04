import React, { useState, useCallback } from 'react';
import { Rectangle } from '../types';
import { DEFAULT_COLORS, DEFAULT_RECTANGLE_SIZE } from '../utils/constants';
import { 
  updateChildrenLayout, 
  calculateNewRectangleLayout,
  getAllDescendants,
  getChildren,
  calculateMinimumParentSize,
  calculateChildLayout
} from '../utils/layoutUtils';

export interface FixedDimensions {
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
}

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
  getAllDescendantsWrapper: (parentId: string) => string[];
  
  // Internal state setters (for drag/resize operations)
  setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>;
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
    
    let color = DEFAULT_COLORS.root; // Default color
    let finalW = w;
    let finalH = h;

    if (parentId) {
      color = DEFAULT_COLORS.leaf;
      // A new rectangle with a parent is always initially a leaf
      const rectType = 'leaf';
      
      // Apply fixed dimensions for leaf nodes if enabled
      if (rectType === 'leaf') {
        const fixedDimensions = getFixedDimensions();
        if (fixedDimensions.leafFixedWidth) {
          finalW = fixedDimensions.leafWidth;
        }
        if (fixedDimensions.leafFixedHeight) {
          finalH = fixedDimensions.leafHeight;
        }
      }
    }

    const newRect: Rectangle = {
      id,
      parentId: parentId || undefined,
      x,
      y,
      w: finalW,
      h: finalH,
      label: `Rectangle ${id}`,
      color,
      type: parentId ? 'leaf' : 'root',
    };

    setRectangles(prev => {
      const updated = [...prev, newRect];
      
      // Update parent type if it was a leaf and now has children
      if (parentId) {
        const parentIndex = updated.findIndex(r => r.id === parentId);
        if (parentIndex !== -1) {
          const parent = updated[parentIndex];
          if (parent.type === 'leaf') {
            updated[parentIndex] = { ...parent, type: 'parent' };
          }
          
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
  }, [generateId, rectangles, gridSize, panOffsetRef, containerRef, getFixedDimensions]);

  // Get all descendants of a rectangle (recursive)
  const getAllDescendantsWrapper = useCallback((parentId: string): string[] => {
    return getAllDescendants(parentId, rectangles);
  }, [rectangles]);

  // Remove a rectangle and its children
  const removeRectangle = useCallback((id: string) => {
    const toRemove = [id, ...getAllDescendantsWrapper(id)];
    setRectangles(prev => {
      const updated = prev.filter(rect => !toRemove.includes(rect.id));
      return updated;
    });
    setSelectedId(null);
  }, [getAllDescendantsWrapper]);

  // Update rectangle label
  const updateRectangleLabel = useCallback((id: string, label: string) => {
    setRectangles(prev => 
      prev.map(rect => 
        rect.id === id ? { ...rect, label } : rect
      )
    );
  }, []);

  // Update rectangle color
  const updateRectangleColor = useCallback((id: string, color: string) => {
    setRectangles(prev => {
      const updated = prev.map(rect => 
        rect.id === id ? { 
          ...rect, 
          color
        } : rect
      );
      return updated;
    });
  }, []);

  // Fit rectangle to children
  const fitToChildren = useCallback((id: string) => {
    setRectangles(prev => {
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
  }, [getFixedDimensions]);

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
    
    // Internal state setters (for drag/resize operations)
    setRectangles,
  };
};
