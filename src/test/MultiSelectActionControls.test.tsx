import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Rectangle } from '../types';
import { cleanupAutoSaveSubscription, useAppStore } from '../stores/useAppStore';
import MultiSelectActionControls from '../components/MultiSelectActionControls';

const parent = (isManualPositioningEnabled = true): Rectangle => ({
  id: 'parent',
  x: 0,
  y: 0,
  w: 40,
  h: 20,
  label: 'Parent',
  color: '#111111',
  type: 'root',
  isManualPositioningEnabled,
});

const child = (id: string, x: number): Rectangle => ({
  id,
  parentId: 'parent',
  x,
  y: 2,
  w: 8,
  h: 4,
  label: id,
  color: '#222222',
  type: 'leaf',
});

describe('MultiSelectActionControls', () => {
  const originalRectangleActions = useAppStore.getState().rectangleActions;
  const originalClipboardActions = useAppStore.getState().clipboardActions;

  beforeEach(() => {
    cleanupAutoSaveSubscription();
    act(() => {
      useAppStore.setState({
        rectangles: [parent(), child('a', 1), child('b', 12), child('c', 23)],
        ui: {
          ...useAppStore.getState().ui,
          selectedIds: ['a', 'b'],
        },
        rectangleActions: {
          ...originalRectangleActions,
          alignRectangles: vi.fn(),
          distributeRectangles: vi.fn(),
          makeSameSize: vi.fn(),
          bulkDelete: vi.fn(),
        },
        clipboardActions: {
          ...originalClipboardActions,
          copyRectangles: vi.fn(),
          duplicateRectangles: vi.fn(),
        },
      });
    });
  });

  afterEach(() => {
    act(() => {
      useAppStore.setState({
        rectangleActions: originalRectangleActions,
        clipboardActions: originalClipboardActions,
      });
    });
  });

  it('runs enabled alignment actions for a valid manual-positioned selection', () => {
    render(<MultiSelectActionControls variant="panel" />);

    fireEvent.click(screen.getByLabelText('Align left'));

    expect(useAppStore.getState().rectangleActions.alignRectangles).toHaveBeenCalledWith(['a', 'b'], 'left');
  });

  it('disables alignment when the parent is not manually positioned', () => {
    act(() => {
      useAppStore.setState({
        rectangles: [parent(false), child('a', 1), child('b', 12)],
      });
    });

    render(<MultiSelectActionControls variant="panel" />);

    const alignLeft = screen.getByLabelText('Align left');
    expect(alignLeft).toBeDisabled();
    expect(alignLeft).toHaveAttribute('title', 'Enable manual positioning on parent to align selected rectangles.');
  });

  it('requires at least three selected rectangles for distribution', () => {
    render(<MultiSelectActionControls variant="panel" />);

    const distributeHorizontal = screen.getByLabelText('Distribute horizontal');
    expect(distributeHorizontal).toBeDisabled();
    expect(distributeHorizontal).toHaveAttribute('title', 'Select at least 3 rectangles to distribute.');
  });

  it('runs same-size for a valid two-item selection', () => {
    render(<MultiSelectActionControls variant="panel" />);

    fireEvent.click(screen.getByLabelText('Same size'));

    expect(useAppStore.getState().rectangleActions.makeSameSize).toHaveBeenCalledWith(['a', 'b']);
  });
});
