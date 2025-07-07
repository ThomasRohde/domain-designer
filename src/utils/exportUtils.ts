import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Rectangle, ExportOptions, GlobalSettings, ValidationResult } from '../types';

export const exportDiagram = async (
  containerElement: HTMLElement,
  rectangles: Rectangle[],
  options: ExportOptions,
  globalSettings?: GlobalSettings,
  gridSize: number = 20,
  borderRadius: number = 8,
  borderColor: string = '#374151',
  borderWidth: number = 2,
  predefinedColors?: string[]
): Promise<void> => {
  const { format, quality = 1, scale = 1, includeBackground = true } = options;
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `domain-model-${timestamp}`;

  switch (format) {
    case 'png':
      await exportToPNG(containerElement, filename, { quality, scale, includeBackground });
      break;
    case 'svg':
      await exportToSVG(containerElement, rectangles, filename, { scale, includeBackground }, gridSize, borderRadius, borderColor, borderWidth);
      break;
    case 'pdf':
      await exportToPDF(containerElement, filename, { quality, scale, includeBackground });
      break;
    case 'json':
      exportToJSON(rectangles, globalSettings, filename, predefinedColors);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

const exportToPNG = async (
  element: HTMLElement,
  filename: string,
  options: { quality: number; scale: number; includeBackground: boolean }
): Promise<void> => {
  try {
    const canvas = await html2canvas(element, {
      scale: options.scale,
      backgroundColor: options.includeBackground ? '#f9fafb' : null,
      useCORS: true,
      allowTaint: true
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png', options.quality);
    link.click();
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw error;
  }
};

const exportToSVG = async (
  _element: HTMLElement,
  rectangles: Rectangle[],
  filename: string,
  options: { scale: number; includeBackground: boolean },
  gridSize: number = 20,
  borderRadius: number = 8,
  borderColor: string = '#374151',
  borderWidth: number = 2
): Promise<void> => {
  try {
    const svg = createSVGFromRectangles(rectangles, options, gridSize, borderRadius, borderColor, borderWidth);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to SVG:', error);
    throw error;
  }
};

const exportToPDF = async (
  element: HTMLElement,
  filename: string,
  options: { quality: number; scale: number; includeBackground: boolean }
): Promise<void> => {
  try {
    const canvas = await html2canvas(element, {
      scale: options.scale,
      backgroundColor: options.includeBackground ? '#f9fafb' : null,
      useCORS: true,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/png', options.quality);
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};

const exportToJSON = (rectangles: Rectangle[], globalSettings: GlobalSettings | undefined, filename: string, predefinedColors?: string[]): void => {
  const enhancedGlobalSettings = globalSettings ? {
    ...globalSettings,
    predefinedColors: predefinedColors || globalSettings.predefinedColors
  } : predefinedColors ? {
    gridSize: 20,
    leafFixedWidth: false,
    leafFixedHeight: false,
    leafWidth: 8,
    leafHeight: 4,
    rootFontSize: 14,
    dynamicFontSizing: false,
    borderRadius: 8,
    borderColor: '#374151',
    borderWidth: 2,
    predefinedColors
  } : undefined;

  const data = {
    rectangles,
    globalSettings: enhancedGlobalSettings,
    version: '1.0',
    timestamp: new Date().toISOString(),
    metadata: {
      totalRectangles: rectangles.length,
      rootRectangles: rectangles.filter(r => !r.parentId).length,
      types: [...new Set(rectangles.map(r => r.type))],
      hasGlobalSettings: !!enhancedGlobalSettings
    }
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `${filename}.json`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
};

const escapeXML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  // Approximate character width (rough estimation)
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

const createSVGFromRectangles = (
  rectangles: Rectangle[],
  options: { scale: number; includeBackground: boolean },
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
  
  const width = (maxX - minX) * gridSize * options.scale;
  const height = (maxY - minY) * gridSize * options.scale;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  if (options.includeBackground) {
    svg += `<rect width="100%" height="100%" fill="#f9fafb"/>`;
  }

  // Sort rectangles by hierarchy (parents first)
  const sortedRectangles = [...rectangles].sort((a, b) => {
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    return 0;
  });

  // Check which rectangles have children
  const hasChildren = new Set<string>();
  rectangles.forEach(rect => {
    if (rect.parentId) {
      hasChildren.add(rect.parentId);
    }
  });

  sortedRectangles.forEach(rect => {
    // Adjust coordinates to start from top-left
    const x = (rect.x - minX) * gridSize * options.scale;
    const y = (rect.y - minY) * gridSize * options.scale;
    const w = rect.w * gridSize * options.scale;
    const h = rect.h * gridSize * options.scale;

    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
      fill="${rect.color}" 
      stroke="${borderColor}" 
      stroke-width="${borderWidth}" 
      rx="${borderRadius}"/>`;
    
    // Calculate text positioning and wrapping
    const fontSize = 14;
    const padding = 10;
    const textWidth = w - (padding * 2);
    const lines = wrapText(rect.label, textWidth, fontSize);
    
    const lineHeight = fontSize * 1.2;
    const isParent = hasChildren.has(rect.id);
    
    let textStartY: number;
    if (isParent) {
      // Top-align for rectangles with children
      textStartY = y + padding + fontSize;
    } else {
      // Center-align for leaf rectangles
      const totalTextHeight = lines.length * lineHeight;
      textStartY = y + (h - totalTextHeight) / 2 + fontSize;
    }
    
    lines.forEach((line, index) => {
      const textY = textStartY + (index * lineHeight);
      const textX = x + w / 2; // Center horizontally
      
      svg += `<text x="${textX}" y="${textY}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        fill="#374151"
        text-anchor="middle">${escapeXML(line)}</text>`;
    });
  });

  svg += '</svg>';
  return svg;
};

export interface ImportedDiagramData {
  rectangles: Rectangle[];
  globalSettings?: GlobalSettings;
  version?: string;
  timestamp?: string;
  metadata?: {
    totalRectangles: number;
    rootRectangles: number;
    types: string[];
    hasGlobalSettings?: boolean;
  };
}

export const validateImportedData = (data: unknown): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid JSON data structure');
    return { isValid: false, errors, warnings };
  }

  const dataObj = data as Record<string, unknown>;

  if (!Array.isArray(dataObj.rectangles)) {
    errors.push('Missing or invalid rectangles array');
    return { isValid: false, errors, warnings };
  }

  if (dataObj.rectangles.length === 0) {
    warnings.push('No rectangles found in import data');
  }

  for (let i = 0; i < dataObj.rectangles.length; i++) {
    const rect = dataObj.rectangles[i] as Record<string, unknown>;
    if (!rect.id || typeof rect.id !== 'string') {
      errors.push(`Rectangle at index ${i} missing valid id`);
    }
    if (typeof rect.x !== 'number' || typeof rect.y !== 'number') {
      errors.push(`Rectangle at index ${i} missing valid coordinates`);
    }
    if (typeof rect.w !== 'number' || typeof rect.h !== 'number') {
      errors.push(`Rectangle at index ${i} missing valid dimensions`);
    }
    if (!rect.label || typeof rect.label !== 'string') {
      errors.push(`Rectangle at index ${i} missing valid label`);
    }
    if (!rect.color || typeof rect.color !== 'string') {
      errors.push(`Rectangle at index ${i} missing valid color`);
    }
    if (!rect.type || !['root', 'parent', 'leaf'].includes(rect.type as string)) {
      errors.push(`Rectangle at index ${i} missing valid type`);
    }
  }

  if (dataObj.globalSettings && typeof dataObj.globalSettings !== 'object') {
    warnings.push('Invalid global settings format, will use defaults');
  }

  return { isValid: errors.length === 0, errors, warnings };
};

export const importDiagramFromJSON = (file: File): Promise<ImportedDiagramData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        
        const validation = validateImportedData(data);
        
        if (!validation.isValid) {
          reject(new Error(`Invalid JSON data: ${validation.errors.join(', ')}`));
          return;
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
 * Validates and fixes rectangle relationships in imported data
 * Removes orphaned rectangles and ensures all parentId references are valid
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
 * Updates rectangle types based on actual parent-child relationships
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
 * Validates and fixes rectangle IDs to prevent conflicts
 * Returns both the fixed rectangles and the maximum ID number found
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
 * Comprehensive import processing that validates and fixes all issues
 */
export const processImportedDiagram = (importedData: ImportedDiagramData, currentNextId: number): { rectangles: Rectangle[], nextId: number } => {
  // Step 1: Validate and fix rectangle relationships
  let processedRectangles = validateAndFixRectangleRelationships(importedData.rectangles);
  
  // Step 2: Update rectangle types based on actual relationships
  processedRectangles = updateRectangleTypes(processedRectangles);
  
  // Step 3: Validate and fix rectangle IDs
  const { rectangles: fixedRectangles, maxId } = validateAndFixRectangleIds(processedRectangles, currentNextId);
  
  // Step 4: Calculate new nextId to prevent future conflicts
  const newNextId = maxId + 1;
  
  return { rectangles: fixedRectangles, nextId: newNextId };
};