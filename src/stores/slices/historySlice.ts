import type { SliceCreator, HistoryState, HistoryActions } from '../types';
import type { Rectangle } from '../../types';

const MAX_HISTORY_SIZE = 50;

/**
 * History state slice managing undo/redo functionality.
 * Provides time-travel debugging and user error recovery with
 * efficient state comparison and memory management.
 */
export interface HistorySlice {
  history: HistoryState;
  historyActions: HistoryActions;
}

/**
 * Deep equality comparison for rectangle states to prevent duplicate history entries.
 * Compares all relevant rectangle properties to detect meaningful changes.
 * This optimization prevents history bloat from reference changes without content changes.
 */
const areRectangleStatesEqual = (state1: Rectangle[], state2: Rectangle[]): boolean => {
  if (state1.length !== state2.length) {
    return false;
  }
  
  return state1.every((rect, i) => {
    const other = state2[i];
    return other && 
           rect.id === other.id &&
           rect.x === other.x &&
           rect.y === other.y &&
           rect.w === other.w &&
           rect.h === other.h &&
           rect.label === other.label &&
           rect.color === other.color &&
           rect.parentId === other.parentId &&
           rect.type === other.type &&
           rect.description === other.description &&
           rect.isTextLabel === other.isTextLabel &&
           rect.textFontFamily === other.textFontFamily &&
           rect.textFontSize === other.textFontSize &&
           rect.fontWeight === other.fontWeight &&
           rect.textAlign === other.textAlign &&
           rect.isManualPositioningEnabled === other.isManualPositioningEnabled &&
           rect.isLockedAsIs === other.isLockedAsIs &&
           // Important: include heatmapValue so heatmap edits are recorded in history
           rect.heatmapValue === other.heatmapValue;
  });
};

/**
 * Creates the history slice for the store
 */
export const createHistorySlice: SliceCreator<HistorySlice> = (set, get) => ({
  // Initial state
  history: {
    stack: [[]],
    index: 0
  },

  // Actions
  historyActions: {
    undo: () => {
      const state = get();
      const { history } = state;
      
      if (history.index <= 0) {
        return;
      }
      
      const newIndex = history.index - 1;
      const previousState = history.stack[newIndex];
      
      set(state => ({
        rectangles: JSON.parse(JSON.stringify(previousState)),
        selectedId: null,
        history: {
          ...state.history,
          index: newIndex
        }
      }));
    },

    redo: () => {
      const state = get();
      const { history } = state;
      
      if (history.index >= history.stack.length - 1) {
        return;
      }
      
      const newIndex = history.index + 1;
      const nextState = history.stack[newIndex];
      
      set(state => ({
        rectangles: JSON.parse(JSON.stringify(nextState)),
        selectedId: null,
        history: {
          ...state.history,
          index: newIndex
        }
      }));
    },

    /**
     * Save current rectangle state to history with duplicate detection.
     * Manages history stack size, removes future states when branching,
     * and prevents duplicate entries to optimize memory usage.
     * Uses asynchronous deep copy to prevent UI thread blocking.
     */
    saveToHistory: () => {
      const state = get();
      const { rectangles, history } = state;
      
      let newStack = [...history.stack];
      
      // Remove future states when creating a new branch (standard undo/redo behavior)
      if (history.index < newStack.length - 1) {
        newStack = newStack.slice(0, history.index + 1);
      }
      
      // Skip duplicate states to prevent history bloat
      const currentState = newStack[history.index];
      if (currentState && areRectangleStatesEqual(rectangles, currentState)) {
        return; // No meaningful changes to save
      }
      
      // Use asynchronous deep copy to prevent blocking UI thread
      // Defer the expensive JSON operation to the next tick
      Promise.resolve().then(() => {
        try {
          const deepCopy = JSON.parse(JSON.stringify(rectangles));
          
          // Re-get state in case it changed during async operation
          const currentState = get();
          let updatedStack = [...currentState.history.stack];
          
          // Remove future states again in case user did more actions
          if (currentState.history.index < updatedStack.length - 1) {
            updatedStack = updatedStack.slice(0, currentState.history.index + 1);
          }
          
          // Add new state with the deep copy
          updatedStack.push(deepCopy);
          
          let newIndex = updatedStack.length - 1;
          
          // Maintain bounded history size for memory management
          if (updatedStack.length > MAX_HISTORY_SIZE) {
            updatedStack.shift();
            newIndex = updatedStack.length - 1;
          }
          
          set(() => ({
            history: {
              stack: updatedStack,
              index: newIndex
            }
          }));
        } catch (error) {
          console.warn('Failed to save state to history:', error);
        }
      });
    },

    pushState: (rectangles: Rectangle[]) => {
      // Save the provided rectangles state to history
      const state = get();
      const { history } = state;
      
      let newStack = [...history.stack];
      
      // If we're not at the end of history, remove all states after current index
      if (history.index < newStack.length - 1) {
        newStack = newStack.slice(0, history.index + 1);
      }
      
      // Enhanced duplicate detection
      const currentState = newStack[history.index];
      if (currentState && areRectangleStatesEqual(rectangles, currentState)) {
        // Skip adding duplicate state
        return;
      }
      
      // Add the new state (deep copy to prevent mutations)
      newStack.push(JSON.parse(JSON.stringify(rectangles)));
      
      let newIndex = newStack.length - 1;
      
      // Limit history size
      if (newStack.length > MAX_HISTORY_SIZE) {
        newStack.shift();
        newIndex = newStack.length - 1;
      }
      
      set(() => ({
        history: {
          stack: newStack,
          index: newIndex
        }
      }));
    },

    clearHistory: () => {
      set(() => ({
        history: {
          stack: [[]],
          index: 0
        }
      }));
    },

    initializeHistory: (initialState: Rectangle[]) => {
      const newHistory = [JSON.parse(JSON.stringify(initialState))];
      set(() => ({
        history: {
          stack: newHistory,
          index: 0
        }
      }));
    }
  }
});