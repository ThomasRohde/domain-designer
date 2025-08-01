import type { Rectangle } from '../types';
import { updateChildrenLayout } from './layoutUtils';
import { validateSelection, canBulkMove } from './selectionUtils';

/**
 * Comprehensive bulk operation validation and layout integration utilities
 * 
 * This module provides the critical bridge between multi-select operations and the
 * application's constraint-based layout system. It ensures that bulk operations
 * respect hierarchical relationships, layout algorithm requirements, and user expectations.
 * 
 * Key Responsibilities:
 * - Pre-operation validation with detailed error reporting
 * - Layout constraint enforcement and conflict detection
 * - Automatic layout recalculation after bulk modifications
 * - Cascading operation analysis (e.g., delete with children)
 * - User-friendly operation summaries for confirmation dialogs
 * 
 * Integration Points:
 * - Layout System: Triggers updateChildrenLayout() when needed
 * - Selection System: Validates against selectionUtils constraints
 * - UI System: Provides user-friendly error messages and warnings
 */

/**
 * Comprehensive validation result for bulk operations with detailed feedback.
 * 
 * Designed to provide both programmatic validation and rich user feedback:
 * - isValid: Boolean gate for operation execution
 * - errorMessage: User-facing explanation for validation failures
 * - warnings: Non-blocking alerts about operation side effects
 * - affectedRectangles: Complete list of rectangles impacted by operation
 */
export interface BulkOperationValidationResult {
  isValid: boolean;
  errorMessage?: string;
  warnings?: string[];
  affectedRectangles?: string[];
}

/**
 * Comprehensive bulk operation validation with layout system integration.
 * 
 * Multi-Layer Validation Process:
 * 1. Selection Constraints: Validates same-parent and text-label rules
 * 2. Operation-Specific Rules: Custom validation per operation type
 * 3. Layout System Integration: Checks for automatic layout conflicts
 * 4. Cascading Effect Analysis: Identifies indirect operation impacts
 * 
 * Operation-Specific Validation:
 * - move: Requires parent manual positioning permission
 * - delete: Analyzes cascading deletions of child rectangles
 * - align/distribute: Warns about potential layout recalculation
 * - color: Generally safe, minimal constraints
 * 
 * @param operation - Type of bulk operation to validate
 * @param selectedIds - Rectangle IDs in the current selection
 * @param rectangles - Complete rectangle dataset for relationship analysis
 * @param _settings - Global layout settings (reserved for future constraint checks)
 * @returns Detailed validation result with errors, warnings, and affected rectangle lists
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

  // Foundation validation: ensure selection meets multi-select constraints
  if (!validateSelection(selectedIds, rectangles)) {
    return {
      isValid: false,
      errorMessage: 'Invalid selection: rectangles must be at the same hierarchy level and cannot include text labels'
    };
  }

  // Specialized validation rules based on operation type
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
      // Cascading effect analysis: identify child rectangles that will be deleted
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

      // Layout impact analysis: detect automatic layout conflicts
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
      // Color operations: minimal constraints, generally safe to execute
      break;
    }
  }

  return result;
};

/**
 * Intelligent layout recalculation system for post-operation updates.
 * 
 * Smart Recalculation Logic:
 * 1. Parent Impact Analysis: Determine which containers are affected
 * 2. Layout Mode Detection: Check if parents have automatic layout enabled
 * 3. Conditional Recalculation: Only recalculate when necessary
 * 4. Recursive Layout Update: Use existing updateChildrenLayout() system
 * 
 * Performance Optimization:
 * - Avoids unnecessary recalculations for manual positioning containers
 * - Respects isLockedAsIs flag to prevent unwanted layout changes
 * - Batches multiple rectangle changes into single layout pass
 * 
 * Layout System Integration:
 * - Maintains consistency with Grid, Flow, and Mixed Flow algorithms
 * - Preserves fixed dimension settings for leaf rectangles
 * - Respects margin and spacing configurations
 * 
 * @param affectedRectangleIds - Rectangle IDs modified by the bulk operation
 * @param rectangles - Current rectangle state before layout recalculation
 * @param settings - Layout calculation parameters and constraints
 * @returns Updated rectangle array with recalculated positions and sizes
 */
export const triggerLayoutRecalculation = (
  affectedRectangleIds: string[],
  rectangles: Rectangle[],
  settings: { margin: number; labelMargin: number; leafFixedWidth: boolean; leafFixedHeight: boolean; leafWidth: number; leafHeight: number }
): Rectangle[] => {
  if (affectedRectangleIds.length === 0) {
    return rectangles;
  }

  // Parent impact analysis: identify containers that need layout updates
  const affectedParents = new Set<string>();
  
  for (const id of affectedRectangleIds) {
    const rect = rectangles.find(r => r.id === id);
    if (rect?.parentId) {
      affectedParents.add(rect.parentId);
    }
  }

  // Layout mode detection: determine if recalculation is necessary
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
 * Recursive descendant finder for cascading operation analysis.
 * 
 * Traverses the rectangle hierarchy tree to find all descendants of a given rectangle.
 * Essential for:
 * - Delete operations: Calculate total impact of removing a parent
 * - Move operations: Understand which rectangles move together
 * - Layout operations: Identify all rectangles affected by parent changes
 * 
 * Algorithm: Depth-first search through parent-child relationships
 * Performance: O(n) where n is total rectangle count (efficient for typical diagrams)
 */
function getAllDescendants(rectangleId: string, rectangles: Rectangle[]): string[] {
  const descendants: string[] = [];
  // Find immediate children of the given rectangle
  const children = rectangles.filter(r => r.parentId === rectangleId);
  
  // Recursively collect all descendants through depth-first traversal
  for (const child of children) {
    descendants.push(child.id);
    descendants.push(...getAllDescendants(child.id, rectangles));
  }
  
  return descendants;
}

/**
 * Generates user-friendly operation summaries for confirmation dialogs.
 * 
 * Summary Generation Strategy:
 * 1. Primary Impact: Count of directly selected rectangles
 * 2. Secondary Impact: Additional rectangles affected by cascading effects
 * 3. Warning Integration: Include validation warnings in summary
 * 4. User-Friendly Language: Clear, non-technical descriptions
 * 
 * Used By:
 * - Confirmation dialogs: "Are you sure you want to..."
 * - Progress indicators: "Processing X rectangles..."
 * - Undo descriptions: "Bulk delete of X rectangles"
 * 
 * @param _operation - Operation type (reserved for operation-specific messages)
 * @param selectedIds - Directly selected rectangle IDs
 * @param validationResult - Validation output with warnings and affected rectangles
 * @returns Array of summary strings ready for user display
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