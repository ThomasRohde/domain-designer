/**
 * Font Detection Utilities
 * Detects available fonts on the user's system using modern browser APIs
 */

export interface FontOption {
  value: string;
  label: string;
  category: 'system' | 'serif' | 'sans-serif' | 'monospace' | 'web';
}

// Comprehensive list of common system fonts to test
const COMMON_FONTS = [
  // Cross-platform fonts
  { name: 'Arial', category: 'sans-serif' as const },
  { name: 'Helvetica', category: 'sans-serif' as const },
  { name: 'Times New Roman', category: 'serif' as const },
  { name: 'Times', category: 'serif' as const },
  { name: 'Courier New', category: 'monospace' as const },
  { name: 'Courier', category: 'monospace' as const },
  { name: 'Verdana', category: 'sans-serif' as const },
  { name: 'Georgia', category: 'serif' as const },
  { name: 'Trebuchet MS', category: 'sans-serif' as const },
  { name: 'Impact', category: 'sans-serif' as const },
  { name: 'Comic Sans MS', category: 'sans-serif' as const },
  
  // Windows fonts
  { name: 'Segoe UI', category: 'sans-serif' as const },
  { name: 'Calibri', category: 'sans-serif' as const },
  { name: 'Cambria', category: 'serif' as const },
  { name: 'Consolas', category: 'monospace' as const },
  { name: 'Arial Black', category: 'sans-serif' as const },
  { name: 'Tahoma', category: 'sans-serif' as const },
  { name: 'Microsoft Sans Serif', category: 'sans-serif' as const },
  
  // macOS fonts
  { name: 'SF Pro Display', category: 'sans-serif' as const },
  { name: 'SF Pro Text', category: 'sans-serif' as const },
  { name: 'Helvetica Neue', category: 'sans-serif' as const },
  { name: 'San Francisco', category: 'sans-serif' as const },
  { name: 'Avenir', category: 'sans-serif' as const },
  { name: 'Optima', category: 'sans-serif' as const },
  { name: 'Lucida Grande', category: 'sans-serif' as const },
  { name: 'Menlo', category: 'monospace' as const },
  { name: 'Monaco', category: 'monospace' as const },
  
  // Linux fonts
  { name: 'Liberation Sans', category: 'sans-serif' as const },
  { name: 'Liberation Serif', category: 'serif' as const },
  { name: 'Liberation Mono', category: 'monospace' as const },
  { name: 'DejaVu Sans', category: 'sans-serif' as const },
  { name: 'DejaVu Serif', category: 'serif' as const },
  { name: 'DejaVu Sans Mono', category: 'monospace' as const },
  { name: 'Ubuntu', category: 'sans-serif' as const },
  { name: 'Ubuntu Mono', category: 'monospace' as const },
  { name: 'Roboto', category: 'sans-serif' as const },
  { name: 'Noto Sans', category: 'sans-serif' as const },
  { name: 'Source Sans Pro', category: 'sans-serif' as const },
  
  // Custom Danske fonts
  { name: 'DanskeLight', category: 'sans-serif' as const },
  { name: 'DanskeMedium', category: 'sans-serif' as const },
  { name: 'DanskeRegular', category: 'sans-serif' as const },
];

// Always include web fonts and fallbacks
const WEB_FONTS: FontOption[] = [
  { value: 'Inter', label: 'Inter (Web)', category: 'web' },
  { value: 'sans-serif', label: 'Sans-serif (Generic)', category: 'system' },
  { value: 'serif', label: 'Serif (Generic)', category: 'system' },
  { value: 'monospace', label: 'Monospace (Generic)', category: 'system' },
];

/**
 * Detect if a font is available using the FontFaceSet API (modern browsers)
 */
function isFontAvailableModern(fontName: string): boolean {
  if (!document.fonts || !document.fonts.check) {
    return false;
  }
  
  try {
    // Test with a reasonable size
    const result = document.fonts.check(`16px "${fontName}"`);
    return result;
  } catch {
    return false;
  }
}

/**
 * Detect if a font is available using canvas-based measurement (fallback)
 */
function isFontAvailableCanvas(fontName: string): boolean {
  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return false;
    }
    
    const testText = 'mmmmmmmmmmlli'; // Characters that vary significantly between fonts
    const baseFonts = ['serif', 'sans-serif', 'monospace'];
    const testSize = 72;
    
    // Test against multiple base fonts to increase accuracy
    for (const baseFont of baseFonts) {
      // Measure with base font
      context.font = `${testSize}px ${baseFont}`;
      const baseWidth = context.measureText(testText).width;
      
      // Measure with test font, falling back to base font
      context.font = `${testSize}px "${fontName}", ${baseFont}`;
      const testWidth = context.measureText(testText).width;
      
      const difference = Math.abs(baseWidth - testWidth);
      
      // If widths are significantly different, the font is likely available
      if (difference > 2) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  } finally {
    // Clean up canvas to prevent memory leak
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
  }
}

/**
 * Check if a specific font is available on the system
 */
export function isFontAvailable(fontName: string): boolean {
  // Skip generic font names - they're always "available"
  if (['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(fontName.toLowerCase())) {
    return true;
  }
  
  try {
    // Use canvas method primarily as it's more reliable for system fonts
    const canvasResult = isFontAvailableCanvas(fontName);
    
    // If canvas fails, try FontFaceSet API as fallback
    if (!canvasResult) {
      const modernResult = isFontAvailableModern(fontName);
      return modernResult;
    }
    
    return canvasResult;
  } catch (error) {
    // In case of any errors, be more permissive in production
    console.warn(`Font detection error for "${fontName}":`, error);
    
    // For Danske fonts, assume they might be available since user specifically wants them
    if (fontName.startsWith('Danske')) {
      return true;
    }
    
    // For other common fonts, also assume they might be available
    const commonFonts = ['Arial', 'Times New Roman', 'Courier New', 'Segoe UI', 'Calibri', 'Verdana', 'Georgia'];
    return commonFonts.includes(fontName);
  }
}

/**
 * Detect all available fonts from the common fonts list
 */
export async function detectAvailableFonts(): Promise<FontOption[]> {
  const availableFonts: FontOption[] = [];
  
  // Always include web fonts first
  availableFonts.push(...WEB_FONTS);
  
  // Log environment info for debugging
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isHTTPS = window.location.protocol === 'https:';
  console.log(`Font detection running on: ${window.location.origin} (localhost: ${isLocalhost}, HTTPS: ${isHTTPS})`);
  
  // Test a few essential fonts first to ensure detection is working
  const essentialFonts = ['Arial', 'Times New Roman', 'Courier New'];
  const detectedEssential = essentialFonts.filter(fontName => isFontAvailable(fontName));
  
  // If no essential fonts are detected, something is wrong - use fallback
  // This is more likely to happen in production environments like GitHub Pages
  if (detectedEssential.length === 0) {
    console.warn('Font detection failed - using fallback font list');
    // Include more fonts in fallback, including the Danske fonts for systems that have them
    const fallbackFonts: FontOption[] = [
      ...WEB_FONTS,
      // Common Windows fonts
      { value: 'Arial', label: 'Arial', category: 'sans-serif' },
      { value: 'Calibri', label: 'Calibri', category: 'sans-serif' },
      { value: 'Segoe UI', label: 'Segoe UI', category: 'sans-serif' },
      { value: 'Tahoma', label: 'Tahoma', category: 'sans-serif' },
      { value: 'Verdana', label: 'Verdana', category: 'sans-serif' },
      // Include Danske fonts in fallback
      { value: 'DanskeLight', label: 'DanskeLight', category: 'sans-serif' },
      { value: 'DanskeMedium', label: 'DanskeMedium', category: 'sans-serif' },
      { value: 'DanskeRegular', label: 'DanskeRegular', category: 'sans-serif' },
      // Common serif fonts
      { value: 'Times New Roman', label: 'Times New Roman', category: 'serif' },
      { value: 'Georgia', label: 'Georgia', category: 'serif' },
      // Common monospace fonts
      { value: 'Courier New', label: 'Courier New', category: 'monospace' },
      { value: 'Consolas', label: 'Consolas', category: 'monospace' },
    ];
    return fallbackFonts;
  }
  
  // Test each common font
  for (const font of COMMON_FONTS) {
    const isAvailable = isFontAvailable(font.name);
    if (isAvailable) {
      availableFonts.push({
        value: font.name,
        label: font.name,
        category: font.category
      });
    }
  }
  
  // Remove duplicates based on value
  const uniqueFonts = availableFonts.filter((font, index, array) => 
    array.findIndex(f => f.value === font.value) === index
  );
  
  // Sort by category and then by name
  const categoryOrder = ['web', 'system', 'sans-serif', 'serif', 'monospace'];
  uniqueFonts.sort((a, b) => {
    const categoryA = categoryOrder.indexOf(a.category);
    const categoryB = categoryOrder.indexOf(b.category);
    
    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }
    
    return a.label.localeCompare(b.label);
  });
  
  // Log detected fonts for debugging
  console.log(`Detected ${uniqueFonts.length} fonts:`, uniqueFonts.map(f => f.value));
  const danskeDetected = uniqueFonts.filter(f => f.value.startsWith('Danske'));
  if (danskeDetected.length > 0) {
    console.log('Danske fonts detected:', danskeDetected.map(f => f.value));
  }
  
  return uniqueFonts;
}

/**
 * Get cached available fonts or detect them if not cached
 */
export async function getAvailableFonts(): Promise<FontOption[]> {
  const cacheKey = 'availableFonts';
  const cacheExpiry = 'availableFontsExpiry';
  const cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  
  try {
    // Check if we have cached results that haven't expired
    const cached = localStorage.getItem(cacheKey);
    const expiry = localStorage.getItem(cacheExpiry);
    
    if (cached && expiry && Date.now() < parseInt(expiry)) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore cache read errors
  }
  
  // Detect fonts
  const fonts = await detectAvailableFonts();
  
  try {
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(fonts));
    localStorage.setItem(cacheExpiry, (Date.now() + cacheTimeout).toString());
  } catch {
    // Ignore cache write errors
  }
  
  return fonts;
}

/**
 * Clear the font cache (useful for debugging or if detection seems stale)
 */
export function clearFontCache(): void {
  try {
    localStorage.removeItem('availableFonts');
    localStorage.removeItem('availableFontsExpiry');
  } catch {
    // Ignore cache clear errors
  }
}