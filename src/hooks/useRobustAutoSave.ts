import { useCallback, useRef, useState, useEffect } from 'react';
import { Rectangle, AppSettings } from '../types';
import { SavedDiagram, ValidationResult } from '../types/layoutSnapshot';
import { validateSavedDiagram } from '../utils/schemaValidation';
import { useAutoSave } from './useAutoSave';
import { UseAppStateMachineReturn } from './useAppStateMachine';

export interface UseRobustAutoSaveProps {
  rectangles: Rectangle[];
  appSettings: AppSettings;
  stateMachine: UseAppStateMachineReturn;
  onRestore: (rectangles: Rectangle[], appSettings: AppSettings, layoutMetadata?: { algorithm: string; isUserArranged: boolean; preservePositions: boolean; boundingBox: { w: number; h: number } }) => void;
}

export interface UseRobustAutoSaveReturn {
  save: () => Promise<void>;
  restore: () => Promise<void>;
  clearData: () => Promise<void>;
  rollbackToLastGood: () => Promise<void>;
  isAutoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  lastSaved: number | null;
  lastGoodSave: number | null;
  hasSavedData: boolean;
}

export const useRobustAutoSave = ({
  rectangles,
  appSettings,
  stateMachine,
  onRestore
}: UseRobustAutoSaveProps): UseRobustAutoSaveReturn => {
  const { saveData, loadData, clearData: clearAutoSaveData } = useAutoSave();
  const [isAutoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [lastGoodSave, setLastGoodSave] = useState<number | null>(null);
  const [hasSavedData, setHasSavedData] = useState(false);
  const lastGoodDataRef = useRef<SavedDiagram | null>(null);
  const hasAutoRestoredRef = useRef(false);

  // Validate data before saving
  const validateBeforeSave = useCallback((data: SavedDiagram): ValidationResult => {
    // Basic validation
    const validation = validateSavedDiagram(data);
    
    // Additional business logic validation
    if (validation.isValid) {
      // Don't save empty states unless intentional
      if (data.rectangles.length === 0) {
        validation.errors.push('Cannot save empty rectangle set');
        validation.isValid = false;
      }
      
      // Don't save during state transitions that might produce invalid data
      if (stateMachine.isImporting || stateMachine.isRestoring) {
        validation.errors.push('Cannot save during import/restore operations');
        validation.isValid = false;
      }
    }
    
    return validation;
  }, [stateMachine]);

  // Create a diagram from current state
  const createDiagramFromState = useCallback((): SavedDiagram => {
    return {
      version: '2.0',
      rectangles,
      globalSettings: appSettings,
      layoutMetadata: {
        algorithm: appSettings.layoutAlgorithm || 'grid',
        isUserArranged: rectangles.some(r => r.isManualPositioningEnabled),
        preservePositions: false, // Allow re-layout for user-created content
        boundingBox: { w: 0, h: 0 } // Will be calculated during validation
      },
      timestamp: Date.now()
    };
  }, [rectangles, appSettings]);

  // Save with validation
  const save = useCallback(async (): Promise<void> => {
    if (!isAutoSaveEnabled) return;

    try {
      const data = createDiagramFromState();
      const validation = validateBeforeSave(data);
      
      if (!validation.isValid) {
        console.warn('Skipping save due to validation errors:', validation.errors);
        return;
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Save warnings:', validation.warnings);
      }

      // Convert to AutoSaveData format for compatibility
      const autoSaveData = {
        rectangles: data.rectangles,
        appSettings: data.globalSettings,
        timestamp: data.timestamp
      };

      // Save the data
      await new Promise<void>((resolve) => {
        saveData(autoSaveData, () => {
          // Keep track of last good data for rollback
          lastGoodDataRef.current = structuredClone(data);
          setLastSaved(data.timestamp);
          setLastGoodSave(data.timestamp);
          setHasSavedData(true);
          resolve();
        });
      });
      
    } catch (error) {
      console.error('Failed to save data:', error);
      throw error;
    }
  }, [isAutoSaveEnabled, createDiagramFromState, validateBeforeSave, saveData]);

  // Rollback to last known good state - define first to avoid circular dependency
  const rollbackToLastGood = useCallback(async (): Promise<void> => {
    if (!lastGoodDataRef.current) {
      throw new Error('No good save data available for rollback');
    }

    try {
      console.log('Rolling back to last good save');
      
      const goodData = lastGoodDataRef.current;
      
      // Convert to AutoSaveData format and save back to storage
      const autoSaveData = {
        rectangles: goodData.rectangles,
        appSettings: goodData.globalSettings,
        timestamp: goodData.timestamp
      };

      await new Promise<void>((resolve) => {
        saveData(autoSaveData, () => {
          resolve();
        });
      });
      
      // Restore from the good data
      onRestore(goodData.rectangles, goodData.globalSettings, goodData.layoutMetadata);
      setLastSaved(goodData.timestamp);
      setLastGoodSave(goodData.timestamp);
      
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }, [saveData, onRestore]);

  // Restore with validation - now defined after rollbackToLastGood
  const restore = useCallback(async (): Promise<void> => {
    if (stateMachine.isImporting || stateMachine.isRestoring) {
      console.warn('Cannot restore during import/restore operations');
      return;
    }

    try {
      stateMachine.transition({ type: 'START_RESTORE' });
      
      const autoSaveData = await loadData();
      if (!autoSaveData) {
        console.log('No saved data to restore');
        stateMachine.transition({ type: 'COMPLETE' });
        return;
      }

      // Convert AutoSaveData to SavedDiagram format for validation
      const savedData: SavedDiagram = {
        version: '2.0',
        rectangles: autoSaveData.rectangles,
        globalSettings: autoSaveData.appSettings,
        layoutMetadata: {
          algorithm: autoSaveData.appSettings.layoutAlgorithm || 'grid',
          isUserArranged: autoSaveData.rectangles.some(r => r.isManualPositioningEnabled),
          preservePositions: true, // Preserve positions for restored data
          boundingBox: { w: 0, h: 0 } // Will be calculated if needed
        },
        timestamp: autoSaveData.timestamp
      };

      // Validate the loaded data
      const validation = validateSavedDiagram(savedData);
      
      if (!validation.isValid) {
        console.error('Saved data is corrupted:', validation.errors);
        
        // Try to rollback to last known good data
        if (lastGoodDataRef.current) {  
          console.log('Attempting rollback to last good data');
          await rollbackToLastGood();
          return;
        }
        
        throw new Error(`Corrupted save data: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('Restore warnings:', validation.warnings);
      }

      stateMachine.transition({ type: 'RESTORE_APPLYING' });
      
      // Restore the data
      onRestore(savedData.rectangles, savedData.globalSettings, savedData.layoutMetadata);
      setLastSaved(savedData.timestamp);
      setHasSavedData(true);
      
      // Keep this as last good data
      lastGoodDataRef.current = structuredClone(savedData);
      setLastGoodSave(savedData.timestamp);
      
      stateMachine.transition({ type: 'COMPLETE' });
      
    } catch (error) {
      console.error('Failed to restore data:', error);
      stateMachine.transition({ type: 'ERROR' });
      throw error;
    }
  }, [stateMachine, loadData, onRestore, rollbackToLastGood]);

  // Clear all saved data
  const clearData = useCallback(async (): Promise<void> => {
    try {
      await clearAutoSaveData();
      setLastSaved(null);
      setLastGoodSave(null);
      setHasSavedData(false);
      lastGoodDataRef.current = null;
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }, [clearAutoSaveData]);

  // Check for existing data on mount and auto-restore (only once)
  useEffect(() => {
    const checkAndRestoreSavedData = async () => {
      // Prevent multiple auto-restores
      if (hasAutoRestoredRef.current) {
        return;
      }

      try {
        const autoSaveData = await loadData();
        if (autoSaveData) {
          setHasSavedData(true);
          setLastSaved(autoSaveData.timestamp);
          
          // Convert to SavedDiagram format for validation
          const savedData: SavedDiagram = {
            version: '2.0',
            rectangles: autoSaveData.rectangles,
            globalSettings: autoSaveData.appSettings,
            layoutMetadata: {
              algorithm: autoSaveData.appSettings.layoutAlgorithm || 'grid',
              isUserArranged: autoSaveData.rectangles.some(r => r.isManualPositioningEnabled),
              preservePositions: true,
              boundingBox: { w: 0, h: 0 }
            },
            timestamp: autoSaveData.timestamp
          };
          
          // Validate the existing data
          const validation = validateSavedDiagram(savedData);
          if (validation.isValid) {
            lastGoodDataRef.current = savedData;
            setLastGoodSave(savedData.timestamp);
            
            // Automatically restore the validated data (only once)
            console.log('🔄 Auto-restoring saved data on page load:', savedData.rectangles.length, 'rectangles');
            hasAutoRestoredRef.current = true;
            onRestore(savedData.rectangles, savedData.globalSettings, savedData.layoutMetadata);
          }
        }
      } catch (error) {
        console.error('Failed to check for saved data:', error);
      }
    };
    
    checkAndRestoreSavedData();
  }, [loadData]);

  return {
    save,
    restore,
    clearData,
    rollbackToLastGood,
    isAutoSaveEnabled,
    setAutoSaveEnabled,
    lastSaved,
    lastGoodSave,
    hasSavedData
  };
};