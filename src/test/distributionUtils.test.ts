import { describe, test, expect } from 'vitest';
import { Rectangle, GlobalSettings } from '../types';
import { DistributionDirection } from '../stores/types';
import {
  distributeHorizontally,
  distributeVertically,
  distributeRectangles,
  canDistribute,
  getDistributionDescription,
  calculateCurrentSpacing,
  areEvenlyDistributed
} from '../utils/distributionUtils';

// Test fixtures
const mockSettings: GlobalSettings = {
  gridSize: 10,
  showGrid: false,
  leafFixedWidth: false,
  leafFixedHeight: false,
  leafWidth: 100,
  leafHeight: 60,
  rootFontSize: 16,
  dynamicFontSizing: true,
  fontFamily: 'Inter',
  borderRadius: 4,
  borderColor: '#000000',
  borderWidth: 1,
  predefinedColors: ['#3B82F6', '#EF4444', '#10B981'],
  margin: 10,
  labelMargin: 20,
  layoutAlgorithm: 'mixed-flow'
};

const createTestRectangle = (
  id: string, 
  x: number, 
  y: number, 
  w: number, 
  h: number
): Rectangle => ({
  id,
  x,
  y,
  w,
  h,
  label: `Rectangle ${id}`,
  color: '#3B82F6',
  type: 'leaf'
});

describe('Distribution Utils', () => {
  describe('distributeHorizontally', () => {
    test('should distribute equal gaps between rectangles', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Right edge: 100
        createTestRectangle('2', 120, 20, 80, 40),   // Needs to be repositioned
        createTestRectangle('3', 200, 30, 60, 30)    // Left edge: 200 (boundary)
      ];
      // Boundary rectangles: first (0-100) and last (200-260)
      // Available space between boundaries: 200 - 100 = 100
      // Middle rectangle width: 80
      // Total white space: 100 - 80 = 20
      // Equal gaps: 20 / 2 = 10 per gap
      // Middle rectangle should be at: 100 + 10 = 110

      const result = distributeHorizontally(rectangles, mockSettings);

      // First and last rectangles should remain unchanged (boundary preservation)
      expect(result[0].x).toBe(0);
      expect(result[2].x).toBe(200);
      
      // Middle rectangle should be repositioned for equal gaps
      expect(result[1].x).toBe(110); // 100 + 10 gap
      
      // Check equal gap spacing
      const gap1 = result[1].x - (result[0].x + result[0].w); // 110 - 100 = 10
      const gap2 = result[2].x - (result[1].x + result[1].w); // 200 - 190 = 10
      expect(gap1).toBe(gap2);
      expect(gap1).toBe(10);

      // Y positions should remain unchanged
      expect(result[0].y).toBe(10);
      expect(result[1].y).toBe(20);
      expect(result[2].y).toBe(30);
    });

    test('should create equal gaps with multiple intermediate rectangles', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Boundary: 0-100
        createTestRectangle('2', 120, 20, 60, 40),   // Should be repositioned
        createTestRectangle('3', 200, 30, 80, 30)    // Boundary: 200-280
      ];
      // Boundary rectangles: first (0-100) and last (200-280)
      // Available space: 200 - 100 = 100
      // Middle rectangle width: 60
      // White space: 100 - 60 = 40
      // Equal gaps: 40 / 2 = 20 per gap
      // Middle rectangle position: 100 + 20 = 120
      
      const result = distributeHorizontally(rectangles, mockSettings);

      // Boundary rectangles unchanged
      expect(result[0].x).toBe(0);
      expect(result[2].x).toBe(200);
      
      // Middle rectangle positioned for equal gaps
      expect(result[1].x).toBe(120);
      
      // Verify equal gaps
      const gap1 = result[1].x - (result[0].x + result[0].w); // 120 - 100 = 20
      const gap2 = result[2].x - (result[1].x + result[1].w); // 200 - 180 = 20
      expect(gap1).toBe(gap2);
      expect(gap1).toBe(20);
    });

    test('should handle less than 3 rectangles by returning unchanged', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),
        createTestRectangle('2', 100, 20, 80, 40)
      ];

      const result = distributeHorizontally(rectangles, mockSettings);
      expect(result).toEqual(rectangles);
    });

    test('should handle single rectangle', () => {
      const rectangles = [createTestRectangle('1', 0, 10, 100, 50)];
      const result = distributeHorizontally(rectangles, mockSettings);
      expect(result).toEqual(rectangles);
    });

    test('should handle empty array', () => {
      const result = distributeHorizontally([], mockSettings);
      expect(result).toEqual([]);
    });
  });

  describe('distributeRectangles', () => {
    const testRectangles = [
      createTestRectangle('1', 0, 0, 100, 100),
      createTestRectangle('2', 100, 100, 80, 80),
      createTestRectangle('3', 300, 300, 60, 60)
    ];

    test('should dispatch to correct distribution function', () => {
      const horizontalResult = distributeRectangles(testRectangles, 'horizontal', mockSettings);
      // Check if horizontal distribution was applied by verifying equal gaps
      const gap1 = horizontalResult[1].x - (horizontalResult[0].x + horizontalResult[0].w);
      const gap2 = horizontalResult[2].x - (horizontalResult[1].x + horizontalResult[1].w);
      expect(Math.abs(gap1 - gap2)).toBeLessThan(1); // Should have equal gaps

      const verticalResult = distributeRectangles(testRectangles, 'vertical', mockSettings);
      // Check if vertical distribution was applied by verifying equal gaps
      const vGap1 = verticalResult[1].y - (verticalResult[0].y + verticalResult[0].h);
      const vGap2 = verticalResult[2].y - (verticalResult[1].y + verticalResult[1].h);
      expect(Math.abs(vGap1 - vGap2)).toBeLessThan(1); // Should have equal gaps
    });

    test('should handle invalid distribution direction', () => {
      const result = distributeRectangles(testRectangles, 'invalid' as DistributionDirection, mockSettings);
      expect(result).toEqual(testRectangles); // Should return unchanged
    });
  });

  describe('canDistribute', () => {
    test('should return true for 3 or more rectangles', () => {
      expect(canDistribute([
        createTestRectangle('1', 0, 0, 100, 50),
        createTestRectangle('2', 50, 0, 100, 50),
        createTestRectangle('3', 100, 0, 100, 50)
      ])).toBe(true);

      expect(canDistribute([
        createTestRectangle('1', 0, 0, 100, 50),
        createTestRectangle('2', 50, 0, 100, 50),
        createTestRectangle('3', 100, 0, 100, 50),
        createTestRectangle('4', 150, 0, 100, 50)
      ])).toBe(true);
    });

    test('should return false for less than 3 rectangles', () => {
      expect(canDistribute([])).toBe(false);
      expect(canDistribute([createTestRectangle('1', 0, 0, 100, 50)])).toBe(false);
      expect(canDistribute([
        createTestRectangle('1', 0, 0, 100, 50),
        createTestRectangle('2', 50, 0, 100, 50)
      ])).toBe(false);
    });
  });

  describe('getDistributionDescription', () => {
    test('should return correct descriptions for distribution directions', () => {
      expect(getDistributionDescription('horizontal', 3)).toBe('Distribute 3 rectangles Horizontally');
      expect(getDistributionDescription('vertical', 5)).toBe('Distribute 5 rectangles Vertically');
      expect(getDistributionDescription('horizontal', 1)).toBe('Distribute 1 rectangles Horizontally');
    });
  });

  describe('calculateCurrentSpacing', () => {
    test('should calculate horizontal spacing correctly', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Right edge: 100
        createTestRectangle('2', 150, 20, 80, 40),   // Left edge: 150, Right edge: 230
        createTestRectangle('3', 270, 30, 60, 30)    // Left edge: 270
      ];

      const spacings = calculateCurrentSpacing(rectangles, 'horizontal');
      
      expect(spacings).toHaveLength(2);
      expect(spacings[0]).toBe(50); // 150 - 100 (gap between rect1 and rect2)
      expect(spacings[1]).toBe(40); // 270 - 230 (gap between rect2 and rect3)
    });

    test('should calculate vertical spacing correctly', () => {
      const rectangles = [
        createTestRectangle('1', 10, 0, 100, 100),   // Bottom edge: 100
        createTestRectangle('2', 20, 150, 80, 80),   // Top edge: 150, Bottom edge: 230
        createTestRectangle('3', 30, 270, 60, 60)    // Top edge: 270
      ];

      const spacings = calculateCurrentSpacing(rectangles, 'vertical');
      
      expect(spacings).toHaveLength(2);
      expect(spacings[0]).toBe(50); // 150 - 100 (gap between rect1 and rect2)
      expect(spacings[1]).toBe(40); // 270 - 230 (gap between rect2 and rect3)
    });

    test('should return empty array for less than 2 rectangles', () => {
      expect(calculateCurrentSpacing([], 'horizontal')).toEqual([]);
      expect(calculateCurrentSpacing([createTestRectangle('1', 0, 0, 100, 50)], 'horizontal')).toEqual([]);
    });

    test('should sort rectangles by appropriate axis before calculating', () => {
      const rectangles = [
        createTestRectangle('middle', 150, 20, 80, 40),   // Left: 150, Right: 230
        createTestRectangle('left', 0, 10, 100, 50),      // Left: 0, Right: 100
        createTestRectangle('right', 270, 30, 60, 30)     // Left: 270, Right: 330
      ];

      const spacings = calculateCurrentSpacing(rectangles, 'horizontal');
      
      // Should calculate based on sorted order (left, middle, right)
      expect(spacings[0]).toBe(50); // 150 - 100 (gap between left and middle)
      expect(spacings[1]).toBe(40); // 270 - 230 (gap between middle and right)
    });
  });

  describe('areEvenlyDistributed', () => {
    test('should return true for evenly distributed rectangles', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Right edge: 100
        createTestRectangle('2', 120, 20, 80, 40),   // Left: 120, Right: 200
        createTestRectangle('3', 220, 30, 60, 30)    // Left: 220
      ];
      // Gaps: 20 (120-100), 20 (220-200) - evenly distributed

      expect(areEvenlyDistributed(rectangles, 'horizontal')).toBe(true);
    });

    test('should return false for unevenly distributed rectangles', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Right edge: 100
        createTestRectangle('2', 150, 20, 80, 40),   // Left: 150, Right: 230
        createTestRectangle('3', 270, 30, 60, 30)    // Left: 270
      ];
      // Gaps: 50 (150-100), 40 (270-230) - not evenly distributed

      expect(areEvenlyDistributed(rectangles, 'horizontal')).toBe(false);
    });

    test('should use tolerance for near-even distribution', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Right edge: 100
        createTestRectangle('2', 119, 20, 80, 40),   // Left: 119, Right: 199
        createTestRectangle('3', 220, 30, 60, 30)    // Left: 220
      ];
      // Gaps: 19 (119-100), 21 (220-199) - within tolerance of 2

      expect(areEvenlyDistributed(rectangles, 'horizontal', 2)).toBe(true);
      expect(areEvenlyDistributed(rectangles, 'horizontal', 1)).toBe(false);
    });

    test('should return true for less than 3 rectangles', () => {
      expect(areEvenlyDistributed([], 'horizontal')).toBe(true);
      expect(areEvenlyDistributed([createTestRectangle('1', 0, 0, 100, 50)], 'horizontal')).toBe(true);
      expect(areEvenlyDistributed([
        createTestRectangle('1', 0, 0, 100, 50),
        createTestRectangle('2', 50, 0, 100, 50)
      ], 'horizontal')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rectangles with zero dimensions', () => {
      const rectangles = [
        createTestRectangle('1', 50, 10, 0, 0),
        createTestRectangle('2', 100, 20, 0, 0),
        createTestRectangle('3', 150, 30, 0, 0)
      ];

      expect(() => distributeHorizontally(rectangles, mockSettings)).not.toThrow();
      expect(() => distributeVertically(rectangles, mockSettings)).not.toThrow();
    });


    test('should handle very large coordinates', () => {
      const rectangles = [
        createTestRectangle('1', 10000, 10000, 100, 50),
        createTestRectangle('2', 20000, 20000, 80, 40),
        createTestRectangle('3', 30000, 30000, 60, 30)
      ];

      expect(() => distributeHorizontally(rectangles, mockSettings)).not.toThrow();
      expect(() => distributeVertically(rectangles, mockSettings)).not.toThrow();
    });

    test('should preserve all rectangle properties except position', () => {
      const originalRect: Rectangle = {
        id: '1',
        x: 0,
        y: 10,
        w: 100,
        h: 50,
        label: 'Test Rectangle',
        color: '#FF0000',
        type: 'parent',
        parentId: 'parent1',
        isEditing: true,
        description: 'Test description',
        metadata: { tags: ['test'] }
      };

      const rectangles = [
        originalRect,
        createTestRectangle('2', 100, 20, 80, 40),
        createTestRectangle('3', 300, 30, 60, 30)
      ];

      const result = distributeHorizontally(rectangles, mockSettings);
      const distributedRect = result[0];

      // Position may change
      // All other properties should be preserved
      expect(distributedRect.w).toBe(100);
      expect(distributedRect.h).toBe(50);
      expect(distributedRect.label).toBe('Test Rectangle');
      expect(distributedRect.color).toBe('#FF0000');
      expect(distributedRect.type).toBe('parent');
      expect(distributedRect.parentId).toBe('parent1');
      expect(distributedRect.isEditing).toBe(true);
      expect(distributedRect.description).toBe('Test description');
      expect(distributedRect.metadata).toEqual({ tags: ['test'] });
    });

    test('should handle rectangles with same center positions', () => {
      const rectangles = [
        createTestRectangle('1', 40, 10, 120, 50),  // Center: 100
        createTestRectangle('2', 60, 20, 80, 40),   // Center: 100
        createTestRectangle('3', 270, 30, 60, 30)   // Center: 300
      ];

      expect(() => distributeHorizontally(rectangles, mockSettings)).not.toThrow();
      const result = distributeHorizontally(rectangles, mockSettings);
      
      // Should still create distribution even with overlapping centers
      expect(result).toHaveLength(3);
    });
  });

});