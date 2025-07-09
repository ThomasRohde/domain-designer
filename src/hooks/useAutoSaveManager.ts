import { useEffect, useCallback, useState, useRef } from 'react';
import { useAutoSave } from './useAutoSave';
import { Rectangle, AppSettings } from '../types';

interface AutoSaveManagerProps {
  rectangles: Rectangle[];
  appSettings: AppSettings;
  onRestore: (rectangles: Rectangle[], appSettings: AppSettings) => void;
}

export const useAutoSaveManager = ({ 
  rectangles, 
  appSettings, 
  onRestore 
}: AutoSaveManagerProps) => {
  const { saveData, loadData, clearData } = useAutoSave();
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [justRestored, setJustRestored] = useState(false);
  
  // Use refs to store stable references to avoid dependency issues
  const saveDataRef = useRef(saveData);
  const loadDataRef = useRef(loadData);
  const clearDataRef = useRef(clearData);
  const onRestoreRef = useRef(onRestore);
  
  // Keep refs updated
  useEffect(() => {
    saveDataRef.current = saveData;
    loadDataRef.current = loadData;
    clearDataRef.current = clearData;
    onRestoreRef.current = onRestore;
  });


  // Restore from saved state
  const restoreFromSave = useCallback(async () => {
    setIsRestoring(true);
    setJustRestored(true);
    try {
      const savedData = await loadData();
      if (savedData) {
        console.log('Restoring from auto-save:', new Date(savedData.timestamp));
        onRestore(savedData.rectangles, savedData.appSettings);
        setLastSaved(savedData.timestamp);
      }
    } catch (error) {
      console.error('Failed to restore from auto-save:', error);
    } finally {
      setIsRestoring(false);
      // Reset justRestored flag after a delay to prevent immediate auto-save
      setTimeout(() => {
        setJustRestored(false);
      }, 1000);
    }
  }, [loadData, onRestore]);

  // Clear saved state
  const clearSavedState = useCallback(async () => {
    await clearDataRef.current();
    setLastSaved(null);
  }, []);

  // Auto-save when state changes (but not during initial restore)
  useEffect(() => {
    if (!isRestoring && !justRestored && rectangles.length > 0) {
      console.log('Auto-saving', rectangles.length, 'rectangles');
      
      // Call saveData directly to avoid dependency issues
      const data = {
        rectangles,
        appSettings,
        timestamp: Date.now()
      };
      
      saveDataRef.current(data, () => {
        setLastSaved(Date.now());
      });
    }
  }, [rectangles, appSettings, isRestoring, justRestored]); // Clean dependencies

  // Initial restore on mount
  useEffect(() => {
    const performRestore = async () => {
      setIsRestoring(true);
      setJustRestored(true);
      try {
        const savedData = await loadDataRef.current();
        if (savedData) {
          console.log('About to restore data:', savedData.rectangles.length, 'rectangles');
          onRestoreRef.current(savedData.rectangles, savedData.appSettings);
          setLastSaved(savedData.timestamp);
        }
      } catch (error) {
        console.error('Failed to restore from auto-save:', error);
      } finally {
        setIsRestoring(false);
        // Reset justRestored flag after a delay to prevent immediate auto-save
        setTimeout(() => {
          setJustRestored(false);
        }, 1000);
      }
    };
    
    performRestore();
  }, []); // Empty dependency array - only run once on mount

  return {
    lastSaved,
    autoSaveEnabled,
    setAutoSaveEnabled,
    clearSavedState,
    isRestoring,
    restoreFromSave
  };
};