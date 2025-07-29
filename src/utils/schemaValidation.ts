import { ValidationResult } from '../types/layoutSnapshot';

// Note: We use 'any' types for validation functions since they need to validate
// potentially invalid data that doesn't conform to our types yet
/* eslint-disable @typescript-eslint/no-explicit-any */

// Schema validation for Rectangle objects
export const validateRectangle = (rect: any, index?: number): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = index !== undefined ? `Rectangle at index ${index}` : 'Rectangle';

  // Required fields validation
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

  if (rect.type && !['root', 'parent', 'leaf'].includes(rect.type)) {
    errors.push(`${prefix}: Invalid type "${rect.type}"`);
  }

  // Optional field validation
  if (rect.parentId !== undefined && typeof rect.parentId !== 'string') {
    errors.push(`${prefix}: Invalid parentId`);
  }

  if (rect.color !== undefined && typeof rect.color !== 'string') {
    warnings.push(`${prefix}: Invalid color`);
  }

  if (rect.description !== undefined && typeof rect.description !== 'string') {
    warnings.push(`${prefix}: Invalid description`);
  }

  // Boolean field validation
  ['isManualPositioningEnabled', 'isLockedAsIs'].forEach(field => {
    if (rect[field] !== undefined && typeof rect[field] !== 'boolean') {
      warnings.push(`${prefix}: Invalid ${field}`);
    }
  });

  return { isValid: errors.length === 0, errors, warnings };
};

// Schema validation for AppSettings
export const validateAppSettings = (settings: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!settings || typeof settings !== 'object') {
    errors.push('Invalid settings object');
    return { isValid: false, errors, warnings };
  }

  // Numeric field validation
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

  // Boolean field validation
  const booleanFields = [
    'leafFixedWidth', 'leafFixedHeight', 'dynamicFontSizing'
  ];

  booleanFields.forEach(field => {
    if (settings[field] !== undefined && typeof settings[field] !== 'boolean') {
      warnings.push(`Invalid ${field}: expected boolean`);
    }
  });

  // String field validation
  const stringFields = ['fontFamily', 'borderColor', 'layoutAlgorithm'];
  
  stringFields.forEach(field => {
    if (settings[field] !== undefined && typeof settings[field] !== 'string') {
      warnings.push(`Invalid ${field}: expected string`);
    }
  });

  // Array validation
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

// Comprehensive validation for SavedDiagram (v2.0 schema)
export const validateSavedDiagram = (data: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid diagram data');
    return { isValid: false, errors, warnings };
  }

  // Version validation - only v2.0 supported
  if (!data.version || data.version !== '2.0') {
    errors.push(`Invalid version: ${data.version || 'missing'}. Only v2.0 is supported.`);
  }

  // Rectangles validation
  if (!Array.isArray(data.rectangles)) {
    errors.push('Invalid or missing rectangles array');
  } else {
    if (data.rectangles.length === 0) {
      warnings.push('Empty rectangles array');
    }

    // Validate each rectangle
    data.rectangles.forEach((rect: any, index: number) => {
      const rectValidation = validateRectangle(rect, index);
      errors.push(...rectValidation.errors);
      warnings.push(...rectValidation.warnings);
    });

    // Check for duplicate IDs
    const ids = data.rectangles.map((r: any) => r?.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push('Duplicate rectangle IDs found');
    }

    // Check parent-child relationships
    const rectMap = new Map(data.rectangles.map((r: any) => [r.id, r]));
    data.rectangles.forEach((rect: any) => {
      if (rect.parentId && !rectMap.has(rect.parentId)) {
        errors.push(`Rectangle ${rect.id} references non-existent parent ${rect.parentId}`);
      }
    });
  }

  // Global settings validation
  if (data.globalSettings || data.appSettings) {
    const settings = data.globalSettings || data.appSettings;
    const settingsValidation = validateAppSettings(settings);
    errors.push(...settingsValidation.errors);
    warnings.push(...settingsValidation.warnings);
  }

  // Layout metadata validation (v2.0 only)
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

  // Timestamp validation
  if (data.timestamp !== undefined && 
      (typeof data.timestamp !== 'number' || !isFinite(data.timestamp))) {
    warnings.push('Invalid timestamp');
  }

  return { isValid: errors.length === 0, errors, warnings };
};

// Validate diagram format (v2.0 only)
export const validateDiagramAuto = (data: any): ValidationResult => {
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid data'], warnings: [] };
  }

  // Only support v2.0 format
  if (!data.version || data.version !== '2.0') {
    return { 
      isValid: false, 
      errors: [`Unsupported format version: ${data.version || 'missing'}. Only v2.0 is supported.`], 
      warnings: [] 
    };
  }

  return validateSavedDiagram(data);
};

// Sanitize and fix common issues in diagram data
export const sanitizeDiagramData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const sanitized = { ...data };

  // Ensure rectangles array exists
  if (!Array.isArray(sanitized.rectangles)) {
    sanitized.rectangles = [];
  }

  // Sanitize rectangles
  sanitized.rectangles = sanitized.rectangles
    .filter((rect: any) => rect && typeof rect === 'object')
    .map((rect: any) => {
      const sanitizedRect: any = { ...rect };

      // Ensure numeric fields are valid
      ['x', 'y', 'w', 'h'].forEach(field => {
        if (typeof sanitizedRect[field] !== 'number' || !isFinite(sanitizedRect[field])) {
          sanitizedRect[field] = field === 'w' || field === 'h' ? 100 : 0;
        }
      });

      // Ensure positive dimensions
      if (sanitizedRect.w <= 0) sanitizedRect.w = 100;
      if (sanitizedRect.h <= 0) sanitizedRect.h = 100;

      // Ensure label exists
      if (!sanitizedRect.label || typeof sanitizedRect.label !== 'string') {
        sanitizedRect.label = `Rectangle ${sanitizedRect.id || 'Unknown'}`;
      }

      // Ensure type is valid
      if (!['root', 'parent', 'leaf'].includes(sanitizedRect.type)) {
        sanitizedRect.type = sanitizedRect.parentId ? 'leaf' : 'root';
      }

      return sanitizedRect;
    });

  // Add timestamp if missing
  if (typeof sanitized.timestamp !== 'number') {
    sanitized.timestamp = Date.now();
  }

  return sanitized;
};