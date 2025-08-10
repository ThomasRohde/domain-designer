import { Rectangle, ExportOptions, GlobalSettings, ValidationResult } from '../types';
import { SavedDiagram, calculateBoundingBox } from '../types/layoutSnapshot';
import { validateDiagramAuto, sanitizeDiagramData } from './schemaValidation';
import { exportToHTML } from './htmlExport';
import type { HeatmapState } from '../stores/types';
import { calculateHeatmapColor } from './heatmapColors';
import PptxGenJS from 'pptxgenjs';

/**
 * Applies heatmap colors to rectangles for export scenarios.
 * 
 * This function ensures exported formats (HTML, SVG, PDF) accurately reflect 
 * the heatmap visualization as seen in the application. When heatmap is enabled,
 * rectangle colors are replaced with their computed heatmap colors, preserving
 * the visual representation in static exports.
 * 
 * @param rectangles - Source rectangle data with heatmap values
 * @param heatmapState - Current heatmap configuration and settings
 * @returns Modified rectangles with heatmap colors applied to the color property
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
 * Shared utility for exporting files with native file dialog and fallback
 * 
 * Uses File System Access API when available to show native file dialog,
 * automatically falls back to traditional download for unsupported browsers.
 * 
 * @param options - File export configuration
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
 * Main export dispatcher supporting multiple output formats
 * 
 * Coordinates export process by delegating to format-specific handlers.
 * Generates timestamped filenames and handles browser download initiation.
 * 
 * @param containerElement - Canvas container (used for certain formats)
 * @param rectangles - Rectangle data to export
 * @param options - Export configuration including format and scaling
 * @param globalSettings - Application settings for export context
 * @param gridSize - Grid unit size for coordinate scaling
 * @param borderRadius - Visual styling parameter
 * @param borderColor - Border color for rendered formats
 * @param borderWidth - Border thickness for rendered formats
 * @param predefinedColors - Color palette for JSON exports
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
  const { format, scale = 1, includeBackground = true, confluenceMode = false } = options;
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `domain-model-${timestamp}`;
  
  // Apply heatmap colors for export to ensure visual consistency between app and exported format
  const exportRectangles = heatmapState 
    ? applyHeatmapColorsForExport(rectangles, heatmapState)
    : rectangles;

  switch (format) {
    case 'html':
      await exportToHTML(exportRectangles, filename, { includeBackground, scale, confluenceMode }, globalSettings);
      break;
    case 'svg':
      await exportToSVG(containerElement, exportRectangles, filename, { scale, includeBackground }, globalSettings, gridSize, borderRadius, borderColor, borderWidth);
      break;
    case 'json':
      await exportToJSON(exportRectangles, globalSettings, filename, predefinedColors, heatmapState, true);
      break;
    case 'pptx':
      await exportToPPTX(exportRectangles, filename, { scale, includeBackground }, globalSettings, gridSize, borderRadius, borderColor, borderWidth);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};


/**
 * Generate SVG vector graphics export with precise rendering
 * 
 * Creates scalable vector representation of the diagram with:
 * - Accurate coordinate transformation
 * - Text wrapping and font handling
 * - Hierarchical rendering order
 * - Customizable styling parameters
 * 
 * @param _element - Container element (unused in current implementation)
 * @param rectangles - Rectangle data to render
 * @param filename - Output filename for download
 * @param options - Scale and background options
 * @param globalSettings - Font and styling preferences
 * @param gridSize - Grid unit size for coordinate conversion
 * @param borderRadius - Corner radius for rectangles
 * @param borderColor - Border color
 * @param borderWidth - Border thickness
 */
const exportToSVG = async (
  _element: HTMLElement,
  rectangles: Rectangle[],
  filename: string,
  options: { scale: number; includeBackground: boolean },
  globalSettings?: GlobalSettings,
  gridSize: number = 20,
  borderRadius: number = 8,
  borderColor: string = '#374151',
  borderWidth: number = 2
): Promise<void> => {
  try {
    const svg = createSVGFromRectangles(rectangles, options, globalSettings, gridSize, borderRadius, borderColor, borderWidth);

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
 * Export diagram data in JSON format with schema versioning
 * 
 * Creates v2.0 schema-compliant JSON export with:
 * - Complete rectangle data and relationships
 * - Global settings preservation
 * - Layout preservation metadata
 * - Bounding box calculations
 * - Timestamp for version tracking
 * 
 * Uses native file dialog when supported, falls back to download.
 * 
 * @param rectangles - Rectangle data to export
 * @param globalSettings - Application settings to include
 * @param filename - Output filename for download
 * @param predefinedColors - Color palette to include
 * @param preserveLayout - Whether to preserve current positioning
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
  options: { scale: number; includeBackground: boolean },
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
  const contentWidthPx = (maxX - minX) * gridSize * options.scale;
  const contentHeightPx = (maxY - minY) * gridSize * options.scale;
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
    const xPx = (rect.x - minX) * gridSize * options.scale + marginPx;
    const yPx = (rect.y - minY) * gridSize * options.scale + marginPx;
    const wPx = rect.w * gridSize * options.scale;
    const hPx = rect.h * gridSize * options.scale;

    const xIn = pxToIn(xPx);
    const yIn = pxToIn(yPx);
    const wIn = pxToIn(wPx);
    const hIn = pxToIn(hPx);

    const isTextLabel = rect.isTextLabel || rect.type === 'textLabel';
    const isParent = hasChildren.has(rect.id);
    const textFontSize = isTextLabel ? (rect.textFontSize || 14) : calculateFontSize(rect.id);
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
 * Escape special characters for XML/SVG safety
 * 
 * @param text - Text to escape
 * @returns XML-safe text string
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
 * Break text into lines that fit within specified width
 * 
 * Uses character width approximation to estimate line lengths.
 * Prevents overflow in fixed-width containers like SVG rectangles.
 * 
 * @param text - Text to wrap
 * @param maxWidth - Maximum line width in pixels
 * @param fontSize - Font size for width calculation
 * @returns Array of text lines
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
  const contentWidth = (maxX - minX) * gridSize * options.scale;
  const contentHeight = (maxY - minY) * gridSize * options.scale;
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
    const x = (rect.x - minX) * gridSize * options.scale + margin;
    const y = (rect.y - minY) * gridSize * options.scale + margin;
    const w = rect.w * gridSize * options.scale;
    const h = rect.h * gridSize * options.scale;

    // Calculate text positioning and wrapping with HTML-matching logic
    const isTextLabel = rect.isTextLabel || rect.type === 'textLabel';
    const isParent = hasChildren.has(rect.id);
    
    // Use exact same font calculation as HTML export
    const fontSize = isTextLabel ? (rect.textFontSize || 14) : calculateFontSize(rect.id);
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
    
    // Use same padding calculation as HTML export
    const padding = marginSetting * gridSize;
    const textWidth = w - (padding * 2);
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
 * Import and validate JSON diagram file with error handling
 * 
 * Process:
 * 1. Read file contents asynchronously
 * 2. Parse JSON with error handling
 * 3. Validate against diagram schema
 * 4. Attempt data sanitization if validation fails
 * 5. Re-validate sanitized data
 * 
 * @param file - JSON file to import
 * @returns Promise resolving to validated diagram data
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
 * Complete import data processing pipeline with multi-stage validation
 * 
 * Processing stages:
 * 1. Fix parent-child relationship integrity
 * 2. Update rectangle types based on relationships
 * 3. Restore layout properties with proper defaults for roundtrip integrity
 * 4. Ensure unique IDs and track maximum
 * 5. Calculate next available ID for future use
 * 
 * @param importedData - Raw imported diagram data
 * @param currentNextId - Current next available ID
 * @returns Processed rectangles and updated next ID
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