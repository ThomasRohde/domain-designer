import { useEffect, useCallback, useRef } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Rectangle, AppSettings } from '../types';

/**
 * Data structure for auto-save persistence
 */
interface AutoSaveData {
  rectangles: Rectangle[];
  appSettings: AppSettings;
  timestamp: number;
}

/**
 * IndexedDB schema definition for domain designer data
 */
interface DomainDesignerDB extends DBSchema {
  diagrams: {
    key: string;
    value: AutoSaveData;
  };
}

// IndexedDB configuration constants
const DB_NAME = 'DomainDesigner_v2_DB';
const DB_VERSION = 1;
const STORE_NAME = 'diagrams';
const AUTOSAVE_KEY = 'current_diagram';
const SAVE_DELAY = 2000; // Debounce delay to prevent excessive saves

/**
 * Custom hook for auto-save functionality using IndexedDB
 * Provides debounced saving with error handling and cleanup
 */
export const useAutoSave = () => {
  const dbRef = useRef<IDBPDatabase<DomainDesignerDB> | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  /**
   * Initializes IndexedDB connection with error handling
   * Creates object store if it doesn't exist
   */
  const initDB = useCallback(async () => {
    try {
      if (!dbRef.current) {
        dbRef.current = await openDB<DomainDesignerDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          },
        });
      }
      return dbRef.current;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      return null;
    }
  }, []);

  /**
   * Saves data to IndexedDB with error handling
   * Gracefully degrades when IndexedDB is unavailable
   */
  const saveData = useCallback(async (data: AutoSaveData) => {
    try {
      const db = await initDB();
      if (!db) {
        console.warn('IndexedDB not available for auto-save');
        return;
      }

      await db.put(STORE_NAME, data, AUTOSAVE_KEY);
      console.log('Auto-save complete:', data.rectangles.length, 'rectangles');
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }, [initDB]);

  /**
   * Loads saved data from IndexedDB
   * Returns null if no data exists or on error
   */
  const loadData = useCallback(async (): Promise<AutoSaveData | null> => {
    try {
      const db = await initDB();
      if (!db) {
        console.warn('IndexedDB not available for auto-restore');
        return null;
      }

      const data = await db.get(STORE_NAME, AUTOSAVE_KEY);
      if (data) {
        console.log('Loaded saved data:', data.rectangles.length, 'rectangles from', new Date(data.timestamp).toLocaleString());
      }
      return data || null;
    } catch (error) {
      console.error('Failed to load data:', error);
      return null;
    }
  }, [initDB]);

  /**
   * Clears all saved data from IndexedDB
   * Used for cleanup operations
   */
  const clearData = useCallback(async () => {
    try {
      const db = await initDB();
      if (!db) return;

      await db.delete(STORE_NAME, AUTOSAVE_KEY);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }, [initDB]);

  /**
   * Debounced save function to prevent excessive write operations
   * Cancels previous saves and schedules new one after delay
   */
  const debouncedSave = useCallback((data: AutoSaveData, onComplete?: () => void) => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      await saveData(data);
      onComplete?.();
    }, SAVE_DELAY);
  }, [saveData]);

  /**
   * Cleanup: prevents memory leaks from pending timeouts
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Initialize database connection on hook mount
   */
  useEffect(() => {
    initDB();
  }, [initDB]);

  return {
    saveData: debouncedSave,
    loadData,
    clearData,
    isReady: !!dbRef.current
  };
};