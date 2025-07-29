import { useCallback } from 'react';
import { Rectangle, FixedDimensions } from '../types';
import { LayoutMetadata, shouldPreserveExactLayout } from '../types/layoutSnapshot';
import { updateChildrenLayout, calculateMinimumParentSize, getChildren } from '../utils/layoutUtils';
import { layoutManager, LayoutAlgorithmType } from '../utils/layout';

export interface UseLayoutEngineProps {
  getFixedDimensions: () => FixedDimensions;
  getMargins: () => { margin: number; labelMargin: number };
}

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
  
  // Check if layout can be updated based on metadata
  const canLayoutUpdate = useCallback((layoutMetadata?: LayoutMetadata): boolean => {
    if (!layoutMetadata) return true;
    
    // Don't update layout if it should be preserved exactly
    return !shouldPreserveExactLayout(layoutMetadata);
  }, []);

  // Set the layout algorithm
  const setLayoutAlgorithm = useCallback((algorithm: LayoutAlgorithmType) => {
    layoutManager.setAlgorithm(algorithm);
  }, []);

  // Update layout for all rectangles that need it
  const updateLayout = useCallback((
    rectangles: Rectangle[], 
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Don't modify layout if it should be preserved
    if (!canLayoutUpdate(layoutMetadata)) {
      return rectangles;
    }

    // Use the existing updateChildrenLayout utility
    return updateChildrenLayout(rectangles, getFixedDimensions(), getMargins());
  }, [canLayoutUpdate, getFixedDimensions, getMargins]);

  // Fit a parent rectangle to its children
  const fitParentToChildren = useCallback((
    rectangles: Rectangle[], 
    parentId: string,
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Don't modify layout if it should be preserved
    if (!canLayoutUpdate(layoutMetadata)) {
      return rectangles;
    }

    const parent = rectangles.find(rect => rect.id === parentId);
    if (!parent) return rectangles;

    const children = getChildren(parentId, rectangles);
    if (children.length === 0) return rectangles;

    const newSize = calculateMinimumParentSize(parentId, rectangles, getFixedDimensions(), getMargins());

    // Update parent size
    const updated = rectangles.map(rect => 
      rect.id === parentId ? { ...rect, w: newSize.w, h: newSize.h } : rect
    );

    // Recalculate children layout after parent resize
    return updateChildrenLayout(updated, getFixedDimensions(), getMargins());
  }, [canLayoutUpdate, getFixedDimensions, getMargins]);

  // Recalculate layout for children of a specific parent
  const recalculateChildrenLayout = useCallback((
    rectangles: Rectangle[], 
    parentId: string,
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Don't modify layout if it should be preserved
    if (!canLayoutUpdate(layoutMetadata)) {
      return rectangles;
    }

    const parent = rectangles.find(rect => rect.id === parentId);
    if (!parent || parent.isManualPositioningEnabled || parent.isLockedAsIs) {
      return rectangles;
    }

    const children = getChildren(parentId, rectangles);
    if (children.length === 0) return rectangles;

    // Use the existing updateChildrenLayout utility
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