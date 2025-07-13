import { useState, useCallback, useRef } from 'react';
import { Rectangle } from '../types';

export interface UseHistoryReturn {
  // History state
  canUndo: boolean;
  canRedo: boolean;
  
  // Actions
  pushState: (rectangles: Rectangle[]) => void;
  undo: () => Rectangle[] | null;
  redo: () => Rectangle[] | null;
  clearHistory: () => void;
  initializeHistory: (initialState: Rectangle[]) => void;
}

const MAX_HISTORY_SIZE = 50;

export const useHistory = (): UseHistoryReturn => {
  const [history, setHistory] = useState<Rectangle[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Use refs to track current values for consistent access in callbacks
  const historyRef = useRef<Rectangle[][]>([[]]);
  const historyIndexRef = useRef(0);
  
  // Keep refs in sync with state
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  const pushState = useCallback((rectangles: Rectangle[]) => {
    // Use refs for current values to avoid stale closures
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    
    let newHistory = [...currentHistory];
    
    // If we're not at the end of history, remove all states after current index
    if (currentIndex < newHistory.length - 1) {
      newHistory = newHistory.slice(0, currentIndex + 1);
    }
    
    // Enhanced duplicate detection - check if the new state is identical to the current state
    const currentState = newHistory[currentIndex];
    if (currentState) {
      const serializedNew = JSON.stringify(rectangles);
      const serializedCurrent = JSON.stringify(currentState);
      
      if (serializedNew === serializedCurrent) {
        // Skip adding duplicate state - no changes needed
        return;
      }
    }
    
    // Add the new state (deep copy to prevent mutations)
    newHistory.push(JSON.parse(JSON.stringify(rectangles)));
    
    // Limit history size
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
      // Index needs to be adjusted since we removed from the beginning
      setHistoryIndex(newHistory.length - 1);
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    
    setHistory(newHistory);
  }, []);

  const undo = useCallback((): Rectangle[] | null => {
    if (historyIndex <= 0) {
      return null;
    }
    
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    
    // Return deep copy to prevent mutations
    return JSON.parse(JSON.stringify(history[newIndex]));
  }, [history, historyIndex]);

  const redo = useCallback((): Rectangle[] | null => {
    if (historyIndex >= history.length - 1) {
      return null;
    }
    
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    
    // Return deep copy to prevent mutations
    return JSON.parse(JSON.stringify(history[newIndex]));
  }, [history, historyIndex]);

  const clearHistory = useCallback(() => {
    setHistory([[]]);
    setHistoryIndex(0);
  }, []);

  const initializeHistory = useCallback((initialState: Rectangle[]) => {
    // Initialize history with the given state as the first entry
    const newHistory = [JSON.parse(JSON.stringify(initialState))];
    setHistory(newHistory);
    setHistoryIndex(0);
  }, []);

  return {
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    pushState,
    undo,
    redo,
    clearHistory,
    initializeHistory,
  };
};