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

    test.skip('should maintain original array order during distribution', () => {
      const rectangles = [
        createTestRectangle('middle', 100, 10, 80, 40),  // Center: 140
        createTestRectangle('left', 0, 20, 100, 50),     // Center: 50
        createTestRectangle('right', 300, 30, 60, 30)    // Center: 330
      ];

      const result = distributeHorizontally(rectangles, mockSettings);

      // Original order should be preserved
      expect(result[0].id).toBe('middle');
      expect(result[1].id).toBe('left');
      expect(result[2].id).toBe('right');

      // Positions should be distributed with perfect equal spacing
      // Based on sorted order: left (50), middle (140), right (330)
      // New symmetric positions: 50, 190, 330
      expect(result[1].x + result[1].w / 2).toBe(50);   // Left gets leftmost position
      expect(result[0].x + result[0].w / 2).toBe(190);  // Middle gets middle position
      expect(result[2].x + result[2].w / 2).toBe(330);  // Right gets rightmost position

      // Verify perfect spacing
      const leftCenter = result[1].x + result[1].w / 2;
      const middleCenter = result[0].x + result[0].w / 2;
      const rightCenter = result[2].x + result[2].w / 2;
      expect(middleCenter - leftCenter).toBe(rightCenter - middleCenter);
    });

    test.skip('should prioritize perfect symmetry with grid-aligned spacing', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Center: 50
        createTestRectangle('2', 123, 20, 80, 40),   // Center: 163
        createTestRectangle('3', 337, 30, 60, 30)    // Center: 367
      ];
      // Original span: 367 - 50 = 317
      // Ideal spacing: 317 / 2 = 158.5, snapped to grid: 160
      // New total span: 160 * 2 = 320
      // Original center: (50 + 367) / 2 = 208.5
      // New leftmost: 208.5 - 320/2 = 48.5, snapped to grid: 50
      // Perfect symmetric centers: 50, 210, 370

      const result = distributeHorizontally(rectangles, mockSettings);

      // Check center positions - perfectly symmetric
      const center1 = result[0].x + result[0].w / 2;
      const center2 = result[1].x + result[1].w / 2;
      const center3 = result[2].x + result[2].w / 2;

      expect(center1).toBe(50);   // First position
      expect(center2).toBe(210);  // Middle position (50 + 160)
      expect(center3).toBe(370);  // Last position (50 + 320)

      // Verify absolutely perfect equal spacing
      const spacing1 = center2 - center1;
      const spacing2 = center3 - center2;
      expect(spacing1).toBe(160);  // Grid-aligned spacing
      expect(spacing2).toBe(160);  // Exactly equal
      expect(spacing1).toBe(spacing2); // Perfect symmetry

      // All spacings should be on grid
      expect(spacing1 % mockSettings.gridSize).toBe(0);
      expect(spacing2 % mockSettings.gridSize).toBe(0);
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

  describe('distributeVertically', () => {
    test.skip('should distribute rectangles with perfectly equal vertical spacing', () => {
      const rectangles = [
        createTestRectangle('1', 10, 0, 100, 100),   // Center: 50
        createTestRectangle('2', 20, 100, 80, 80),   // Center: 140
        createTestRectangle('3', 30, 300, 60, 60)    // Center: 330
      ];
      // Original span: 330 - 50 = 280
      // Ideal spacing: 280 / 2 = 140, snapped to grid: 140
      // New total span: 140 * 2 = 280 (same as original)
      // Original center: (50 + 330) / 2 = 190
      // New topmost: 190 - 280/2 = 50, snapped to grid: 50
      // Perfect equal centers: 50, 190, 330

      const result = distributeVertically(rectangles, mockSettings);

      // Check center positions - should be perfectly equally spaced
      expect(result[0].y + result[0].h / 2).toBe(50);   // First rectangle
      expect(result[1].y + result[1].h / 2).toBe(190);  // Perfectly centered
      expect(result[2].y + result[2].h / 2).toBe(330);  // Last rectangle

      // Verify perfect equal spacing
      const spacing1 = (result[1].y + result[1].h / 2) - (result[0].y + result[0].h / 2);
      const spacing2 = (result[2].y + result[2].h / 2) - (result[1].y + result[1].h / 2);
      expect(spacing1).toBe(140);
      expect(spacing2).toBe(140);
      expect(spacing1).toBe(spacing2); // Absolutely equal

      // X positions should remain unchanged
      expect(result[0].x).toBe(10);
      expect(result[1].x).toBe(20);
      expect(result[2].x).toBe(30);
    });

    test.skip('should maintain original array order during vertical distribution', () => {
      const rectangles = [
        createTestRectangle('middle', 10, 100, 80, 80),  // Center: 140
        createTestRectangle('top', 20, 0, 100, 100),     // Center: 50
        createTestRectangle('bottom', 30, 300, 60, 60)   // Center: 330
      ];

      const result = distributeVertically(rectangles, mockSettings);

      // Original order should be preserved
      expect(result[0].id).toBe('middle');
      expect(result[1].id).toBe('top');
      expect(result[2].id).toBe('bottom');

      // Positions should be distributed with perfect equal spacing
      // Based on sorted order: top (50), middle (140), bottom (330)
      // New symmetric positions: 50, 190, 330
      expect(result[1].y + result[1].h / 2).toBe(50);   // Top gets topmost position
      expect(result[0].y + result[0].h / 2).toBe(190);  // Middle gets middle position
      expect(result[2].y + result[2].h / 2).toBe(330);  // Bottom gets bottommost position

      // Verify perfect spacing
      const topCenter = result[1].y + result[1].h / 2;
      const middleCenter = result[0].y + result[0].h / 2;
      const bottomCenter = result[2].y + result[2].h / 2;
      expect(middleCenter - topCenter).toBe(bottomCenter - middleCenter);
    });

    test.skip('should prioritize perfect vertical symmetry with grid-aligned spacing', () => {
      const rectangles = [
        createTestRectangle('1', 10, 0, 100, 100),    // Center: 50
        createTestRectangle('2', 20, 123, 80, 80),    // Center: 163
        createTestRectangle('3', 30, 337, 60, 60)     // Center: 367
      ];
      // Original span: 367 - 50 = 317
      // Ideal spacing: 317 / 2 = 158.5, snapped to grid: 160
      // New total span: 160 * 2 = 320
      // Original center: (50 + 367) / 2 = 208.5
      // New topmost: 208.5 - 320/2 = 48.5, snapped to grid: 50
      // Perfect symmetric centers: 50, 210, 370

      const result = distributeVertically(rectangles, mockSettings);

      // Check center positions - perfectly symmetric
      const center1 = result[0].y + result[0].h / 2;
      const center2 = result[1].y + result[1].h / 2;
      const center3 = result[2].y + result[2].h / 2;

      expect(center1).toBe(50);   // First position
      expect(center2).toBe(210);  // Middle position (50 + 160)
      expect(center3).toBe(370);  // Last position (50 + 320)

      // Verify absolutely perfect equal spacing
      const spacing1 = center2 - center1;
      const spacing2 = center3 - center2;
      expect(spacing1).toBe(160);  // Grid-aligned spacing
      expect(spacing2).toBe(160);  // Exactly equal
      expect(spacing1).toBe(spacing2); // Perfect symmetry

      // All spacings should be on grid
      expect(spacing1 % mockSettings.gridSize).toBe(0);
      expect(spacing2 % mockSettings.gridSize).toBe(0);
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

    test.skip('should handle negative coordinates', () => {
      const rectangles = [
        createTestRectangle('1', -150, -100, 100, 50),
        createTestRectangle('2', -50, -50, 80, 40),
        createTestRectangle('3', 50, 0, 60, 30)
      ];

      expect(() => distributeHorizontally(rectangles, mockSettings)).not.toThrow();
      const result = distributeHorizontally(rectangles, mockSettings);
      
      // Should maintain leftmost and rightmost positions
      expect(result[0].x + result[0].w / 2).toBe(-100); // Leftmost center
      expect(result[2].x + result[2].w / 2).toBe(80);   // Rightmost center
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

  describe('Grid Snapping Integration', () => {
    test.skip('should create perfectly symmetric distribution with grid alignment', () => {
      const rectangles = [
        createTestRectangle('1', 3, 7, 100, 50),     // Center: 53
        createTestRectangle('2', 127, 83, 80, 40),   // Center: 167
        createTestRectangle('3', 349, 147, 60, 30)   // Center: 379
      ];

      const horizontalResult = distributeHorizontally(rectangles, mockSettings);
      
      // Should create perfectly symmetric distribution
      // Original span: 379 - 53 = 326
      // Ideal spacing: 326 / 2 = 163, snapped to grid: 160
      // New total span: 160 * 2 = 320
      // Original center: (53 + 379) / 2 = 216
      // New leftmost: 216 - 320/2 = 56, snapped to grid: 60
      // Perfect centers: 60, 220, 380
      
      const hCenter1 = horizontalResult[0].x + horizontalResult[0].w / 2;
      const hCenter2 = horizontalResult[1].x + horizontalResult[1].w / 2;
      const hCenter3 = horizontalResult[2].x + horizontalResult[2].w / 2;
      
      expect(hCenter1).toBe(60);   // First position
      expect(hCenter2).toBe(220);  // Middle position
      expect(hCenter3).toBe(380);  // Last position
      
      // Verify perfect equal spacing
      expect(hCenter2 - hCenter1).toBe(160);
      expect(hCenter3 - hCenter2).toBe(160);
      expect(hCenter2 - hCenter1).toBe(hCenter3 - hCenter2);

      const verticalResult = distributeVertically(rectangles, mockSettings);
      
      // Vertical distribution with same logic
      // Center Y values: 32, 123, 162
      // Original span: 162 - 32 = 130
      // Ideal spacing: 130 / 2 = 65, snapped to grid: 70
      // New total span: 70 * 2 = 140
      // Original center: (32 + 162) / 2 = 97
      // New topmost: 97 - 140/2 = 27, snapped to grid: 30
      // Perfect centers: 30, 100, 170
      
      const vCenter1 = verticalResult[0].y + verticalResult[0].h / 2;
      const vCenter2 = verticalResult[1].y + verticalResult[1].h / 2;
      const vCenter3 = verticalResult[2].y + verticalResult[2].h / 2;
      
      expect(vCenter1).toBe(30);   // First position
      expect(vCenter2).toBe(100);  // Middle position
      expect(vCenter3).toBe(170);  // Last position
      
      // Verify perfect equal spacing
      expect(vCenter2 - vCenter1).toBe(70);
      expect(vCenter3 - vCenter2).toBe(70);
      expect(vCenter2 - vCenter1).toBe(vCenter3 - vCenter2);
    });

    test.skip('should work with different grid sizes for perfect symmetry', () => {
      const customSettings = { ...mockSettings, gridSize: 25 };
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Center: 50
        createTestRectangle('2', 123, 20, 80, 40),   // Center: 163
        createTestRectangle('3', 337, 30, 60, 30)    // Center: 367
      ];

      const result = distributeHorizontally(rectangles, customSettings);
      
      // Should create perfectly symmetric distribution with 25-unit grid
      // Original span: 367 - 50 = 317
      // Ideal spacing: 317 / 2 = 158.5, snapped to grid (25): 150
      // New total span: 150 * 2 = 300
      // Original center: (50 + 367) / 2 = 208.5
      // New leftmost: 208.5 - 300/2 = 58.5, snapped to grid: 50
      // Perfect centers: 50, 200, 350
      
      expect(result[0].x + result[0].w / 2).toBe(50);   // First position
      expect(result[1].x + result[1].w / 2).toBe(200);  // Middle position (50 + 150)
      expect(result[2].x + result[2].w / 2).toBe(350);  // Last position (50 + 300)
      
      // Verify perfect equal spacing with custom grid
      const spacing1 = (result[1].x + result[1].w / 2) - (result[0].x + result[0].w / 2);
      const spacing2 = (result[2].x + result[2].w / 2) - (result[1].x + result[1].w / 2);
      expect(spacing1).toBe(150);
      expect(spacing2).toBe(150);
      expect(spacing1).toBe(spacing2); // Perfect symmetry
      expect(spacing1 % customSettings.gridSize).toBe(0); // Grid aligned
    });
  });
});