import { Rectangle, ExportOptions, GlobalSettings, ValidationResult } from '../types';
import { SavedDiagram, calculateBoundingBox } from '../types/layoutSnapshot';
import { validateDiagramAuto, sanitizeDiagramData } from './schemaValidation';
import { exportToHTML } from './htmlExport';
import type { HeatmapState } from '../stores/types';
import { calculateHeatmapColor } from './heatmapColors';
import PptxGenJS from 'pptxgenjs';

/**
 * Applies heatmap color visualization to rectangles for export consistency.
 * 
 * Ensures exported formats accurately reflect the heatmap visualization by replacing
 * rectangle colors with computed heatmap colors when visualization is enabled.
 * This maintains visual consistency between the interactive application and static exports.
 * 
 * Process:
 * 1. Check if heatmap visualization is enabled
 * 2. Find selected color palette from heatmap state
 * 3. Calculate heatmap color for each rectangle based on its heatmapValue
 * 4. Replace rectangle color with heatmap color (or use undefinedValueColor fallback)
 * 
 * @param rectangles - Source rectangle data containing heatmapValue properties
 * @param heatmapState - Current heatmap configuration including palette and enabled state
 * @returns Rectangle array with heatmap colors applied to color property for visual consistency
 */
const applyHeatmapColorsForExport = (rectangles: Rectangle[], heatmapState: HeatmapState): Rectangle[] => {
  if (!heatmapState.enabled) {
    return rectangles;
  }
  
  const selectedPalette = heatmapState.palettes.find(p => p.id === heatmapState.selectedPaletteId);
  
  return rectangles.map(rect => {
    const heatmapColor = calculateHeatmapColor(
      rect.heatmapValue,
      selectedPalette,
      heatmapState.undefinedValueColor
    );
    
    if (heatmapColor) {
      return {
        ...rect,
        color: heatmapColor
      };
    }
    
    return rect;
  });
};

/**
 * File export configuration for different formats
 */
export interface FileExportOptions {
  filename: string;
  content: string;
  mimeType: string;
  extension: string;
  description: string;
}

/**
 * Cross-browser file export utility with progressive enhancement.
 * 
 * Implementation strategy:
 * 1. Attempt modern File System Access API for native file dialogs (Chrome 86+, Edge 86+)
 * 2. Graceful fallback to traditional blob download for unsupported browsers
 * 3. Consistent user experience across different browser capabilities
 * 
 * File System Access API advantages:
 * - Native file picker with proper file type filtering
 * - User can choose save location and filename
 * - Better integration with OS file management
 * 
 * @param options - File export configuration including filename, content, and MIME type
 */
export const exportFile = async (options: FileExportOptions): Promise<void> => {
  const { filename, content, mimeType, extension, description } = options;

  // Check if File System Access API is supported
  if ('showSaveFilePicker' in window) {
    try {
      // Use native file dialog
      const fileHandle = await (window as typeof window & {
        showSaveFilePicker: (options: {
          suggestedName: string;
          types: Array<{
            description: string;
            accept: Record<string, string[]>;
          }>;
        }) => Promise<{
          createWritable: () => Promise<{
            write: (data: string) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      }).showSaveFilePicker({
        suggestedName: `${filename}.${extension}`,
        types: [{
          description,
          accept: {
            [mimeType]: [`.${extension}`]
          }
        }]
      });

      // Create writable stream and save the file
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      return; // Success, no need for fallback
    } catch (error) {
      // User cancelled dialog or other error occurred
      console.log('File save cancelled or error occurred:', error);
      // Fall through to download fallback
    }
  }

  // Fallback: Use traditional download approach
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `${filename}.${extension}`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
};

/**
 * Central export dispatcher coordinating multi-format diagram export.
 * 
 * Supported formats and their use cases:
 * - HTML: Interactive web documents with zoom/pan, Confluence compatibility
 * - SVG: Scalable vector graphics for document embedding and print
 * - JSON: Complete diagram data backup with v2.0 schema and heatmap state
 * - PPTX: Native PowerPoint presentations with hierarchical formatting
 * - Draw.io: XML format for diagrams.net compatibility and further editing
 * - ArchiMate: Enterprise architecture modeling with Strategy elements
 * 
 * Process:
 * 1. Apply heatmap colors if visualization is enabled
 * 2. Generate timestamped filename for consistency
 * 3. Delegate to format-specific export handler
 * 4. Handle browser download initiation or file dialog
 * 
 * @param containerElement - Canvas container element (used by some export formats)
 * @param rectangles - Source rectangle data to export
 * @param options - Export configuration including target format and visual options
 * @param globalSettings - Application settings providing font, layout, and styling context
 * @param gridSize - Grid unit to pixel conversion factor for coordinate transformation
 * @param borderRadius - Rectangle corner radius for visual consistency
 * @param borderColor - Default border color for rendered formats
 * @param borderWidth - Border thickness for visual consistency
 * @param predefinedColors - Color palette to include in JSON exports
 * @param heatmapState - Optional heatmap state for color visualization in exports
 */
export const exportDiagram = async (
  containerElement: HTMLElement,
  rectangles: Rectangle[],
  options: ExportOptions,
  globalSettings?: GlobalSettings,
  gridSize: number = 20,
  borderRadius: number = 8,
  borderColor: string = '#374151',
  borderWidth: number = 2,
  predefinedColors?: string[],
  heatmapState?: HeatmapState
): Promise<void> => {
  const { format, includeBackground = true, confluenceMode = false } = options;
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `domain-model-${timestamp}`;
  
  // Apply heatmap colors for export to ensure visual consistency between app and exported format
  const exportRectangles = heatmapState 
    ? applyHeatmapColorsForExport(rectangles, heatmapState)
    : rectangles;

  switch (format) {
    case 'html':
      await exportToHTML(exportRectangles, filename, { includeBackground, confluenceMode }, globalSettings);
      break;
    case 'svg':
      await exportToSVG(containerElement, exportRectangles, filename, { includeBackground }, globalSettings, gridSize, borderRadius, borderColor, borderWidth);
      break;
    case 'json':
      await exportToJSON(exportRectangles, globalSettings, filename, predefinedColors, heatmapState, true);
      break;
    case 'pptx':
      await exportToPPTX(exportRectangles, filename, { includeBackground }, globalSettings, gridSize, borderRadius, borderColor, borderWidth);
      break;
    case 'drawio':
      await exportToDrawIO(exportRectangles, filename, globalSettings, gridSize, borderRadius, borderColor, borderWidth);
      break;
    case 'archimate':
      await exportToArchimate(exportRectangles, filename, globalSettings, gridSize, borderRadius, borderColor, borderWidth);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};


/**
 * Generate publication-ready SVG vector graphics export.
 * 
 * SVG Export Features:
 * - **Scalable Output**: Vector format maintains quality at any size for print and web
 * - **Coordinate Precision**: Grid units transformed to pixels with proper margin padding
 * - **Text Handling**: Multi-line text wrapping with character width approximation
 * - **Hierarchical Rendering**: Parents rendered before children for proper SVG stacking
 * - **Font Consistency**: Matches HTML export fonts with comprehensive fallback chains
 * - **Text Label Support**: Transparent backgrounds for text-only elements
 * 
 * Rendering Process:
 * 1. Calculate diagram bounding box and add margin padding
 * 2. Sort rectangles by hierarchy depth (parents first for SVG z-order)
 * 3. Transform coordinates from grid units to pixels
 * 4. Apply text positioning logic (top-aligned for parents, centered for leaves)
 * 5. Generate SVG markup with proper styling and text elements
 * 
 * @param _element - Container element (reserved for future canvas-based rendering)
 * @param rectangles - Rectangle data to render as SVG elements
 * @param filename - Output filename for download (without extension)
 * @param options - Visual options including background rendering
 * @param globalSettings - Application settings for fonts, margins, and dynamic sizing
 * @param gridSize - Grid unit to pixel conversion factor
 * @param borderRadius - Rectangle corner radius in pixels
 * @param borderColor - Default border color for non-text elements
 * @param borderWidth - Border line thickness in pixels
 */
const exportToSVG = async (
  _element: HTMLElement,
  rectangles: Rectangle[],
  filename: string,
  options: { includeBackground: boolean },
  globalSettings?: GlobalSettings,
  gridSize: number = 20,
  borderRadius: number = 8,
  borderColor: string = '#374151',
  borderWidth: number = 2
): Promise<void> => {
  try {
    const svg = createSVGFromRectangles(rectangles, { ...options, scale: 1 }, globalSettings, gridSize, borderRadius, borderColor, borderWidth);

    await exportFile({
      filename,
      content: svg,
      mimeType: 'image/svg+xml',
      extension: 'svg',
      description: 'SVG files'
    });
  } catch (error) {
    console.error('Error exporting to SVG:', error);
    throw error;
  }
};


/**
 * Export complete diagram data in v2.0 JSON format with full state preservation.
 * 
 * JSON Export Features:
 * - **Schema Versioning**: v2.0 format with backward compatibility indicators
 * - **Complete State**: All rectangle properties, relationships, and metadata
 * - **Global Settings**: Font, layout, margin, and algorithm preferences
 * - **Heat Map State**: Color palette, values, and visualization settings
 * - **Layout Metadata**: Algorithm used, bounding box, and user arrangement flags
 * - **Roundtrip Integrity**: Explicit property defaults for reliable import/export cycles
 * 
 * State Preservation Logic:
 * 1. Detect children in manually-positioned parents (lock their dimensions)
 * 2. Set explicit defaults for layout-critical properties
 * 3. Calculate diagram bounding box for layout metadata
 * 4. Include complete heatmap state for visualization restoration
 * 5. Add timestamp for version tracking and debugging
 * 
 * @param rectangles - Rectangle data with complete hierarchy and properties
 * @param globalSettings - Application settings to preserve (uses defaults if undefined)
 * @param filename - Output filename for download (without extension)
 * @param predefinedColors - Color palette to include in global settings
 * @param heatmapState - Current heatmap configuration and values to preserve
 * @param preserveLayout - Whether to maintain current positioning (true for save, false for template)
 */
const exportToJSON = async (rectangles: Rectangle[], globalSettings: GlobalSettings | undefined, filename: string, predefinedColors?: string[], heatmapState?: HeatmapState, preserveLayout = true): Promise<void> => {
  // Create default settings with all required properties
  const defaultSettings = {
    gridSize: 20,
    showGrid: true,
    leafFixedWidth: false,
    leafFixedHeight: false,
    leafWidth: 8,
    leafHeight: 4,
    rootFontSize: 14,
    dynamicFontSizing: false,
    fontFamily: 'Inter' as const,
    borderRadius: 8,
    borderColor: '#374151',
    borderWidth: 2,
    margin: 1,
    labelMargin: 2,
    layoutAlgorithm: 'grid' as const,
    predefinedColors: predefinedColors || []
  };

  const enhancedGlobalSettings = globalSettings ? {
    ...defaultSettings,
    ...globalSettings,
    predefinedColors: predefinedColors || globalSettings.predefinedColors
  } : defaultSettings;

  /**
   * Check if a rectangle is contained within a manually-positioned parent.
   * Children of manual parents need special handling to preserve their custom dimensions.
   */
  const isInManualModeParent = (rect: Rectangle): boolean => {
    if (!rect.parentId) return false;
    const parent = rectangles.find(r => r.id === rect.parentId);
    return parent?.isManualPositioningEnabled === true;
  };

  // Ensure layout-critical properties are explicitly set for round-trip integrity
  const rectanglesWithLayoutProperties = rectangles.map(rect => {
    const inManualParent = isInManualModeParent(rect);
    return {
      ...rect,
      // Explicitly export manual positioning state
      isManualPositioningEnabled: rect.isManualPositioningEnabled ?? false,
      // Lock dimensions for children in manual parents to preserve custom sizing
      isLockedAsIs: inManualParent ? true : (rect.isLockedAsIs ?? false),
      // Preserve UI state flags
      isEditing: rect.isEditing ?? false,
      isTextLabel: rect.isTextLabel ?? false
    };
  });

  // Create v2.0 schema with layout preservation metadata
  const boundingBox = calculateBoundingBox(rectangles);
  
  const data: SavedDiagram = {
    version: '2.0',
    rectangles: rectanglesWithLayoutProperties,
    globalSettings: enhancedGlobalSettings,
    layoutMetadata: {
      algorithm: enhancedGlobalSettings.layoutAlgorithm,
      isUserArranged: rectangles.some(r => r.isManualPositioningEnabled),
      preservePositions: preserveLayout,
      boundingBox
    },
    heatmapState: heatmapState,
    timestamp: Date.now()
  };

  const jsonContent = JSON.stringify(data, null, 2);

  await exportFile({
    filename,
    content: jsonContent,
    mimeType: 'application/json',
    extension: 'json',
    description: 'JSON files'
  });
};

/**
 * Export diagram to PowerPoint (PPTX) using PptxGenJS library.
 * 
 * Creates a native PowerPoint presentation with the following features:
 * - Dynamic slide sizing based on diagram bounds (minimum 4x3 inches)
 * - Each rectangle rendered as a rounded shape with embedded text
 * - Preserves visual hierarchy through font weight (bold for parents)
 * - Text positioning matches HTML/SVG exports (top-aligned for parents, centered for leaves)
 * - Handles text labels separately without shape backgrounds
 * - Supports all global settings (fonts, colors, borders, margins)
 * - Maintains heat map colors when visualization is enabled
 * 
 * The export uses inches for PowerPoint's internal coordinate system (96 DPI conversion).
 * Border radius is scaled from pixels to PowerPoint's 0-1 range for rounded corners.
 */
const exportToPPTX = async (
  rectangles: Rectangle[],
  filename: string,
  options: { includeBackground: boolean },
  globalSettings?: GlobalSettings,
  gridSize: number = 20,
  borderRadius: number = 8,
  borderColor: string = '#374151',
  borderWidth: number = 2
): Promise<void> => {
  const pptx = new PptxGenJS();
  
  // Handle empty diagram edge case by creating minimal presentation
  if (rectangles.length === 0) {
    await pptx.writeFile({ fileName: `${filename}.pptx` });
    return;
  }

  // Calculate diagram bounds in grid units for coordinate transformation
  const minX = Math.min(...rectangles.map(r => r.x));
  const minY = Math.min(...rectangles.map(r => r.y));
  const maxX = Math.max(...rectangles.map(r => r.x + r.w));
  const maxY = Math.max(...rectangles.map(r => r.y + r.h));

  const marginPx = 20;
  const scale = 1; // Fixed scale value
  const contentWidthPx = (maxX - minX) * gridSize * scale;
  const contentHeightPx = (maxY - minY) * gridSize * scale;
  const totalWidthPx = contentWidthPx + marginPx * 2;
  const totalHeightPx = contentHeightPx + marginPx * 2;

  // PowerPoint uses inches internally - convert from pixels at 96 DPI
  const pxToIn = (px: number) => px / 96;
  const slideW = Math.max(pxToIn(totalWidthPx), 4); // Ensure minimum 4 inches width
  const slideH = Math.max(pxToIn(totalHeightPx), 3); // Ensure minimum 3 inches height

  pptx.defineLayout({ name: 'CONTENT_FIT', width: slideW, height: slideH });
  pptx.layout = 'CONTENT_FIT';

  const slide = pptx.addSlide();
  if (options.includeBackground) {
    slide.bkgd = 'FFFFFF';
  }

  // Extract visual settings with fallbacks to maintain consistency across export formats
  const fontFamily = globalSettings?.fontFamily || 'Inter';
  const marginSetting = globalSettings?.margin || 1;
  const rootFontSize = globalSettings?.rootFontSize || 12;
  const dynamicFontSizing = globalSettings?.dynamicFontSizing ?? true;
  const actualBorderRadius = globalSettings?.borderRadius !== undefined ? globalSettings.borderRadius : borderRadius;
  const actualBorderColor = globalSettings?.borderColor || borderColor;
  const actualBorderWidth = globalSettings?.borderWidth !== undefined ? globalSettings.borderWidth : borderWidth;

  // Build hierarchy metadata for proper rendering order and text formatting
  const hasChildren = new Set<string>();
  rectangles.forEach(r => { if (r.parentId) hasChildren.add(r.parentId); });
  
  /**
   * Calculate depth in hierarchy tree for font size scaling.
   * Prevents infinite loops with depth limit of 10.
   */
  const getDepth = (rectId: string): number => {
    const rect = rectangles.find(r => r.id === rectId);
    if (!rect || !rect.parentId) return 0;
    let depth = 0;
    let current: Rectangle | undefined = rect;
    while (current && current.parentId) {
      depth++;
      current = rectangles.find(r => r.id === current!.parentId);
      if (!current || depth > 10) break;
    }
    return depth;
  };
  const calculateFontSize = (rectId: string): number => {
    if (!dynamicFontSizing) return rootFontSize;
    const depth = getDepth(rectId);
    return Math.max(rootFontSize * Math.pow(0.9, depth), rootFontSize * 0.6);
  };

  // Sort by depth to ensure proper z-ordering (parents rendered before children)
  const sorted = [...rectangles].sort((a, b) => {
    const depthA = getDepth(a.id);
    const depthB = getDepth(b.id);
    return depthA - depthB;
  });

  for (const rect of sorted) {
    const xPx = (rect.x - minX) * gridSize * scale + marginPx;
    const yPx = (rect.y - minY) * gridSize * scale + marginPx;
    const wPx = rect.w * gridSize * scale;
    const hPx = rect.h * gridSize * scale;

    const xIn = pxToIn(xPx);
    const yIn = pxToIn(yPx);
    const wIn = pxToIn(wPx);
    const hIn = pxToIn(hPx);

    const isTextLabel = rect.isTextLabel || rect.type === 'textLabel';
    const isParent = hasChildren.has(rect.id);
    
    // Calculate initial font size
    let initialFontSize = isTextLabel ? (rect.textFontSize || 14) : calculateFontSize(rect.id);
    
    // Calculate available space for text (accounting for padding)
    const textPaddingPx = marginSetting * gridSize;
    const availableWidth = wPx - (textPaddingPx * 2);
    const availableHeight = hPx - (textPaddingPx * 2);
    
    // Optimize font size to prevent overflow/excessive wrapping
    const optimizedFontSize = optimizeFontSize(
      rect.label || '',
      availableWidth,
      availableHeight,
      initialFontSize,
      3 // Max 3 reduction steps
    );
    
    const textFontSize = Math.floor(optimizedFontSize);
    const textFontFamily = rect.textFontFamily || fontFamily;
    const fontWeight = isTextLabel ? (rect.fontWeight || 'normal') : (isParent ? 'bold' : 'normal');

    // PowerPoint's rectRadius is 0-1 where 0.5 = fully rounded
    // Map pixel radius (0-20px typical) to PowerPoint scale
    const rectRadiusValue = Math.min(actualBorderRadius / 40, 0.5);
    
    const textContent = rect.label || '';
    const align = rect.textAlign || 'center';
    const textColor = '374151'; // Hex color without # prefix for PptxGenJS
    
    const paddingPx = marginSetting * gridSize;
    const paddingIn = pxToIn(paddingPx);
    
    if (isTextLabel) {
      // Text-only elements without shape background (transparent labels)
      slide.addText(textContent, {
        x: xIn,
        y: yIn,
        w: wIn,
        h: hIn,
        fontFace: textFontFamily,
        fontSize: textFontSize,
        bold: fontWeight === 'bold',
        color: textColor,
        align: (align === 'left' ? 'left' : align === 'right' ? 'right' : 'center') as 'left' | 'center' | 'right',
        valign: 'middle' as 'top' | 'middle' | 'bottom',
      });
    } else {
      // Standard rectangles with background and border
      // PptxGenJS combines shape and text in single call for proper layering
      const fillColor = rect.color.replace('#', '');
      const lineColor = actualBorderColor.replace('#', '');
      
      // Select shape type based on border radius setting
      const shapeType = rectRadiusValue > 0 ? 'roundRect' : 'rect';
      
      slide.addText(textContent, {
        shape: shapeType,
        x: xIn,
        y: yIn,
        w: wIn,
        h: hIn,
        fill: { color: fillColor },
        line: { color: lineColor, width: actualBorderWidth },
        rectRadius: rectRadiusValue,
        fontFace: textFontFamily,
        fontSize: textFontSize,
        bold: fontWeight === 'bold',
        color: textColor,
        align: (align === 'left' ? 'left' : align === 'right' ? 'right' : 'center') as 'left' | 'center' | 'right',
        valign: (isParent ? 'top' : 'middle') as 'top' | 'middle' | 'bottom', // Parents top-aligned to match HTML/SVG
        margin: isParent ? paddingIn : 0, // Apply margin only for parent rectangles
      });
    }
  }

  await pptx.writeFile({ fileName: `${filename}.pptx` });
};

/**
 * Export diagram to Draw.io (.drawio) XML format (mxGraphModel)
 *
 * Mapping notes:
 * - Each rectangle becomes an mxCell vertex with geometry (in px = gridSize units converted)
 * - All rectangles are placed on the root layer (no parent-child grouping in Draw.io)
 * - Z-ordering is maintained by depth-based sorting (parents rendered before children)
 * - Text labels use value attribute; font style approximated by bold flag for parents
 * - Border radius maps to style rounded and arcSize; colors map to fillColor and strokeColor
 * - Text-only labels are exported as vertices with no fill (transparent)
 * - Absolute coordinates are used for all rectangles to avoid grouping behavior
 */
const exportToDrawIO = async (
  rectangles: Rectangle[],
  filename: string,
  globalSettings?: GlobalSettings,
  gridSize: number = 20,
  borderRadius: number = 8,
  borderColor: string = '#374151',
  borderWidth: number = 2
): Promise<void> => {
  if (rectangles.length === 0) {
    const empty = '<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net"><diagram id="0" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
    await exportFile({ filename, content: empty, mimeType: 'application/xml', extension: 'drawio', description: 'Draw.io files' });
    return;
  }

  // Normalization and mapping
  const gs = {
    borderRadius: globalSettings?.borderRadius ?? borderRadius,
    borderColor: globalSettings?.borderColor ?? borderColor,
    borderWidth: globalSettings?.borderWidth ?? borderWidth,
    fontFamily: globalSettings?.fontFamily ?? 'Inter',
    rootFontSize: globalSettings?.rootFontSize ?? 12,
    dynamicFontSizing: globalSettings?.dynamicFontSizing ?? true,
    margin: globalSettings?.margin ?? 1,
  };

  // Build depth map for font sizing and order
  const idToRect = new Map<string, Rectangle>(rectangles.map(r => [r.id, r]));
  const hasChildren = new Set<string>();
  rectangles.forEach(r => { if (r.parentId) hasChildren.add(r.parentId); });
  const getDepth = (id: string): number => {
    let d = 0; let cur = idToRect.get(id);
    while (cur && cur.parentId && d < 10) { d++; cur = idToRect.get(cur.parentId); }
    return d;
  };
  const calcFontSize = (id: string): number => {
    if (!gs.dynamicFontSizing) return gs.rootFontSize;
    const depth = getDepth(id);
    return Math.max(gs.rootFontSize * Math.pow(0.9, depth), gs.rootFontSize * 0.6);
  };

  // Draw.io requires a root (id=0) and a layer (id=1). All shapes will be parented to layer 1 to avoid grouping.
  const header = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<mxfile host="app.diagrams.net">',
    '<diagram id="Page-1" name="Page-1">',
    '<mxGraphModel>',
    '<root>',
    '<mxCell id="0"/>',
    '<mxCell id="1" parent="0"/>'
  ].join('\n');

  // Map app rect IDs to numeric-ish IDs safe for mxCell. Use the same IDs but ensure they don't start with non-digit by prefixing r_.
  const mxId = (id: string) => `r_${id}`;

  // Sort rectangles by depth to ensure correct z-ordering (parents drawn before children)
  const sortedRectangles = [...rectangles].sort((a, b) => {
    const depthA = getDepth(a.id);
    const depthB = getDepth(b.id);
    return depthA - depthB;
  });

  // Convert each rectangle to an mxCell vertex with geometry
  // All rectangles are parented to layer 1 (no grouping) and use absolute coordinates

  const cells = sortedRectangles.map(rect => {
    // Use absolute coordinates (no relative positioning since we're not grouping)
    const x = rect.x * gridSize;
    const y = rect.y * gridSize;
    const w = rect.w * gridSize;
    const h = rect.h * gridSize;

    const isLabel = rect.isTextLabel || rect.type === 'textLabel';
    const isParent = hasChildren.has(rect.id);
    
    // Calculate initial font size
    const initialFontSize = rect.textFontSize ?? calcFontSize(rect.id);
    
    // Calculate available space for text (accounting for typical padding)
    const padding = gs.margin * gridSize;
    const availableWidth = w - (padding * 2);
    const availableHeight = h - (padding * 2);
    
    // Optimize font size to prevent overflow/excessive wrapping (less aggressive for Draw.io)
    const optimizedFontSize = optimizeFontSize(
      rect.label || '',
      availableWidth,
      availableHeight,
      initialFontSize,
      2 // Max 2 reduction steps for Draw.io (less aggressive)
    );
    
    const fontSize = Math.round(optimizedFontSize);
    const fontFamily = rect.textFontFamily ?? gs.fontFamily;
    const align = rect.textAlign ?? 'center';

    const fillColor = isLabel ? 'none' : rect.color;
    const strokeColor = isLabel ? 'none' : gs.borderColor;
  const rounded = (gs.borderRadius ?? 0) > 0 ? 1 : 0;
  const minDim = Math.max(1, Math.min(w, h));
  const arcSize = Math.min((gs.borderRadius / minDim) * 100, 50) || (rounded ? 10 : 0);
    const fontStyle = isParent && !isLabel ? 1 : (rect.fontWeight === 'bold' ? 1 : 0); // 1=bold

    // Draw.io style string
    const styleParts = [
      'shape=rectangle',
  `rounded=${rounded}`,
      `arcSize=${Math.round(arcSize)}`,
      `fillColor=${fillColor}`,
      `strokeColor=${strokeColor}`,
      `strokeWidth=${gs.borderWidth}`,
      `fontFamily=${fontFamily}`,
      `fontSize=${Math.round(fontSize)}`,
      `fontStyle=${fontStyle}`,
  'html=1',
      `align=${align}`,
      `verticalAlign=${isParent ? 'top' : 'middle'}`,
      'whiteSpace=wrap',
  // Nudge parent labels upwards slightly like the sample
  `spacingTop=${isParent ? 0 : 0}`
    ];

    const style = styleParts.join(';');
    const value = escapeXML(rect.label || '');
    const id = mxId(rect.id);
    const parent = '1'; // All rectangles are parented to layer 1 to avoid grouping

    return [
      `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="${parent}">`,
      `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>`,
      `</mxCell>`
    ].join('\n');
  }).join('\n');

  const footer = ['</root>', '</mxGraphModel>', '</diagram>', '</mxfile>'].join('\n');
  const xml = [header, cells, footer].join('\n');

  await exportFile({ filename, content: xml, mimeType: 'application/xml', extension: 'drawio', description: 'Draw.io files' });
};

/**
 * Export diagram to ArchiMate Tool (.archimate) XML format for enterprise architecture modeling.
 * 
 * ArchiMate Export Architecture:
 * 1. **Model Structure**: Creates compliant ArchiMate 5.0 model with standard folder organization
 *    - Strategy folder: Contains Capability elements representing each rectangle
 *    - Relations folder: Contains Composition relationships for parent-child hierarchy
 *    - Views folder: Contains visual diagram with precise positioning and styling
 * 
 * 2. **Element Mapping**:
 *    - Regular rectangles → Strategy layer Capability elements
 *    - Text labels → Note elements with transparent background
 *    - Parent-child relationships → Composition relationships (excludes text labels)
 * 
 * 3. **Visual Preservation**:
 *    - Coordinate transformation: Grid units → pixels with (0,0) origin normalization
 *    - Font mapping: Application fonts → ArchiMate font strings with weight/size
 *    - Color preservation: Hex colors → ArchiMate RGB format
 *    - Hierarchy nesting: Child elements properly nested within parent DiagramObjects
 * 
 * 4. **Enterprise Integration**:
 *    - Compatible with ArchiMate Tool, Archi, and other enterprise architecture platforms
 *    - Preserves semantic relationships for business analysis and impact assessment
 *    - Maintains visual fidelity for presentation and stakeholder communication
 * 
 * @param rectangles - Rectangle data to transform into ArchiMate Strategy elements
 * @param filename - Output filename for .archimate file download
 * @param globalSettings - Application settings for font family, sizing, and layout preferences
 * @param gridSize - Grid unit size for pixel coordinate conversion (typically 20px)
 * @param _borderRadius - Border radius (unused in ArchiMate format)
 * @param _borderColor - Border color (unused, ArchiMate uses element-specific colors)
 * @param borderWidth - Border line width for diagram objects
 */
const exportToArchimate = async (
  rectangles: Rectangle[],
  filename: string,
  globalSettings?: GlobalSettings,
  gridSize: number = 20,
  _borderRadius: number = 8,
  _borderColor: string = '#374151',
  borderWidth: number = 2
): Promise<void> => {
  if (rectangles.length === 0) {
    const empty = '<?xml version="1.0" encoding="UTF-8"?>\n<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.archimatetool.com/archimate" name="Domain Model" id="model-' + Date.now() + '" version="5.0.0"></archimate:model>';
    await exportFile({ filename, content: empty, mimeType: 'application/xml', extension: 'archimate', description: 'ArchiMate files' });
    return;
  }

  // Generate cryptographically random IDs following ArchiMate Tool conventions
  const generateArchiId = () => `id-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  const modelId = generateArchiId();
  const strategyFolderId = generateArchiId();
  const relationsFolderId = generateArchiId();
  const viewsFolderId = generateArchiId();
  const diagramId = generateArchiId();

  // Create bidirectional mapping between application rectangle IDs and ArchiMate element/object IDs
  const elementIdMap = new Map<string, string>();
  const diagramObjectIdMap = new Map<string, string>();
  rectangles.forEach(rect => {
    elementIdMap.set(rect.id, generateArchiId());
    diagramObjectIdMap.set(rect.id, generateArchiId());
  });

  /** 
   * Build Composition relationships from parent-child hierarchy.
   * Text labels are excluded as they don't represent business elements in ArchiMate.
   */
  const relationships: Array<{ id: string; sourceId: string; targetId: string; sourceObjId: string; targetObjId: string; connectionId: string }> = [];
  
  rectangles.forEach(rect => {
    // Skip text labels - they don't have relationships in ArchiMate
    if (rect.isTextLabel) return;
    
    if (rect.parentId) {
      const parentRect = rectangles.find(r => r.id === rect.parentId);
      // Skip if parent is a text label
      if (parentRect?.isTextLabel) return;
      
      const sourceElementId = elementIdMap.get(rect.parentId);
      const targetElementId = elementIdMap.get(rect.id);
      const sourceObjId = diagramObjectIdMap.get(rect.parentId);
      const targetObjId = diagramObjectIdMap.get(rect.id);
      
      if (sourceElementId && targetElementId && sourceObjId && targetObjId) {
        relationships.push({
          id: generateArchiId(),
          sourceId: sourceElementId,
          targetId: targetElementId,
          sourceObjId: sourceObjId,
          targetObjId: targetObjId,
          connectionId: generateArchiId()
        });
      }
    }
  });

  // Normalize coordinates to start at (0,0) for ArchiMate diagram positioning
  const minX = rectangles.length > 0 ? Math.min(...rectangles.map(r => r.x)) : 0;
  const minY = rectangles.length > 0 ? Math.min(...rectangles.map(r => r.y)) : 0;
  
  // Helper to get depth and check if has children
  const hasChildren = new Set<string>();
  rectangles.forEach(r => { if (r.parentId) hasChildren.add(r.parentId); });
  
  const getDepth = (rectId: string): number => {
    const rect = rectangles.find(r => r.id === rectId);
    if (!rect || !rect.parentId) return 0;
    let depth = 0;
    let current: Rectangle | undefined = rect;
    while (current && current.parentId && depth < 10) {
      depth++;
      current = rectangles.find(r => r.id === current!.parentId);
    }
    return depth;
  };

  // Calculate font size based on settings
  const rootFontSize = globalSettings?.rootFontSize || 14;
  const dynamicFontSizing = globalSettings?.dynamicFontSizing ?? false;
  const fontFamily = globalSettings?.fontFamily || 'Verdana';
  
  const calculateFontSize = (rectId: string): number => {
    if (!dynamicFontSizing) return rootFontSize;
    const depth = getDepth(rectId);
    return Math.max(rootFontSize * Math.pow(0.9, depth), rootFontSize * 0.6);
  };

  // Generate Strategy layer Capability elements (text labels become Notes in diagram only)
  const strategyElements = rectangles
    .filter(rect => !rect.isTextLabel)
    .map(rect => {
      const elementId = elementIdMap.get(rect.id);
      const name = escapeXML(rect.label || 'Unnamed');
      return `    <element xsi:type="archimate:Capability" name="${name}" id="${elementId}"/>`;
    }).join('\n');

  // Build relationships
  const relationElements = relationships.map(rel => {
    return `    <element xsi:type="archimate:CompositionRelationship" id="${rel.id}" source="${rel.sourceId}" target="${rel.targetId}"/>`;
  }).join('\n');

  /** 
   * Recursively build nested ArchiMate DiagramObjects preserving visual hierarchy.
   * Each rectangle becomes a DiagramObject with proper positioning, styling, and nesting.
   */
  const buildDiagramObject = (rect: Rectangle, parentRect?: Rectangle): string => {
    const objectId = diagramObjectIdMap.get(rect.id);
    const elementId = elementIdMap.get(rect.id);
    const isParent = hasChildren.has(rect.id);
    const isTextLabel = rect.isTextLabel || false;
    
    // Calculate absolute position with transposition to start at (0,0)
    let x = (rect.x - minX) * gridSize;
    let y = (rect.y - minY) * gridSize;
    
    // If this is a child, convert to relative position within parent
    if (parentRect) {
      x = (rect.x - parentRect.x) * gridSize;
      y = (rect.y - parentRect.y) * gridSize;
    }
    
    const width = rect.w * gridSize;
    const height = rect.h * gridSize;
    
    // Calculate initial font settings
    const initialFontSize = isTextLabel ? (rect.textFontSize || 24) : calculateFontSize(rect.id);
    
    // Calculate available space for text (accounting for typical ArchiMate margins)
    const padding = 8; // ArchiMate typically uses smaller padding
    const availableWidth = width - (padding * 2);
    const availableHeight = height - (padding * 2);
    
    // Optimize font size to prevent overflow/excessive wrapping
    const optimizedFontSize = optimizeFontSize(
      rect.label || '',
      availableWidth,
      availableHeight,
      initialFontSize,
      3 // Max 3 reduction steps
    );
    
    const fontSize = Math.round(optimizedFontSize);
    const fontWeight = isTextLabel ? 400 : (isParent ? 700 : 400);
    const fontBold = isTextLabel ? '0' : (isParent ? '1' : '0');
    
    // Build font string for ArchiMate (format: "style|family|size|bold|platform|...")
    const fontString = `1|${fontFamily}|${fontSize}|${fontBold}|WINDOWS|1|-${Math.round(fontSize * 2)}|0|0|0|${fontWeight}|0|0|0|0|3|2|1|34|${fontFamily}`;
    
    // Handle text labels differently - they are Note elements
    if (isTextLabel) {
      const textAlign = rect.textAlign || 'center';
      const textAlignValue = textAlign === 'left' ? '1' : textAlign === 'right' ? '3' : '2'; // 1=left, 2=center, 3=right
      const content = escapeXML(rect.label || '');
      
      return `      <child xsi:type="archimate:Note" id="${objectId}" font="${fontString}" textAlignment="${textAlignValue}" textPosition="1" borderType="2">
        <bounds x="${x}" y="${y}" width="${width}" height="${height}"/>
        <content>${content}</content>
      </child>`;
    }
    
    // Convert color from hex to decimal RGB
    const hexToRgb = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '#c0c0c0'; // Default gray
      return `#${result[1]}${result[2]}${result[3]}`;
    };
    
    const fillColor = hexToRgb(rect.color);
    
    // Find child rectangles
    const children = rectangles.filter(r => r.parentId === rect.id);
    
    // Build source connections for this object
    const sourceConnections = relationships
      .filter(rel => rel.sourceObjId === objectId)
      .map(rel => {
        return `        <sourceConnection xsi:type="archimate:Connection" id="${rel.connectionId}" source="${rel.sourceObjId}" target="${rel.targetObjId}" archimateRelationship="${rel.id}"/>`;
      })
      .join('\n');
    
    // Get target connections that reference this object
    const targetConnectionsList = relationships
      .filter(rel => rel.targetObjId === objectId)
      .map(rel => rel.connectionId);
    
    const targetConnectionsAttr = targetConnectionsList.length > 0 ? ` targetConnections="${targetConnectionsList.join(' ')}"` : '';
    
    // Build nested child elements
    const childElements = children.map(child => buildDiagramObject(child, rect))
      .map(childXml => '  ' + childXml.split('\n').join('\n  ')) // Indent child elements
      .join('\n');
    
    // Add textPosition="1" for leaf nodes to center labels
    const textPositionAttr = !isParent ? ' textPosition="1"' : '';
    
    let xml = `      <child xsi:type="archimate:DiagramObject" id="${objectId}"${targetConnectionsAttr} font="${fontString}" lineWidth="${borderWidth}" fillColor="${fillColor}"${textPositionAttr} archimateElement="${elementId}">
        <bounds x="${x}" y="${y}" width="${width}" height="${height}"/>
        <feature name="iconVisible" value="2"/>`;
    
    if (sourceConnections) {
      xml += '\n' + sourceConnections;
    }
    
    if (childElements) {
      xml += '\n' + childElements;
    }
    
    xml += '\n      </child>';
    
    return xml;
  };

  // Build root diagram objects
  const rootRectangles = rectangles.filter(r => !r.parentId);
  const diagramObjects = rootRectangles.map(rect => buildDiagramObject(rect)).join('\n');

  // Build complete ArchiMate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.archimatetool.com/archimate" name="Domain Model" id="${modelId}" version="5.0.0">
  <folder name="Strategy" id="${strategyFolderId}" type="strategy">
${strategyElements}
  </folder>
  <folder name="Business" id="${generateArchiId()}" type="business"/>
  <folder name="Application" id="${generateArchiId()}" type="application"/>
  <folder name="Technology &amp; Physical" id="${generateArchiId()}" type="technology"/>
  <folder name="Motivation" id="${generateArchiId()}" type="motivation"/>
  <folder name="Implementation &amp; Migration" id="${generateArchiId()}" type="implementation_migration"/>
  <folder name="Other" id="${generateArchiId()}" type="other"/>
  <folder name="Relations" id="${relationsFolderId}" type="relations">
${relationElements}
  </folder>
  <folder name="Views" id="${viewsFolderId}" type="diagrams">
    <element xsi:type="archimate:ArchimateDiagramModel" name="Domain View" id="${diagramId}">
${diagramObjects}
    </element>
  </folder>
</archimate:model>`;

  await exportFile({ 
    filename, 
    content: xml, 
    mimeType: 'application/xml', 
    extension: 'archimate', 
    description: 'ArchiMate files' 
  });
};

/**
 * Escape special XML/HTML characters for safe markup generation.
 * 
 * Converts potentially dangerous characters to their XML entity equivalents:
 * & → &amp; (must be first to avoid double-escaping)
 * < → &lt; (prevents tag injection)
 * > → &gt; (prevents tag closure issues) 
 * " → &quot; (safe for attribute values)
 * ' → &#39; (safe for attribute values)
 * 
 * @param text - Raw text string potentially containing special characters
 * @returns XML-safe string suitable for element content and attributes
 */
const escapeXML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Check if text would require wrapping or exceed height constraints.
 * 
 * @param text - Text content to check
 * @param availableWidth - Available width in pixels
 * @param availableHeight - Available height in pixels
 * @param fontSize - Current font size
 * @returns True if text would require multiple lines or exceed height
 */
const wouldTextRequireWrapping = (text: string, availableWidth: number, availableHeight: number, fontSize: number): boolean => {
  const words = text.split(' ');
  const charWidth = fontSize * 0.6;
  const lineHeight = fontSize * 1.2;
  const maxCharsPerLine = Math.floor(availableWidth / charWidth);
  
  let lines = 1;
  let currentLineLength = 0;
  
  for (const word of words) {
    const wordLength = word.length;
    const testLength = currentLineLength === 0 ? wordLength : currentLineLength + 1 + wordLength; // +1 for space
    
    if (testLength > maxCharsPerLine) {
      if (currentLineLength > 0) {
        lines++;
        currentLineLength = wordLength;
      } else {
        // Single word longer than line, will be truncated
        lines++;
        currentLineLength = 0;
      }
    } else {
      currentLineLength = testLength;
    }
  }
  
  const totalHeight = lines * lineHeight;
  return totalHeight > availableHeight;
};

/**
 * Find optimal font size to prevent text from exceeding available height.
 * 
 * Attempts to reduce font size by 1-3 steps until wrapped text fits within height constraints.
 * Both leaf and parent nodes now support word wrapping - font size is only reduced when
 * the wrapped text would exceed the available height.
 * 
 * @param text - Text content to fit
 * @param availableWidth - Available width in pixels
 * @param availableHeight - Available height in pixels
 * @param initialFontSize - Starting font size
 * @param maxReduction - Maximum font size reduction steps (default 3)
 * @returns Optimized font size
 */
const optimizeFontSize = (
  text: string, 
  availableWidth: number, 
  availableHeight: number, 
  initialFontSize: number, 
  maxReduction: number = 3
): number => {
  if (!text || text.trim().length === 0) {
    return initialFontSize;
  }
  
  let fontSize = initialFontSize;
  let reductionSteps = 0;
  
  while (reductionSteps < maxReduction) {
    // Check if wrapped text fits within height constraints
    if (!wouldTextRequireWrapping(text, availableWidth, availableHeight, fontSize)) {
      break;
    }
    
    // More conservative reduction: smaller steps and higher minimum
    const reduction = fontSize > 16 ? 1.5 : 1; // Smaller reductions
    fontSize = Math.max(fontSize - reduction, Math.floor(initialFontSize * 0.75)); // Don't go below 75% of original (was 60%)
    reductionSteps++;
  }
  
  return Math.floor(fontSize); // Ensure integer font size
};

/**
 * Intelligent text wrapping for fixed-width containers with character-based estimation.
 * 
 * Algorithm:
 * 1. Calculate approximate character width (0.6 × fontSize for typical fonts)
 * 2. Determine maximum characters per line based on container width
 * 3. Break text on word boundaries when possible
 * 4. Handle edge cases like single words exceeding line width
 * 
 * Character Width Assumptions:
 * - Uses 0.6 × fontSize as average character width
 * - Works well for most sans-serif fonts (Inter, Arial, Helvetica)
 * - Provides conservative estimates to prevent overflow
 * 
 * @param text - Input text to wrap (spaces used as word delimiters)
 * @param maxWidth - Available width in pixels for text rendering
 * @param fontSize - Font size for character width calculation
 * @returns Array of text lines that fit within maxWidth constraints
 */
const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  // Character width approximation: 0.6 * fontSize is typical for most fonts
  const charWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / charWidth);
  
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Single word is too long, truncate it
        lines.push(word.substring(0, maxChars));
        currentLine = '';
      }
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

/**
 * Generate complete SVG document from rectangle data
 * 
 * Creates production-ready SVG with:
 * - Proper coordinate transformation from grid to pixels
 * - Hierarchical rendering order (parents before children)
 * - Text wrapping and alignment
 * - Custom styling and fonts
 * - Scalable dimensions with margin padding
 * 
 * @param rectangles - Rectangle data to render
 * @param options - Scaling and background options
 * @param globalSettings - Font and styling preferences
 * @param gridSize - Grid unit to pixel conversion factor
 * @param borderRadius - Rectangle corner radius
 * @param borderColor - Default border color
 * @param borderWidth - Border thickness
 * @returns Complete SVG markup string
 */
const createSVGFromRectangles = (
  rectangles: Rectangle[],
  options: { scale: number; includeBackground: boolean },
  globalSettings?: GlobalSettings,
  gridSize: number = 20,
  borderRadius: number = 8,
  borderColor: string = '#374151',
  borderWidth: number = 2
): string => {
  if (rectangles.length === 0) return '';

  // Calculate bounding box
  const minX = Math.min(...rectangles.map(r => r.x));
  const minY = Math.min(...rectangles.map(r => r.y));
  const maxX = Math.max(...rectangles.map(r => r.x + r.w));
  const maxY = Math.max(...rectangles.map(r => r.y + r.h));
  
  // Add margin around the content
  const margin = 20; // 20px margin
  const scale = options.scale || 1; // Use provided scale or default to 1
  const contentWidth = (maxX - minX) * gridSize * scale;
  const contentHeight = (maxY - minY) * gridSize * scale;
  const width = contentWidth + (margin * 2);
  const height = contentHeight + (margin * 2);

  // Extract font settings from globalSettings to match HTML export
  const fontFamily = globalSettings?.fontFamily || 'Inter';
  const marginSetting = globalSettings?.margin || 1;
  const rootFontSize = globalSettings?.rootFontSize || 12;
  const dynamicFontSizing = globalSettings?.dynamicFontSizing ?? true;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  if (options.includeBackground) {
    svg += `<rect width="100%" height="100%" fill="white"/>`;
  }

  // Sort rectangles by depth (parents first for proper SVG stacking)
  const sortedRectangles = [...rectangles].sort((a, b) => {
    // Calculate depth for each rectangle
    const getDepth = (rect: Rectangle): number => {
      let depth = 0;
      let current = rect;
      while (current && current.parentId) {
        depth++;
        const parent = rectangles.find(r => r.id === current.parentId);
        if (!parent || depth > 10) break;
        current = parent;
      }
      return depth;
    };
    
    const depthA = getDepth(a);
    const depthB = getDepth(b);
    
    // Sort by depth (shallower elements first for SVG stacking)
    return depthA - depthB;
  });

  // Check which rectangles have children
  const hasChildren = new Set<string>();
  rectangles.forEach(rect => {
    if (rect.parentId) {
      hasChildren.add(rect.parentId);
    }
  });

  // Helper function to calculate hierarchy depth (same as HTML export)
  const getDepth = (rectId: string): number => {
    const rect = rectangles.find(r => r.id === rectId);
    if (!rect || !rect.parentId) return 0;
    
    let depth = 0;
    let current = rect;
    
    while (current && current.parentId) {
      depth++;
      const parent = rectangles.find(r => r.id === current!.parentId);
      if (!parent || depth > 10) break; // Prevent infinite loops
      current = parent;
    }
    
    return depth;
  };
  
  // Helper function to calculate font size based on depth (same as HTML export)
  const calculateFontSize = (rectId: string): number => {
    if (!dynamicFontSizing) return rootFontSize;
    
    const depth = getDepth(rectId);
    // Scale down font size by 10% for each level of depth
    return Math.max(rootFontSize * Math.pow(0.9, depth), rootFontSize * 0.6);
  };

  sortedRectangles.forEach(rect => {
    // Adjust coordinates to start from top-left with margin offset
    const x = (rect.x - minX) * gridSize * scale + margin;
    const y = (rect.y - minY) * gridSize * scale + margin;
    const w = rect.w * gridSize * scale;
    const h = rect.h * gridSize * scale;

    // Calculate text positioning and wrapping with HTML-matching logic
    const isTextLabel = rect.isTextLabel || rect.type === 'textLabel';
    const isParent = hasChildren.has(rect.id);
    
    // Calculate initial font size
    let initialFontSize = isTextLabel ? (rect.textFontSize || 14) : calculateFontSize(rect.id);
    
    // Use same padding calculation as HTML export
    const padding = marginSetting * gridSize;
    const textWidth = w - (padding * 2);
    const textHeight = h - (padding * 2);
    
    // Optimize font size to prevent overflow/excessive wrapping (less aggressive for SVG)
    const optimizedFontSize = optimizeFontSize(
      rect.label || '',
      textWidth,
      textHeight,
      initialFontSize,
      2 // Max 2 reduction steps for SVG (less aggressive)
    );
    
    const fontSize = optimizedFontSize;
    const textFontFamily = isTextLabel ? (rect.textFontFamily || fontFamily) : (rect.textFontFamily || fontFamily);
    const fontWeight = isTextLabel ? (rect.fontWeight || 'normal') : (isParent ? 'bold' : 'normal');
    const textAlign = isTextLabel ? (rect.textAlign || 'center') : 'center';
    
    // Text labels should have transparent background and no border
    const fillColor = isTextLabel ? 'transparent' : rect.color;
    const strokeColor = isTextLabel ? 'transparent' : borderColor;
    const strokeWidthFinal = isTextLabel ? 0 : borderWidth;
    
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
      fill="${fillColor}" 
      stroke="${strokeColor}" 
      stroke-width="${strokeWidthFinal}" 
      rx="${borderRadius}"/>`;
    
    const lines = wrapText(rect.label, textWidth, fontSize);
    
    const lineHeight = fontSize * 1.2;
    
    let textStartY: number;
    if (isParent) {
      // Top-align for rectangles with children (match HTML export logic)
      textStartY = y + padding + fontSize - (fontSize * 0.5);
    } else {
      // Center-align for leaf rectangles
      const totalTextHeight = lines.length * lineHeight;
      textStartY = y + (h - totalTextHeight) / 2 + fontSize;
    }
    
    lines.forEach((line, index) => {
      const textY = textStartY + (index * lineHeight);
      let textX: number;
      let textAnchor: string;
      
      // Handle text alignment for text labels (match HTML export)
      if (isTextLabel) {
        switch (textAlign) {
          case 'left':
            textX = x + padding;
            textAnchor = 'start';
            break;
          case 'right':
            textX = x + w - padding;
            textAnchor = 'end';
            break;
          case 'justify':
          case 'center':
          default:
            textX = x + w / 2;
            textAnchor = 'middle';
        }
      } else {
        textX = x + w / 2; // Center horizontally for regular rectangles
        textAnchor = 'middle';
      }
      
      // Use comprehensive font family with fallbacks (match HTML export)
      const fontFamilyWithFallbacks = `${textFontFamily}, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`;
      
      svg += `<text x="${textX}" y="${textY}" 
        font-family="${fontFamilyWithFallbacks}" 
        font-size="${fontSize}" 
        font-weight="${fontWeight}" 
        fill="#374151"
        text-anchor="${textAnchor}">${escapeXML(line)}</text>`;
    });
  });

  svg += '</svg>';
  return svg;
};

export interface ImportedDiagramData {
  rectangles: Rectangle[];
  globalSettings?: GlobalSettings;
  version: string;
  timestamp?: string | number;
  layoutMetadata?: {
    algorithm: string;
    isUserArranged: boolean;
    preservePositions: boolean;
    boundingBox: { w: number; h: number };
  };
  // Optional heat map state saved with the diagram export (for restoration on import)
  heatmapState?: HeatmapState;
}

/**
 * Validate imported data against diagram schema.
 * 
 * Performs comprehensive validation using the schema validation system
 * to ensure data integrity and prevent corruption from malformed imports.
 * 
 * @param data - Raw imported data to validate
 * @returns Validation result with success/failure and error details
 */
export const validateImportedData = (data: unknown): ValidationResult => {
  return validateDiagramAuto(data);
};

/**
 * Robust JSON diagram import with multi-stage validation and error recovery.
 * 
 * Import Process:
 * 1. **File Reading**: Asynchronous file content reading with error handling
 * 2. **JSON Parsing**: Safe JSON parsing with descriptive error messages
 * 3. **Schema Validation**: Primary validation against v2.0 diagram schema
 * 4. **Data Sanitization**: Automatic repair of common data structure issues
 * 5. **Re-validation**: Confirmation that sanitized data meets schema requirements
 * 6. **Warning Reporting**: Non-blocking warnings for user awareness
 * 
 * Error Recovery Strategies:
 * - Missing required properties filled with sensible defaults
 * - Invalid parent references converted to root rectangles
 * - Malformed color values replaced with fallback colors
 * - Corrupt hierarchy relationships repaired automatically
 * 
 * @param file - JSON file containing diagram data to import
 * @returns Promise resolving to validated and sanitized diagram data
 * @throws Error with descriptive message if data cannot be recovered
 */
export const importDiagramFromJSON = (file: File): Promise<ImportedDiagramData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let data = JSON.parse(text);
        
        // First validate the raw data
        const validation = validateImportedData(data);
        
        if (!validation.isValid) {
          // Try to sanitize the data if validation fails
          console.warn('Data validation failed, attempting to sanitize:', validation.errors);
          data = sanitizeDiagramData(data);
          
          if (!data) {
            reject(new Error(`Invalid JSON data: ${validation.errors.join(', ')}`));
            return;
          }
          
          // Re-validate after sanitization
          const revalidation = validateImportedData(data);
          if (!revalidation.isValid) {
            reject(new Error(`Invalid JSON data after sanitization: ${revalidation.errors.join(', ')}`));
            return;
          }
        }

        if (validation.warnings.length > 0) {
          console.warn('Import warnings:', validation.warnings);
        }


        resolve(data as ImportedDiagramData);
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Repair hierarchy integrity by fixing invalid parent references
 * 
 * Validates that all parentId references point to existing rectangles.
 * Converts orphaned rectangles (invalid parent) to root rectangles.
 * 
 * @param rectangles - Rectangle data to validate
 * @returns Rectangles with fixed parent relationships
 */
export const validateAndFixRectangleRelationships = (rectangles: Rectangle[]): Rectangle[] => {
  const rectMap = new Map(rectangles.map(r => [r.id, r]));
  
  return rectangles.map(rect => {
    // Fix invalid parent references
    if (rect.parentId && !rectMap.has(rect.parentId)) {
      console.warn(`Rectangle ${rect.id} has invalid parent ${rect.parentId}, making it a root`);
      return { ...rect, parentId: undefined };
    }
    return rect;
  });
};

/**
 * Infer correct rectangle types from hierarchy relationships
 * 
 * @param rectangles - Rectangles to update
 * @returns Rectangles with corrected type assignments
 */
export const updateRectangleTypes = (rectangles: Rectangle[]): Rectangle[] => {
  return rectangles.map(rect => {
    const hasChildren = rectangles.some(r => r.parentId === rect.id);
    const hasParent = rect.parentId !== undefined;
    
    let newType: 'root' | 'parent' | 'leaf';
    if (!hasParent) {
      newType = 'root';
    } else if (hasChildren) {
      newType = 'parent';
    } else {
      newType = 'leaf';
    }
    
    return { ...rect, type: newType };
  });
};

/**
 * Ensure unique rectangle IDs and track maximum ID for future allocation
 * 
 * Handles:
 * - Duplicate ID detection and reassignment
 * - Invalid/empty ID correction
 * - Maximum ID tracking for next available ID calculation
 * 
 * @param rectangles - Rectangles to validate
 * @param currentNextId - Current next available ID number
 * @returns Fixed rectangles and updated maximum ID
 */
export const validateAndFixRectangleIds = (rectangles: Rectangle[], currentNextId: number): { rectangles: Rectangle[], maxId: number } => {
  const idSet = new Set<string>();
  let nextId = currentNextId;
  let maxId = currentNextId - 1;
  
  const fixedRectangles = rectangles.map(rect => {
    // Extract numeric ID if it follows the rect-N pattern
    const idMatch = rect.id.match(/^rect-(\d+)$/);
    if (idMatch) {
      const numericId = parseInt(idMatch[1], 10);
      maxId = Math.max(maxId, numericId);
    }
    
    // Check for duplicate or invalid IDs
    if (idSet.has(rect.id) || !rect.id) {
      const newId = `rect-${nextId++}`;
      console.warn(`Rectangle ${rect.id} has duplicate/invalid ID, changing to ${newId}`);
      idSet.add(newId);
      return { ...rect, id: newId };
    }
    
    idSet.add(rect.id);
    return rect;
  });
  
  return { rectangles: fixedRectangles, maxId };
};

/**
 * Comprehensive import data processing pipeline ensuring data integrity and consistency.
 * 
 * Multi-Stage Processing:
 * 1. **Relationship Repair**: Fix orphaned rectangles and invalid parent references
 * 2. **Type Correction**: Update rectangle types based on actual hierarchy relationships
 * 3. **Property Restoration**: Set explicit defaults for layout-critical properties
 * 4. **ID Validation**: Ensure unique IDs and fix duplicates with new assignments
 * 5. **Counter Management**: Update next available ID to prevent future conflicts
 * 
 * Data Integrity Guarantees:
 * - All parent references point to existing rectangles
 * - Rectangle types match their actual role in hierarchy (root/parent/leaf)
 * - Layout properties have explicit values for predictable behavior
 * - All IDs are unique and follow rect-N naming convention
 * - Next ID counter prevents collisions with existing rectangles
 * 
 * @param importedData - Raw diagram data from JSON import (potentially malformed)
 * @param currentNextId - Current application's next available rectangle ID
 * @returns Validated rectangles and updated next ID for consistent state management
 */
export const processImportedDiagram = (importedData: ImportedDiagramData, currentNextId: number): { rectangles: Rectangle[], nextId: number } => {
  // Step 1: Validate and fix rectangle relationships
  let processedRectangles = validateAndFixRectangleRelationships(importedData.rectangles);
  
  // Step 2: Update rectangle types based on actual relationships
  processedRectangles = updateRectangleTypes(processedRectangles);
  
  // Step 3: Restore layout properties with proper defaults for roundtrip integrity
  processedRectangles = processedRectangles.map(rect => ({
    ...rect,
    // Ensure layout-critical properties are preserved with proper defaults
    isManualPositioningEnabled: rect.isManualPositioningEnabled ?? false,
    isLockedAsIs: rect.isLockedAsIs ?? false,
    // Preserve editing and text label states  
    isEditing: rect.isEditing ?? false,
    isTextLabel: rect.isTextLabel ?? false
  }));
  
  // Step 4: Validate and fix rectangle IDs
  const { rectangles: fixedRectangles, maxId } = validateAndFixRectangleIds(processedRectangles, currentNextId);
  
  // Step 5: Calculate new nextId to prevent future conflicts
  const newNextId = maxId + 1;
  
  return { rectangles: fixedRectangles, nextId: newNextId };
};