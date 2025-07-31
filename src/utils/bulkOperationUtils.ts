import type { Rectangle } from '../types';
import { updateChildrenLayout } from './layoutUtils';
import { validateSelection, canBulkMove } from './selectionUtils';

/**
 * Utility functions for validating and executing bulk operations
 * with proper layout constraint enforcement and recalculation.
 */

/**
 * Result of bulk operation validation
 */
export interface BulkOperationValidationResult {
  isValid: boolean;
  errorMessage?: string;
  warnings?: string[];
  affectedRectangles?: string[];
}

/**
 * Validates bulk operations against layout constraints
 * @param operation - The operation to validate
 * @param selectedIds - IDs of selected rectangles
 * @param rectangles - All rectangles in the diagram
 * @param settings - Global settings for margins and grid
 * @returns Validation result with detailed feedback
 */
export const validateBulkOperationConstraints = (
  operation: 'move' | 'delete' | 'align' | 'distribute' | 'color',
  selectedIds: string[],
  rectangles: Rectangle[],
  _settings: { margin: number; labelMargin: number; gridSize: number }
): BulkOperationValidationResult => {
  const result: BulkOperationValidationResult = {
    isValid: true,
    warnings: [],
    affectedRectangles: []
  };

  // Basic selection validation
  if (!validateSelection(selectedIds, rectangles)) {
    return {
      isValid: false,
      errorMessage: 'Invalid selection: rectangles must be at the same hierarchy level and cannot include text labels'
    };
  }

  // Operation-specific validation
  switch (operation) {
    case 'move': {
      if (!canBulkMove(selectedIds, rectangles)) {
        return {
          isValid: false,
          errorMessage: 'Bulk movement not allowed: parent container has automatic layout enabled'
        };
      }
      break;
    }

    case 'delete': {
      // Check for cascading deletions
      const cascadedIds = new Set(selectedIds);
      for (const id of selectedIds) {
        const descendants = getAllDescendants(id, rectangles);
        descendants.forEach(descId => cascadedIds.add(descId));
      }
      
      if (cascadedIds.size > selectedIds.length) {
        result.warnings?.push(
          `Deleting ${selectedIds.length} rectangles will also delete ${cascadedIds.size - selectedIds.length} child rectangles`
        );
        result.affectedRectangles = Array.from(cascadedIds);
      }
      break;
    }

    case 'align':
    case 'distribute': {
      const minCount = operation === 'align' ? 2 : 3;
      if (selectedIds.length < minCount) {
        return {
          isValid: false,
          errorMessage: `${operation} requires at least ${minCount} rectangles selected`
        };
      }

      // Check if alignment/distribution would cause layout recalculation
      const selectedRects = rectangles.filter(r => selectedIds.includes(r.id));
      const parentIds = [...new Set(selectedRects.map(r => r.parentId).filter(Boolean))];
      
      for (const parentId of parentIds) {
        const parent = rectangles.find(r => r.id === parentId);
        if (parent && !parent.isManualPositioningEnabled) {
          result.warnings?.push(
            `${operation} may trigger automatic layout recalculation in parent container`
          );
        }
      }
      break;
    }

    case 'color': {
      // Color changes are generally safe, no specific constraints
      break;
    }
  }

  return result;
};

/**
 * Triggers layout recalculation after bulk operations
 * @param affectedRectangleIds - IDs of rectangles modified by the operation
 * @param rectangles - Current rectangle state
 * @param settings - Global settings for layout calculation
 * @returns Updated rectangles with recalculated layouts
 */
export const triggerLayoutRecalculation = (
  affectedRectangleIds: string[],
  rectangles: Rectangle[],
  settings: { margin: number; labelMargin: number; leafFixedWidth: boolean; leafFixedHeight: boolean; leafWidth: number; leafHeight: number }
): Rectangle[] => {
  if (affectedRectangleIds.length === 0) {
    return rectangles;
  }

  // Find all parent containers that might be affected
  const affectedParents = new Set<string>();
  
  for (const id of affectedRectangleIds) {
    const rect = rectangles.find(r => r.id === id);
    if (rect?.parentId) {
      affectedParents.add(rect.parentId);
    }
  }

  // Check if any affected parents have automatic layout enabled
  const needsRecalculation = Array.from(affectedParents).some(parentId => {
    const parent = rectangles.find(r => r.id === parentId);
    return parent && !parent.isManualPositioningEnabled && !parent.isLockedAsIs;
  });

  if (needsRecalculation) {
    const fixedDimensions = {
      leafFixedWidth: settings.leafFixedWidth,
      leafFixedHeight: settings.leafFixedHeight,
      leafWidth: settings.leafWidth,
      leafHeight: settings.leafHeight
    };
    
    const margins = {
      margin: settings.margin,
      labelMargin: settings.labelMargin
    };

    return updateChildrenLayout(rectangles, fixedDimensions, margins);
  }

  return rectangles;
};

/**
 * Helper function to get all descendants of a rectangle
 * @param rectangleId - ID of the parent rectangle
 * @param rectangles - All rectangles in the diagram
 * @returns Array of descendant rectangle IDs
 */
function getAllDescendants(rectangleId: string, rectangles: Rectangle[]): string[] {
  const descendants: string[] = [];
  const children = rectangles.filter(r => r.parentId === rectangleId);
  
  for (const child of children) {
    descendants.push(child.id);
    descendants.push(...getAllDescendants(child.id, rectangles));
  }
  
  return descendants;
}

/**
 * Creates a summary of bulk operation effects for user confirmation
 * @param operation - The operation being performed
 * @param selectedIds - IDs of selected rectangles
 * @param validationResult - Result from validateBulkOperationConstraints
 * @returns Array of summary strings for user display
 */
export const createBulkOperationSummary = (
  _operation: 'move' | 'delete' | 'align' | 'distribute' | 'color',
  selectedIds: string[],
  validationResult: BulkOperationValidationResult
): string[] => {
  const summary: string[] = [];

  summary.push(`${selectedIds.length} rectangle${selectedIds.length > 1 ? 's' : ''} selected`);

  if (validationResult.affectedRectangles && validationResult.affectedRectangles.length > selectedIds.length) {
    const additionalCount = validationResult.affectedRectangles.length - selectedIds.length;
    summary.push(`${additionalCount} additional rectangle${additionalCount > 1 ? 's' : ''} will be affected`);
  }

  if (validationResult.warnings) {
    summary.push(...validationResult.warnings);
  }

  return summary;
};