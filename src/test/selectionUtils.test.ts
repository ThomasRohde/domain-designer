import { describe, it, expect } from 'vitest';
import type { Rectangle } from '../types';
import {
  validateSelection,
  canAddToSelection,
  getSelectionParent,
  areAllSameLevelSiblings,
  filterValidSelection,
  canBulkMove,
  getMinimumSelectionSize,
  validateBulkOperation
} from '../utils/selectionUtils';

/**
 * Test data setup for selection validation tests
 * Creates a realistic hierarchy structure for comprehensive testing
 */
const createTestRectangles = (): Rectangle[] => [
  // Root rectangles (manual positioning enabled)
  {
    id: 'root1',
    x: 0, y: 0, w: 100, h: 50,
    label: 'Root 1',
    color: '#ff0000',
    type: 'root',
    isManualPositioningEnabled: true
  },
  {
    id: 'root2', 
    x: 120, y: 0, w: 100, h: 50,
    label: 'Root 2',
    color: '#00ff00',
    type: 'root'
  },
  // Children of root1 (parent has manual positioning enabled)
  {
    id: 'child1_1',
    parentId: 'root1',
    x: 10, y: 10, w: 30, h: 20,
    label: 'Child 1.1',
    color: '#ff8888',
    type: 'leaf'
  },
  {
    id: 'child1_2',
    parentId: 'root1', 
    x: 50, y: 10, w: 30, h: 20,
    label: 'Child 1.2',
    color: '#ff8888',
    type: 'leaf'
  },
  // Children of root2 (automatic layout - no manual positioning)
  {
    id: 'child2_1',
    parentId: 'root2',
    x: 130, y: 10, w: 30, h: 20,
    label: 'Child 2.1', 
    color: '#88ff88',
    type: 'leaf'
  },
  {
    id: 'child2_2',
    parentId: 'root2',
    x: 170, y: 10, w: 30, h: 20,
    label: 'Child 2.2',
    color: '#88ff88', 
    type: 'leaf'
  },
  // Text label (should be excluded from multi-select)
  {
    id: 'text1',
    parentId: 'root1',
    x: 15, y: 35, w: 20, h: 10,
    label: 'Text Label',
    color: '#000000',
    type: 'textLabel',
    isTextLabel: true
  },
  // Parent with children (has manual positioning enabled)
  {
    id: 'parent1',
    parentId: 'root1',
    x: 10, y: 60, w: 80, h: 40,
    label: 'Parent Container',
    color: '#ffff00',
    type: 'parent',
    isManualPositioningEnabled: true
  },
  // Grandchildren of root1 via parent1
  {
    id: 'grandchild1_1',
    parentId: 'parent1',
    x: 15, y: 70, w: 20, h: 15,
    label: 'Grandchild 1.1',
    color: '#ffff88',
    type: 'leaf'
  },
  {
    id: 'grandchild1_2',
    parentId: 'parent1',
    x: 40, y: 70, w: 20, h: 15,
    label: 'Grandchild 1.2',
    color: '#ffff88',
    type: 'leaf'
  }
];

describe('Selection Validation Utils', () => {
  const testRectangles = createTestRectangles();

  describe('validateSelection', () => {
    it('should allow empty selections', () => {
      expect(validateSelection([], testRectangles)).toBe(true);
    });

    it('should allow single selections', () => {
      expect(validateSelection(['root1'], testRectangles)).toBe(true);
      expect(validateSelection(['child1_1'], testRectangles)).toBe(true);
    });

    it('should allow multi-select of same-parent siblings', () => {
      // Root level siblings
      expect(validateSelection(['root1', 'root2'], testRectangles)).toBe(true);
      
      // Children of same parent
      expect(validateSelection(['child1_1', 'child1_2'], testRectangles)).toBe(true);
      expect(validateSelection(['child2_1', 'child2_2'], testRectangles)).toBe(true);
      expect(validateSelection(['grandchild1_1', 'grandchild1_2'], testRectangles)).toBe(true);
    });

    it('should reject multi-select of different-parent rectangles', () => {
      // Children of different parents
      expect(validateSelection(['child1_1', 'child2_1'], testRectangles)).toBe(false);
      
      // Root and child
      expect(validateSelection(['root1', 'child1_1'], testRectangles)).toBe(false);
      
      // Children at different hierarchy levels
      expect(validateSelection(['child1_1', 'grandchild1_1'], testRectangles)).toBe(false);
    });

    it('should reject selections containing text labels', () => {
      expect(validateSelection(['text1'], testRectangles)).toBe(true); // Single text label OK
      expect(validateSelection(['text1', 'child1_1'], testRectangles)).toBe(false);
      expect(validateSelection(['child1_1', 'text1', 'child1_2'], testRectangles)).toBe(false);
    });

    it('should reject selections with non-existent rectangles', () => {
      expect(validateSelection(['nonexistent'], testRectangles)).toBe(false);
      expect(validateSelection(['root1', 'nonexistent'], testRectangles)).toBe(false);
    });
  });

  describe('canAddToSelection', () => {
    it('should allow adding to empty selection', () => {
      expect(canAddToSelection('root1', [], testRectangles)).toBe(true);
      expect(canAddToSelection('child1_1', [], testRectangles)).toBe(true);
    });

    it('should allow adding same-parent siblings', () => {
      expect(canAddToSelection('root2', ['root1'], testRectangles)).toBe(true);
      expect(canAddToSelection('child1_2', ['child1_1'], testRectangles)).toBe(true);
    });

    it('should reject adding different-parent rectangles', () => {
      expect(canAddToSelection('child2_1', ['child1_1'], testRectangles)).toBe(false);
      expect(canAddToSelection('root1', ['child1_1'], testRectangles)).toBe(false);
    });

    it('should reject adding text labels to multi-selection', () => {
      expect(canAddToSelection('text1', ['child1_1'], testRectangles)).toBe(false);
    });

    it('should reject adding non-existent rectangles', () => {
      expect(canAddToSelection('nonexistent', ['root1'], testRectangles)).toBe(false);
    });
  });

  describe('getSelectionParent', () => {
    it('should return undefined for empty selection', () => {
      expect(getSelectionParent([], testRectangles)).toBe(undefined);
    });

    it('should return null for root rectangles', () => {
      expect(getSelectionParent(['root1'], testRectangles)).toBe(null);
      expect(getSelectionParent(['root1', 'root2'], testRectangles)).toBe(null);
    });

    it('should return parent ID for child rectangles', () => {
      expect(getSelectionParent(['child1_1'], testRectangles)).toBe('root1');
      expect(getSelectionParent(['child1_1', 'child1_2'], testRectangles)).toBe('root1');
      expect(getSelectionParent(['grandchild1_1', 'grandchild1_2'], testRectangles)).toBe('parent1');
    });

    it('should return undefined for invalid selections', () => {
      expect(getSelectionParent(['child1_1', 'child2_1'], testRectangles)).toBe(undefined);
      expect(getSelectionParent(['nonexistent'], testRectangles)).toBe(undefined);
    });
  });

  describe('areAllSameLevelSiblings', () => {
    it('should return true for empty or single selections', () => {
      expect(areAllSameLevelSiblings([], testRectangles)).toBe(true);
      expect(areAllSameLevelSiblings(['root1'], testRectangles)).toBe(true);
    });

    it('should return true for same-parent siblings', () => {
      expect(areAllSameLevelSiblings(['root1', 'root2'], testRectangles)).toBe(true);
      expect(areAllSameLevelSiblings(['child1_1', 'child1_2'], testRectangles)).toBe(true);
    });

    it('should return false for different-parent rectangles', () => {
      expect(areAllSameLevelSiblings(['child1_1', 'child2_1'], testRectangles)).toBe(false);
      expect(areAllSameLevelSiblings(['root1', 'child1_1'], testRectangles)).toBe(false);
    });

    it('should return false for non-existent rectangles', () => {
      expect(areAllSameLevelSiblings(['nonexistent'], testRectangles)).toBe(false);
      expect(areAllSameLevelSiblings(['root1', 'nonexistent'], testRectangles)).toBe(false);
    });
  });

  describe('filterValidSelection', () => {
    it('should preserve single selections', () => {
      expect(filterValidSelection(['root1'], testRectangles)).toEqual(['root1']);
      expect(filterValidSelection(['child1_1'], testRectangles)).toEqual(['child1_1']);
    });

    it('should preserve valid multi-selections', () => {
      const result = filterValidSelection(['root1', 'root2'], testRectangles);
      expect(result).toContain('root1');
      expect(result).toContain('root2');
      expect(result).toHaveLength(2);
    });

    it('should filter out text labels', () => {
      const result = filterValidSelection(['child1_1', 'text1', 'child1_2'], testRectangles);
      expect(result).toContain('child1_1');
      expect(result).toContain('child1_2');
      expect(result).not.toContain('text1');
      expect(result).toHaveLength(2);
    });

    it('should return largest same-parent group from mixed selection', () => {
      // Mix children from different parents - should return the larger group
      const result = filterValidSelection(['child1_1', 'child1_2', 'child2_1'], testRectangles);
      expect(result).toHaveLength(2);
      expect(result).toContain('child1_1');
      expect(result).toContain('child1_2');
    });

    it('should handle non-existent rectangles', () => {
      const result = filterValidSelection(['root1', 'nonexistent', 'root2'], testRectangles);
      expect(result).toContain('root1');
      expect(result).toContain('root2');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no valid rectangles', () => {
      expect(filterValidSelection(['nonexistent'], testRectangles)).toEqual([]);
      expect(filterValidSelection(['text1'], testRectangles)).toEqual([]);
    });
  });

  describe('canBulkMove', () => {
    it('should return false for empty selection', () => {
      expect(canBulkMove([], testRectangles)).toBe(false);
    });

    it('should return true for root rectangles (no parent constraints)', () => {
      expect(canBulkMove(['root1', 'root2'], testRectangles)).toBe(true);
    });

    it('should return true when parent has manual positioning enabled', () => {
      // child1_1 has manual positioning enabled
      expect(canBulkMove(['child1_1', 'child1_2'], testRectangles)).toBe(true);
      expect(canBulkMove(['grandchild1_1', 'grandchild1_2'], testRectangles)).toBe(true);
    });

    it('should return false when parent has automatic layout', () => {
      // child2_1 and child2_2 parent (root2) doesn't have manual positioning enabled
      expect(canBulkMove(['child2_1', 'child2_2'], testRectangles)).toBe(false);
    });

    it('should return false for invalid selections', () => {
      expect(canBulkMove(['child1_1', 'child2_1'], testRectangles)).toBe(false);
      expect(canBulkMove(['nonexistent'], testRectangles)).toBe(false);
    });
  });

  describe('getMinimumSelectionSize', () => {
    it('should return correct minimum sizes for each operation', () => {
      expect(getMinimumSelectionSize('align')).toBe(2);
      expect(getMinimumSelectionSize('distribute')).toBe(3);
      expect(getMinimumSelectionSize('bulkEdit')).toBe(2);
      expect(getMinimumSelectionSize('bulkMove')).toBe(2);
      expect(getMinimumSelectionSize('bulkDelete')).toBe(2);
    });
  });

  describe('validateBulkOperation', () => {
    it('should validate alignment operations', () => {
      // Valid alignment - 2+ same-parent rectangles
      expect(validateBulkOperation('align', ['root1', 'root2'], testRectangles)).toEqual({
        isValid: true
      });

      // Invalid - too few rectangles
      expect(validateBulkOperation('align', ['root1'], testRectangles)).toEqual({
        isValid: false,
        errorMessage: 'align requires at least 2 rectangles selected'
      });

      // Invalid - different parents
      expect(validateBulkOperation('align', ['child1_1', 'child2_1'], testRectangles)).toEqual({
        isValid: false,
        errorMessage: 'Selection contains rectangles that cannot be operated on together'
      });
    });

    it('should validate distribution operations', () => {
      // Valid distribution - 3+ same-parent rectangles
      const validSelection = ['child1_1', 'child1_2', 'parent1']; // All children of root1
      expect(validateBulkOperation('distribute', validSelection, testRectangles)).toEqual({
        isValid: true
      });

      // Invalid - too few rectangles
      expect(validateBulkOperation('distribute', ['root1', 'root2'], testRectangles)).toEqual({
        isValid: false,
        errorMessage: 'distribute requires at least 3 rectangles selected'
      });
    });

    it('should validate bulk move operations', () => {
      // Valid bulk move - manual positioning enabled
      expect(validateBulkOperation('bulkMove', ['child1_1', 'child1_2'], testRectangles)).toEqual({
        isValid: true
      });

      // Invalid - automatic layout parent
      expect(validateBulkOperation('bulkMove', ['child2_1', 'child2_2'], testRectangles)).toEqual({
        isValid: false,
        errorMessage: 'Bulk movement is not allowed when parent has automatic layout enabled'
      });
    });

    it('should validate bulk edit operations', () => {
      // Valid bulk edit
      expect(validateBulkOperation('bulkEdit', ['root1', 'root2'], testRectangles)).toEqual({
        isValid: true
      });

      // Invalid - too few rectangles
      expect(validateBulkOperation('bulkEdit', ['root1'], testRectangles)).toEqual({
        isValid: false,
        errorMessage: 'bulkEdit requires at least 2 rectangles selected'
      });
    });

    it('should validate bulk delete operations', () => {
      // Valid bulk delete
      expect(validateBulkOperation('bulkDelete', ['child1_1', 'child1_2'], testRectangles)).toEqual({
        isValid: true
      });

      // Invalid - too few rectangles  
      expect(validateBulkOperation('bulkDelete', ['child1_1'], testRectangles)).toEqual({
        isValid: false,
        errorMessage: 'bulkDelete requires at least 2 rectangles selected'
      });
    });
  });
});