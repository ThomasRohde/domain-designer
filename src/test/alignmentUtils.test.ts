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
    test('should align rectangles to left edge of first (anchor) rectangle', () => {
      const rectangles = [
        createTestRectangle('1', 50, 10, 100, 50),  // Anchor rectangle
        createTestRectangle('2', 20, 30, 80, 40),   
        createTestRectangle('3', 80, 50, 60, 30)
      ];

      const result = alignLeft(rectangles, mockSettings);

      // First rectangle should remain unchanged (anchor)
      expect(result[0].x).toBe(50);
      // Other rectangles should align to first rectangle's left edge (50)
      expect(result[1].x).toBe(50);
      expect(result[2].x).toBe(50);

      // Y positions and dimensions should remain unchanged
      expect(result[0].y).toBe(10);
      expect(result[1].y).toBe(30);
      expect(result[2].y).toBe(50);
      expect(result[0].w).toBe(100);
      expect(result[1].w).toBe(80);
      expect(result[2].w).toBe(60);
    });

    test('should align to exact anchor position (no grid snapping)', () => {
      const rectangles = [
        createTestRectangle('1', 23, 10, 100, 50),  // Anchor: x=23
        createTestRectangle('2', 47, 30, 80, 40)    // Should align to exact anchor position
      ];

      const result = alignLeft(rectangles, mockSettings);

      // Should align to exact anchor position (no grid snapping)
      expect(result[0].x).toBe(23); // Anchor stays at original position
      expect(result[1].x).toBe(23); // Aligns to exact anchor position
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
    test('should align rectangles to horizontal center of first (anchor) rectangle', () => {
      const rectangles = [
        createTestRectangle('1', 0, 10, 100, 50),    // Anchor: Center at 50
        createTestRectangle('2', 100, 30, 80, 40),   // Should align to anchor center
        createTestRectangle('3', 200, 50, 60, 30)    // Should align to anchor center
      ];

      const result = alignCenter(rectangles, mockSettings);

      // First rectangle should remain unchanged (anchor)
      expect(result[0].x).toBe(0);
      // Other rectangles should center on anchor's center (50)
      expect(result[1].x).toBe(50 - 40);  // 10 (center at 50)
      expect(result[2].x).toBe(50 - 30);  // 20 (center at 50)

      // Y positions should remain unchanged
      expect(result[0].y).toBe(10);
      expect(result[1].y).toBe(30);
      expect(result[2].y).toBe(50);
    });

    test('should align to exact anchor center position', () => {
      const rectangles = [
        createTestRectangle('1', 7, 10, 100, 50),     // Anchor: Center at 57
        createTestRectangle('2', 107, 30, 80, 40)     // Should align to exact anchor center
      ];

      const result = alignCenter(rectangles, mockSettings);

      // First rectangle should remain unchanged (anchor)
      expect(result[0].x).toBe(7);
      // Second rectangle should center on exact anchor center (57)
      expect(result[1].x).toBe(57 - 40);  // 17 (center at 57)
    });
  });

  describe('alignRight', () => {
    test('should align rectangles to right edge of first (anchor) rectangle', () => {
      const rectangles = [
        createTestRectangle('1', 50, 10, 100, 50),   // Anchor: Right edge at 150
        createTestRectangle('2', 20, 30, 80, 40),    // Should align to anchor right
        createTestRectangle('3', 80, 50, 120, 30)    // Should align to anchor right
      ];

      const result = alignRight(rectangles, mockSettings);

      // First rectangle should remain unchanged (anchor)
      expect(result[0].x).toBe(50);
      // Other rectangles should align their right edge to anchor's right edge (150)
      expect(result[1].x).toBe(150 - 80);   // 70
      expect(result[2].x).toBe(150 - 120);  // 30

      // Y positions should remain unchanged
      expect(result[0].y).toBe(10);
      expect(result[1].y).toBe(30);
      expect(result[2].y).toBe(50);
    });
  });

  describe('alignTop', () => {
    test('should align rectangles to top edge of first (anchor) rectangle', () => {
      const rectangles = [
        createTestRectangle('1', 50, 30, 100, 50),  // Anchor
        createTestRectangle('2', 20, 10, 80, 40),   
        createTestRectangle('3', 80, 50, 60, 30)
      ];

      const result = alignTop(rectangles, mockSettings);

      // First rectangle should remain unchanged (anchor)
      expect(result[0].y).toBe(30);
      // Other rectangles should align to anchor's top edge (30)
      expect(result[1].y).toBe(30);
      expect(result[2].y).toBe(30);

      // X positions and dimensions should remain unchanged
      expect(result[0].x).toBe(50);
      expect(result[1].x).toBe(20);
      expect(result[2].x).toBe(80);
    });
  });

  describe('alignMiddle', () => {
    test('should align rectangles to vertical center of first (anchor) rectangle', () => {
      const rectangles = [
        createTestRectangle('1', 50, 0, 100, 100),   // Anchor: Center at 50
        createTestRectangle('2', 20, 100, 80, 80),   // Should align to anchor center
        createTestRectangle('3', 80, 200, 60, 60)    // Should align to anchor center
      ];

      const result = alignMiddle(rectangles, mockSettings);

      // First rectangle should remain unchanged (anchor)
      expect(result[0].y).toBe(0);
      // Other rectangles should center on anchor's center (50)
      expect(result[1].y).toBe(50 - 40);  // 10 (center at 50)
      expect(result[2].y).toBe(50 - 30);  // 20 (center at 50)

      // X positions should remain unchanged
      expect(result[0].x).toBe(50);
      expect(result[1].x).toBe(20);
      expect(result[2].x).toBe(80);
    });
  });

  describe('alignBottom', () => {
    test('should align rectangles to bottom edge of first (anchor) rectangle', () => {
      const rectangles = [
        createTestRectangle('1', 50, 10, 100, 50),   // Anchor: Bottom edge at 60
        createTestRectangle('2', 20, 30, 80, 40),    // Should align to anchor bottom
        createTestRectangle('3', 80, 40, 60, 80)     // Should align to anchor bottom
      ];

      const result = alignBottom(rectangles, mockSettings);

      // First rectangle should remain unchanged (anchor)
      expect(result[0].y).toBe(10);
      // Other rectangles should align their bottom edge to anchor's bottom (60)
      expect(result[1].y).toBe(60 - 40);  // 20
      expect(result[2].y).toBe(60 - 80);  // -20

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
      expect(leftResult[0].x).toBe(50); // Anchor should remain unchanged
      expect(leftResult[1].x).toBe(50); // Should align to anchor left

      const rightResult = alignRectangles(testRectangles, 'right', mockSettings);
      expect(rightResult[0].x).toBe(50); // Anchor should remain unchanged
      expect(rightResult[1].x).toBe(150 - 80); // Should align to anchor right (150-80=70)

      const topResult = alignRectangles(testRectangles, 'top', mockSettings);
      expect(topResult[0].y).toBe(10); // Anchor should remain unchanged
      expect(topResult[1].y).toBe(10); // Should align to anchor top

      const bottomResult = alignRectangles(testRectangles, 'bottom', mockSettings);
      expect(bottomResult[0].y).toBe(10); // Anchor should remain unchanged
      expect(bottomResult[1].y).toBe(60 - 40); // Should align to anchor bottom (60-40=20)
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
    test('should align to exact anchor position (no grid snapping)', () => {
      const rectangles = [
        createTestRectangle('1', 23, 17, 100, 50),   // Anchor (off-grid position)
        createTestRectangle('2', 47, 83, 80, 40)     // Aligns to exact anchor position
      ];

      // Test left alignment - should align to exact anchor position
      const leftResult = alignLeft(rectangles, mockSettings);
      expect(leftResult[0].x).toBe(23); // Anchor stays unchanged
      expect(leftResult[1].x).toBe(23); // Aligns to exact anchor position

      // Test top alignment - should align to exact anchor position
      const topResult = alignTop(rectangles, mockSettings);
      expect(topResult[0].y).toBe(17); // Anchor stays unchanged
      expect(topResult[1].y).toBe(17); // Aligns to exact anchor position
    });

    test('should align to exact anchor position regardless of grid size', () => {
      const customSettings = { ...mockSettings, gridSize: 25 };
      const rectangles = [
        createTestRectangle('1', 30, 20, 100, 50),   // Anchor (stays at 30)
        createTestRectangle('2', 80, 70, 80, 40)     // Aligns to exact anchor
      ];

      const result = alignLeft(rectangles, customSettings);
      
      // Both rectangles should be at exact anchor position
      expect(result[0].x).toBe(30); // Anchor unchanged
      expect(result[1].x).toBe(30); // Aligned to exact anchor position
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
        createTestRectangle('1', -50, -10, 100, 50),  // Anchor
        createTestRectangle('2', -100, -20, 80, 40)   // Should align to anchor
      ];

      const result = alignLeft(rectangles, mockSettings);
      expect(result[0].x).toBe(-50); // Anchor should remain unchanged
      expect(result[1].x).toBe(-50); // Should align to anchor
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
      const alignedRect = result[1]; // Test the second rectangle (aligns to first)

      // Position should change (second rectangle aligns to first)
      expect(alignedRect.x).toBe(50); // Should align to anchor position
      expect(alignedRect.y).toBe(30); // Y unchanged for left align

      // All other properties should be preserved
      expect(alignedRect.w).toBe(80);
      expect(alignedRect.h).toBe(40);
      expect(alignedRect.label).toBe('Rectangle 2');
      expect(alignedRect.color).toBe('#3B82F6');
      expect(alignedRect.type).toBe('leaf');
    });
  });
});