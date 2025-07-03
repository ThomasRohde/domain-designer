import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Rectangle, ExportOptions } from '../types';

export const exportDiagram = async (
  containerElement: HTMLElement,
  rectangles: Rectangle[],
  options: ExportOptions
): Promise<void> => {
  const { format, quality = 1, scale = 1, includeBackground = true } = options;
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `domain-model-${timestamp}`;

  switch (format) {
    case 'png':
      await exportToPNG(containerElement, filename, { quality, scale, includeBackground });
      break;
    case 'svg':
      await exportToSVG(containerElement, rectangles, filename, { scale, includeBackground });
      break;
    case 'pdf':
      await exportToPDF(containerElement, filename, { quality, scale, includeBackground });
      break;
    case 'json':
      exportToJSON(rectangles, filename);
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
  options: { scale: number; includeBackground: boolean }
): Promise<void> => {
  try {
    const svg = createSVGFromRectangles(rectangles, options);
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

const exportToJSON = (rectangles: Rectangle[], filename: string): void => {
  const data = {
    rectangles,
    version: '1.0',
    timestamp: new Date().toISOString(),
    metadata: {
      totalRectangles: rectangles.length,
      rootRectangles: rectangles.filter(r => !r.parentId).length,
      categories: [...new Set(rectangles.map(r => r.category))]
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

const createSVGFromRectangles = (
  rectangles: Rectangle[],
  options: { scale: number; includeBackground: boolean }
): string => {
  if (rectangles.length === 0) return '';

  const GRID_SIZE = 20;
  const maxX = Math.max(...rectangles.map(r => r.x + r.w));
  const maxY = Math.max(...rectangles.map(r => r.y + r.h));
  const width = (maxX + 2) * GRID_SIZE * options.scale;
  const height = (maxY + 2) * GRID_SIZE * options.scale;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  if (options.includeBackground) {
    svg += `<rect width="100%" height="100%" fill="#f9fafb"/>`;
    
    // Add grid pattern
    svg += `<defs>
      <pattern id="grid" width="${GRID_SIZE * options.scale}" height="${GRID_SIZE * options.scale}" patternUnits="userSpaceOnUse">
        <circle cx="${GRID_SIZE * options.scale / 2}" cy="${GRID_SIZE * options.scale / 2}" r="1" fill="#d1d5db"/>
      </pattern>
    </defs>`;
    svg += `<rect width="100%" height="100%" fill="url(#grid)"/>`;
  }

  // Sort rectangles by hierarchy (parents first)
  const sortedRectangles = [...rectangles].sort((a, b) => {
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    return 0;
  });

  sortedRectangles.forEach(rect => {
    const x = rect.x * GRID_SIZE * options.scale;
    const y = rect.y * GRID_SIZE * options.scale;
    const w = rect.w * GRID_SIZE * options.scale;
    const h = rect.h * GRID_SIZE * options.scale;

    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
      fill="${rect.color}" 
      stroke="#374151" 
      stroke-width="2" 
      rx="8"/>`;
    
    svg += `<text x="${x + 10}" y="${y + 20}" 
      font-family="Arial, sans-serif" 
      font-size="14" 
      font-weight="bold" 
      fill="#374151">${rect.label}</text>`;
  });

  svg += '</svg>';
  return svg;
};