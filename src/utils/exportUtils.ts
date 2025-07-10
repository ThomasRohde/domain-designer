import { Rectangle, ExportOptions, GlobalSettings, ValidationResult } from '../types';
import { exportToHTML } from './htmlExport';
import pako from 'pako';

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
  const { format, scale = 1, includeBackground = true } = options;
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `domain-model-${timestamp}`;

  switch (format) {
    case 'html':
      exportToHTML(rectangles, filename, { includeBackground, scale }, globalSettings);
      break;
    case 'svg':
      await exportToSVG(containerElement, rectangles, filename, { scale, includeBackground }, gridSize, borderRadius, borderColor, borderWidth);
      break;
    case 'json':
      exportToJSON(rectangles, globalSettings, filename, predefinedColors);
      break;
    case 'mermaid':
      exportToMermaid(rectangles, filename);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
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
    margin: 1,
    labelMargin: 2,
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

const exportToMermaid = (rectangles: Rectangle[], filename: string): void => {
  const mermaidDiagram = generateMermaidDiagram(rectangles);
  
  // Save the file
  const blob = new Blob([mermaidDiagram], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `${filename}.mmd`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
  
  // Open preview in new window and generate SVG link
  openMermaidPreview(mermaidDiagram);
};

const openMermaidPreview = (mermaidDiagram: string): void => {
  try {
    // Create the JSON structure that Mermaid Live Editor expects
    const jGraph = {
      code: mermaidDiagram,
      mermaid: { theme: "default" }
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(jGraph);
    
    // Convert to bytes (UTF-8 encoded)
    const encoder = new TextEncoder();
    const byteArray = encoder.encode(jsonString);
    
    // Compress with pako (deflate)
    const compressed = pako.deflate(byteArray);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < compressed.length; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    const base64 = btoa(binary);
    
    // Make URL-safe by replacing + with - and / with _
    const urlSafeBase64 = base64.replace(/\+/g, '-').replace(/\//g, '_');
    
    // Create Mermaid Ink SVG URL
    const svgUrl = `https://mermaid.ink/svg/pako:${urlSafeBase64}`;
    
    console.log('Opening Mermaid SVG with pako encoding:', svgUrl);
    
    // Open SVG directly in new window
    window.open(svgUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  } catch (error) {
    console.error('Error with pako encoding:', error);
    
    // Fallback: use simple base64 encoding with JSON structure
    try {
      const jGraph = {
        code: mermaidDiagram,
        mermaid: { theme: "default" }
      };
      const jsonString = JSON.stringify(jGraph);
      const base64 = btoa(jsonString);
      const fallbackSvgUrl = `https://mermaid.ink/svg/base64:${base64}`;
      
      console.log('Opening Mermaid SVG with base64 encoding (fallback):', fallbackSvgUrl);
      
      // Open SVG directly in new window
      window.open(fallbackSvgUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    } catch (fallbackError) {
      console.error('Error with base64 encoding:', fallbackError);
      alert('Unable to open Mermaid preview. The diagram has been saved to your downloads folder.');
    }
  }
};

const generateMermaidDiagram = (rectangles: Rectangle[]): string => {

  let mermaidContent = 'graph TD\n';
  
  // Function to sanitize labels for Mermaid
  const sanitizeLabel = (label: string): string => {
    return label.replace(/["\n\r]/g, ' ').trim();
  };
  
  // Function to generate a valid Mermaid node ID
  const getNodeId = (rect: Rectangle): string => {
    return `node_${rect.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  };
  
  // Add all nodes with their labels
  rectangles.forEach(rect => {
    const nodeId = getNodeId(rect);
    const sanitizedLabel = sanitizeLabel(rect.label);
    
    // Choose node shape based on type
    let nodeShape: string;
    switch (rect.type) {
      case 'root':
        nodeShape = `${nodeId}["${sanitizedLabel}"]`;
        break;
      case 'parent':
        nodeShape = `${nodeId}["${sanitizedLabel}"]`;
        break;
      case 'leaf':
        nodeShape = `${nodeId}("${sanitizedLabel}")`;
        break;
      default:
        nodeShape = `${nodeId}["${sanitizedLabel}"]`;
    }
    
    mermaidContent += `    ${nodeShape}\n`;
  });
  
  // Add relationships
  rectangles.forEach(rect => {
    if (rect.parentId) {
      const parentRect = rectangles.find(r => r.id === rect.parentId);
      if (parentRect) {
        const parentNodeId = getNodeId(parentRect);
        const childNodeId = getNodeId(rect);
        mermaidContent += `    ${parentNodeId} --> ${childNodeId}\n`;
      }
    }
  });
  
  // Add styling
  mermaidContent += '\n';
  rectangles.forEach(rect => {
    const nodeId = getNodeId(rect);
    mermaidContent += `    style ${nodeId} fill:${rect.color},stroke:#333,stroke-width:2px\n`;
  });
  
  return mermaidContent;
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
  
  // Add margin around the content
  const margin = 20; // 20px margin
  const contentWidth = (maxX - minX) * gridSize * options.scale;
  const contentHeight = (maxY - minY) * gridSize * options.scale;
  const width = contentWidth + (margin * 2);
  const height = contentHeight + (margin * 2);

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
    // Adjust coordinates to start from top-left with margin offset
    const x = (rect.x - minX) * gridSize * options.scale + margin;
    const y = (rect.y - minY) * gridSize * options.scale + margin;
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