export const GRID_SIZE = 10;
export const MARGIN = 1; // Margin around rectangles to prevent overlap
export const LABEL_MARGIN = 1.5; // Extra margin for nodes with children to accommodate labels
export const MIN_WIDTH = 5;
export const MIN_HEIGHT = 3;
export const MAX_HISTORY_SIZE = 50;

export const DEFAULT_COLORS = {
  root: '#4ECDC4',
  parent: '#45B7D1', 
  leaf: '#96CEB4',
  textLabel: 'transparent'
};

export const DEFAULT_RECTANGLE_SIZE = {
  root: { w: 16, h: 10 },
  parent: { w: 6, h: 4 },
  leaf: { w: 4, h: 3 },
  textLabel: { w: 8, h: 2 }
};

export const DEFAULT_FONT_SETTINGS = {
  rootFontSize: 12,
  dynamicFontSizing: true
};

import type { FontOption } from './fontDetection';

export const DEFAULT_FONT_FAMILY = 'Inter';

// Fallback font options if dynamic detection fails
export const FALLBACK_FONT_OPTIONS: FontOption[] = [
  { value: 'Inter', label: 'Inter', category: 'web' },
  { value: 'Arial', label: 'Arial', category: 'sans-serif' },
  { value: 'Helvetica', label: 'Helvetica', category: 'sans-serif' },
  { value: 'Georgia', label: 'Georgia', category: 'serif' },
  { value: 'Times New Roman', label: 'Times New Roman', category: 'serif' },
  { value: 'Verdana', label: 'Verdana', category: 'sans-serif' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS', category: 'sans-serif' },
  { value: 'Courier New', label: 'Courier New', category: 'monospace' },
  { value: 'system-ui', label: 'System UI', category: 'system' }
];

// Re-export for compatibility
export const FONT_OPTIONS = FALLBACK_FONT_OPTIONS;

export const DEFAULT_BORDER_SETTINGS = {
  borderRadius: 8,
  borderColor: '#374151',
  borderWidth: 2
};

export const DEFAULT_MARGIN_SETTINGS = {
  margin: 1,
  labelMargin: 2
};

export const KEYBOARD_SHORTCUTS = {
  SAVE: 'Ctrl+S',
  LOAD: 'Ctrl+O',
  UNDO: 'Ctrl+Z',
  REDO: 'Ctrl+Y',
  DELETE: 'Delete',
  COPY: 'Ctrl+C',
  PASTE: 'Ctrl+V',
  SELECT_ALL: 'Ctrl+A',
  ZOOM_IN: 'Ctrl+=',
  ZOOM_OUT: 'Ctrl+-',
  ZOOM_RESET: 'Ctrl+0'
};