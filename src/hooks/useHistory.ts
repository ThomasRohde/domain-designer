import { useState, useCallback, useRef } from 'react';
import { Rectangle } from '../types';

/**
 * Return interface for useHistory hook
 * Provides undo/redo functionality with optimized state management
 */
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

// Maximum history entries to prevent memory issues
const MAX_HISTORY_SIZE = 50;

export const useHistory = (): UseHistoryReturn => {
  const [history, setHistory] = useState<Rectangle[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  /**
   * Refs provide stable access to current values in callbacks
   * Prevents stale closure issues in useCallback dependencies
   */
  const historyRef = useRef<Rectangle[][]>([[]]);
  const historyIndexRef = useRef(0);
  
  // Maintain ref synchronization with React state
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  const pushState = useCallback((rectangles: Rectangle[]) => {
    // Access current values via refs to prevent stale state
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    
    let newHistory = [...currentHistory];
    
    // Branching: remove future states when adding after undo
    if (currentIndex < newHistory.length - 1) {
      newHistory = newHistory.slice(0, currentIndex + 1);
    }
    
    /**
     * Optimized duplicate detection using field-by-field comparison
     * Avoids expensive JSON serialization for performance
     */
    const currentState = newHistory[currentIndex];
    if (currentState) {
      // Fast comparison: check length first, then field-by-field
      if (rectangles.length === currentState.length && 
          rectangles.every((rect, i) => {
            const current = currentState[i];
            return current && 
                   rect.id === current.id &&
                   rect.x === current.x &&
                   rect.y === current.y &&
                   rect.w === current.w &&
                   rect.h === current.h &&
                   rect.label === current.label &&
                   rect.color === current.color &&
                   rect.parentId === current.parentId &&
                   rect.type === current.type;
          })) {
        // Skip duplicate: no actual changes detected
        return;
      }
    }
    
    // Store immutable copy to prevent external mutations
    newHistory.push(JSON.parse(JSON.stringify(rectangles)));
    
    // Memory management: enforce size limits
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
      // Adjust index after removing oldest entry
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
    
    // Return immutable copy to prevent external mutations
    return JSON.parse(JSON.stringify(history[newIndex]));
  }, [history, historyIndex]);

  const redo = useCallback((): Rectangle[] | null => {
    if (historyIndex >= history.length - 1) {
      return null;
    }
    
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    
    // Return immutable copy to prevent external mutations
    return JSON.parse(JSON.stringify(history[newIndex]));
  }, [history, historyIndex]);

  const clearHistory = useCallback(() => {
    setHistory([[]]);
    setHistoryIndex(0);
  }, []);

  const initializeHistory = useCallback((initialState: Rectangle[]) => {
    // Reset history with provided initial state as base entry
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