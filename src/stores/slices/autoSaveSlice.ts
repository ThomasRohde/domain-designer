import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Rectangle, AppSettings } from '../../types';
import { SavedDiagram, ValidationResult } from '../../types/layoutSnapshot';
import { validateSavedDiagram } from '../../utils/schemaValidation';
import type { SliceCreator, AutoSaveState, AutoSaveActions } from '../types';

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

const DB_NAME = 'DomainDesigner_v2_DB';
const DB_VERSION = 1;
const STORE_NAME = 'diagrams';
const AUTOSAVE_KEY = 'current_diagram';
const SAVE_DELAY = 2000; // 2 second debounce

/**
 * Auto-save state slice interface
 */
export interface AutoSaveSlice {
  autoSave: AutoSaveState & {
    lastGoodSave: number | null;
    hasAutoRestored: boolean;
    isValidating: boolean;
  };
  autoSaveActions: AutoSaveActions & {
    validate: (rectangles: Rectangle[], settings: AppSettings) => ValidationResult;
    rollbackToLastGood: () => Promise<boolean>;
    resetAutoRestoreFlag: () => void;
    setLastGoodSave: (timestamp: number | null) => void;
    setIsValidating: (validating: boolean) => void;
    setHasAutoRestored: (restored: boolean) => void;
  };
}

/**
 * Creates the auto-save slice for the store
 */
export const createAutoSaveSlice: SliceCreator<AutoSaveSlice> = (set, get) => {
  let dbRef: IDBPDatabase<DomainDesignerDB> | null = null;
  let saveTimeoutRef: number | null = null;
  let lastGoodDataRef: SavedDiagram | null = null;

  // Initialize IndexedDB
  const initDB = async (): Promise<IDBPDatabase<DomainDesignerDB> | null> => {
    try {
      if (!dbRef) {
        dbRef = await openDB<DomainDesignerDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          },
        });
      }
      return dbRef;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      return null;
    }
  };

  // Save data to IndexedDB
  const saveDataToIndexedDB = async (data: AutoSaveData): Promise<boolean> => {
    try {
      const db = await initDB();
      if (!db) {
        console.warn('IndexedDB not available for auto-save');
        return false;
      }

      await db.put(STORE_NAME, data, AUTOSAVE_KEY);
      console.log('Auto-save complete:', data.rectangles.length, 'rectangles');
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  };

  // Load data from IndexedDB
  const loadDataFromIndexedDB = async (): Promise<AutoSaveData | null> => {
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
  };

  // Clear saved data
  const clearDataFromIndexedDB = async (): Promise<void> => {
    try {
      const db = await initDB();
      if (!db) return;

      await db.delete(STORE_NAME, AUTOSAVE_KEY);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  };

  // Debounced save function
  const debouncedSave = (data: AutoSaveData) => {
    if (saveTimeoutRef) {
      window.clearTimeout(saveTimeoutRef);
    }

    saveTimeoutRef = window.setTimeout(async () => {
      const success = await saveDataToIndexedDB(data);
      if (success) {
        set(state => ({
          autoSave: {
            ...state.autoSave,
            lastSaved: Date.now(),
            hasSavedData: true
          }
        }));
      }
    }, SAVE_DELAY);
  };

  return {
    // Initial state
    autoSave: {
      enabled: true,
      lastSaved: null,
      hasSavedData: false,
      lastGoodSave: null,
      hasAutoRestored: false,
      isValidating: false
    },

    // Actions
    autoSaveActions: {
      // Initialize the IndexedDB and check for auto-restore on app start
      initialize: async () => {
        try {
          await initDB();
          // Check for auto-restore after a short delay
          setTimeout(async () => {
            await get().autoSaveActions.checkAndAutoRestore();
          }, 500);
        } catch (error) {
          console.error('Failed to initialize auto-save:', error);
        }
      },
      setEnabled: (enabled: boolean) => {
        set(state => ({
          autoSave: {
            ...state.autoSave,
            enabled
          }
        }));
      },

      setLastSaved: (timestamp: number | null) => {
        set(state => ({
          autoSave: {
            ...state.autoSave,
            lastSaved: timestamp
          }
        }));
      },

      setHasSavedData: (hasSaved: boolean) => {
        set(state => ({
          autoSave: {
            ...state.autoSave,
            hasSavedData: hasSaved
          }
        }));
      },

      setLastGoodSave: (timestamp: number | null) => {
        set(state => ({
          autoSave: {
            ...state.autoSave,
            lastGoodSave: timestamp
          }
        }));
      },

      setIsValidating: (validating: boolean) => {
        set(state => ({
          autoSave: {
            ...state.autoSave,
            isValidating: validating
          }
        }));
      },

      setHasAutoRestored: (restored: boolean) => {
        set(state => ({
          autoSave: {
            ...state.autoSave,
            hasAutoRestored: restored
          }
        }));
      },

      resetAutoRestoreFlag: () => {
        set(state => ({
          autoSave: {
            ...state.autoSave,
            hasAutoRestored: false
          }
        }));
      },

      validate: (rectangles: Rectangle[], settings: AppSettings): ValidationResult => {
        // Create SavedDiagram format for validation
        const savedData: SavedDiagram = {
          version: '2.0',
          rectangles,
          globalSettings: settings,
          layoutMetadata: {
            algorithm: settings.layoutAlgorithm || 'grid',
            isUserArranged: rectangles.some(r => r.isManualPositioningEnabled),
            preservePositions: false,
            boundingBox: { w: 0, h: 0 }
          },
          timestamp: Date.now()
        };

        const validation = validateSavedDiagram(savedData);
        
        // Additional business logic validation
        if (validation.isValid) {
          // Allow empty states - users can clear their canvas
          if (rectangles.length === 0) {
            validation.warnings.push('Saving empty canvas state');
          }
        }
        
        return validation;
      },

      saveData: () => {
        const state = get();
        const { rectangles, settings, autoSave } = state;
        
        if (!autoSave.enabled || autoSave.isValidating) return;

        // Validate before saving
        const validation = get().autoSaveActions.validate(rectangles, settings);
        
        if (!validation.isValid) {
          console.warn('Skipping save due to validation errors:', validation.errors);
          return;
        }
        
        if (validation.warnings.length > 0) {
          console.warn('Save warnings:', validation.warnings);
        }

        const data: AutoSaveData = {
          rectangles,
          appSettings: settings,
          timestamp: Date.now()
        };

        // Store as last good data before saving
        lastGoodDataRef = {
          version: '2.0',
          rectangles,
          globalSettings: settings,
          layoutMetadata: {
            algorithm: settings.layoutAlgorithm || 'grid',
            isUserArranged: rectangles.some(r => r.isManualPositioningEnabled),
            preservePositions: false,
            boundingBox: { w: 0, h: 0 }
          },
          timestamp: data.timestamp
        };

        debouncedSave(data);
      },

      restoreData: async (): Promise<boolean> => {
        try {
          set(state => ({
            autoSave: {
              ...state.autoSave,
              isValidating: true
            }
          }));

          const data = await loadDataFromIndexedDB();
          if (!data) {
            set(state => ({
              autoSave: {
                ...state.autoSave,
                isValidating: false
              }
            }));
            return false;
          }

          // Convert to SavedDiagram format for validation
          const savedData: SavedDiagram = {
            version: '2.0',
            rectangles: data.rectangles,
            globalSettings: data.appSettings,
            layoutMetadata: {
              algorithm: data.appSettings.layoutAlgorithm || 'grid',
              isUserArranged: data.rectangles.some(r => r.isManualPositioningEnabled),
              preservePositions: true,
              boundingBox: { w: 0, h: 0 }
            },
            timestamp: data.timestamp
          };

          // Validate the loaded data
          const validation = validateSavedDiagram(savedData);
          
          if (!validation.isValid) {
            console.error('Saved data is corrupted:', validation.errors);
            
            // Try to rollback to last known good data
            if (lastGoodDataRef) {
              console.log('Attempting rollback to last good data');
              const rollbackSuccess = await get().autoSaveActions.rollbackToLastGood();
              set(state => ({
                autoSave: {
                  ...state.autoSave,
                  isValidating: false
                }
              }));
              return rollbackSuccess;
            }
            
            set(state => ({
              autoSave: {
                ...state.autoSave,
                isValidating: false
              }
            }));
            throw new Error(`Corrupted save data: ${validation.errors.join(', ')}`);
          }

          if (validation.warnings.length > 0) {
            console.warn('Restore warnings:', validation.warnings);
          }

          // Store as last good data
          lastGoodDataRef = savedData;
          
          const state = get();
          
          set({
            rectangles: data.rectangles,
            settings: data.appSettings,
            selectedId: null,
            autoSave: {
              ...state.autoSave,
              hasSavedData: true,
              lastSaved: data.timestamp,
              lastGoodSave: data.timestamp,
              isValidating: false
            }
          });

          return true;
        } catch (error) {
          console.error('Failed to restore data:', error);
          set(state => ({
            autoSave: {
              ...state.autoSave,
              isValidating: false
            }
          }));
          return false;
        }
      },

      rollbackToLastGood: async (): Promise<boolean> => {
        if (!lastGoodDataRef) {
          console.error('No good save data available for rollback');
          return false;
        }

        try {
          console.log('Rolling back to last good save');
          
          const goodData = lastGoodDataRef;
          
          // Convert to AutoSaveData format and save back to storage
          const autoSaveData = {
            rectangles: goodData.rectangles,
            appSettings: goodData.globalSettings,
            timestamp: goodData.timestamp
          };

          const success = await saveDataToIndexedDB(autoSaveData);
          if (success) {
            // Restore the good data to the store
            set({
              rectangles: goodData.rectangles,
              settings: goodData.globalSettings,
              selectedId: null,
              autoSave: {
                ...get().autoSave,
                lastSaved: goodData.timestamp,
                lastGoodSave: goodData.timestamp,
                hasSavedData: true
              }
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Rollback failed:', error);
          return false;
        }
      },

      clearData: async () => {
        await clearDataFromIndexedDB();
        lastGoodDataRef = null;
        set(state => ({
          autoSave: {
            ...state.autoSave,
            hasSavedData: false,
            lastSaved: null,
            lastGoodSave: null,
            hasAutoRestored: false
          }
        }));
      },

      // Auto-restore functionality - check for existing data on initialization
      checkAndAutoRestore: async (): Promise<boolean> => {
        const state = get();
        
        // Prevent multiple auto-restores
        if (state.autoSave.hasAutoRestored) {
          console.log('🚫 Skipping auto-restore - already restored this session');
          return false;
        }
        
        console.log('🔍 Checking for saved data to auto-restore...');

        try {
          const data = await loadDataFromIndexedDB();
          if (data) {
            console.log('📦 Found saved data:', data.rectangles.length, 'rectangles');
            
            // Convert to SavedDiagram format for validation
            const savedData: SavedDiagram = {
              version: '2.0',
              rectangles: data.rectangles,
              globalSettings: data.appSettings,
              layoutMetadata: {
                algorithm: data.appSettings.layoutAlgorithm || 'grid',
                isUserArranged: data.rectangles.some(r => r.isManualPositioningEnabled),
                preservePositions: true,
                boundingBox: { w: 0, h: 0 }
              },
              timestamp: data.timestamp
            };
            
            // Validate the existing data
            const validation = validateSavedDiagram(savedData);
            if (validation.isValid) {
              lastGoodDataRef = savedData;
              
              // Auto-restore validated data (once per session)
              console.log('🔄 Auto-restoring saved data:', savedData.rectangles.length, 'rectangles');
              
              set({
                rectangles: savedData.rectangles,
                settings: savedData.globalSettings,
                selectedId: null,
                autoSave: {
                  ...state.autoSave,
                  hasSavedData: true,
                  lastSaved: savedData.timestamp,
                  lastGoodSave: savedData.timestamp,
                  hasAutoRestored: true
                }
              });
              
              return true;
            } else {
              console.error('❌ Corrupted auto-save data found. Please clear localStorage.');
              return false;
            }
          } else {
            console.log('📭 No saved data found');
            return false;
          }
        } catch (error) {
          console.error('Failed to check for saved data:', error);
          return false;
        }
      }
    }
  };
};