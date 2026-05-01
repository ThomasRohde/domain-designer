import { describe, expect, it } from 'vitest';
import type { DragState, Rectangle, ResizeState } from '../types';
import { getZIndex } from '../utils/layoutUtils';
import {
  buildRectangleRenderIndex,
  calculateIndexedFontSize,
  getIndexedChildren,
  getIndexedZIndex,
  getRectanglePath,
} from '../utils/rectangleIndexUtils';

const createRectangles = (): Rectangle[] => [
  {
    id: 'rect-1',
    x: 0,
    y: 0,
    w: 20,
    h: 10,
    label: 'Root',
    color: '#111111',
    type: 'root',
    isLockedAsIs: true,
  },
  {
    id: 'rect-2',
    parentId: 'rect-1',
    x: 1,
    y: 1,
    w: 8,
    h: 4,
    label: 'Child A',
    color: '#222222',
    type: 'parent',
  },
  {
    id: 'rect-10',
    parentId: 'rect-1',
    x: 10,
    y: 1,
    w: 8,
    h: 4,
    label: 'Child B',
    color: '#333333',
    type: 'leaf',
  },
  {
    id: 'rect-3',
    parentId: 'rect-2',
    x: 2,
    y: 2,
    w: 3,
    h: 2,
    label: 'Grandchild',
    color: '#444444',
    type: 'leaf',
  },
];

describe('rectangleIndexUtils', () => {
  it('builds lookup maps for children, child counts, depths, descendants, and locked ancestors', () => {
    const rectangles = createRectangles();
    const index = buildRectangleRenderIndex(rectangles);

    expect(index.rectById.get('rect-2')?.label).toBe('Child A');
    expect(getIndexedChildren(index, 'rect-1').map(rect => rect.id)).toEqual(['rect-2', 'rect-10']);
    expect(index.childCountById.get('rect-1')).toBe(2);
    expect(index.childCountById.get('rect-2')).toBe(1);
    expect(index.childCountById.get('rect-10')).toBe(0);
    expect(index.depthById.get('rect-1')).toBe(0);
    expect(index.depthById.get('rect-2')).toBe(1);
    expect(index.depthById.get('rect-3')).toBe(2);
    expect(index.descendantsById.get('rect-1')).toEqual(['rect-2', 'rect-3', 'rect-10']);
    expect(index.descendantsById.get('rect-2')).toEqual(['rect-3']);
    expect(index.hasLockedAncestorById.get('rect-2')).toBe(true);
    expect(index.hasLockedAncestorById.get('rect-3')).toBe(true);
    expect(index.hasLockedAncestorById.get('rect-1')).toBe(false);
  });

  it('sorts by depth first and numeric id second', () => {
    const index = buildRectangleRenderIndex(createRectangles());

    expect(index.sortedByDepth.map(rect => rect.id)).toEqual(['rect-3', 'rect-2', 'rect-10', 'rect-1']);
  });

  it('matches existing z-index behavior for selected, dragged, and resized rectangles', () => {
    const rectangles = createRectangles();
    const index = buildRectangleRenderIndex(rectangles);
    const selectedId = 'rect-10';
    const dragState: DragState = {
      id: 'rect-2',
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0,
    };
    const resizeState: ResizeState = {
      id: 'rect-10',
      startX: 0,
      startY: 0,
      initialW: 8,
      initialH: 4,
    };

    for (const rectangle of rectangles) {
      expect(getIndexedZIndex(rectangle, index, selectedId, null, null, null)).toBe(
        getZIndex(rectangle, rectangles, selectedId, null, null, null)
      );
      expect(getIndexedZIndex(rectangle, index, selectedId, dragState, null, null)).toBe(
        getZIndex(rectangle, rectangles, selectedId, dragState, null, null)
      );
      expect(getIndexedZIndex(rectangle, index, selectedId, null, resizeState, null)).toBe(
        getZIndex(rectangle, rectangles, selectedId, null, resizeState, null)
      );
    }
  });

  it('derives font scaling and breadcrumb paths from indexed depth', () => {
    const index = buildRectangleRenderIndex(createRectangles());

    expect(calculateIndexedFontSize('rect-3', index, 20, true)).toBeCloseTo(16.2);
    expect(calculateIndexedFontSize('rect-3', index, 20, false)).toBe(20);
    expect(getRectanglePath('rect-3', index).map(rect => rect.label)).toEqual([
      'Root',
      'Child A',
      'Grandchild',
    ]);
  });
});
