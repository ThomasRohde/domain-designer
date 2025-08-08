import { Rectangle, AppSettings } from '../types';
import type { HeatmapState } from '../stores/types';

export interface LayoutMetadata {
  version: string;
  timestamp: number;
  isImported: boolean;
  preserveExactLayout: boolean;
  algorithm?: string;
  isUserArranged?: boolean;
  preservePositions?: boolean;
  boundingBox?: { w: number; h: number };
}

export interface LayoutSnapshot {
  rectangles: Rectangle[];
  metadata: LayoutMetadata;
}

export interface SavedDiagram {
  version: '2.0';
  rectangles: Rectangle[];
  globalSettings: AppSettings;
  layoutMetadata: {
    algorithm: string;
    isUserArranged: boolean;
    preservePositions: boolean;
    boundingBox: { w: number; h: number };
  };
  heatmapState?: HeatmapState;
  timestamp: number;
}

// Validation result for data integrity checks
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Factory function to create layout snapshots
export const createLayoutSnapshot = (
  rectangles: Rectangle[],
  options: Partial<LayoutMetadata> = {}
): LayoutSnapshot => {
  const metadata: LayoutMetadata = {
    version: '2.0',
    timestamp: Date.now(),
    isImported: false,
    preserveExactLayout: false,
    ...options
  };

  return {
    rectangles: structuredClone(rectangles), // Deep clone for immutability
    metadata
  };
};

// Factory function to create immutable imported snapshots
export const createImportedSnapshot = (
  rectangles: Rectangle[],
  additionalMetadata: Partial<LayoutMetadata> = {}
): LayoutSnapshot => {
  return createLayoutSnapshot(rectangles, {
    isImported: true,
    preserveExactLayout: true,
    ...additionalMetadata
  });
};

// Factory function to create restore snapshots
export const createRestoreSnapshot = (
  rectangles: Rectangle[],
  additionalMetadata: Partial<LayoutMetadata> = {}
): LayoutSnapshot => {
  return createLayoutSnapshot(rectangles, {
    preserveExactLayout: true,
    ...additionalMetadata
  });
};

// Check if a layout should be preserved exactly
export const shouldPreserveExactLayout = (metadata: LayoutMetadata): boolean => {
  return metadata.preserveExactLayout || metadata.isImported;
};

// Calculate bounding box for validation
export const calculateBoundingBox = (rectangles: Rectangle[]): { w: number; h: number } => {
  if (rectangles.length === 0) {
    return { w: 0, h: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  rectangles.forEach(rect => {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  });

  return {
    w: maxX - minX,
    h: maxY - minY
  };
};

// Validate layout snapshot integrity
export const validateLayoutSnapshot = (snapshot: LayoutSnapshot): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check basic structure
  if (!snapshot.rectangles || !Array.isArray(snapshot.rectangles)) {
    errors.push('Invalid rectangles array');
  }

  if (!snapshot.metadata) {
    errors.push('Missing metadata');
  }

  // Check rectangles
  if (snapshot.rectangles) {
    if (snapshot.rectangles.length === 0) {
      warnings.push('Empty rectangle set');
    }

    snapshot.rectangles.forEach((rect, index) => {
      if (!rect.id) {
        errors.push(`Rectangle at index ${index} missing id`);
      }
      if (typeof rect.x !== 'number' || typeof rect.y !== 'number') {
        errors.push(`Rectangle ${rect.id} has invalid position`);
      }
      if (typeof rect.w !== 'number' || typeof rect.h !== 'number' || rect.w <= 0 || rect.h <= 0) {
        errors.push(`Rectangle ${rect.id} has invalid dimensions`);
      }
    });

    // Check for duplicate IDs
    const ids = snapshot.rectangles.map(r => r.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push('Duplicate rectangle IDs found');
    }
  }

  // Check metadata
  if (snapshot.metadata) {
    if (!snapshot.metadata.version) {
      warnings.push('Missing version information');
    }
    if (!snapshot.metadata.timestamp) {
      warnings.push('Missing timestamp');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};