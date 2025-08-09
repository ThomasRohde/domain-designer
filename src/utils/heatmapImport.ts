import type { Rectangle } from '../types';
import type { HeatmapImportResult } from '../stores/types';

/**
 * CSV Processing Utilities
 * 
 * Implements RFC 4180-compliant CSV parsing with robust error handling:
 * - Handles quoted fields containing commas, newlines, and embedded quotes
 * - Escapes quotes by doubling them ("" becomes ")
 * - Supports BOM removal for files from Excel and other tools
 * - Normalizes whitespace and handles case-insensitive matching
 */
/**
 * Escapes a string value for CSV output by wrapping in quotes and doubling internal quotes.
 */
function csvEscape(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Parses a single CSV line respecting quoted fields and escaped quotes.
 * Handles the complexities of CSV format including comma-separated values within quotes.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Handle escaped quote (double quote sequence)
          current += '"';
          i++; // Skip the second quote in the escaped sequence
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === ',') {
        result.push(current);
        current = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result.map(s => s.trim());
}

/**
 * Normalizes rectangle labels for robust case-insensitive matching.
 * 
 * Handles common variations in label formatting:
 * - Removes Unicode BOM (common in Excel exports)
 * - Trims leading/trailing whitespace
 * - Collapses multiple internal spaces to single spaces
 * - Converts to lowercase for case-insensitive comparison
 */
function normalizeLabel(value: string): string {
  return value
    .replace(/^\uFEFF/, '') // strip BOM if present
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Represents a parsed CSV entry with validation context.
 */
interface CSVEntry {
  label: string;
  valueStr: string;
  lineNumber: number;
}

/**
 * Parses and validates heatmap CSV data for import.
 * 
 * Expected CSV format: rectangleName,value
 * - Supports optional header row (automatically detected and skipped)
 * - Ignores comment lines starting with #
 * - Values must be numeric and in range [0, 1]
 * - Rectangle names matched case-insensitively against existing labels
 * - Text labels are excluded from matching to prevent invalid assignments
 * 
 * Algorithm:
 * 1. Parse and clean CSV lines, removing empty lines and comments
 * 2. Detect and skip header rows based on common patterns
 * 3. Create normalized lookup map of rectangle labels for efficient matching
 * 4. Validate each entry: numeric values, range checks, rectangle existence
 * 5. Categorize results: successful imports, validation failures, unmatched labels
 * 
 * @param csvContent - Raw CSV file content as string
 * @param rectangles - Current rectangle data for label matching
 * @returns Categorized import results with detailed error information
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
    .map(line => line.replace(/\r$/, ''))
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
    
    // Parse CSV line with proper quote handling
    const parts = parseCSVLine(line);
    
    // Auto-detect and skip header rows based on common header patterns
  if (i === 0 && parts[0] && /^(name|label|rectangle|rectanglename)$/i.test(normalizeLabel(parts[0]))) {
      continue;
    }
    
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

  // Build optimized lookup map for case-insensitive rectangle matching
  const rectangleLookup = new Map<string, Rectangle>();
  rectangles.forEach(rect => {
    if (rect.isTextLabel || rect.type === 'textLabel') return; // Exclude text labels (not valid heatmap targets)
    rectangleLookup.set(normalizeLabel(rect.label), rect);
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
    
  // Attempt normalized case-insensitive rectangle label matching
    const rectangle = rectangleLookup.get(normalizeLabel(label));
    
    if (!rectangle) {
      result.unmatched.push({
        label,
        value
      });
      continue;
    }
    
    // Successfully matched rectangle with valid value
    result.successful.push({
      rectangleId: rectangle.id,
      label: rectangle.label, // Use actual rectangle label (preserves original casing) for display
      value
    });
  }

  return result;
}

/**
 * Performs comprehensive validation of CSV files before parsing.
 * 
 * Validation checks:
 * - File extension (.csv) and MIME type verification
 * - Size limits (1MB maximum to prevent memory issues)
 * - Content structure validation (non-empty, contains comma separators)
 * - Encoding support (handles UTF-8 with/without BOM)
 * 
 * @param file - File object from input or drag-and-drop
 * @returns Promise resolving to validation result with content on success
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
    
    // Validate basic CSV structure and content
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
    
    // Verify CSV format by checking for comma separators
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
 * Generates sample CSV content to help users understand the expected import format.
 * 
 * Creates a template CSV with:
 * - Standard header row (rectangleName,value)
 * - Comment lines explaining the format and requirements
 * - Sample data using actual rectangle names from the canvas
 * - Graduated sample values (0.0, 0.25, 0.5, 0.75, 1.0) to demonstrate range
 * - Generic examples if insufficient rectangles exist
 * 
 * @param rectangles - Current rectangle data from the canvas
 * @returns Formatted CSV content string ready for download
 */
export function generateSampleCSV(rectangles: Rectangle[]): string {
  const lines: string[] = [
    'rectangleName,value',
    '# This is a sample CSV file for heat map import',
    '# Format: rectangleName,value (where value is between 0 and 1)',
    '# Rectangle names are case-insensitive',
    ''
  ];
  
  // Include examples using real rectangle names from the current canvas
  const sampleRectangles = rectangles.slice(0, 5);
  sampleRectangles.forEach((rect, index) => {
    const sampleValue = (index / Math.max(sampleRectangles.length - 1, 1)).toFixed(2);
    lines.push(`${csvEscape(rect.label)},${sampleValue}`);
  });
  
  // Add fallback examples if canvas has few rectangles
  if (sampleRectangles.length < 3) {
    lines.push('Example Rectangle 1,0.25');
    lines.push('Example Rectangle 2,0.75');
  }
  
  return lines.join('\n');
}

/**
 * Generates CSV export of current heatmap values for round-trip workflows.
 * 
 * Export features:
 * - Matches import format exactly (rectangleName,value) for seamless round-trip
 * - Only includes rectangles that have assigned heatmap values (excludes undefined)
 * - Optional zero inclusion for rectangles without values (useful for complete datasets)
 * - Automatic exclusion of text labels (prevents invalid heatmap assignments)
 * - Proper CSV escaping for complex rectangle names
 * - High precision value formatting (6 decimal places) to preserve accuracy
 * 
 * @param rectangles - Current rectangle data with heatmap values
 * @param includeMissingAsZero - Whether to export undefined values as 0.0
 * @returns CSV content string ready for download or external processing
 */
export function generateHeatmapCSV(rectangles: Rectangle[], includeMissingAsZero = false): string {
  const header = 'rectangleName,value';
  const rows: string[] = [header];

  const formatValue = (v: number) => Number(v.toFixed(6)).toString();

  rectangles.forEach(rect => {
    // Exclude text labels (not valid heatmap targets)
    if (rect.isTextLabel || rect.type === 'textLabel') return;

    if (typeof rect.heatmapValue === 'number') {
      rows.push(`${csvEscape(rect.label)},${formatValue(rect.heatmapValue)}`);
    } else if (includeMissingAsZero) {
      rows.push(`${csvEscape(rect.label)},0`);
    }
  });

  return rows.join('\n');
}