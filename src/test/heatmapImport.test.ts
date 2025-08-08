import { describe, it, expect } from 'vitest';
import { parseHeatmapCSV } from '../utils/heatmapImport';
import type { Rectangle } from '../types';

describe('parseHeatmapCSV', () => {
  const rectangles: Rectangle[] = [
    { id: 'rect-1', label: 'Alpha', description: '', x: 0, y: 0, w: 4, h: 2, color: '#fff', type: 'leaf' },
    { id: 'rect-2', label: 'Beta', description: '', x: 0, y: 0, w: 4, h: 2, color: '#fff', type: 'leaf' },
  ];

  it('skips comment lines and header, imports valid rows', () => {
    const csv = [
      'rectangleName,value',
      '# comment explaining the file',
      'Alpha,0.25',
      '# Another comment',
      'Beta,0.75',
      '',
    ].join('\n');

    const result = parseHeatmapCSV(csv, rectangles);

    expect(result.successful).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);

    const values = result.successful.map(e => ({ id: e.rectangleId, value: e.value })).sort((a,b) => a.id.localeCompare(b.id));
    expect(values).toEqual([
      { id: 'rect-1', value: 0.25 },
      { id: 'rect-2', value: 0.75 },
    ]);
  });

  it('reports invalid numbers and out-of-range values', () => {
    const csv = [
      'Name,Value',
      'Alpha,NaN',
      'Alpha,1.5',
      'Gamma,0.5',
    ].join('\n');

    const result = parseHeatmapCSV(csv, rectangles);

    expect(result.successful).toHaveLength(0);
    expect(result.failed.length >= 1).toBe(true);
    expect(result.unmatched).toEqual([{ label: 'Gamma', value: 0.5 }]);
  });
});
