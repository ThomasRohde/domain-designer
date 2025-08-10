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
 * Scientifically-designed heatmap color palettes for data visualization.
 * 
 * This collection provides 11 carefully selected palettes optimized for different
 * data types and visualization requirements. Each palette defines color stops at
 * specific normalized values (0-1 range) with smooth interpolation between stops.
 * 
 * **Basic Palettes:**
 * - Temperature: Intuitive blue→yellow→red progression mimicking thermal maps
 * - Traffic Light: Familiar green→yellow→red for performance/status indicators  
 * - Grayscale: High-contrast monochrome for accessibility and printing
 * 
 * **Sequential Palettes** (single-hue gradients for ordered data):
 * - Blues: Light to dark blue - excellent for water depth, coldness, or density
 * - Greens: Light to dark green - ideal for vegetation, growth, or ecological data
 * - YlOrRd: Yellow→orange→red heat progression - perfect for temperature/intensity
 * 
 * **Perceptually Uniform Palettes** (scientifically optimized for human vision):
 * - Viridis: Purple→blue→green→yellow - gold standard for scientific visualization
 * - Plasma: Purple→pink→yellow - high contrast alternative to Viridis
 * - Cividis: Blue→teal→yellow - optimized for all types of color vision deficiencies
 * 
 * **Diverging Palettes** (emphasize deviations from central values):
 * - RdBu: Red→white→blue - classic diverging for correlation/change data
 * - Cool-Warm: Blue→white→red - temperature-inspired diverging palette
 * 
 * All palettes follow ColorBrewer and scientific visualization best practices,
 * ensuring accessibility, perceptual uniformity, and professional appearance.
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
  },
  // Sequential palettes - single-hue progressions following ColorBrewer specifications
  {
    id: 'blues',
    name: 'Blues',
    stops: [
      { value: 0, color: '#f7fbff' },
      { value: 0.25, color: '#c6dbef' },
      { value: 0.5, color: '#6baed6' },
      { value: 0.75, color: '#2171b5' },
      { value: 1, color: '#08306b' }
    ],
    isCustom: false
  },
  {
    id: 'greens',
    name: 'Greens',
    stops: [
      { value: 0, color: '#f7fcf5' },
      { value: 0.25, color: '#c7e9c0' },
      { value: 0.5, color: '#74c476' },
      { value: 0.75, color: '#238b45' },
      { value: 1, color: '#00441b' }
    ],
    isCustom: false
  },
  {
    id: 'ylord',
    name: 'YlOrRd',
    stops: [
      { value: 0, color: '#ffffb2' },
      { value: 0.25, color: '#fed976' },
      { value: 0.5, color: '#feb24c' },
      { value: 0.75, color: '#fd8d3c' },
      { value: 1, color: '#b10026' }
    ],
    isCustom: false
  },
  // Perceptually uniform palettes - matplotlib-inspired, scientifically validated for human vision
  {
    id: 'plasma',
    name: 'Plasma',
    stops: [
      { value: 0, color: '#0d0887' },
      { value: 0.25, color: '#7e03a8' },
      { value: 0.5, color: '#cc4778' },
      { value: 0.75, color: '#f89441' },
      { value: 1, color: '#f0f921' }
    ],
    isCustom: false
  },
  {
    id: 'cividis',
    name: 'Cividis',
    stops: [
      { value: 0, color: '#00224e' },
      { value: 0.25, color: '#123570' },
      { value: 0.5, color: '#3b496c' },
      { value: 0.75, color: '#575d6d' },
      { value: 1, color: '#fdea45' }
    ],
    isCustom: false
  },
  // Diverging palettes - emphasize deviations from neutral midpoint (0.5)
  {
    id: 'rdbu',
    name: 'RdBu',
    stops: [
      { value: 0, color: '#67001f' },
      { value: 0.25, color: '#d6604d' },
      { value: 0.5, color: '#f7f7f7' },
      { value: 0.75, color: '#4393c3' },
      { value: 1, color: '#053061' }
    ],
    isCustom: false
  },
  {
    id: 'cool-warm',
    name: 'Cool-Warm',
    stops: [
      { value: 0, color: '#3b4cc0' },
      { value: 0.25, color: '#688aef' },
      { value: 0.5, color: '#dddddd' },
      { value: 0.75, color: '#f49b7c' },
      { value: 1, color: '#b40426' }
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

      // Precompute palette colors when enabling to eliminate first-render delays
      if (enabled) {
        const { heatmap } = get();
        const palette = heatmap.palettes.find(p => p.id === heatmap.selectedPaletteId);
        if (palette) {
          precomputePaletteColors(palette, 64); // 64 color cache provides smooth gradients
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
      // Invalidate old cache and precompute new palette for instant color lookups
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
          // Auto-fallback to temperature palette if removing currently active palette
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
      
      // Enforce 0-1 range constraint for consistent color mapping
      if (value !== undefined && (value < 0 || value > 1)) {
        console.warn(`Heat map value ${value} is outside valid range [0, 1]. Clamping to range.`);
        value = Math.max(0, Math.min(1, value));
      }
      
      rectangleActions.updateRectangle(rectangleId, { heatmapValue: value });
    },

    bulkSetHeatmapValues: (values: Array<{ rectangleId: string; value: number }>) => {
      const { rectangles, rectangleActions } = get();
      
      // Batch process all value updates to create single undo/redo entry
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
      
      // Use fallback color for rectangles without assigned heatmap values
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
      
      // Clear all heatmap values with single history entry for clean undo/redo
      const updatedRectangles = rectangles.map(rect => ({
        ...rect,
        heatmapValue: undefined
      }));
      
      rectangleActions.setRectanglesWithHistory(updatedRectangles);
    },

    applyImportedHeatmapState: (stateToApply) => {
      // Import heatmap state with validation - preserves current predefined palettes
      if (!stateToApply) return;
      set(state => ({
        heatmap: {
          ...state.heatmap,
          enabled: !!stateToApply.enabled,
          selectedPaletteId: stateToApply.selectedPaletteId || state.heatmap.selectedPaletteId,
          palettes: PREDEFINED_PALETTES, // Always use current predefined palettes for consistency
          undefinedValueColor: stateToApply.undefinedValueColor || state.heatmap.undefinedValueColor,
          showLegend: !!stateToApply.showLegend
        }
      }));
      // Prime color cache for imported palette selection
      const { heatmap } = get();
      const palette = heatmap.palettes.find(p => p.id === heatmap.selectedPaletteId);
      if (palette) {
        clearColorCache();
        precomputePaletteColors(palette, 64);
      }
    },

    refreshPalettes: () => {
      // Reload predefined palettes to latest definitions (useful after app updates)
      set(state => ({
        heatmap: {
          ...state.heatmap,
          palettes: PREDEFINED_PALETTES,
          selectedPaletteId: PREDEFINED_PALETTES.find(p => p.id === state.heatmap.selectedPaletteId) 
            ? state.heatmap.selectedPaletteId 
            : 'temperature' // Fallback if current selection was removed/renamed
        }
      }));
    }
  }
});