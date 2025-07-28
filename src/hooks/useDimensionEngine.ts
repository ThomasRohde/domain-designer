import { useCallback } from 'react';
import { Rectangle, FixedDimensions } from '../types';
import { LayoutMetadata, shouldPreserveExactLayout } from '../types/layoutSnapshot';

export interface UseDimensionEngineProps {
  getFixedDimensions: () => FixedDimensions;
}

export interface UseDimensionEngineReturn {
  applyFixedDimensions: (rectangles: Rectangle[], layoutMetadata?: LayoutMetadata) => Rectangle[];
  updateLeafDimensions: (rectangles: Rectangle[], fixedDimensions: FixedDimensions, layoutMetadata?: LayoutMetadata) => Rectangle[];
  canUpdateDimensions: (layoutMetadata?: LayoutMetadata) => boolean;
}

export const useDimensionEngine = ({
  getFixedDimensions
}: UseDimensionEngineProps): UseDimensionEngineReturn => {
  
  // Check if dimensions can be updated based on layout metadata
  const canUpdateDimensions = useCallback((layoutMetadata?: LayoutMetadata): boolean => {
    if (!layoutMetadata) return true;
    
    // Don't update dimensions if layout should be preserved exactly
    return !shouldPreserveExactLayout(layoutMetadata);
  }, []);

  // Apply fixed dimensions to leaf rectangles only if allowed
  const applyFixedDimensions = useCallback((
    rectangles: Rectangle[], 
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Don't modify dimensions if layout should be preserved
    if (!canUpdateDimensions(layoutMetadata)) {
      return rectangles;
    }

    const fixedDims = getFixedDimensions();
    
    return rectangles.map(rect => {
      if (rect.type === 'leaf') {
        const updatedRect = { ...rect };
        
        if (fixedDims.leafFixedWidth) {
          updatedRect.w = fixedDims.leafWidth;
        }
        
        if (fixedDims.leafFixedHeight) {
          updatedRect.h = fixedDims.leafHeight;
        }
        
        return updatedRect;
      }
      
      return rect;
    });
  }, [getFixedDimensions, canUpdateDimensions]);

  // Update leaf dimensions based on settings
  const updateLeafDimensions = useCallback((
    rectangles: Rectangle[], 
    fixedDimensions: FixedDimensions,
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Don't modify dimensions if layout should be preserved
    if (!canUpdateDimensions(layoutMetadata)) {
      return rectangles;
    }

    return rectangles.map(rect => {
      if (rect.type === 'leaf') {
        const updatedRect = { ...rect };
        
        if (fixedDimensions.leafFixedWidth) {
          updatedRect.w = fixedDimensions.leafWidth;
        }
        
        if (fixedDimensions.leafFixedHeight) {
          updatedRect.h = fixedDimensions.leafHeight;
        }
        
        return updatedRect;
      }
      
      return rect;
    });
  }, [canUpdateDimensions]);

  return {
    applyFixedDimensions,
    updateLeafDimensions,
    canUpdateDimensions
  };
};