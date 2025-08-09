import type { SliceCreator, HeatmapState, HeatmapActions, HeatmapPalette } from '../types';
import { getColorFromPalette, precomputePaletteColors, clearColorCache } from '../../utils/heatmapColors';

/**
 * Heatmap slice interface combining state and actions for the Zustand store.
 * 
 * The heatmap system provides color overlay functionality for rectangles based on numeric values:
 * - Values are normalized to 0-1 range for consistent color mapping
 * - Multiple predefined and custom color palettes supported
 * - Performance optimized with color caching and precomputation
 * - Integrates seamlessly with existing rectangle rendering system
 */
export interface HeatmapSlice {
  heatmap: HeatmapState;
  heatmapActions: HeatmapActions;
}

/**
 * Predefined heatmap color palettes providing common visualization patterns.
 * 
 * Each palette defines color stops at specific values (0-1 range) to create
 * smooth gradients. The system interpolates between stops for intermediate values.
 * 
 * Available palettes:
 * - Temperature: Blue (cold) to red (hot) via yellow
 * - Viridis: Perceptually uniform scientific palette
 * - Traffic Light: Green (good) to red (bad) via yellow
 * - Grayscale: Simple white to black gradient
 */
const PREDEFINED_PALETTES: HeatmapPalette[] = [
  {
    id: 'temperature',
    name: 'Temperature',
    stops: [
      { value: 0, color: '#0066cc' },
      { value: 0.5, color: '#ffff00' },
      { value: 1, color: '#ff3300' }
    ],
    isCustom: false
  },
  {
    id: 'viridis',
    name: 'Viridis',
    stops: [
      { value: 0, color: '#440154' },
      { value: 0.25, color: '#31688e' },
      { value: 0.5, color: '#35b779' },
      { value: 0.75, color: '#fde725' },
      { value: 1, color: '#f0f921' }
    ],
    isCustom: false
  },
  {
    id: 'traffic-light',
    name: 'Traffic Light',
    stops: [
      { value: 0, color: '#00cc00' },
      { value: 0.5, color: '#ffcc00' },
      { value: 1, color: '#cc0000' }
    ],
    isCustom: false
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    stops: [
      { value: 0, color: '#ffffff' },
      { value: 1, color: '#000000' }
    ],
    isCustom: false
  }
];

/**
 * Creates the heatmap slice for the Zustand store.
 * 
 * Provides complete heatmap functionality including:
 * - State management for palettes, colors, and visibility settings
 * - Performance optimized color computation with caching
 * - Bulk operations for CSV import/export workflows
 * - Integration with rectangle update system and history management
 */
export const createHeatmapSlice: SliceCreator<HeatmapSlice> = (set, get) => ({
  // Initial state
  heatmap: {
    enabled: false,
    selectedPaletteId: 'temperature',
    palettes: PREDEFINED_PALETTES,
    undefinedValueColor: '#e5e7eb', // Light gray
    showLegend: false
  },

  // Actions
  heatmapActions: {
    setEnabled: (enabled: boolean) => {
      set(state => ({
        heatmap: {
          ...state.heatmap,
          enabled
        }
      }));

      // Warm up color cache when enabling heatmap to ensure smooth initial rendering
      if (enabled) {
        const { heatmap } = get();
        const palette = heatmap.palettes.find(p => p.id === heatmap.selectedPaletteId);
        if (palette) {
          precomputePaletteColors(palette, 64);
        }
      }
    },

    setSelectedPalette: (paletteId: string) => {
      set(state => ({
        heatmap: {
          ...state.heatmap,
          selectedPaletteId: paletteId
        }
      }));
      // Clear existing cache and precompute colors for the new palette to ensure smooth UI transitions
      const { heatmap } = get();
      const palette = heatmap.palettes.find(p => p.id === paletteId);
      if (palette) {
        clearColorCache();
        precomputePaletteColors(palette, 64);
      }
    },

    addCustomPalette: (palette: HeatmapPalette) => {
      set(state => ({
        heatmap: {
          ...state.heatmap,
          palettes: [...state.heatmap.palettes, { ...palette, isCustom: true }]
        }
      }));
    },

    removeCustomPalette: (paletteId: string) => {
      set(state => ({
        heatmap: {
          ...state.heatmap,
          palettes: state.heatmap.palettes.filter(p => p.id !== paletteId),
          // If removing the currently selected palette, automatically switch to temperature (default)
          selectedPaletteId: state.heatmap.selectedPaletteId === paletteId 
            ? 'temperature' 
            : state.heatmap.selectedPaletteId
        }
      }));
    },

    updateCustomPalette: (paletteId: string, updates: Partial<HeatmapPalette>) => {
      set(state => ({
        heatmap: {
          ...state.heatmap,
          palettes: state.heatmap.palettes.map(p => 
            p.id === paletteId ? { ...p, ...updates } : p
          )
        }
      }));
    },

    setUndefinedValueColor: (color: string) => {
      set(state => ({
        heatmap: {
          ...state.heatmap,
          undefinedValueColor: color
        }
      }));
    },

    setShowLegend: (show: boolean) => {
      set(state => ({
        heatmap: {
          ...state.heatmap,
          showLegend: show
        }
      }));
    },

    setRectangleHeatmapValue: (rectangleId: string, value: number | undefined) => {
      const { rectangleActions } = get();
      
      // Validate and clamp heatmap value to valid 0-1 range
      if (value !== undefined && (value < 0 || value > 1)) {
        console.warn(`Heat map value ${value} is outside valid range [0, 1]. Clamping to range.`);
        value = Math.max(0, Math.min(1, value));
      }
      
      rectangleActions.updateRectangle(rectangleId, { heatmapValue: value });
    },

    bulkSetHeatmapValues: (values: Array<{ rectangleId: string; value: number }>) => {
      const { rectangles, rectangleActions } = get();
      
      // Process all values as a single bulk update to create one history entry
      const updatedRectangles = rectangles.map(rect => {
        const valueUpdate = values.find(v => v.rectangleId === rect.id);
        if (valueUpdate) {
          // Validate and clamp value
          const clampedValue = Math.max(0, Math.min(1, valueUpdate.value));
          return { ...rect, heatmapValue: clampedValue };
        }
        return rect;
      });
      
      rectangleActions.setRectanglesWithHistory(updatedRectangles);
    },

    getHeatmapColor: (rectangleId: string): string | null => {
      const state = get();
      const { rectangles, heatmap } = state;
      
      if (!heatmap.enabled) {
        return null;
      }
      
      const rectangle = rectangles.find(r => r.id === rectangleId);
      if (!rectangle) {
        return null;
      }
      
      // Return undefined value color for rectangles without heatmap values
      if (rectangle.heatmapValue === undefined) {
        return heatmap.undefinedValueColor;
      }
      
      // Find the selected palette
      const selectedPalette = heatmap.palettes.find(p => p.id === heatmap.selectedPaletteId);
      if (!selectedPalette) {
        return heatmap.undefinedValueColor;
      }
      
      return getColorFromPalette(selectedPalette, rectangle.heatmapValue);
    },

    clearAllHeatmapValues: () => {
      const { rectangles, rectangleActions } = get();
      
      // Remove all heatmap values in a single bulk update for one history entry
      const updatedRectangles = rectangles.map(rect => ({
        ...rect,
        heatmapValue: undefined
      }));
      
      rectangleActions.setRectanglesWithHistory(updatedRectangles);
    },

    applyImportedHeatmapState: (stateToApply) => {
      // Apply imported heatmap configuration with validation and fallbacks
      if (!stateToApply) return;
      set(state => ({
        heatmap: {
          ...state.heatmap,
          enabled: !!stateToApply.enabled,
          selectedPaletteId: stateToApply.selectedPaletteId || state.heatmap.selectedPaletteId,
          palettes: Array.isArray(stateToApply.palettes) && stateToApply.palettes.length > 0
            ? stateToApply.palettes
            : state.heatmap.palettes,
          undefinedValueColor: stateToApply.undefinedValueColor || state.heatmap.undefinedValueColor,
          showLegend: !!stateToApply.showLegend
        }
      }));
      // Precompute colors for the imported palette to ensure smooth performance
      const { heatmap } = get();
      const palette = heatmap.palettes.find(p => p.id === heatmap.selectedPaletteId);
      if (palette) {
        clearColorCache();
        precomputePaletteColors(palette, 64);
      }
    }
  }
});