import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Rectangle } from '../types';
import { cleanupAutoSaveSubscription, useAppStore } from '../stores/useAppStore';
import HierarchyOutlinePanel from '../components/HierarchyOutlinePanel';

const rectangles: Rectangle[] = [
  {
    id: 'root',
    x: 0,
    y: 0,
    w: 30,
    h: 20,
    label: 'Root',
    color: '#111111',
    type: 'root',
  },
  {
    id: 'alpha-one',
    parentId: 'root',
    x: 1,
    y: 2,
    w: 8,
    h: 4,
    label: 'Alpha One',
    color: '#222222',
    type: 'leaf',
  },
  {
    id: 'alpha-two',
    parentId: 'root',
    x: 12,
    y: 2,
    w: 8,
    h: 4,
    label: 'Alpha Two',
    color: '#333333',
    type: 'leaf',
  },
];

describe('HierarchyOutlinePanel search', () => {
  beforeEach(() => {
    cleanupAutoSaveSubscription();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    });
    useAppStore.setState(state => ({
      rectangles,
      ui: {
        ...state.ui,
        hierarchyOutlineOpen: true,
        selectedIds: [],
      },
      canvas: {
        ...state.canvas,
        panOffset: { x: 0, y: 0 },
      },
    }));
  });

  it('uses ArrowDown and Enter to select direct search matches while keeping desktop panel open', () => {
    render(<HierarchyOutlinePanel />);

    const searchInput = screen.getByPlaceholderText('Search rectangles...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(useAppStore.getState().ui.selectedIds).toEqual(['alpha-two']);
    expect(useAppStore.getState().ui.hierarchyOutlineOpen).toBe(true);
  });

  it('clears search on Escape before closing the panel', () => {
    render(<HierarchyOutlinePanel />);

    const searchInput = screen.getByPlaceholderText('Search rectangles...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(searchInput).toHaveValue('');
    expect(useAppStore.getState().ui.hierarchyOutlineOpen).toBe(true);

    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(useAppStore.getState().ui.hierarchyOutlineOpen).toBe(false);
  });
});
