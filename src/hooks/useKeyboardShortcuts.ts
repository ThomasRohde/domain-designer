import { useEffect } from 'react';

/**
 * Interface defining available keyboard shortcuts and their handlers
 * Supports standard editing operations and precise movement controls
 */
interface KeyboardShortcuts {
  onSave?: () => void;
  onLoad?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCancel?: () => void;
  onMoveUp?: (deltaPixels: number) => void;
  onMoveDown?: (deltaPixels: number) => void;
  onMoveLeft?: (deltaPixels: number) => void;
  onMoveRight?: (deltaPixels: number) => void;
  onToggleMinimap?: () => void;  // 'M' key toggles navigation minimap visibility
  onShowHelp?: () => void;  // Show keyboard shortcut help overlay
}

/**
 * Custom hook for managing global keyboard shortcuts
 * Handles context-aware shortcut processing with modal and input detection
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, key } = event;
      const isCtrlOrCmd = ctrlKey || metaKey;

      // Context detection: prevent shortcuts during text editing or modal interactions
      const isTyping = (event.target as Element)?.matches('input, textarea, [contenteditable="true"]');
      const isInModal = (event.target as Element)?.closest('[role="dialog"], .modal, [data-modal]');

      if (!isCtrlOrCmd) {
        if (key === 'Delete' && shortcuts.onDelete && !isTyping && !isInModal) {
          event.preventDefault();
          shortcuts.onDelete();
        } else if (key === 'Escape' && shortcuts.onCancel) {
          event.preventDefault();
          shortcuts.onCancel();
        } else if (key.toLowerCase() === 'm' && shortcuts.onToggleMinimap && !isTyping && !isInModal) {
          // 'M' key toggles minimap visibility for spatial navigation
          event.preventDefault();
          shortcuts.onToggleMinimap();
        } else if ((key === '?' || key === 'F1') && shortcuts.onShowHelp && !isTyping && !isInModal) {
          // '?' or F1 key shows keyboard shortcut help
          event.preventDefault();
          shortcuts.onShowHelp();
        } else if (!isTyping && !isInModal) {
          // Arrow key movement with precision control via modifiers
          let deltaPixels = 1; // Precise movement by default
          
          if (event.shiftKey) {
            deltaPixels = 10; // Fast movement with Shift modifier
          } else if (!event.ctrlKey && !event.metaKey) {
            deltaPixels = 1; // Fine-grained positioning
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
        case 'd':
          if (shortcuts.onDuplicate) {
            event.preventDefault();
            shortcuts.onDuplicate();
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
            event.preventDefault();
            shortcuts.onRedo();
          } else if (!event.shiftKey && shortcuts.onUndo) {
            event.preventDefault();
            shortcuts.onUndo();
          }
          break;
        case 'y':
          if (shortcuts.onRedo) {
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