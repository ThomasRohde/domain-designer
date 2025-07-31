import { ValidationResult } from '../types/layoutSnapshot';

/**
 * Schema Validation Utilities
 * 
 * Provides comprehensive validation for diagram data structures including:
 * - Rectangle object validation with field-level error reporting
 * - Global settings validation with range and type checking  
 * - Complete diagram format validation with referential integrity
 * - Data sanitization and corruption recovery mechanisms
 * 
 * All validation functions are designed to handle malformed data gracefully
 * and provide detailed error reporting for debugging and user feedback.
 */

// Validation functions intentionally use 'any' types to handle potentially 
// malformed data before type safety can be established through validation
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Validates rectangle object structure and data integrity
 * Performs comprehensive field validation for all required and optional properties
 * 
 * @param rect - Potentially invalid rectangle object to validate
 * @param index - Optional index for error reporting context
 * @returns ValidationResult with errors and warnings categorized by severity
 */
export const validateRectangle = (rect: any, index?: number): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = index !== undefined ? `Rectangle at index ${index}` : 'Rectangle';

  // Validate essential fields required for rectangle functionality
  if (!rect || typeof rect !== 'object') {
    errors.push(`${prefix}: Invalid rectangle object`);
    return { isValid: false, errors, warnings };
  }

  if (!rect.id || typeof rect.id !== 'string') {
    errors.push(`${prefix}: Missing or invalid id`);
  }

  if (typeof rect.x !== 'number' || !isFinite(rect.x)) {
    errors.push(`${prefix}: Missing or invalid x coordinate`);
  }

  if (typeof rect.y !== 'number' || !isFinite(rect.y)) {
    errors.push(`${prefix}: Missing or invalid y coordinate`);
  }

  if (typeof rect.w !== 'number' || !isFinite(rect.w) || rect.w <= 0) {
    errors.push(`${prefix}: Missing or invalid width`);
  }

  if (typeof rect.h !== 'number' || !isFinite(rect.h) || rect.h <= 0) {
    errors.push(`${prefix}: Missing or invalid height`);
  }

  if (!rect.label || typeof rect.label !== 'string') {
    warnings.push(`${prefix}: Missing or invalid label`);
  }

  if (rect.type && !['root', 'parent', 'leaf', 'textLabel'].includes(rect.type)) {
    errors.push(`${prefix}: Invalid type "${rect.type}"`);
  }

  // Validate optional fields for type safety and consistency
  if (rect.parentId !== undefined && typeof rect.parentId !== 'string') {
    errors.push(`${prefix}: Invalid parentId`);
  }

  if (rect.color !== undefined && typeof rect.color !== 'string') {
    warnings.push(`${prefix}: Invalid color`);
  }

  if (rect.description !== undefined && typeof rect.description !== 'string') {
    warnings.push(`${prefix}: Invalid description`);
  }

  // Validate boolean flags that control rectangle behavior
  ['isManualPositioningEnabled', 'isLockedAsIs', 'isTextLabel'].forEach(field => {
    if (rect[field] !== undefined && typeof rect[field] !== 'boolean') {
      warnings.push(`${prefix}: Invalid ${field}`);
    }
  });

  // Validate text label specific properties for formatting and display
  if (rect.textFontFamily !== undefined && typeof rect.textFontFamily !== 'string') {
    warnings.push(`${prefix}: Invalid textFontFamily`);
  }

  if (rect.textFontSize !== undefined && (typeof rect.textFontSize !== 'number' || !isFinite(rect.textFontSize) || rect.textFontSize <= 0)) {
    warnings.push(`${prefix}: Invalid textFontSize`);
  }

  if (rect.fontWeight !== undefined && !['normal', 'bold'].includes(rect.fontWeight)) {
    warnings.push(`${prefix}: Invalid fontWeight`);
  }

  if (rect.textAlign !== undefined && !['left', 'center', 'right', 'justify'].includes(rect.textAlign)) {
    warnings.push(`${prefix}: Invalid textAlign`);
  }

  return { isValid: errors.length === 0, errors, warnings };
};

/**
 * Validates global application settings structure and value ranges
 * Ensures all configuration values are within acceptable bounds
 * 
 * @param settings - Potentially invalid settings object to validate
 * @returns ValidationResult indicating validation success and any issues found
 */
export const validateAppSettings = (settings: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!settings || typeof settings !== 'object') {
    errors.push('Invalid settings object');
    return { isValid: false, errors, warnings };
  }

  // Validate numeric configuration values for positive range constraints
  const numericFields = [
    'gridSize', 'leafWidth', 'leafHeight', 'rootFontSize', 
    'borderRadius', 'borderWidth', 'margin', 'labelMargin'
  ];

  numericFields.forEach(field => {
    if (settings[field] !== undefined && 
        (typeof settings[field] !== 'number' || !isFinite(settings[field]) || settings[field] < 0)) {
      warnings.push(`Invalid ${field}: expected positive number`);
    }
  });

  // Validate boolean configuration flags
  const booleanFields = [
    'leafFixedWidth', 'leafFixedHeight', 'dynamicFontSizing'
  ];

  booleanFields.forEach(field => {
    if (settings[field] !== undefined && typeof settings[field] !== 'boolean') {
      warnings.push(`Invalid ${field}: expected boolean`);
    }
  });

  // Validate string configuration values
  const stringFields = ['fontFamily', 'borderColor', 'layoutAlgorithm'];
  
  stringFields.forEach(field => {
    if (settings[field] !== undefined && typeof settings[field] !== 'string') {
      warnings.push(`Invalid ${field}: expected string`);
    }
  });

  // Validate array fields for structure and element types
  if (settings.predefinedColors !== undefined) {
    if (!Array.isArray(settings.predefinedColors)) {
      warnings.push('Invalid predefinedColors: expected array');
    } else {
      settings.predefinedColors.forEach((color: any, index: number) => {
        if (typeof color !== 'string') {
          warnings.push(`Invalid color at index ${index}: expected string`);
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
};

/**
 * Validates complete saved diagram data structure for v2.0 format
 * Performs deep validation of rectangles, settings, and metadata
 * Ensures referential integrity between parent-child relationships
 * 
 * @param data - Raw diagram data from file or storage
 * @returns ValidationResult with comprehensive error and warning reporting
 */
export const validateSavedDiagram = (data: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid diagram data');
    return { isValid: false, errors, warnings };
  }

  // Enforce strict version compatibility for data format consistency
  if (!data.version || data.version !== '2.0') {
    errors.push(`Invalid version: ${data.version || 'missing'}. Only v2.0 is supported.`);
  }

  // Deep validation of rectangle array and individual elements
  if (!Array.isArray(data.rectangles)) {
    errors.push('Invalid or missing rectangles array');
  } else {
    if (data.rectangles.length === 0) {
      warnings.push('Empty rectangles array');
    }

    // Validate individual rectangles with contextual error reporting
    data.rectangles.forEach((rect: any, index: number) => {
      const rectValidation = validateRectangle(rect, index);
      errors.push(...rectValidation.errors);
      warnings.push(...rectValidation.warnings);
    });

    // Ensure unique identifiers across all rectangles
    const ids = data.rectangles.map((r: any) => r?.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push('Duplicate rectangle IDs found');
    }

    // Validate parent-child relationship integrity
    const rectMap = new Map(data.rectangles.map((r: any) => [r.id, r]));
    data.rectangles.forEach((rect: any) => {
      if (rect.parentId && !rectMap.has(rect.parentId)) {
        errors.push(`Rectangle ${rect.id} references non-existent parent ${rect.parentId}`);
      }
    });
  }

  // Validate configuration settings with delegation to specialized validator
  if (data.globalSettings || data.appSettings) {
    const settings = data.globalSettings || data.appSettings;
    const settingsValidation = validateAppSettings(settings);
    errors.push(...settingsValidation.errors);
    warnings.push(...settingsValidation.warnings);
  }

  // Validate v2.0 layout metadata for position preservation and algorithm tracking
  if (data.version === '2.0' && data.layoutMetadata) {
    const meta = data.layoutMetadata;
    
    if (typeof meta.algorithm !== 'string') {
      warnings.push('Invalid layoutMetadata.algorithm');
    }
    
    if (typeof meta.isUserArranged !== 'boolean') {
      warnings.push('Invalid layoutMetadata.isUserArranged');
    }
    
    if (typeof meta.preservePositions !== 'boolean') {
      warnings.push('Invalid layoutMetadata.preservePositions');
    }
    
    if (meta.boundingBox && (
      typeof meta.boundingBox.w !== 'number' || 
      typeof meta.boundingBox.h !== 'number'
    )) {
      warnings.push('Invalid layoutMetadata.boundingBox');
    }
  }

  // Validate timestamp for data integrity and version tracking
  if (data.timestamp !== undefined && 
      (typeof data.timestamp !== 'number' || !isFinite(data.timestamp))) {
    warnings.push('Invalid timestamp');
  }

  return { isValid: errors.length === 0, errors, warnings };
};

/**
 * Auto-detects and validates diagram format with version-specific logic
 * Currently only supports v2.0 format with comprehensive validation
 * 
 * @param data - Raw diagram data of unknown format
 * @returns ValidationResult with format-specific validation results
 */
export const validateDiagramAuto = (data: any): ValidationResult => {
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid data'], warnings: [] };
  }

  // Enforce v2.0 format requirement for data consistency
  if (!data.version || data.version !== '2.0') {
    return { 
      isValid: false, 
      errors: [`Unsupported format version: ${data.version || 'missing'}. Only v2.0 is supported.`], 
      warnings: [] 
    };
  }

  return validateSavedDiagram(data);
};

/**
 * Repairs common data corruption issues and normalizes diagram structure
 * Provides graceful degradation for partially corrupted data
 * 
 * @param data - Potentially corrupted diagram data
 * @returns Sanitized data structure or null if unrepairable
 */
export const sanitizeDiagramData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const sanitized = { ...data };

  // Initialize rectangles array if missing or corrupted
  if (!Array.isArray(sanitized.rectangles)) {
    sanitized.rectangles = [];
  }

  // Repair individual rectangle data with sensible defaults
  sanitized.rectangles = sanitized.rectangles
    .filter((rect: any) => rect && typeof rect === 'object')
    .map((rect: any) => {
      const sanitizedRect: any = { ...rect };

      // Repair coordinate and dimension fields with fallback values
      ['x', 'y', 'w', 'h'].forEach(field => {
        if (typeof sanitizedRect[field] !== 'number' || !isFinite(sanitizedRect[field])) {
          sanitizedRect[field] = field === 'w' || field === 'h' ? 100 : 0;  // Default size or zero position
        }
      });

      // Enforce minimum dimensions for visibility
      if (sanitizedRect.w <= 0) sanitizedRect.w = 100;
      if (sanitizedRect.h <= 0) sanitizedRect.h = 100;

      // Generate default label if missing or invalid
      if (!sanitizedRect.label || typeof sanitizedRect.label !== 'string') {
        sanitizedRect.label = `Rectangle ${sanitizedRect.id || 'Unknown'}`;
      }

      // Infer rectangle type from hierarchy position if invalid
      if (!['root', 'parent', 'leaf'].includes(sanitizedRect.type)) {
        sanitizedRect.type = sanitizedRect.parentId ? 'leaf' : 'root';
      }

      return sanitizedRect;
    });

  // Ensure timestamp exists for version tracking
  if (typeof sanitized.timestamp !== 'number') {
    sanitized.timestamp = Date.now();
  }

  return sanitized;
};