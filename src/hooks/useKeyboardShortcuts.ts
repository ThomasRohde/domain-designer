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
  onCancel?: () => void;
  onMoveUp?: (deltaPixels: number) => void;
  onMoveDown?: (deltaPixels: number) => void;
  onMoveLeft?: (deltaPixels: number) => void;
  onMoveRight?: (deltaPixels: number) => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, key } = event;
      const isCtrlOrCmd = ctrlKey || metaKey;

      // Check if user is typing in an input field or modal
      const isTyping = (event.target as Element)?.matches('input, textarea, [contenteditable="true"]');
      const isInModal = (event.target as Element)?.closest('[role="dialog"], .modal, [data-modal]');

      if (!isCtrlOrCmd) {
        if (key === 'Delete' && shortcuts.onDelete && !isTyping && !isInModal) {
          event.preventDefault();
          shortcuts.onDelete();
        } else if (key === 'Escape' && shortcuts.onCancel) {
          event.preventDefault();
          shortcuts.onCancel();
        } else if (!isTyping && !isInModal) {
          // Handle arrow key movement with modifier support
          let deltaPixels = 1; // Default: 1 pixel movement
          
          if (event.shiftKey) {
            deltaPixels = 10; // Shift: 10 pixel movement (fast)
          } else if (!event.ctrlKey && !event.metaKey) {
            deltaPixels = 1; // No modifier: 1 pixel movement (precise)
          }
          
          switch (key) {
            case 'ArrowUp':
              if (shortcuts.onMoveUp) {
                event.preventDefault();
                shortcuts.onMoveUp(deltaPixels);
              }
              break;
            case 'ArrowDown':
              if (shortcuts.onMoveDown) {
                event.preventDefault();
                shortcuts.onMoveDown(deltaPixels);
              }
              break;
            case 'ArrowLeft':
              if (shortcuts.onMoveLeft) {
                event.preventDefault();
                shortcuts.onMoveLeft(deltaPixels);
              }
              break;
            case 'ArrowRight':
              if (shortcuts.onMoveRight) {
                event.preventDefault();
                shortcuts.onMoveRight(deltaPixels);
              }
              break;
          }
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