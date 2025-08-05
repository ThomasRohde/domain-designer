// Layout and positioning constants - grid-based system for consistent alignment
export const GRID_SIZE = 15;
export const MARGIN = 1; // Margin around rectangles to prevent overlap
export const LABEL_MARGIN = 2.0; // Extra margin for nodes with children to accommodate labels

// Minimum dimensions to ensure rectangle visibility and usability
export const MIN_WIDTH = 5;
export const MIN_HEIGHT = 3;

// History management - limits undo/redo stack size to prevent memory issues
export const MAX_HISTORY_SIZE = 50;

// Default color scheme for different rectangle types
export const DEFAULT_COLORS = {
  root: '#4ECDC4',        // Teal for top-level containers
  parent: '#45B7D1',      // Blue for intermediate containers  
  leaf: '#96CEB4',        // Light green for terminal nodes
  textLabel: 'transparent' // Transparent background for text-only elements
};

// Default dimensions in grid units for different rectangle types
export const DEFAULT_RECTANGLE_SIZE = {
  root: { w: 20, h: 10 },      // Large size for main domain boundaries
  parent: { w: 6, h: 4 },      // Medium size for container elements
  leaf: { w: 20, h: 3 },       // Wide aspect for detailed items
  textLabel: { w: 20, h: 2 }    // Compact size for text annotations
};

// Typography configuration for hierarchical text scaling
export const DEFAULT_FONT_SETTINGS = {
  rootFontSize: 15,           // Base font size for root level elements
  dynamicFontSizing: true     // Enable automatic font scaling by depth
};

import type { FontOption } from './fontDetection';

// Safe fallback font that's available on all systems
export const DEFAULT_FONT_FAMILY = 'Arial';

// Comprehensive fallback font list when system font detection fails
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


// Visual styling defaults for rectangle borders
export const DEFAULT_BORDER_SETTINGS = {
  borderRadius: 4,            // Rounded corners for modern appearance
  borderColor: '#374151',     // Neutral gray for professional look
  borderWidth: 1              // Standard 1px border weight
};

// Spacing configuration for layout algorithms
export const DEFAULT_MARGIN_SETTINGS = {
  margin: 1,                  // Standard spacing between rectangles
  labelMargin: 2.0           // Additional space for parent container labels
};

// Standard keyboard shortcuts for application actions
export const KEYBOARD_SHORTCUTS = {
  SAVE: 'Ctrl+S',            // Save current diagram
  LOAD: 'Ctrl+O',            // Open file dialog
  UNDO: 'Ctrl+Z',            // Undo last action
  REDO: 'Ctrl+Y',            // Redo undone action
  DELETE: 'Delete',          // Remove selected rectangle
  COPY: 'Ctrl+C',            // Copy selection to clipboard
  PASTE: 'Ctrl+V',           // Paste from clipboard
  SELECT_ALL: 'Ctrl+A',      // Select all rectangles
  ZOOM_IN: 'Ctrl+=',         // Increase zoom level
  ZOOM_OUT: 'Ctrl+-',        // Decrease zoom level
  ZOOM_RESET: 'Ctrl+0'       // Reset zoom to 100%
};