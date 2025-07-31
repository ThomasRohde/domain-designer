import { useCallback } from 'react';
import { Rectangle, FixedDimensions } from '../types';
import { LayoutMetadata, shouldPreserveExactLayout } from '../types/layoutSnapshot';

/**
 * Props for useDimensionEngine hook
 */
export interface UseDimensionEngineProps {
  getFixedDimensions: () => FixedDimensions;
}

/**
 * Return interface for useDimensionEngine hook
 * Provides dimension management operations with metadata awareness
 */
export interface UseDimensionEngineReturn {
  applyFixedDimensions: (rectangles: Rectangle[], layoutMetadata?: LayoutMetadata) => Rectangle[];
  updateLeafDimensions: (rectangles: Rectangle[], fixedDimensions: FixedDimensions, layoutMetadata?: LayoutMetadata) => Rectangle[];
  canUpdateDimensions: (layoutMetadata?: LayoutMetadata) => boolean;
}

export const useDimensionEngine = ({
  getFixedDimensions
}: UseDimensionEngineProps): UseDimensionEngineReturn => {
  
  /**
   * Determines if dimension updates should proceed based on metadata
   * Prevents dimension changes during layout preservation periods
   */
  const canUpdateDimensions = useCallback((layoutMetadata?: LayoutMetadata): boolean => {
    if (!layoutMetadata) return true;
    
    // Preserve exact dimensions during import/restore operations
    return !shouldPreserveExactLayout(layoutMetadata);
  }, []);

  /**
   * Applies global fixed dimension settings to leaf rectangles
   * Enforces consistent sizing for terminal nodes in the hierarchy
   */
  const applyFixedDimensions = useCallback((
    rectangles: Rectangle[], 
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Skip dimension modifications when preservation is required
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

  /**
   * Updates leaf rectangle dimensions based on provided constraints
   * Alternative to applyFixedDimensions with explicit parameters
   */
  const updateLeafDimensions = useCallback((
    rectangles: Rectangle[], 
    fixedDimensions: FixedDimensions,
    layoutMetadata?: LayoutMetadata
  ): Rectangle[] => {
    // Skip dimension modifications when preservation is required
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