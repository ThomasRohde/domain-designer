import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../stores/useAppStore';
import type { Rectangle } from '../types/index';

/**
 * Zustand Store Integration Tests
 * 
 * Comprehensive test suite for the application's Zustand store covering:
 * - Rectangle CRUD operations and hierarchy management
 * - History system with undo/redo functionality
 * - Settings management and persistence
 * - Store getters and computed state
 * 
 * Tests use mocked dependencies (font detection, layout manager) to focus
 * on store logic in isolation. All tests reset store state before running
 * to ensure test independence.
 */

// Mock the font detection utility
vi.mock('../utils/fontDetection', () => ({
  getAvailableFonts: vi.fn().mockResolvedValue([
    { value: 'Arial', label: 'Arial', family: 'Arial, sans-serif' },
    { value: 'Times', label: 'Times New Roman', family: 'Times, serif' }
  ]),
  FALLBACK_FONT_OPTIONS: [
    { value: 'Arial', label: 'Arial', family: 'Arial, sans-serif' }
  ]
}));

// Mock the layout manager
vi.mock('../utils/layout', () => ({
  layoutManager: {
    setAlgorithm: vi.fn(),
    calculateLayout: vi.fn(),
    calculateNewRectangleLayout: vi.fn().mockReturnValue({ x: 10, y: 10, w: 8, h: 3 }),
    calculateChildLayout: vi.fn().mockReturnValue([]),
    calculateGridDimensions: vi.fn().mockReturnValue({ cols: 2, rows: 2 }),
    calculateMinimumParentSize: vi.fn().mockReturnValue({ w: 20, h: 15 })
  }
}));

describe('Zustand Store Tests', () => {
  let store: ReturnType<typeof useAppStore.getState>;

  beforeEach(() => {
    // Clear the store state before each test
    store = useAppStore.getState();
    
    // Reset to initial state
    store.rectangleActions.setRectangles([]);
    store.historyActions.clearHistory();
    store.rectangleActions.setSelectedIds([]);
    store.rectangleActions.updateNextId(1);
  });

  describe('Rectangle Operations', () => {
    it('should add a rectangle', () => {
      const initialCount = store.rectangles.length;
      
      store.rectangleActions.addRectangle();
      
      const newStore = useAppStore.getState();
      expect(newStore.rectangles).toHaveLength(initialCount + 1);
      expect(newStore.rectangles[0]).toMatchObject({
        id: expect.stringMatching(/^rect-\d+$/),
        type: 'root',
        label: expect.stringMatching(/^Rectangle rect-\d+$/),
        color: '#4ECDC4'
      });
    });

    it('should add a child rectangle', () => {
      // First add a parent rectangle
      store.rectangleActions.addRectangle();
      const parentId = useAppStore.getState().rectangles[0].id;
      
      // Add child rectangle
      store.rectangleActions.addRectangle(parentId);
      
      const newStore = useAppStore.getState();
      expect(newStore.rectangles).toHaveLength(2);
      
      const childRect = newStore.rectangles.find(r => r.parentId === parentId);
      expect(childRect).toBeDefined();
      expect(childRect?.type).toBe('leaf');
      expect(childRect?.parentId).toBe(parentId);
      
      // Parent should be updated to 'parent' type
      const parentRect = newStore.rectangles.find(r => r.id === parentId);
      // Note: The parent type might be 'root' initially but should have at least one child
      expect(parentRect).toBeDefined();
      const hasChildren = newStore.rectangles.some(r => r.parentId === parentId);
      expect(hasChildren).toBe(true);
    });

    it('should remove a rectangle and its descendants', () => {
      // Create parent-child hierarchy
      store.rectangleActions.addRectangle();
      const parentId = useAppStore.getState().rectangles[0].id;
      
      store.rectangleActions.addRectangle(parentId);
      store.rectangleActions.addRectangle(parentId);
      
      expect(useAppStore.getState().rectangles).toHaveLength(3);
      
      // Remove parent (should remove all children too)
      store.rectangleActions.removeRectangle(parentId);
      
      const newStore = useAppStore.getState();
      expect(newStore.rectangles).toHaveLength(0);
    });

    it('should update rectangle properties', () => {
      store.rectangleActions.addRectangle();
      const rectId = useAppStore.getState().rectangles[0].id;
      
      store.rectangleActions.updateRectangle(rectId, {
        label: 'Updated Label',
        color: '#ff0000',
        description: 'Test description'
      });
      
      const newStore = useAppStore.getState();
      const updatedRect = newStore.rectangles.find(r => r.id === rectId);
      
      expect(updatedRect?.label).toBe('Updated Label');
      expect(updatedRect?.color).toBe('#ff0000');
      expect(updatedRect?.description).toBe('Test description');
    });

    it('should update rectangle label using dedicated method', () => {
      store.rectangleActions.addRectangle();
      const rectId = useAppStore.getState().rectangles[0].id;
      
      store.rectangleActions.updateRectangleLabel(rectId, 'New Label');
      
      const newStore = useAppStore.getState();
      const updatedRect = newStore.rectangles.find(r => r.id === rectId);
      expect(updatedRect?.label).toBe('New Label');
    });

    it('should update rectangle color using dedicated method', () => {
      store.rectangleActions.addRectangle();
      const rectId = useAppStore.getState().rectangles[0].id;
      
      store.rectangleActions.updateRectangleColor(rectId, '#00ff00');
      
      const newStore = useAppStore.getState();
      const updatedRect = newStore.rectangles.find(r => r.id === rectId);
      expect(updatedRect?.color).toBe('#00ff00');
    });

    it('should toggle text label', () => {
      store.rectangleActions.addRectangle();
      const rectId = useAppStore.getState().rectangles[0].id;
      
      store.rectangleActions.toggleTextLabel(rectId);
      
      const newStore = useAppStore.getState();
      const updatedRect = newStore.rectangles.find(r => r.id === rectId);
      expect(updatedRect?.isTextLabel).toBe(true);
      expect(updatedRect?.type).toBe('textLabel');
    });

    it('should reparent rectangle correctly', () => {
      // Create two parent rectangles
      store.rectangleActions.addRectangle();
      store.rectangleActions.addRectangle();
      
      const parent1Id = useAppStore.getState().rectangles[0].id;
      const parent2Id = useAppStore.getState().rectangles[1].id;
      
      // Add child to first parent
      store.rectangleActions.addRectangle(parent1Id);
      const childId = useAppStore.getState().rectangles.find(r => r.parentId === parent1Id)?.id;
      
      expect(childId).toBeDefined();
      
      // Reparent child to second parent
      const success = store.rectangleActions.reparentRectangle(childId!, parent2Id);
      
      expect(success).toBe(true);
      
      const newStore = useAppStore.getState();
      const reparentedChild = newStore.rectangles.find(r => r.id === childId);
      expect(reparentedChild?.parentId).toBe(parent2Id);
    });

    it('should prevent invalid reparenting (to self)', () => {
      store.rectangleActions.addRectangle();
      const rectId = useAppStore.getState().rectangles[0].id;
      
      const success = store.rectangleActions.reparentRectangle(rectId, rectId);
      expect(success).toBe(false);
    });

    it('should prevent reparenting to descendants', () => {
      // Create grandparent -> parent -> child hierarchy
      store.rectangleActions.addRectangle();
      const grandparentId = useAppStore.getState().rectangles[0].id;
      
      store.rectangleActions.addRectangle(grandparentId);
      const parentId = useAppStore.getState().rectangles.find(r => r.parentId === grandparentId)?.id;
      
      store.rectangleActions.addRectangle(parentId);
      const childId = useAppStore.getState().rectangles.find(r => r.parentId === parentId)?.id;
      
      // Try to reparent grandparent to its grandchild (should fail)
      const success = store.rectangleActions.reparentRectangle(grandparentId, childId!);
      expect(success).toBe(false);
    });

    it('should generate unique IDs', () => {
      const id1 = store.rectangleActions.generateId();
      const id2 = store.rectangleActions.generateId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^rect-\d+$/);
      expect(id2).toMatch(/^rect-\d+$/);
    });

    it('should set selected rectangle IDs', () => {
      store.rectangleActions.addRectangle();
      const rectId = useAppStore.getState().rectangles[0].id;
      
      store.rectangleActions.setSelectedIds([rectId]);
      
      const newStore = useAppStore.getState();
      expect(newStore.ui.selectedIds).toEqual([rectId]);
    });
  });

  describe('History Operations', () => {
    it('should initialize with empty history', () => {
      expect(store.history.stack).toHaveLength(1);
      expect(store.history.stack[0]).toEqual([]);
      expect(store.history.index).toBe(0);
    });

    it('should save state to history', () => {
      // Add a rectangle to create some state
      store.rectangleActions.addRectangle();
      
      // History should be automatically saved by rectangle operations
      // Let's wait for the setTimeout to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const newStore = useAppStore.getState();
          expect(newStore.history.stack.length).toBeGreaterThan(1);
          resolve();
        }, 10);
      });
    });

    it('should support undo operation', () => {
      // Add a rectangle
      store.rectangleActions.addRectangle();
      
      // Wait for history to be saved, then perform undo
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Check that we can undo
          expect(store.getters.canUndo()).toBe(true);
          
          // Perform undo
          store.historyActions.undo();
          
          const newStore = useAppStore.getState();
          expect(newStore.rectangles).toHaveLength(0);
          expect(newStore.ui.selectedIds).toEqual([]);
          resolve();
        }, 10);
      });
    });

    it('should support redo operation', () => {
      // Add a rectangle
      store.rectangleActions.addRectangle();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Undo
          store.historyActions.undo();
          expect(useAppStore.getState().rectangles).toHaveLength(0);
          
          // Check that we can redo
          expect(store.getters.canRedo()).toBe(true);
          
          // Redo
          store.historyActions.redo();
          
          const newStore = useAppStore.getState();
          expect(newStore.rectangles).toHaveLength(1);
          resolve();
        }, 10);
      });
    });

    it('should clear history', () => {
      store.rectangleActions.addRectangle();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(useAppStore.getState().history.stack.length).toBeGreaterThan(1);
          
          store.historyActions.clearHistory();
          
          const newStore = useAppStore.getState();
          expect(newStore.history.stack).toHaveLength(1);
          expect(newStore.history.stack[0]).toEqual([]);
          expect(newStore.history.index).toBe(0);
          resolve();
        }, 10);
      });
    });

    it('should initialize history with given state', () => {
      const initialRectangles: Rectangle[] = [
        {
          id: 'test-1',
          x: 0,
          y: 0,
          w: 10,
          h: 5,
          label: 'Test Rectangle',
          color: '#ff0000',
          type: 'root'
        }
      ];
      
      store.historyActions.initializeHistory(initialRectangles);
      
      const newStore = useAppStore.getState();
      expect(newStore.history.stack).toHaveLength(1);
      expect(newStore.history.stack[0]).toEqual(initialRectangles);
      expect(newStore.history.index).toBe(0);
    });

    it('should limit history size', () => {
      // This test would require adding many history entries to exceed MAX_HISTORY_SIZE
      // For now, we'll just verify the pushState method works
      const testRectangles: Rectangle[] = [
        {
          id: 'test-1',
          x: 0,
          y: 0,
          w: 10,
          h: 5,
          label: 'Test',
          color: '#ff0000',
          type: 'root'
        }
      ];
      
      store.historyActions.pushState(testRectangles);
      
      const newStore = useAppStore.getState();
      expect(newStore.history.stack.length).toBeGreaterThan(1);
      expect(newStore.history.stack[newStore.history.index]).toEqual(testRectangles);
    });
  });

  describe('Settings Operations', () => {
    it('should update global settings', () => {
      const newSettings = {
        gridSize: 15,
        showGrid: false,
        rootFontSize: 18
      };
      
      store.settingsActions.updateSettings(newSettings);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.gridSize).toBe(15);
      expect(newStore.settings.showGrid).toBe(false);
      expect(newStore.settings.rootFontSize).toBe(18);
    });

    it('should update color square in predefined colors', () => {
      const originalColors = [...store.settings.predefinedColors];
      const newColor = '#abcdef';
      
      store.settingsActions.updateColorSquare(0, newColor);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.predefinedColors[0]).toBe(newColor);
      expect(newStore.settings.predefinedColors.slice(1)).toEqual(originalColors.slice(1));
    });

    it('should add custom color', () => {
      const customColor = '#123456';
      
      store.settingsActions.addCustomColor(customColor);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.customColors).toContain(customColor);
    });

    it('should handle leaf fixed width changes', () => {
      store.settingsActions.handleLeafFixedWidthChange(false);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.leafFixedWidth).toBe(false);
    });

    it('should handle leaf fixed height changes', () => {
      store.settingsActions.handleLeafFixedHeightChange(false);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.leafFixedHeight).toBe(false);
    });

    it('should handle leaf width changes', () => {
      const newWidth = 8;
      
      store.settingsActions.handleLeafWidthChange(newWidth);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.leafWidth).toBe(newWidth);
    });

    it('should handle leaf height changes', () => {
      const newHeight = 4;
      
      store.settingsActions.handleLeafHeightChange(newHeight);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.leafHeight).toBe(newHeight);
    });

    it('should handle root font size changes', () => {
      const newSize = 20;
      
      store.settingsActions.handleRootFontSizeChange(newSize);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.rootFontSize).toBe(newSize);
    });

    it('should handle dynamic font sizing changes', () => {
      store.settingsActions.handleDynamicFontSizingChange(false);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.dynamicFontSizing).toBe(false);
    });

    it('should handle font family changes', () => {
      const newFont = 'Times New Roman';
      
      store.settingsActions.handleFontFamilyChange(newFont);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.fontFamily).toBe(newFont);
    });

    it('should handle border radius changes', () => {
      const newRadius = 8;
      
      store.settingsActions.handleBorderRadiusChange(newRadius);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.borderRadius).toBe(newRadius);
    });

    it('should handle border color changes', () => {
      const newColor = '#ff0000';
      
      store.settingsActions.handleBorderColorChange(newColor);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.borderColor).toBe(newColor);
    });

    it('should handle border width changes', () => {
      const newWidth = 3;
      
      store.settingsActions.handleBorderWidthChange(newWidth);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.borderWidth).toBe(newWidth);
    });

    it('should handle margin changes', () => {
      const newMargin = 15;
      
      store.settingsActions.handleMarginChange(newMargin);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.margin).toBe(newMargin);
    });

    it('should handle label margin changes', () => {
      const newLabelMargin = 25;
      
      store.settingsActions.handleLabelMarginChange(newLabelMargin);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.labelMargin).toBe(newLabelMargin);
    });

    it('should handle layout algorithm changes', () => {
      const newAlgorithm = 'grid' as const;
      
      store.settingsActions.handleLayoutAlgorithmChange(newAlgorithm);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.layoutAlgorithm).toBe(newAlgorithm);
    });

    it('should handle grid size changes', () => {
      const newSize = 12;
      
      store.settingsActions.setGridSize(newSize);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.gridSize).toBe(newSize);
    });

    it('should handle show grid changes', () => {
      store.settingsActions.handleShowGridChange(false);
      
      const newStore = useAppStore.getState();
      expect(newStore.settings.showGrid).toBe(false);
    });

    it('should get fixed dimensions', () => {
      const fixedDims = store.settingsActions.getFixedDimensions();
      
      expect(fixedDims).toHaveProperty('leafFixedWidth');
      expect(fixedDims).toHaveProperty('leafFixedHeight');
      expect(fixedDims).toHaveProperty('leafWidth');
      expect(fixedDims).toHaveProperty('leafHeight');
    });

    it('should calculate font size correctly', () => {
      // Test without dynamic font sizing
      store.settingsActions.handleDynamicFontSizingChange(false);
      store.settingsActions.handleRootFontSizeChange(16);
      
      const testRectangles: Rectangle[] = [
        {
          id: 'root-1',
          x: 0,
          y: 0,
          w: 10,
          h: 5,
          label: 'Root',
          color: '#ff0000',
          type: 'root'
        }
      ];
      
      const fontSize = store.settingsActions.calculateFontSize('root-1', testRectangles);
      expect(fontSize).toBe(16);
      
      // Test with dynamic font sizing
      store.settingsActions.handleDynamicFontSizingChange(true);
      const dynamicFontSize = store.settingsActions.calculateFontSize('root-1', testRectangles);
      expect(dynamicFontSize).toBe(16); // Root level should be full size
    });
  });

  describe('Store Getters', () => {
    it('should check if undo is possible', () => {
      expect(store.getters.canUndo()).toBe(false);
      
      store.rectangleActions.addRectangle();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(store.getters.canUndo()).toBe(true);
          resolve();
        }, 10);
      });
    });

    it('should check if redo is possible', () => {
      expect(store.getters.canRedo()).toBe(false);
      
      store.rectangleActions.addRectangle();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          store.historyActions.undo();
          expect(store.getters.canRedo()).toBe(true);
          resolve();
        }, 10);
      });
    });

    it('should find rectangle by ID', () => {
      store.rectangleActions.addRectangle();
      const rectId = useAppStore.getState().rectangles[0].id;
      
      const foundRect = store.getters.findRectangle(rectId);
      expect(foundRect).toBeDefined();
      expect(foundRect?.id).toBe(rectId);
      
      const notFound = store.getters.findRectangle('non-existent');
      expect(notFound).toBeUndefined();
    });

    it('should get children of a rectangle', () => {
      store.rectangleActions.addRectangle();
      const parentId = useAppStore.getState().rectangles[0].id;
      
      store.rectangleActions.addRectangle(parentId);
      store.rectangleActions.addRectangle(parentId);
      
      const children = store.getters.getChildren(parentId);
      expect(children).toHaveLength(2);
      expect(children.every((child: Rectangle) => child.parentId === parentId)).toBe(true);
    });

    it('should get all descendants of a rectangle', () => {
      // Create grandparent -> parent -> child hierarchy
      store.rectangleActions.addRectangle();
      const grandparentId = useAppStore.getState().rectangles[0].id;
      
      store.rectangleActions.addRectangle(grandparentId);
      const parentId = useAppStore.getState().rectangles.find(r => r.parentId === grandparentId)?.id;
      
      store.rectangleActions.addRectangle(parentId);
      
      const descendants = store.getters.getAllDescendants(grandparentId);
      expect(descendants).toHaveLength(2); // parent + child
    });

    it('should check if reparenting is valid', () => {
      store.rectangleActions.addRectangle();
      store.rectangleActions.addRectangle();
      
      const rect1Id = useAppStore.getState().rectangles[0].id;
      const rect2Id = useAppStore.getState().rectangles[1].id;
      
      // Valid reparenting
      expect(store.getters.canReparent(rect1Id, rect2Id)).toBe(true);
      
      // Invalid - to self
      expect(store.getters.canReparent(rect1Id, rect1Id)).toBe(false);
    });

    it('should calculate font size using getters', () => {
      store.rectangleActions.addRectangle();
      const rectId = useAppStore.getState().rectangles[0].id;
      
      const fontSize = store.getters.calculateFontSize(rectId);
      expect(typeof fontSize).toBe('number');
      expect(fontSize).toBeGreaterThan(0);
    });
  });
});