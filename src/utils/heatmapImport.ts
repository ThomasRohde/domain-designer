import type { Rectangle } from '../types';
import type { HeatmapImportResult } from '../stores/types';

/**
 * CSV entry parsed from a single line
 */
interface CSVEntry {
  label: string;
  valueStr: string;
  lineNumber: number;
}

/**
 * Parses CSV content and validates entries
 * Expected format: rectangleName,value
 * 
 * @param csvContent - The raw CSV file content
 * @param rectangles - Array of rectangles to match against
 * @returns Import result with successful, failed, and unmatched entries
 */
export function parseHeatmapCSV(
  csvContent: string,
  rectangles: Rectangle[]
): HeatmapImportResult {
  const result: HeatmapImportResult = {
    successful: [],
    failed: [],
    unmatched: []
  };

  // Split into lines and filter out empty ones
  const lines = csvContent
    .split('\n')
    .map(line => line.trim())
  .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    return result;
  }

  // Parse each line
  const entries: CSVEntry[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
  // Skip header row if it looks like one (contains 'name', 'label', 'value', etc.)
  if (i === 0 && /^(name|label|rectangle|value)/i.test(line)) {
      continue;
    }
    
    // Parse CSV line (simple comma split for now, could be enhanced for quoted values)
    const parts = line.split(',').map(part => part.trim());
    
    if (parts.length < 2) {
      result.failed.push({
        label: parts[0] || `Line ${lineNumber}`,
        value: '',
        error: 'Missing value column'
      });
      continue;
    }
    
    const label = parts[0];
    const valueStr = parts[1];
    
    if (!label) {
      result.failed.push({
        label: `Line ${lineNumber}`,
        value: valueStr,
        error: 'Missing rectangle name'
      });
      continue;
    }
    
    entries.push({ label, valueStr, lineNumber });
  }

  // Create a case-insensitive lookup map for rectangles
  const rectangleLookup = new Map<string, Rectangle>();
  rectangles.forEach(rect => {
    rectangleLookup.set(rect.label.toLowerCase(), rect);
  });

  // Process each entry
  for (const entry of entries) {
    const { label, valueStr } = entry;
    
    // Validate value
    const value = parseFloat(valueStr);
    
    if (isNaN(value)) {
      result.failed.push({
        label,
        value: valueStr,
        error: 'Invalid number format'
      });
      continue;
    }
    
    if (value < 0 || value > 1) {
      result.failed.push({
        label,
        value: valueStr,
        error: 'Value must be between 0 and 1'
      });
      continue;
    }
    
    // Try to match rectangle (case-insensitive)
    const rectangle = rectangleLookup.get(label.toLowerCase());
    
    if (!rectangle) {
      result.unmatched.push({
        label,
        value
      });
      continue;
    }
    
    // Success!
    result.successful.push({
      rectangleId: rectangle.id,
      label: rectangle.label, // Use the actual label from rectangle for display
      value
    });
  }

  return result;
}

/**
 * Validates a CSV file before parsing
 * 
 * @param file - The file to validate
 * @returns Promise resolving to validation result
 */
export async function validateCSVFile(file: File): Promise<{
  isValid: boolean;
  error?: string;
  content?: string;
}> {
  // Check file type
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    return {
      isValid: false,
      error: 'File must be a CSV (.csv) file'
    };
  }
  
  // Check file size (limit to 1MB)
  if (file.size > 1024 * 1024) {
    return {
      isValid: false,
      error: 'File size must be less than 1MB'
    };
  }
  
  try {
    // Read file content
    const content = await file.text();
    
    // Basic validation - check if it looks like CSV
    if (content.trim().length === 0) {
      return {
        isValid: false,
        error: 'File is empty'
      };
    }
    
    // Check for basic CSV structure
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return {
        isValid: false,
        error: 'No valid lines found in file'
      };
    }
    
    // Check if lines have commas (basic CSV check)
    const hasCommas = lines.some(line => line.includes(','));
    if (!hasCommas) {
      return {
        isValid: false,
        error: 'File does not appear to be valid CSV format (no commas found)'
      };
    }
    
    return {
      isValid: true,
      content
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to read file: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
}

/**
 * Generates a sample CSV content for download
 * 
 * @param rectangles - Current rectangles in the canvas
 * @returns CSV content string
 */
export function generateSampleCSV(rectangles: Rectangle[]): string {
  const lines: string[] = [
    'rectangleName,value',
    '# This is a sample CSV file for heat map import',
    '# Format: rectangleName,value (where value is between 0 and 1)',
    '# Rectangle names are case-insensitive',
    ''
  ];
  
  // Add a few examples from actual rectangles
  const sampleRectangles = rectangles.slice(0, 5);
  sampleRectangles.forEach((rect, index) => {
    const sampleValue = (index / Math.max(sampleRectangles.length - 1, 1)).toFixed(2);
    lines.push(`${rect.label},${sampleValue}`);
  });
  
  // Add some generic examples if we don't have enough rectangles
  if (sampleRectangles.length < 3) {
    lines.push('Example Rectangle 1,0.25');
    lines.push('Example Rectangle 2,0.75');
  }
  
  return lines.join('\n');
}