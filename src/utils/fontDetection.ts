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
  
  // System UI fonts
  { name: 'system-ui', category: 'system' as const },
  { name: '-apple-system', category: 'system' as const },
  { name: 'BlinkMacSystemFont', category: 'system' as const },
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
    console.log(`🔍 FontFaceSet API not available for "${fontName}"`);
    return false;
  }
  
  try {
    // Test with a reasonable size
    const result = document.fonts.check(`16px "${fontName}"`);
    console.log(`🔍 FontFaceSet check for "${fontName}":`, result);
    return result;
  } catch (error) {
    console.warn(`❌ Error checking font "${fontName}" with FontFaceSet API:`, error);
    return false;
  }
}

/**
 * Detect if a font is available using canvas-based measurement (fallback)
 */
function isFontAvailableCanvas(fontName: string): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      console.log(`❌ Canvas context not available for "${fontName}"`);
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
      console.log(`🎨 Canvas test "${fontName}" vs "${baseFont}": base=${baseWidth}px, test=${testWidth}px, diff=${difference}px`);
      
      // If widths are significantly different, the font is likely available
      if (difference > 2) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn(`❌ Error checking font "${fontName}" with canvas method:`, error);
    return false;
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
  
  // Use canvas method primarily as it's more reliable for system fonts
  const canvasResult = isFontAvailableCanvas(fontName);
  console.log(`🎨 Canvas detection for "${fontName}":`, canvasResult);
  
  // If canvas fails, try FontFaceSet API as fallback
  if (!canvasResult) {
    const modernResult = isFontAvailableModern(fontName);
    console.log(`🔧 Fallback to FontFaceSet for "${fontName}":`, modernResult);
    return modernResult;
  }
  
  return canvasResult;
}

/**
 * Detect all available fonts from the common fonts list
 */
export async function detectAvailableFonts(): Promise<FontOption[]> {
  console.log('🔍 Starting font detection...');
  const availableFonts: FontOption[] = [];
  
  // Always include web fonts first
  availableFonts.push(...WEB_FONTS);
  console.log('✅ Added web fonts:', WEB_FONTS.length);
  
  // Test a few essential fonts first to ensure detection is working
  const essentialFonts = ['Arial', 'Times New Roman', 'Courier New'];
  const detectedEssential = essentialFonts.filter(fontName => isFontAvailable(fontName));
  console.log('🎯 Essential fonts detected:', detectedEssential);
  
  // If no essential fonts are detected, something is wrong - use fallback
  if (detectedEssential.length === 0) {
    console.warn('⚠️ No essential fonts detected! Font detection may be failing. Using fallback list.');
    return [...WEB_FONTS, ...COMMON_FONTS.slice(0, 5).map(font => ({
      value: font.name,
      label: font.name,
      category: font.category
    }))];
  }
  
  // Test each common font
  for (const font of COMMON_FONTS) {
    const isAvailable = isFontAvailable(font.name);
    console.log(`🔤 Testing "${font.name}":`, isAvailable ? '✅' : '❌');
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
  
  console.log('🎯 Total available fonts detected:', uniqueFonts.length);
  console.log('📋 Available fonts:', uniqueFonts.map(f => f.value));
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
  } catch (error) {
    console.warn('Error reading font cache:', error);
  }
  
  // Detect fonts
  const fonts = await detectAvailableFonts();
  
  try {
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(fonts));
    localStorage.setItem(cacheExpiry, (Date.now() + cacheTimeout).toString());
  } catch (error) {
    console.warn('Error caching fonts:', error);
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
  } catch (error) {
    console.warn('Error clearing font cache:', error);
  }
}