import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Rectangle, AppSettings } from '../../types';
import { SavedDiagram, ValidationResult } from '../../types/layoutSnapshot';
import { validateSavedDiagram } from '../../utils/schemaValidation';
import type { SliceCreator, AutoSaveState, AutoSaveActions } from '../types';

/**
 * Structure for data persisted to IndexedDB.
 * Contains rectangle state, settings, and metadata for validation and recovery.
 */
interface AutoSaveData {
  rectangles: Rectangle[];
  appSettings: AppSettings;
  timestamp: number;
  manualClearInProgress?: boolean; // Flag to track intentional data clearing
}

/**
 * IndexedDB schema definition for type-safe database operations.
 * Uses IDB library for improved error handling and TypeScript support.
 */
interface DomainDesignerDB extends DBSchema {
  diagrams: {
    key: string;
    value: AutoSaveData;
  };
}

// Database configuration constants
const DB_NAME = 'DomainDesigner_v2_DB';
const DB_VERSION = 1;
const STORE_NAME = 'diagrams';
const AUTOSAVE_KEY = 'current_diagram';
const SAVE_DELAY = 1000; // Debounce delay for auto-save operations (1 second)

/**
 * Extended auto-save slice interface with data integrity features.
 * Includes validation, error recovery, and manual clear handling capabilities
 * beyond the basic auto-save functionality.
 */
export interface AutoSaveSlice {
  autoSave: AutoSaveState & {
    lastGoodSave: number | null;       // Timestamp of last validated successful save
    hasAutoRestored: boolean;          // Prevents multiple auto-restores per session
    isValidating: boolean;             // Prevents save operations during validation
    manualClearInProgress: boolean;    // Tracks intentional data clearing operations
  };
  autoSaveActions: AutoSaveActions & {
    validate: (rectangles: Rectangle[], settings: AppSettings) => ValidationResult;
    rollbackToLastGood: () => Promise<boolean>;
    resetAutoRestoreFlag: () => void;
    setLastGoodSave: (timestamp: number | null) => void;
    setIsValidating: (validating: boolean) => void;
    setHasAutoRestored: (restored: boolean) => void;
    setManualClearInProgress: (inProgress: boolean) => void;
  };
}

/**
 * Creates the auto-save slice with IndexedDB persistence and data validation.
 * Manages browser storage, error recovery, and data integrity for the application.
 * Uses debounced saves and validation to ensure reliable data persistence.
 */
export const createAutoSaveSlice: SliceCreator<AutoSaveSlice> = (set, get) => {
  let dbRef: IDBPDatabase<DomainDesignerDB> | null = null;  // Cached database connection
  let saveTimeoutRef: number | null = null;                // Debounce timer for save operations  
  let lastGoodDataRef: SavedDiagram | null = null;         // Last validated save for rollback

  /**
   * Initialize IndexedDB connection with error handling and schema migration.
   * Creates database and object store if they don't exist, providing graceful
   * fallback when IndexedDB is unavailable (e.g., private browsing mode).
   */
  const initDB = async (): Promise<IDBPDatabase<DomainDesignerDB> | null> => {
    try {
      if (!dbRef) {
        dbRef = await openDB<DomainDesignerDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            // Create object store on first run or version upgrade
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          },
        });
      }
      return dbRef;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      return null; // Graceful fallback when IndexedDB is unavailable
    }
  };

  /**
   * Persist data to IndexedDB with error handling.
   * Returns success status to allow calling code to handle failures gracefully.
   * Includes fallback behavior when IndexedDB is unavailable.
   */
  const saveDataToIndexedDB = async (data: AutoSaveData): Promise<boolean> => {
    try {
      const db = await initDB();
      if (!db) {
        console.warn('IndexedDB not available for auto-save');
        return false;
      }

      await db.put(STORE_NAME, data, AUTOSAVE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  };

  /**
   * Load previously saved data from IndexedDB.
   * Returns null if no data exists or if IndexedDB is unavailable,
   * allowing calling code to handle missing data appropriately.
   */
  const loadDataFromIndexedDB = async (): Promise<AutoSaveData | null> => {
    try {
      const db = await initDB();
      if (!db) {
        console.warn('IndexedDB not available for auto-restore');
        return null;
      }

      const data = await db.get(STORE_NAME, AUTOSAVE_KEY);
      return data || null;
    } catch (error) {
      console.error('Failed to load data:', error);
      return null;
    }
  };

  /**
   * Remove all saved data from IndexedDB.
   * Used during manual data clearing and application reset operations.
   * Fails silently to avoid disrupting user workflows.
   */
  const clearDataFromIndexedDB = async (): Promise<void> => {
    try {
      const db = await initDB();
      if (!db) return;

      await db.delete(STORE_NAME, AUTOSAVE_KEY);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  };

  /**
   * Debounced save operation to prevent excessive IndexedDB writes.
   * Delays save operations until user activity stops, improving performance
   * while ensuring data persistence. Updates UI state on successful saves.
   */
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
      saveTimeoutRef = null;
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
      isValidating: false,
      manualClearInProgress: false
    },

    // Actions
    autoSaveActions: {
      /**
       * Initialize the auto-save system on application startup.
       * Establishes IndexedDB connection, checks for pending clear operations,
       * and triggers auto-restore if appropriate. Uses delayed restore to ensure
       * UI components are fully initialized before data restoration.
       */
      initialize: async () => {
        try {
          await initDB();
          
          // Check for manual clear operation in progress
          const data = await loadDataFromIndexedDB();
          if (data?.manualClearInProgress) {
            // Update state to reflect ongoing clear operation
            set(state => ({
              rectangles: [],
              autoSave: {
                ...state.autoSave,
                manualClearInProgress: true,
                hasSavedData: true,
                lastSaved: data.timestamp
              }
            }));
          }
          
          // Delayed auto-restore to ensure UI is ready
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

      setManualClearInProgress: (inProgress: boolean) => {
        set(state => ({
          autoSave: {
            ...state.autoSave,
            manualClearInProgress: inProgress
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

      /**
       * Validate rectangle and settings data before saving.
       * Converts data to SavedDiagram format and applies schema validation.
       * Allows empty states as users can intentionally clear their workspace.
       * Returns validation result with detailed error information.
       */
      validate: (rectangles: Rectangle[], settings: AppSettings): ValidationResult => {
        // Convert to standard SavedDiagram format for validation
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
        
        // Business rule: empty states are valid (users can clear canvas)
        if (validation.isValid) {
          // Additional validation logic can be added here
        }
        
        return validation;
      },

      /**
       * Save current application state to IndexedDB with validation.
       * Handles manual clear flag management and validates data before saving.
       * Uses debounced saves to prevent excessive database operations.
       * Maintains last known good state for error recovery.
       */
      saveData: () => {
        const state = get();
        const { rectangles, settings, autoSave } = state;
        
        // Skip save if disabled or currently validating
        if (!autoSave.enabled || autoSave.isValidating) {
          return;
        }

        const hasContent = rectangles.length > 0;
        let shouldClearFlag = false;
        
        // Reset manual clear flag when user adds content after clearing
        if (hasContent && autoSave.manualClearInProgress) {
          get().autoSaveActions.setManualClearInProgress(false);
          shouldClearFlag = true;
        }

        // Validate data structure before saving
        const validation = get().autoSaveActions.validate(rectangles, settings);
        
        if (!validation.isValid) {
          console.warn('Skipping save due to validation errors:', validation.errors);
          return;
        }

        // Determine final manual clear flag state
        const currentManualClearInProgress = shouldClearFlag ? false : autoSave.manualClearInProgress;

        const data: AutoSaveData = {
          rectangles,
          appSettings: settings,
          timestamp: Date.now(),
          manualClearInProgress: currentManualClearInProgress
        };

        // Cache validated data for potential rollback
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
            hasAutoRestored: false,
            manualClearInProgress: false  // Reset flag when clearing all data
          }
        }));
      },

      /**
       * Clear rectangle data while preserving application settings.
       * Sets flags to prevent auto-restore on page refresh and ensures
       * the cleared state is immediately persisted. Used when user
       * intentionally clears their workspace.
       */
      clearModel: async () => {
        const timestamp = Date.now();
        
        // Set clear in progress flag to prevent auto-restore
        
        // Update state to reflect intentional clearing
        set(prevState => ({
          rectangles: [], // Remove all rectangles
          autoSave: {
            ...prevState.autoSave,
            manualClearInProgress: true,
            clearInProgressTimestamp: timestamp
          }
        }));
        
        // Force immediate save of cleared state (bypassing normal debounce)
        const state = get();
        const data: AutoSaveData = {
          rectangles: [], // Explicitly empty array
          appSettings: state.settings,
          timestamp: timestamp,
          manualClearInProgress: true
        };
        
        const success = await saveDataToIndexedDB(data);
        if (success) {
          set(state => ({
            autoSave: {
              ...state.autoSave,
              lastSaved: timestamp,
              hasSavedData: true
            }
          }));
        } else {
          console.error('Failed to save cleared model to IndexedDB');
        }
      },

      // Auto-restore functionality - check for existing data on initialization
      checkAndAutoRestore: async (): Promise<boolean> => {
        const state = get();
        
        // Check clear in progress flag first (highest priority)
        if (state.autoSave.manualClearInProgress) {
          // Ensure the state reflects this
          get().autoSaveActions.setManualClearInProgress(true);
          return false;
        }
        
        // Prevent multiple auto-restores - but always check for manual clear flag first
        if (state.autoSave.hasAutoRestored && !state.autoSave.manualClearInProgress) {
          return false;
        }

        // Skip auto-restore if a manual clear is in progress
        if (state.autoSave.manualClearInProgress) {
          return false;
        }

        try {
          const data = await loadDataFromIndexedDB();
          if (!data) {
            // No data found - this is expected for fresh browser sessions
            return false;
          }
          
          // Check if manual clear was in progress when data was saved
          if (data.manualClearInProgress) {
            // Update our state to reflect the saved flag AND ensure empty rectangles
            set(state => ({
              rectangles: [], // Ensure rectangles are empty
              autoSave: {
                ...state.autoSave,
                manualClearInProgress: true,
                hasSavedData: true,
                lastSaved: data.timestamp
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
          
          // Validate the existing data
          const validation = validateSavedDiagram(savedData);
          if (validation.isValid) {
            lastGoodDataRef = savedData;
            
            // Auto-restore validated data (once per session)
            set({
              rectangles: savedData.rectangles,
              settings: savedData.globalSettings,
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
            console.error('❌ Corrupted auto-save data found. Please clear data manually.');
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