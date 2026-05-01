import { describe, expect, it } from 'vitest';
import type { Rectangle } from '../types';
import { calculateFitView, calculateRectanglesBounds } from '../utils/viewportUtils';

const rectangles: Rectangle[] = [
  {
    id: 'a',
    x: 0,
    y: 0,
    w: 10,
    h: 5,
    label: 'A',
    color: '#111111',
    type: 'root',
  },
  {
    id: 'b',
    x: 20,
    y: 10,
    w: 10,
    h: 10,
    label: 'B',
    color: '#222222',
    type: 'root',
  },
];

describe('viewportUtils', () => {
  it('calculates bounds across all rectangles', () => {
    expect(calculateRectanglesBounds(rectangles)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 30,
      maxY: 20,
      width: 30,
      height: 20,
    });
  });

  it('fits all rectangles with padding', () => {
    const fit = calculateFitView(rectangles, {
      containerWidth: 850,
      containerHeight: 600,
      gridSize: 10,
      paddingPx: 50,
      minZoom: 0.1,
      maxZoom: 3,
    });

    expect(fit?.zoomLevel).toBe(2.5);
    expect(fit?.panOffset).toEqual({
      x: 50,
      y: 50,
    });
  });

  it('fits a selected subset independently from the full model', () => {
    const fit = calculateFitView([rectangles[1]], {
      containerWidth: 800,
      containerHeight: 600,
      gridSize: 10,
      paddingPx: 50,
      minZoom: 0.1,
      maxZoom: 3,
    });

    expect(fit?.bounds).toMatchObject({
      minX: 20,
      minY: 10,
      width: 10,
      height: 10,
    });
    expect(fit?.zoomLevel).toBe(3);
  });

  it('returns null for an empty rectangle set', () => {
    expect(calculateFitView([], {
      containerWidth: 800,
      containerHeight: 600,
      gridSize: 10,
    })).toBeNull();
  });

  it('clamps to min and max zoom levels', () => {
    const minClamped = calculateFitView(rectangles, {
      containerWidth: 100,
      containerHeight: 80,
      gridSize: 100,
      paddingPx: 10,
      minZoom: 0.2,
      maxZoom: 3,
    });
    const maxClamped = calculateFitView([rectangles[0]], {
      containerWidth: 2000,
      containerHeight: 1200,
      gridSize: 10,
      paddingPx: 10,
      minZoom: 0.1,
      maxZoom: 2,
    });

    expect(minClamped?.zoomLevel).toBe(0.2);
    expect(maxClamped?.zoomLevel).toBe(2);
  });
});
