import { describe, test, expect } from 'vitest';
import { Rectangle, GlobalSettings } from '../types';
import { AlignmentType } from '../stores/types';
import {
  alignLeft,
  alignCenter,
  alignRight,
  alignTop,
  alignMiddle,
  alignBottom,
  alignRectangles,
  canAlign,
  getAlignmentDescription
} from '../utils/alignmentUtils';

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

describe('Alignment Utils', () => {
  describe('alignLeft', () => {
    test('should align multiple rectangles to leftmost edge', () => {
      const rectangles = [
        createTestRectangle('1', 50, 10, 100, 50),
        createTestRectangle('2', 20, 30, 80, 40),   // Leftmost
        createTestRectangle('3', 80, 50, 60, 30)
      ];

      const result = alignLeft(rectangles, mockSettings);

      // All rectangles should have x = 20 (leftmost position, snapped to grid)
      expect(result[0].x).toBe(20);
      expect(result[1].x).toBe(20);
      expect(result[2].x).toBe(20);

      // Y positions and dimensions should remain unchanged
      expect(result[0].y).toBe(10);
      expect(result[1].y).toBe(30);
      expect(result[2].y).toBe(50);
      expect(result[0].w).toBe(100);
      expect(result[1].w).toBe(80);
      expect(result[2].w).toBe(60);
    });

    test('should snap to grid when aligning left', () => {
      const rectangles = [
        createTestRectangle('1', 23, 10, 100, 50),  // x=23, should snap to 20
        createTestRectangle('2', 47, 30, 80, 40)    // x=47, should snap to 50, but 23 is leftmost
      ];

      const result = alignLeft(rectangles, mockSettings);

      // Should align to snapped version of leftmost (23 -> 20)
      expect(result[0].x).toBe(20);
      expect(result[1].x).toBe(20);
    });

    test('should handle single rectangle by returning unchanged', () => {
      const rectangles = [createTestRectangle('1', 50, 10, 100, 50)];
      const result = alignLeft(rectangles, mockSettings);

      expect(result).toEqual(rectangles);
    });

    test('should handle empty array', () => {
      const result = alignLeft([], mockSettings);
      expect(result).toEqual([]);
    });
  });

  describe('alignCenter', () => {
    test('should align rectangles to horizontal center of selection', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Center: 50
        createTestRectangle('2', 100, 30, 80, 40),   // Center: 140
        createTestRectangle('3', 200, 50, 60, 30)    // Center: 230
      ];
      // Selection bounds: left=0, right=260, centerX=130

      const result = alignCenter(rectangles, mockSettings);

      // All rectangles should be centered at x=130
      expect(result[0].x).toBe(130 - 50);  // 80
      expect(result[1].x).toBe(130 - 40);  // 90
      expect(result[2].x).toBe(130 - 30);  // 100

      // Y positions should remain unchanged
      expect(result[0].y).toBe(10);
      expect(result[1].y).toBe(30);
      expect(result[2].y).toBe(50);
    });

    test('should snap center position to grid', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Center: 50
        createTestRectangle('2', 107, 30, 80, 40)    // Center: 147
      ];
      // Selection bounds: left=0, right=187, centerX=93.5 -> should snap to 90

      const result = alignCenter(rectangles, mockSettings);

      // Rectangles should be centered at snapped position (90)
      expect(result[0].x).toBe(90 - 50);  // 40
      expect(result[1].x).toBe(90 - 40);  // 50
    });
  });

  describe('alignRight', () => {
    test('should align rectangles to rightmost edge of selection', () => {
      const rectangles = [
        createTestRectangle('1', 50, 10, 100, 50),   // Right edge: 150
        createTestRectangle('2', 20, 30, 80, 40),    // Right edge: 100
        createTestRectangle('3', 80, 50, 120, 30)    // Right edge: 200 (rightmost)
      ];

      const result = alignRight(rectangles, mockSettings);

      // All rectangles should have their right edge at 200
      expect(result[0].x).toBe(200 - 100);  // 100
      expect(result[1].x).toBe(200 - 80);   // 120
      expect(result[2].x).toBe(200 - 120);  // 80

      // Y positions should remain unchanged
      expect(result[0].y).toBe(10);
      expect(result[1].y).toBe(30);
      expect(result[2].y).toBe(50);
    });
  });

  describe('alignTop', () => {
    test('should align rectangles to topmost edge of selection', () => {
      const rectangles = [
        createTestRectangle('1', 50, 30, 100, 50),
        createTestRectangle('2', 20, 10, 80, 40),    // Topmost
        createTestRectangle('3', 80, 50, 60, 30)
      ];

      const result = alignTop(rectangles, mockSettings);

      // All rectangles should have y = 10 (topmost position)
      expect(result[0].y).toBe(10);
      expect(result[1].y).toBe(10);
      expect(result[2].y).toBe(10);

      // X positions and dimensions should remain unchanged
      expect(result[0].x).toBe(50);
      expect(result[1].x).toBe(20);
      expect(result[2].x).toBe(80);
    });
  });

  describe('alignMiddle', () => {
    test('should align rectangles to vertical center of selection', () => {
      const rectangles = [
        createTestRectangle('1', 50, 0, 100, 100),   // Center: 50
        createTestRectangle('2', 20, 100, 80, 80),   // Center: 140
        createTestRectangle('3', 80, 200, 60, 60)    // Center: 230
      ];
      // Selection bounds: top=0, bottom=260, centerY=130

      const result = alignMiddle(rectangles, mockSettings);

      // All rectangles should be centered at y=130
      expect(result[0].y).toBe(130 - 50);  // 80
      expect(result[1].y).toBe(130 - 40);  // 90
      expect(result[2].y).toBe(130 - 30);  // 100

      // X positions should remain unchanged
      expect(result[0].x).toBe(50);
      expect(result[1].x).toBe(20);
      expect(result[2].x).toBe(80);
    });
  });

  describe('alignBottom', () => {
    test('should align rectangles to bottommost edge of selection', () => {
      const rectangles = [
        createTestRectangle('1', 50, 10, 100, 50),   // Bottom edge: 60
        createTestRectangle('2', 20, 30, 80, 40),    // Bottom edge: 70
        createTestRectangle('3', 80, 40, 60, 80)     // Bottom edge: 120 (bottommost)
      ];

      const result = alignBottom(rectangles, mockSettings);

      // All rectangles should have their bottom edge at 120
      expect(result[0].y).toBe(120 - 50);  // 70
      expect(result[1].y).toBe(120 - 40);  // 80
      expect(result[2].y).toBe(120 - 80);  // 40

      // X positions should remain unchanged
      expect(result[0].x).toBe(50);
      expect(result[1].x).toBe(20);
      expect(result[2].x).toBe(80);
    });
  });

  describe('alignRectangles', () => {
    const testRectangles = [
      createTestRectangle('1', 50, 10, 100, 50),
      createTestRectangle('2', 20, 30, 80, 40)
    ];

    test('should dispatch to correct alignment function', () => {
      const leftResult = alignRectangles(testRectangles, 'left', mockSettings);
      expect(leftResult[0].x).toBe(20); // Should align left

      const rightResult = alignRectangles(testRectangles, 'right', mockSettings);
      expect(rightResult[0].x).toBe(50); // 100-50, should align right

      const topResult = alignRectangles(testRectangles, 'top', mockSettings);
      expect(topResult[0].y).toBe(10); // Should align top

      const bottomResult = alignRectangles(testRectangles, 'bottom', mockSettings);
      expect(bottomResult[0].y).toBe(20); // 70-50, should align bottom
    });

    test('should handle invalid alignment type', () => {
      const result = alignRectangles(testRectangles, 'invalid' as AlignmentType, mockSettings);
      expect(result).toEqual(testRectangles); // Should return unchanged
    });
  });

  describe('canAlign', () => {
    test('should return true for 2 or more rectangles', () => {
      expect(canAlign([
        createTestRectangle('1', 0, 0, 100, 50),
        createTestRectangle('2', 50, 0, 100, 50)
      ])).toBe(true);

      expect(canAlign([
        createTestRectangle('1', 0, 0, 100, 50),
        createTestRectangle('2', 50, 0, 100, 50),
        createTestRectangle('3', 100, 0, 100, 50)
      ])).toBe(true);
    });

    test('should return false for less than 2 rectangles', () => {
      expect(canAlign([])).toBe(false);
      expect(canAlign([createTestRectangle('1', 0, 0, 100, 50)])).toBe(false);
    });
  });

  describe('getAlignmentDescription', () => {
    test('should return correct descriptions for all alignment types', () => {
      expect(getAlignmentDescription('left', 3)).toBe('Align 3 rectangles Left');
      expect(getAlignmentDescription('center', 2)).toBe('Align 2 rectangles Center');
      expect(getAlignmentDescription('right', 1)).toBe('Align 1 rectangle Right');
      expect(getAlignmentDescription('top', 5)).toBe('Align 5 rectangles Top');
      expect(getAlignmentDescription('middle', 4)).toBe('Align 4 rectangles Middle');
      expect(getAlignmentDescription('bottom', 2)).toBe('Align 2 rectangles Bottom');
    });

    test('should handle singular vs plural correctly', () => {
      expect(getAlignmentDescription('left', 1)).toBe('Align 1 rectangle Left');
      expect(getAlignmentDescription('left', 2)).toBe('Align 2 rectangles Left');
    });
  });

  describe('Grid Snapping Integration', () => {
    test('should snap all alignment operations to grid', () => {
      const rectangles = [
        createTestRectangle('1', 23, 17, 100, 50),   // Off-grid positions
        createTestRectangle('2', 47, 83, 80, 40)
      ];

      // Test left alignment with grid snapping
      const leftResult = alignLeft(rectangles, mockSettings);
      expect(leftResult[0].x % mockSettings.gridSize).toBe(0);
      expect(leftResult[1].x % mockSettings.gridSize).toBe(0);

      // Test top alignment with grid snapping
      const topResult = alignTop(rectangles, mockSettings);
      expect(topResult[0].y % mockSettings.gridSize).toBe(0);
      expect(topResult[1].y % mockSettings.gridSize).toBe(0);
    });

    test('should work with different grid sizes', () => {
      const customSettings = { ...mockSettings, gridSize: 25 };
      const rectangles = [
        createTestRectangle('1', 30, 20, 100, 50),   // Should snap to 25, 25
        createTestRectangle('2', 80, 70, 80, 40)     // Should snap to 75, 75
      ];

      const result = alignLeft(rectangles, customSettings);
      
      // Should align to snapped version of leftmost (30 -> 25)
      expect(result[0].x).toBe(25);
      expect(result[1].x).toBe(25);
      expect(result[0].x % customSettings.gridSize).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rectangles with zero dimensions', () => {
      const rectangles = [
        createTestRectangle('1', 50, 10, 0, 0),
        createTestRectangle('2', 100, 20, 100, 50)
      ];

      expect(() => alignLeft(rectangles, mockSettings)).not.toThrow();
      expect(() => alignCenter(rectangles, mockSettings)).not.toThrow();
      expect(() => alignMiddle(rectangles, mockSettings)).not.toThrow();
    });

    test('should handle negative coordinates', () => {
      const rectangles = [
        createTestRectangle('1', -50, -10, 100, 50),
        createTestRectangle('2', -100, -20, 80, 40)
      ];

      const result = alignLeft(rectangles, mockSettings);
      expect(result[0].x).toBe(-100); // Should align to leftmost
      expect(result[1].x).toBe(-100);
    });

    test('should handle very large coordinates', () => {
      const rectangles = [
        createTestRectangle('1', 10000, 10000, 100, 50),
        createTestRectangle('2', 20000, 20000, 80, 40)
      ];

      expect(() => alignLeft(rectangles, mockSettings)).not.toThrow();
      const result = alignLeft(rectangles, mockSettings);
      expect(result[0].x).toBe(10000);
      expect(result[1].x).toBe(10000);
    });

    test('should preserve all rectangle properties except position', () => {
      const originalRect: Rectangle = {
        id: '1',
        x: 50,
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
        createTestRectangle('2', 20, 30, 80, 40)
      ];

      const result = alignLeft(rectangles, mockSettings);
      const alignedRect = result[0];

      // Position should change
      expect(alignedRect.x).toBe(20);
      expect(alignedRect.y).toBe(10); // Y unchanged for left align

      // All other properties should be preserved
      expect(alignedRect.w).toBe(100);
      expect(alignedRect.h).toBe(50);
      expect(alignedRect.label).toBe('Test Rectangle');
      expect(alignedRect.color).toBe('#FF0000');
      expect(alignedRect.type).toBe('parent');
      expect(alignedRect.parentId).toBe('parent1');
      expect(alignedRect.isEditing).toBe(true);
      expect(alignedRect.description).toBe('Test description');
      expect(alignedRect.metadata).toEqual({ tags: ['test'] });
    });
  });
});