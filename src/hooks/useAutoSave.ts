import { useEffect, useCallback, useRef } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Rectangle, AppSettings } from '../types';

interface AutoSaveData {
  rectangles: Rectangle[];
  appSettings: AppSettings;
  timestamp: number;
}

interface DomainDesignerDB extends DBSchema {
  diagrams: {
    key: string;
    value: AutoSaveData;
  };
}

const DB_NAME = 'DomainDesignerDB';
const DB_VERSION = 1;
const STORE_NAME = 'diagrams';
const AUTOSAVE_KEY = 'autosave';
const SAVE_DELAY = 1000; // 1 second debounce

export const useAutoSave = () => {
  const dbRef = useRef<IDBPDatabase<DomainDesignerDB> | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Initialize IndexedDB
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

  // Save data to IndexedDB
  const saveData = useCallback(async (data: AutoSaveData) => {
    try {
      const db = await initDB();
      if (!db) return;

      await db.put(STORE_NAME, data, AUTOSAVE_KEY);
      console.log('Auto-save completed');
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }, [initDB]);

  // Load data from IndexedDB
  const loadData = useCallback(async (): Promise<AutoSaveData | null> => {
    try {
      const db = await initDB();
      if (!db) return null;

      const data = await db.get(STORE_NAME, AUTOSAVE_KEY);
      return data || null;
    } catch (error) {
      console.error('Failed to load data:', error);
      return null;
    }
  }, [initDB]);

  // Clear saved data
  const clearData = useCallback(async () => {
    try {
      const db = await initDB();
      if (!db) return;

      await db.delete(STORE_NAME, AUTOSAVE_KEY);
      console.log('Auto-save data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }, [initDB]);

  // Debounced save function
  const debouncedSave = useCallback((data: AutoSaveData) => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveData(data);
    }, SAVE_DELAY);
  }, [saveData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Initialize DB on mount
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