import { CategoryConfig } from '../types';

export const GRID_SIZE = 20;
export const MARGIN = 2;
export const MIN_WIDTH = 3;
export const MIN_HEIGHT = 3;
export const MAX_HISTORY_SIZE = 50;

export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  channel: {
    name: 'Channels',
    color: '#1976D2',
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
    textColor: '#0D47A1',
    icon: '📡'
  },
  relationship: {
    name: 'Relationships',
    color: '#7B1FA2',
    backgroundColor: '#F3E5F5',
    borderColor: '#7B1FA2',
    textColor: '#4A148C',
    icon: '🤝'
  },
  business: {
    name: 'Business Support',
    color: '#388E3C',
    backgroundColor: '#E8F5E8',
    borderColor: '#388E3C',
    textColor: '#1B5E20',
    icon: '💼'
  },
  product: {
    name: 'Products & Services',
    color: '#F57C00',
    backgroundColor: '#FFF3E0',
    borderColor: '#F57C00',
    textColor: '#E65100',
    icon: '📦'
  },
  control: {
    name: 'Business Control',
    color: '#689F38',
    backgroundColor: '#F1F8E9',
    borderColor: '#689F38',
    textColor: '#33691E',
    icon: '🎯'
  },
  risk: {
    name: 'Risk Management',
    color: '#D32F2F',
    backgroundColor: '#FFEBEE',
    borderColor: '#D32F2F',
    textColor: '#B71C1C',
    icon: '⚠️'
  },
  platform: {
    name: 'IT Platform',
    color: '#512DA8',
    backgroundColor: '#E8EAF6',
    borderColor: '#512DA8',
    textColor: '#311B92',
    icon: '💻'
  },
  data: {
    name: 'Data Platform',
    color: '#7B1FA2',
    backgroundColor: '#F3E5F5',
    borderColor: '#7B1FA2',
    textColor: '#4A148C',
    icon: '📊'
  },
  support: {
    name: 'Organisational Support',
    color: '#00796B',
    backgroundColor: '#E0F2F1',
    borderColor: '#00796B',
    textColor: '#004D40',
    icon: '🏢'
  }
};

export const DEFAULT_RECTANGLE_SIZE = {
  root: { w: 8, h: 6 },
  parent: { w: 6, h: 4 },
  leaf: { w: 4, h: 3 }
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