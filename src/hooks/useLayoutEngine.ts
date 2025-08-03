import { useCallback } from 'react';
import { Rectangle, FixedDimensions } from '../types';
import { LayoutMetadata, shouldPreserveExactLayout } from '../types/layoutSnapshot';
import { updateChildrenLayout, getChildren } from '../utils/layoutUtils';
import { layoutManager, LayoutAlgorithmType } from '../utils/layout';

/**
 * Props for useLayoutEngine hook
 */
export interface UseLayoutEngineProps {
  getFixedDimensions: () => FixedDimensions;
  getMargins: () => { margin: number; labelMargin: number };
}

/**
 * Return interface for useLayoutEngine hook
 * Provides layout management operations with metadata awareness
 */
export interface UseLayoutEngineReturn {
  updateLayout: (rectangles: Rectangle[], layoutMetadata?: LayoutMetadata) => Rectangle[];
  fitParentToChildren: (rectangles: Rectangle[], parentId: string, layoutMetadata?: LayoutMetadata) => Rectangle[];
  recalculateChildrenLayout: (rectangles: Rectangle[], parentId: string, layoutMetadata?: LayoutMetadata) => Rectangle[];
  canLayoutUpdate: (layoutMetadata?: LayoutMetadata) => boolean;
  setLayoutAlgorithm: (algorithm: LayoutAlgorithmType) => void;
}

export const useLayoutEngine = ({
  getFixedDimensions,
  getMargins
}: UseLayoutEngineProps): UseLayoutEngineReturn => {
  
  /**
   * Determines if layout operations should proceed based on metadata
   * Respects layout preservation flags from import/restore operations
   */
  const canLayoutUpdate = useCallback((layoutMetadata?: LayoutMetadata): boolean => {
    if (!layoutMetadata) return true;
    
    // Preserve exact layouts during sensitive operations (import/restore)
    return !shouldPreserveExactLayout(layoutMetadata);
  }, []);

  /**
   * Configures the active layout algorithm for subsequent operations
   * Integrates with the global layout manager system
   */
  const setLayoutAlgorithm = useCallback((algorithm: LayoutAlgorithmType) => {
    layoutManager.setAlgorithm(algorithm);
  }, []);

  /**
   * Applies layout algorithm to all rectangles requiring positioning
   * Respects metadata constraints and manual positioning settings
   */
  const updateLayout = useCallback((
    rectangles: Rectangle[], 
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Skip layout modifications when preservation is required
    if (!canLayoutUpdate(layoutMetadata)) {
      return rectangles;
    }

    // Delegate to layout utilities for algorithm application
    return updateChildrenLayout(rectangles, getFixedDimensions(), getMargins());
  }, [canLayoutUpdate, getFixedDimensions, getMargins]);

  /**
   * Resizes parent rectangle to minimum size needed for children
   * Maintains proper containment while respecting layout constraints
   */
  const fitParentToChildren = useCallback((
    rectangles: Rectangle[], 
    parentId: string,
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Skip layout modifications when preservation is required
    if (!canLayoutUpdate(layoutMetadata)) {
      return rectangles;
    }

    const parent = rectangles.find(rect => rect.id === parentId);
    if (!parent) return rectangles;

    const children = getChildren(parentId, rectangles);
    if (children.length === 0) return rectangles;

    const newSize = layoutManager.calculateMinimumParentSize(parentId, rectangles, getFixedDimensions(), getMargins());

    // Apply calculated minimum dimensions to parent
    const updated = rectangles.map(rect => 
      rect.id === parentId ? { ...rect, w: newSize.w, h: newSize.h } : rect
    );

    // Ensure children are properly positioned after parent resize
    return updateChildrenLayout(updated, getFixedDimensions(), getMargins());
  }, [canLayoutUpdate, getFixedDimensions, getMargins]);

  /**
   * Recalculates positioning for children of specified parent
   * Respects manual positioning and lock settings
   */
  const recalculateChildrenLayout = useCallback((
    rectangles: Rectangle[], 
    parentId: string,
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Skip layout modifications when preservation is required
    if (!canLayoutUpdate(layoutMetadata)) {
      return rectangles;
    }

    const parent = rectangles.find(rect => rect.id === parentId);
    if (!parent || parent.isManualPositioningEnabled || parent.isLockedAsIs) {
      return rectangles;
    }

    const children = getChildren(parentId, rectangles);
    if (children.length === 0) return rectangles;

    // Apply layout algorithm to children
    return updateChildrenLayout(rectangles, getFixedDimensions(), getMargins());
  }, [canLayoutUpdate, getFixedDimensions, getMargins]);

  return {
    updateLayout,
    fitParentToChildren,
    recalculateChildrenLayout,
    canLayoutUpdate,
    setLayoutAlgorithm
  };
};