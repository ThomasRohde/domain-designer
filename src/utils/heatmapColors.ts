import type { HeatmapPalette } from '../stores/types';

/**
 * Cache for computed colors to avoid recomputation
 */
const colorCache = new Map<string, string>();

/**
 * Interpolates between two colors based on a factor (0-1)
 * 
 * @param color1 - Starting color in hex format
 * @param color2 - Ending color in hex format  
 * @param factor - Interpolation factor (0-1)
 * @returns Interpolated color in hex format
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
 * Gets color from palette based on value (0-1) with memoization
 * 
 * @param palette - Heat map palette configuration
 * @param value - Value between 0 and 1
 * @returns Computed color in hex format
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
  
  // Find the two stops to interpolate between
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
    // If value is before first stop or after last stop
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
 * Calculates heat map color for a rectangle with memoization
 * 
 * @param heatmapValue - Rectangle's heat map value (0-1) or undefined
 * @param palette - Selected heat map palette
 * @param undefinedValueColor - Color to use for undefined values
 * @returns Computed color or null if no heat map value
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
 * Clears the color computation cache
 * Useful when palettes are updated or memory needs to be freed
 */
export function clearColorCache(): void {
  colorCache.clear();
}

/**
 * Gets current cache size (for debugging/monitoring)
 */
export function getColorCacheSize(): number {
  return colorCache.size;
}

/**
 * Precomputes colors for a range of values to warm up the cache
 * 
 * @param palette - Palette to precompute colors for
 * @param steps - Number of color steps to precompute (default: 100)
 */
export function precomputePaletteColors(palette: HeatmapPalette, steps: number = 100): void {
  for (let i = 0; i <= steps; i++) {
    const value = i / steps;
    getColorFromPalette(palette, value);
  }
}