export interface ShortcutDefinition {
  key: string;
  modifiers: ('ctrl' | 'shift' | 'alt')[];
  description: string;
  category: 'Navigation' | 'Editing' | 'Selection' | 'View';
  available?: boolean; // Optional context-aware availability
}

/**
 * Centralized registry of all keyboard shortcuts
 * Used for help overlay and maintaining consistency
 */
export const SHORTCUT_REGISTRY: ShortcutDefinition[] = [
  // Editing shortcuts
  {
    key: 'C',
    modifiers: ['ctrl'],
    description: 'Copy selected rectangles',
    category: 'Editing'
  },
  {
    key: 'V',
    modifiers: ['ctrl'],
    description: 'Paste rectangles from clipboard',
    category: 'Editing'
  },
  {
    key: 'D',
    modifiers: ['ctrl'],
    description: 'Duplicate selected rectangles',
    category: 'Editing'
  },
  {
    key: 'Z',
    modifiers: ['ctrl'],
    description: 'Undo last action',
    category: 'Editing'
  },
  {
    key: 'Z',
    modifiers: ['ctrl', 'shift'],
    description: 'Redo last undone action',
    category: 'Editing'
  },
  {
    key: 'Y',
    modifiers: ['ctrl'],
    description: 'Redo last undone action',
    category: 'Editing'
  },
  
  // Selection shortcuts
  {
    key: 'A',
    modifiers: ['ctrl'],
    description: 'Select all rectangles at same level',
    category: 'Selection'
  },
  {
    key: 'Escape',
    modifiers: [],
    description: 'Clear current selection',
    category: 'Selection'
  },
  {
    key: 'Delete',
    modifiers: [],
    description: 'Delete selected rectangles',
    category: 'Selection'
  },

  // Navigation shortcuts
  {
    key: '↑',
    modifiers: [],
    description: 'Move selection up (1px)',
    category: 'Navigation'
  },
  {
    key: '↓',
    modifiers: [],
    description: 'Move selection down (1px)',
    category: 'Navigation'
  },
  {
    key: '←',
    modifiers: [],
    description: 'Move selection left (1px)',
    category: 'Navigation'
  },
  {
    key: '→',
    modifiers: [],
    description: 'Move selection right (1px)',
    category: 'Navigation'
  },
  {
    key: '↑',
    modifiers: ['shift'],
    description: 'Move selection up (10px)',
    category: 'Navigation'
  },
  {
    key: '↓',
    modifiers: ['shift'],
    description: 'Move selection down (10px)',
    category: 'Navigation'
  },
  {
    key: '←',
    modifiers: ['shift'],
    description: 'Move selection left (10px)',
    category: 'Navigation'
  },
  {
    key: '→',
    modifiers: ['shift'],
    description: 'Move selection right (10px)',
    category: 'Navigation'
  },

  // View shortcuts
  {
    key: 'M',
    modifiers: [],
    description: 'Toggle navigation minimap',
    category: 'View'
  },
  {
    key: '?',
    modifiers: [],
    description: 'Show keyboard shortcuts help',
    category: 'View'
  },
  {
    key: 'F1',
    modifiers: [],
    description: 'Show keyboard shortcuts help',
    category: 'View'
  }
];

/**
 * Format modifier keys for display
 */
export const formatShortcut = (definition: ShortcutDefinition): string => {
  const modifierMap = {
    ctrl: navigator.platform.includes('Mac') ? '⌘' : 'Ctrl',
    shift: navigator.platform.includes('Mac') ? '⇧' : 'Shift',
    alt: navigator.platform.includes('Mac') ? '⌥' : 'Alt'
  };

  const modifiers = definition.modifiers.map(mod => modifierMap[mod]).join(' + ');
  const key = definition.key;
  
  return modifiers ? `${modifiers} + ${key}` : key;
};

/**
 * Group shortcuts by category for organized display
 */
export const getShortcutsByCategory = (): Record<string, ShortcutDefinition[]> => {
  return SHORTCUT_REGISTRY.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutDefinition[]>);
};