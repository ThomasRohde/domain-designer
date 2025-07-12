import { useState, useCallback } from 'react';
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
}

const MAX_HISTORY_SIZE = 50;

export const useHistory = (): UseHistoryReturn => {
  const [history, setHistory] = useState<Rectangle[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushState = useCallback((rectangles: Rectangle[]) => {
    setHistory(prev => {
      let newHistory = [...prev];
      
      // If we're not at the end of history, remove all states after current index
      const currentIndex = historyIndex;
      if (currentIndex < newHistory.length - 1) {
        newHistory = newHistory.slice(0, currentIndex + 1);
      }
      
      // Check if the new state is identical to the current state (prevents duplicates)
      const currentState = newHistory[currentIndex];
      if (currentState) {
        const serializedNew = JSON.stringify(rectangles);
        const serializedCurrent = JSON.stringify(currentState);
        
        if (serializedNew === serializedCurrent) {
          // Skip adding duplicate state, but still update index to be consistent
          setHistoryIndex(currentIndex);
          return newHistory;
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
      
      return newHistory;
    });
  }, [historyIndex]);

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

  return {
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    pushState,
    undo,
    redo,
    clearHistory,
  };
};