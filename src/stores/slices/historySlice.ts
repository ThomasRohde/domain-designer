import type { SliceCreator, HistoryState, HistoryActions } from '../types';
import type { Rectangle } from '../../types';

const MAX_HISTORY_SIZE = 50;

/**
 * History state slice interface
 */
export interface HistorySlice {
  history: HistoryState;
  historyActions: HistoryActions;
}

/**
 * Compares two rectangle states for equality to avoid duplicate history entries
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
           rect.isLockedAsIs === other.isLockedAsIs;
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

    saveToHistory: () => {
      const state = get();
      const { rectangles, history } = state;
      
      let newStack = [...history.stack];
      
      // If we're not at the end of history, remove all states after current index
      if (history.index < newStack.length - 1) {
        newStack = newStack.slice(0, history.index + 1);
      }
      
      // Enhanced duplicate detection - check if the new state is identical to the current state
      const currentState = newStack[history.index];
      if (currentState && areRectangleStatesEqual(rectangles, currentState)) {
        // Skip adding duplicate state - no changes needed
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

    pushState: (rectangles: Rectangle[]) => {
      // This method provides compatibility with the old useHistory interface
      // It's essentially the same as saveToHistory but takes rectangles as parameter
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