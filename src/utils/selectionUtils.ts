import type { Rectangle } from '../types';

/**
 * Validates if a collection of rectangles can be selected together
 * according to the application's multi-select constraints.
 * 
 * Constraints enforced:
 * - All rectangles must have the same parentId (same-level siblings only)
 * - Text labels (isTextLabel: true) cannot be multi-selected
 * - Single selections are always valid
 * 
 * @param rectangleIds - Array of rectangle IDs to validate
 * @param rectangles - Complete array of all rectangles in the diagram
 * @returns true if the selection is valid, false otherwise
 */
export const validateSelection = (rectangleIds: string[], rectangles: Rectangle[]): boolean => {
  // Empty selections are always valid
  if (rectangleIds.length === 0) return true;

  // Get rectangle objects for validation
  const selectedRects = rectangleIds
    .map(id => rectangles.find(r => r.id === id))
    .filter((rect): rect is Rectangle => rect !== undefined);

  // If we couldn't find all rectangles, selection is invalid
  if (selectedRects.length !== rectangleIds.length) return false;

  // Single selections are valid (after confirming rectangle exists)
  if (selectedRects.length === 1) return true;

  // Text labels cannot be part of multi-selection
  if (selectedRects.some(rect => rect.isTextLabel === true)) return false;

  // All rectangles must have the same parentId (same-level siblings)
  const firstParentId = selectedRects[0].parentId;
  return selectedRects.every(rect => rect.parentId === firstParentId);
};

/**
 * Checks if a new rectangle can be added to the current selection
 * while maintaining all multi-select constraints.
 * 
 * @param newId - ID of rectangle to potentially add to selection
 * @param currentSelection - Array of currently selected rectangle IDs
 * @param rectangles - Complete array of all rectangles in the diagram
 * @returns true if the rectangle can be added, false otherwise
 */
export const canAddToSelection = (
  newId: string, 
  currentSelection: string[], 
  rectangles: Rectangle[]
): boolean => {
  // Adding to empty selection is always allowed
  if (currentSelection.length === 0) return true;

  // Check if the new rectangle exists
  const newRect = rectangles.find(r => r.id === newId);
  if (!newRect) return false;

  // Text labels cannot be multi-selected
  if (newRect.isTextLabel === true) return false;

  // Create proposed new selection and validate it
  const proposedSelection = [...currentSelection, newId];
  return validateSelection(proposedSelection, rectangles);
};

/**
 * Gets the parent ID that is common to all rectangles in the selection.
 * Used for determining the container context of multi-select operations.
 * 
 * @param selectedIds - Array of selected rectangle IDs
 * @param rectangles - Complete array of all rectangles in the diagram
 * @returns Common parent ID (or null if rectangles are root level), undefined if selection is invalid
 */
export const getSelectionParent = (
  selectedIds: string[], 
  rectangles: Rectangle[]
): string | null | undefined => {
  if (selectedIds.length === 0) return undefined;

  // Prerequisite: selection must pass all multi-select constraints
  if (!validateSelection(selectedIds, rectangles)) return undefined;

  // Parent extraction: all rectangles share this parent due to validation
  const firstRect = rectangles.find(r => r.id === selectedIds[0]);
  return firstRect ? firstRect.parentId ?? null : undefined;
};

/**
 * Checks if all provided rectangles are siblings (same parent) at the same hierarchy level.
 * This is a core constraint for multi-select operations.
 * 
 * @param rectangleIds - Array of rectangle IDs to check
 * @param rectangles - Complete array of all rectangles in the diagram
 * @returns true if all rectangles are same-level siblings, false otherwise
 */
export const areAllSameLevelSiblings = (
  rectangleIds: string[], 
  rectangles: Rectangle[]
): boolean => {
  if (rectangleIds.length === 0) return true;

  // Get rectangle objects
  const rects = rectangleIds
    .map(id => rectangles.find(r => r.id === id))
    .filter((rect): rect is Rectangle => rect !== undefined);

  // If we couldn't find all rectangles, they can't be siblings
  if (rects.length !== rectangleIds.length) return false;

  // Single selections are valid siblings
  if (rects.length === 1) return true;

  // Check that all have the same parentId
  const firstParentId = rects[0].parentId;
  return rects.every(rect => rect.parentId === firstParentId);
};

/**
 * Filters a selection to include only rectangles that can be validly selected together.
 * Removes invalid rectangles while preserving the maximum valid subset.
 * 
 * Algorithm:
 * 1. Remove any text labels
 * 2. Group by parentId
 * 3. Return the largest group of same-parent rectangles
 * 
 * @param rectangleIds - Array of rectangle IDs to filter
 * @param rectangles - Complete array of all rectangles in the diagram
 * @returns Array of rectangle IDs that form a valid selection
 */
export const filterValidSelection = (
  rectangleIds: string[], 
  rectangles: Rectangle[]
): string[] => {
  if (rectangleIds.length === 0) return rectangleIds;

  // Get rectangle objects, excluding text labels
  const validRects = rectangleIds
    .map(id => rectangles.find(r => r.id === id))
    .filter((rect): rect is Rectangle => 
      rect !== undefined && rect.isTextLabel !== true
    );

  if (validRects.length <= 1) {
    return validRects.map(r => r.id);
  }

  // Group rectangles by parentId
  const groupsByParent = new Map<string | undefined, Rectangle[]>();
  
  validRects.forEach(rect => {
    const parentKey = rect.parentId;
    if (!groupsByParent.has(parentKey)) {
      groupsByParent.set(parentKey, []);
    }
    groupsByParent.get(parentKey)!.push(rect);
  });

  // Find the largest group (most rectangles with same parent)
  let largestGroup: Rectangle[] = [];
  for (const group of groupsByParent.values()) {
    if (group.length > largestGroup.length) {
      largestGroup = group;
    }
  }

  return largestGroup.map(rect => rect.id);
};

/**
 * Checks if bulk movement operations are allowed for the given selection.
 * Bulk movement requires that the parent container has manual positioning enabled.
 * 
 * @param selectedIds - Array of selected rectangle IDs
 * @param rectangles - Complete array of all rectangles in the diagram
 * @returns true if bulk movement is allowed, false otherwise
 */
export const canBulkMove = (selectedIds: string[], rectangles: Rectangle[]): boolean => {
  if (selectedIds.length === 0) return false;

  // Prerequisite: selection must meet all multi-select constraints
  if (!validateSelection(selectedIds, rectangles)) return false;

  // Parent lookup: determine container that controls positioning permissions
  const parentId = getSelectionParent(selectedIds, rectangles);
  
  // If parentId is null, these are root rectangles - they can always be moved
  if (parentId === null) return true;
  
  // If parentId is undefined, selection is invalid
  if (parentId === undefined) return false;

  // Find the parent rectangle and check if manual positioning is enabled
  const parentRect = rectangles.find(r => r.id === parentId);
  if (!parentRect) return false;

  // Bulk movement is allowed when manual positioning is enabled
  return parentRect.isManualPositioningEnabled === true;
};

/**
 * Gets the minimum number of rectangles required for a specific bulk operation.
 * Used for validating whether operations can be performed.
 * 
 * @param operation - The bulk operation type
 * @returns Minimum number of rectangles required
 */
export const getMinimumSelectionSize = (operation: 'align' | 'distribute' | 'bulkEdit' | 'bulkMove' | 'bulkDelete'): number => {
  switch (operation) {
    case 'align':
      return 2; // Need at least 2 rectangles to align
    case 'distribute':
      return 3; // Need at least 3 rectangles to distribute with spacing
    case 'bulkEdit':
    case 'bulkMove':
    case 'bulkDelete':
      return 2; // Need at least 2 rectangles for bulk operations
    default:
      return 1;
  }
};

/**
 * Checks if alignment operations are allowed for the given selection.
 * Alignment operations can be performed on any valid multi-selection of same-level siblings,
 * regardless of parent's manual positioning setting.
 * 
 * @param selectedIds - Array of selected rectangle IDs
 * @param rectangles - Complete array of all rectangles in the diagram
 * @returns true if alignment operations are allowed, false otherwise
 */
export const canPerformAlignment = (selectedIds: string[], rectangles: Rectangle[]): boolean => {
  if (selectedIds.length < 2) return false;

  // Prerequisite: selection must meet all multi-select constraints
  return validateSelection(selectedIds, rectangles);
};

/**
 * Checks if distribution operations are allowed for the given selection.
 * Distribution operations can be performed on any valid multi-selection of same-level siblings,
 * regardless of parent's manual positioning setting.
 * 
 * @param selectedIds - Array of selected rectangle IDs
 * @param rectangles - Complete array of all rectangles in the diagram
 * @returns true if distribution operations are allowed, false otherwise
 */
export const canPerformDistribution = (selectedIds: string[], rectangles: Rectangle[]): boolean => {
  if (selectedIds.length < 3) return false;

  // Prerequisite: selection must meet all multi-select constraints
  return validateSelection(selectedIds, rectangles);
};

/**
 * Validates if a specific bulk operation can be performed on the current selection.
 * 
 * @param operation - The bulk operation to validate
 * @param selectedIds - Array of selected rectangle IDs
 * @param rectangles - Complete array of all rectangles in the diagram
 * @returns Object containing validation result and error message if invalid
 */
export const validateBulkOperation = (
  operation: 'align' | 'distribute' | 'bulkEdit' | 'bulkMove' | 'bulkDelete',
  selectedIds: string[],
  rectangles: Rectangle[]
): { isValid: boolean; errorMessage?: string } => {
  // Size validation: ensure sufficient rectangles for operation type
  const minSize = getMinimumSelectionSize(operation);
  if (selectedIds.length < minSize) {
    return {
      isValid: false,
      errorMessage: `${operation} requires at least ${minSize} rectangles selected`
    };
  }

  // Multi-select constraint validation: same-parent and text-label rules
  if (!validateSelection(selectedIds, rectangles)) {
    return {
      isValid: false,
      errorMessage: 'Selection contains rectangles that cannot be operated on together'
    };
  }

  // Movement-specific validation: check parent positioning permissions
  if (operation === 'bulkMove' && !canBulkMove(selectedIds, rectangles)) {
    return {
      isValid: false,
      errorMessage: 'Bulk movement is not allowed when parent has automatic layout enabled'
    };
  }

  return { isValid: true };
};