export const GRID_SIZE = 20;
export const MARGIN = 0.5;
export const LABEL_MARGIN = 2; // Extra margin for nodes with children to accommodate labels
export const MIN_WIDTH = 3;
export const MIN_HEIGHT = 3;
export const MAX_HISTORY_SIZE = 50;

export const DEFAULT_COLORS = {
  root: '#4ECDC4',
  parent: '#45B7D1', 
  leaf: '#96CEB4'
};

export const DEFAULT_RECTANGLE_SIZE = {
  root: { w: 16, h: 10 },
  parent: { w: 6, h: 4 },
  leaf: { w: 4, h: 3 }
};

export const DEFAULT_FONT_SETTINGS = {
  rootFontSize: 16,
  dynamicFontSizing: false
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