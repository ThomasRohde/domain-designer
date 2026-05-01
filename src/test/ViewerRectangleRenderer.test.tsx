import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { Rectangle } from '../types';
import type { HeatmapState } from '../stores/types';
import { cleanupAutoSaveSubscription, useAppStore } from '../stores/useAppStore';
import ViewerRectangleRenderer from '../components/ViewerRectangleRenderer';

const rectangle: Rectangle = {
  id: 'rect-1',
  x: 0,
  y: 0,
  w: 10,
  h: 5,
  label: 'A',
  color: '#123456',
  type: 'root',
};

const renderViewer = (heatmapState?: HeatmapState | null) => render(
  <ViewerRectangleRenderer
    rectangles={[rectangle]}
    gridSize={20}
    labelMargin={2}
    rootFontSize={16}
    dynamicFontSizing={true}
    fontFamily="Inter, system-ui, sans-serif"
    borderRadius={8}
    borderColor="#d1d5db"
    borderWidth={1}
    heatmapState={heatmapState}
  />
);

describe('ViewerRectangleRenderer heatmap scoping', () => {
  it('ignores persisted store heatmap colors when diagram heatmap state is null', () => {
    cleanupAutoSaveSubscription();
    useAppStore.setState(state => ({
      heatmap: {
        ...state.heatmap,
        enabled: true,
        undefinedValueColor: '#abcdef',
      },
    }));

    const { container } = renderViewer(null);

    expect(container.querySelector('.group')).toHaveStyle({ backgroundColor: '#123456' });
  });
});
