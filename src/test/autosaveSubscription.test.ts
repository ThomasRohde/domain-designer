import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DragState, Rectangle, ResizeState } from '../types';
import { cleanupAutoSaveSubscription, initializeAutoSaveSubscription, useAppStore } from '../stores/useAppStore';

const createRectangle = (id: string): Rectangle => ({
  id,
  x: 0,
  y: 0,
  w: 10,
  h: 5,
  label: id,
  color: '#111111',
  type: 'root',
});

describe('auto-save subscription', () => {
  const originalAutoSaveActions = useAppStore.getState().autoSaveActions;

  beforeEach(() => {
    cleanupAutoSaveSubscription();
    useAppStore.setState(state => ({
      rectangles: [],
      canvas: {
        ...state.canvas,
        dragState: null,
        resizeState: null,
        hierarchyDragState: null,
        virtualDragState: {
          positions: new Map(),
          isActive: false,
          primaryDraggedId: null,
        },
      },
      autoSaveActions: {
        ...originalAutoSaveActions,
        saveData: vi.fn(),
      },
    }));
  });

  afterEach(() => {
    cleanupAutoSaveSubscription();
    useAppStore.setState({
      autoSaveActions: originalAutoSaveActions,
    });
  });

  it('defers autosave during active drag and flushes once when idle', () => {
    initializeAutoSaveSubscription();
    const saveData = useAppStore.getState().autoSaveActions.saveData;
    const dragState: DragState = {
      id: 'a',
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0,
    };

    useAppStore.setState(state => ({
      rectangles: [createRectangle('a')],
      canvas: {
        ...state.canvas,
        dragState,
      },
    }));
    useAppStore.setState({
      rectangles: [createRectangle('a'), createRectangle('b')],
    });

    expect(saveData).not.toHaveBeenCalled();

    useAppStore.setState(state => ({
      canvas: {
        ...state.canvas,
        dragState: null,
      },
    }));

    expect(saveData).toHaveBeenCalledTimes(1);
  });

  it('defers autosave during active resize and flushes once when idle', () => {
    initializeAutoSaveSubscription();
    const saveData = useAppStore.getState().autoSaveActions.saveData;
    const resizeState: ResizeState = {
      id: 'a',
      startX: 0,
      startY: 0,
      initialW: 10,
      initialH: 5,
    };

    useAppStore.setState(state => ({
      rectangles: [createRectangle('a')],
      canvas: {
        ...state.canvas,
        resizeState,
      },
    }));
    useAppStore.setState({
      rectangles: [{ ...createRectangle('a'), w: 12 }],
    });

    expect(saveData).not.toHaveBeenCalled();

    useAppStore.setState(state => ({
      canvas: {
        ...state.canvas,
        resizeState: null,
      },
    }));

    expect(saveData).toHaveBeenCalledTimes(1);
  });
});
