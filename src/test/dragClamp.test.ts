import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../stores/useAppStore';

describe('Virtual drag group clamping', () => {
  beforeEach(() => {
    const store = useAppStore.getState();
    // Reset relevant state
    store.rectangleActions.setRectangles([]);
    store.canvasActions.cancelVirtualDrag();
  });

  it('prevents negative X by clamping delta for the whole group', () => {
    const store = useAppStore.getState();

    // Parent at x=0,y=0 and child at x=5,y=3
    store.canvasActions.startVirtualDrag(
      'parent',
      ['parent', 'child'],
      {
        parent: { x: 0, y: 0 },
        child: { x: 5, y: 3 }
      }
    );

    // Try to move left by 10 (would go negative without clamping)
    store.canvasActions.updateVirtualDragPositions(-10, 0);

    const parentPos = store.canvasActions.getVirtualPosition('parent');
    const childPos = store.canvasActions.getVirtualPosition('child');
    expect(parentPos?.x).toBe(0);
    expect(childPos?.x).toBe(5);
  });

  it('prevents negative Y by clamping delta for the whole group', () => {
    const store = useAppStore.getState();

    // Parent at x=2,y=0 and child at x=6,y=4
    store.canvasActions.startVirtualDrag(
      'parent',
      ['parent', 'child'],
      {
        parent: { x: 2, y: 0 },
        child: { x: 6, y: 4 }
      }
    );

    // Try to move up by 10 (would go negative without clamping)
    store.canvasActions.updateVirtualDragPositions(0, -10);

    const parentPos = store.canvasActions.getVirtualPosition('parent');
    const childPos = store.canvasActions.getVirtualPosition('child');
    expect(parentPos?.y).toBe(0);
    expect(childPos?.y).toBe(4);
  });

  it('allows movement up to boundary while preserving relative offsets', () => {
    const store = useAppStore.getState();

    // Parent at x=2,y=1 and child at x=5,y=4
    store.canvasActions.startVirtualDrag(
      'parent',
      ['parent', 'child'],
      {
        parent: { x: 2, y: 1 },
        child: { x: 5, y: 4 }
      }
    );

    // Attempt to move left by 3 and up by 2: clamped to -2 in X and -1 in Y
    store.canvasActions.updateVirtualDragPositions(-3, -2);

    const parentPos = store.canvasActions.getVirtualPosition('parent');
    const childPos = store.canvasActions.getVirtualPosition('child');
    expect(parentPos).toEqual({ x: 0, y: 0, initialX: 2, initialY: 1 });
    expect(childPos).toEqual({ x: 3, y: 3, initialX: 5, initialY: 4 });
  });
});
