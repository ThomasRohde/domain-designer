import type { HeatmapPalette } from '../stores/types';

/**
 * Global cache for computed heatmap colors to optimize performance.
 * 
 * Caches interpolated colors using composite keys that include palette stops,
 * values, and interpolation factors. This prevents expensive color calculations
 * during real-time interactions like dragging or resizing.
 * 
 * Cache is automatically managed: cleared when palettes change, precomputed
 * when palettes are selected for smooth user experience.
 */
const colorCache = new Map<string, string>();

/**
 * Performs linear interpolation between two hex colors.
 * 
 * Converts colors to RGB, interpolates each channel separately, then converts back to hex.
 * Results are cached to avoid repeated calculations for the same inputs.
 * 
 * @param color1 - Starting color in hex format (#RRGGBB)
 * @param color2 - Ending color in hex format (#RRGGBB)
 * @param factor - Interpolation factor (0 = color1, 1 = color2)
 * @returns Interpolated color in hex format (#RRGGBB)
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  // Create cache key
  const cacheKey = `${color1}-${color2}-${factor.toFixed(3)}`;
  
  // Check cache first
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey)!;
  }
  
  // Convert hex to RGB
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  // Interpolate
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  
  // Convert back to hex
  const result = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  
  // Cache the result
  colorCache.set(cacheKey, result);
  
  return result;
}

/**
 * Maps a numeric value to a color using a heatmap palette.
 * 
 * Algorithm:
 * 1. Sorts palette stops by value to handle unordered definitions
 * 2. Finds the two adjacent stops that bracket the input value
 * 3. Interpolates between those stop colors based on relative position
 * 4. Handles edge cases (value outside stop range) gracefully
 * 
 * Performance optimized with comprehensive caching including palette stop data
 * in the cache key to handle palette modifications correctly.
 * 
 * @param palette - Heatmap palette with color stops
 * @param value - Numeric value to map (automatically clamped to 0-1)
 * @returns Computed color in hex format (#RRGGBB)
 */
export function getColorFromPalette(palette: HeatmapPalette, value: number): string {
  // Clamp value to 0-1 range
  const clampedValue = Math.max(0, Math.min(1, value));
  
  // Create cache key including palette stops
  const stopsKey = [...palette.stops]
    .sort((a, b) => a.value - b.value)
    .map(stop => `${stop.value}:${stop.color}`)
    .join(',');
  const cacheKey = `${palette.id}-${stopsKey}-${clampedValue.toFixed(3)}`;
  
  // Check cache first
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey)!;
  }
  
  const stops = [...palette.stops].sort((a, b) => a.value - b.value);
  
  let result: string;
  
  // Find adjacent stops that bracket the target value for interpolation
  let foundStop = false;
  for (let i = 0; i < stops.length - 1; i++) {
    const stop1 = stops[i];
    const stop2 = stops[i + 1];
    
    if (clampedValue >= stop1.value && clampedValue <= stop2.value) {
      const factor = (clampedValue - stop1.value) / (stop2.value - stop1.value);
      result = interpolateColor(stop1.color, stop2.color, factor);
      foundStop = true;
      break;
    }
  }
  
  if (!foundStop) {
    // Handle values outside the defined stop range by using endpoint colors
    if (clampedValue <= stops[0].value) {
      result = stops[0].color;
    } else {
      result = stops[stops.length - 1].color;
    }
  }
  
  // Cache the result
  colorCache.set(cacheKey, result!);
  
  return result!;
}

/**
 * High-level utility to determine the display color for a rectangle's heatmap value.
 * 
 * This function encapsulates the logic for handling both defined and undefined values:
 * - Defined values are mapped through the palette color system
 * - Undefined values use the configurable undefined value color
 * - Invalid palette configurations fall back to undefined value color
 * 
 * @param heatmapValue - Rectangle's heatmap value (0-1 range) or undefined
 * @param palette - Active heatmap palette or undefined
 * @param undefinedValueColor - Color for rectangles without values (#RRGGBB)
 * @returns Computed color (#RRGGBB) or null for no heatmap value
 */
export function calculateHeatmapColor(
  heatmapValue: number | undefined,
  palette: HeatmapPalette | undefined,
  undefinedValueColor: string
): string | null {
  if (heatmapValue === undefined) {
    return undefinedValueColor;
  }
  
  if (!palette) {
    return undefinedValueColor;
  }
  
  return getColorFromPalette(palette, heatmapValue);
}

/**
 * Clears the global color computation cache.
 * 
 * Called automatically when:
 * - User changes active palette
 * - Custom palettes are modified
 * - Imported heatmap state is applied
 * 
 * Can be called manually for memory management in long-running sessions.
 */
export function clearColorCache(): void {
  colorCache.clear();
}

/**
 * Returns the current cache size for debugging and performance monitoring.
 * 
 * Useful for understanding cache effectiveness and memory usage patterns.
 * Cache size typically correlates with the number of unique value/palette combinations used.
 */
export function getColorCacheSize(): number {
  return colorCache.size;
}

/**
 * Precomputes colors across the value range to warm up the cache for smooth performance.
 * 
 * This function is called automatically when:
 * - Heatmap mode is enabled
 * - User switches to a new palette
 * - Imported heatmap state is applied
 * 
 * Precomputation ensures that common values (0, 0.25, 0.5, 0.75, 1.0) and interpolated
 * values are immediately available without calculation lag during user interactions.
 * 
 * @param palette - Color palette to precompute for
 * @param steps - Number of evenly-spaced values to precompute (default: 100)
 */
export function precomputePaletteColors(palette: HeatmapPalette, steps: number = 100): void {
  for (let i = 0; i <= steps; i++) {
    const value = i / steps;
    getColorFromPalette(palette, value);
  }
}