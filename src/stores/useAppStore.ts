import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import { getAllDescendants, getChildren } from '../utils/layoutUtils';
import type { AppStore } from './types';
import type { Rectangle } from '../types';

// Import all slices
import { createRectangleSlice } from './slices/rectangleSlice';
import { createUISlice } from './slices/uiSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createCanvasSlice } from './slices/canvasSlice';
import { createHistorySlice } from './slices/historySlice';
import { createAutoSaveSlice } from './slices/autoSaveSlice';

/**
 * Creates the complete app store by combining all slices
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createAppStore = (set: any, get: any, api: any): AppStore => {
  // Create individual slices
  const rectangleSlice = createRectangleSlice(set, get, api);
  const uiSlice = createUISlice(set, get, api);
  const settingsSlice = createSettingsSlice(set, get, api);
  const canvasSlice = createCanvasSlice(set, get, api);
  const historySlice = createHistorySlice(set, get, api);
  const autoSaveSlice = createAutoSaveSlice(set, get, api);

  return {
    // State from slices
    rectangles: rectangleSlice.rectangles,
    selectedId: rectangleSlice.selectedId,
    nextId: rectangleSlice.nextId,
    ui: uiSlice.ui,
    settings: settingsSlice.settings,
    canvas: canvasSlice.canvas,
    history: historySlice.history,
    autoSave: autoSaveSlice.autoSave,

    // Actions from slices
    rectangleActions: rectangleSlice.rectangleActions,
    uiActions: uiSlice.uiActions,
    settingsActions: settingsSlice.settingsActions,
    canvasActions: canvasSlice.canvasActions,
    historyActions: historySlice.historyActions,
    autoSaveActions: autoSaveSlice.autoSaveActions,

    // Computed getters
    getters: {
      canUndo: () => {
        const state = get();
        return state.history.index > 0;
      },

      canRedo: () => {
        const state = get();
        return state.history.index < state.history.stack.length - 1;
      },

      getFixedDimensions: () => {
        const state = get();
        return state.settingsActions.getFixedDimensions();
      },

      findRectangle: (id: string) => {
        const state = get();
        return state.rectangles.find((rect: Rectangle) => rect.id === id);
      },

      getChildren: (parentId: string) => {
        const state = get();
        return getChildren(parentId, state.rectangles);
      },

      getAllDescendants: (parentId: string) => {
        const state = get();
        const descendantIds = getAllDescendants(parentId, state.rectangles);
        return descendantIds.map(id => state.rectangles.find((r: Rectangle) => r.id === id)).filter(Boolean) as Rectangle[];
      },

      canReparent: (childId: string, newParentId: string | null) => {
        const state = get();
        const { rectangles } = state;
        
        // Can't reparent to itself
        if (childId === newParentId) return false;
        
        // Can't reparent to one of its descendants
        if (newParentId) {
          const descendants = getAllDescendants(childId, rectangles);
          if (descendants.includes(newParentId)) return false;
        }
        
        // Can't reparent to text labels
        if (newParentId) {
          const targetParent = rectangles.find((r: Rectangle) => r.id === newParentId);
          if (targetParent?.isTextLabel) return false;
        }
        
        return true;
      },

      calculateFontSize: (rectangleId: string) => {
        const state = get();
        return state.settingsActions.calculateFontSize(rectangleId, state.rectangles);
      }
    }
  };
};

// Auto-save subscription will be initialized separately
let autoSaveUnsubscribe: (() => void) | null = null;

/**
 * Main app store hook with DevTools integration and settings persistence
 */
export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        immer(createAppStore),
        {
          name: 'domain-designer-settings',
          storage: createJSONStorage(() => localStorage),
          // Only persist settings state
          partialize: (state) => ({
            settings: {
              gridSize: state.settings.gridSize,
              showGrid: state.settings.showGrid,
              leafFixedWidth: state.settings.leafFixedWidth,
              leafFixedHeight: state.settings.leafFixedHeight,
              leafWidth: state.settings.leafWidth,
              leafHeight: state.settings.leafHeight,
              rootFontSize: state.settings.rootFontSize,
              dynamicFontSizing: state.settings.dynamicFontSizing,
              fontFamily: state.settings.fontFamily,
              borderRadius: state.settings.borderRadius,
              borderColor: state.settings.borderColor,
              borderWidth: state.settings.borderWidth,
              predefinedColors: state.settings.predefinedColors,
              margin: state.settings.margin,
              labelMargin: state.settings.labelMargin,
              layoutAlgorithm: state.settings.layoutAlgorithm,
              customColors: state.settings.customColors
            }
          }),
          // Don't persist certain transient state
          onRehydrateStorage: () => (state) => {
            if (state) {
              // Reset transient properties after rehydration
              state.settings.fontsLoading = true;
              state.settings.isRestoring = false;
              // Reload fonts after rehydration
              state.settingsActions.reloadFonts();
            }
          }
        }
      ),
      { name: 'domain-designer-store' }
    )
  )
);

// Export a function to initialize auto-save subscriptions
export const initializeAutoSaveSubscription = () => {
  if (autoSaveUnsubscribe) {
    autoSaveUnsubscribe();
  }
  
  // Subscribe to changes in rectangles and settings that should trigger auto-save
  autoSaveUnsubscribe = useAppStore.subscribe(
    (state) => ({ rectangles: state.rectangles, settings: state.settings }),
    (current, previous) => {
      // Only trigger save if rectangles or settings actually changed
      const rectanglesChanged = JSON.stringify(current.rectangles) !== JSON.stringify(previous.rectangles);
      const settingsChanged = JSON.stringify(current.settings) !== JSON.stringify(previous.settings);
      
      if (rectanglesChanged || settingsChanged) {
        // Get fresh state and trigger save
        const state = useAppStore.getState();
        state.autoSaveActions.saveData();
      }
    },
    {
      equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b)
    }
  );
  
  return autoSaveUnsubscribe;
};

// Export cleanup function
export const cleanupAutoSaveSubscription = () => {
  if (autoSaveUnsubscribe) {
    autoSaveUnsubscribe();
    autoSaveUnsubscribe = null;
  }
};

// Export store type for use in components
export type { AppStore } from './types';