// Grid-based layout system - ensures pixel-perfect alignment across all zoom levels
export const GRID_SIZE = 15;        // Base grid unit in pixels - all coordinates are multiples of this value
export const MARGIN = 1;            // Standard spacing between sibling rectangles (in grid units)
export const LABEL_MARGIN = 2.0;    // Additional top spacing for parent containers to accommodate labels (in grid units)

// Minimum size constraints - prevent rectangles from becoming too small to interact with
export const MIN_WIDTH = 5;         // Minimum width in grid units (75px at default grid size)
export const MIN_HEIGHT = 3;        // Minimum height in grid units (45px at default grid size)

// History management - limits undo/redo stack size to prevent memory issues
export const MAX_HISTORY_SIZE = 50;

// Visual identity system - distinct colors for different rectangle types in hierarchy
export const DEFAULT_COLORS = {
  root: '#4ECDC4',         // Teal: Top-level domain boundaries and primary containers
  parent: '#45B7D1',       // Blue: Intermediate containers and logical groupings  
  leaf: '#96CEB4',         // Light green: Terminal elements and specific items
  textLabel: 'transparent' // Transparent: Text annotations and labels without backgrounds
};

// Size templates for different rectangle types - optimized for typical use cases
export const DEFAULT_RECTANGLE_SIZE = {
  root: { w: 20, h: 10 },       // Spacious: Main domain areas and top-level containers (300×150px)
  parent: { w: 6, h: 4 },       // Balanced: Sub-containers and logical groupings (90×60px)
  leaf: { w: 20, h: 3 },        // Horizontal: Detail items and specific elements (300×45px)
  textLabel: { w: 20, h: 2 }    // Minimal: Text annotations and labels (300×30px)
};

// Typography system - supports hierarchical visual organization through font scaling
export const DEFAULT_FONT_SETTINGS = {
  rootFontSize: 22,            // Base font size in pixels for root-level elements
  dynamicFontSizing: true      // Automatically reduce font size for deeper hierarchy levels (10% per level)
};

import type { FontOption } from './fontDetection';

// Universal font fallback - guaranteed availability across all operating systems
export const DEFAULT_FONT_FAMILY = 'Arial';

// Robust font selection - provides quality options when system font detection is unavailable
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


// Border styling system - provides professional appearance with modern design principles
export const DEFAULT_BORDER_SETTINGS = {
  borderRadius: 4,             // Corner rounding in pixels for contemporary visual style
  borderColor: '#374151',      // Neutral gray (Tailwind gray-700) for professional appearance
  borderWidth: 1               // Standard border thickness in pixels
};

// Layout spacing system - controls automatic spacing in layout algorithms
export const DEFAULT_MARGIN_SETTINGS = {
  margin: 1,                   // Inter-rectangle spacing in grid units (prevents visual crowding)
  labelMargin: 2.0            // Top spacing for parent labels in grid units (ensures label visibility)
};

// Application keyboard shortcuts - follows platform conventions for intuitive interaction
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