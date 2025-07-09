import { useEffect, useCallback, useState } from 'react';
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Save current state
  const saveCurrentState = useCallback(() => {
    if (!autoSaveEnabled || isRestoring) return;

    const data = {
      rectangles,
      appSettings,
      timestamp: Date.now()
    };

    saveData(data);
    setLastSaved(new Date());
  }, [rectangles, appSettings, saveData, autoSaveEnabled, isRestoring]);

  // Restore from saved state
  const restoreFromSave = useCallback(async () => {
    setIsRestoring(true);
    try {
      const savedData = await loadData();
      if (savedData) {
        console.log('Restoring from auto-save:', new Date(savedData.timestamp));
        onRestore(savedData.rectangles, savedData.appSettings);
        setLastSaved(new Date(savedData.timestamp));
      }
    } catch (error) {
      console.error('Failed to restore from auto-save:', error);
    } finally {
      setIsRestoring(false);
    }
  }, [loadData, onRestore]);

  // Clear saved state
  const clearSavedState = useCallback(async () => {
    await clearData();
    setLastSaved(null);
  }, [clearData]);

  // Auto-save when state changes
  useEffect(() => {
    if (rectangles.length > 0 || Object.keys(appSettings).length > 0) {
      saveCurrentState();
    }
  }, [rectangles, appSettings, saveCurrentState]);

  // Initial restore on mount
  useEffect(() => {
    restoreFromSave();
  }, [restoreFromSave]);

  return {
    lastSaved,
    autoSaveEnabled,
    setAutoSaveEnabled,
    clearSavedState,
    isRestoring,
    restoreFromSave
  };
};