import { useEffect } from 'react';

interface KeyboardShortcuts {
  onSave?: () => void;
  onLoad?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, key } = event;
      const isCtrlOrCmd = ctrlKey || metaKey;

      if (!isCtrlOrCmd) {
        if (key === 'Delete' && shortcuts.onDelete) {
          event.preventDefault();
          shortcuts.onDelete();
        }
        return;
      }

      switch (key.toLowerCase()) {
        case 's':
          if (shortcuts.onSave) {
            event.preventDefault();
            shortcuts.onSave();
          }
          break;
        case 'o':
          if (shortcuts.onLoad) {
            event.preventDefault();
            shortcuts.onLoad();
          }
          break;
        case 'c':
          if (shortcuts.onCopy) {
            event.preventDefault();
            shortcuts.onCopy();
          }
          break;
        case 'v':
          if (shortcuts.onPaste) {
            event.preventDefault();
            shortcuts.onPaste();
          }
          break;
        case 'a':
          if (shortcuts.onSelectAll) {
            event.preventDefault();
            shortcuts.onSelectAll();
          }
          break;
        case 'z':
          if (event.shiftKey && shortcuts.onRedo) {
            console.log('Executing redo shortcut (Ctrl+Shift+Z)');
            event.preventDefault();
            shortcuts.onRedo();
          } else if (!event.shiftKey && shortcuts.onUndo) {
            console.log('Executing undo shortcut (Ctrl+Z)');
            event.preventDefault();
            shortcuts.onUndo();
          }
          break;
        case 'y':
          if (shortcuts.onRedo) {
            console.log('Executing redo shortcut (Ctrl+Y)');
            event.preventDefault();
            shortcuts.onRedo();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};