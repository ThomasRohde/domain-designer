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
import { createClipboardSlice } from './slices/clipboardSlice';
import { createHeatmapSlice } from './slices/heatmapSlice';

/**
 * Creates the unified application store by composing domain-specific slices.
 * Each slice manages a specific aspect of the application state while maintaining
 * loose coupling and clear separation of concerns. This architecture enables
 * modular development and easier testing of individual domains.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createAppStore = (set: any, get: any, api: any): AppStore => {
  // Initialize domain-specific state slices
  const rectangleSlice = createRectangleSlice(set, get, api);
  const uiSlice = createUISlice(set, get, api);
  const settingsSlice = createSettingsSlice(set, get, api);
  const canvasSlice = createCanvasSlice(set, get, api);
  const historySlice = createHistorySlice(set, get, api);
  const autoSaveSlice = createAutoSaveSlice(set, get, api);
  const clipboardSlice = createClipboardSlice(set, get, api);
  const heatmapSlice = createHeatmapSlice(set, get, api);

  return {
    // Core application state composed from individual slices
    rectangles: rectangleSlice.rectangles,
    nextId: rectangleSlice.nextId,
    ui: uiSlice.ui,
    settings: settingsSlice.settings,
    canvas: canvasSlice.canvas,
    history: historySlice.history,
    autoSave: autoSaveSlice.autoSave,
    clipboard: clipboardSlice.clipboard,
    heatmap: heatmapSlice.heatmap,

    // Action collections organized by domain responsibility
    rectangleActions: rectangleSlice.rectangleActions,
    uiActions: uiSlice.uiActions,
    settingsActions: settingsSlice.settingsActions,
    canvasActions: canvasSlice.canvasActions,
    historyActions: historySlice.historyActions,
    autoSaveActions: autoSaveSlice.autoSaveActions,
    clipboardActions: clipboardSlice.clipboardActions,
    heatmapActions: heatmapSlice.heatmapActions,

    /**
     * Computed getters providing derived state and cross-slice calculations.
     * These getters encapsulate business logic that spans multiple slices
     * and provide a consistent API for components to access computed values.
     */
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

      /**
       * Validates whether a rectangle can be reparented to a new parent.
       * Enforces business rules: no circular dependencies, no text label parents,
       * and maintains hierarchy integrity.
       */
      canReparent: (childId: string, newParentId: string | null) => {
        const state = get();
        const { rectangles } = state;
        
        // Prevent self-parenting (circular reference)
        if (childId === newParentId) return false;
        
        // Prevent reparenting to descendants (would create cycle)
        if (newParentId) {
          const descendants = getAllDescendants(childId, rectangles);
          if (descendants.includes(newParentId)) return false;
        }
        
        // Text labels cannot have children (business rule)
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

/**
 * Auto-save subscription management for reactive data persistence.
 * Tracks changes to rectangles and settings, automatically saving to IndexedDB
 * when modifications occur. Subscription is managed separately from store creation.
 */
let autoSaveUnsubscribe: (() => void) | null = null;

/**
 * Main application store with Zustand middleware stack.
 * Combines subscribeWithSelector for reactive subscriptions, DevTools for debugging,
 * persist for settings storage, and immer for immutable state updates.
 */
export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        immer(createAppStore),
        {
          name: 'domain-designer-settings',
          storage: createJSONStorage(() => localStorage),
          /**
           * Selective state persistence - only settings are persisted.
           * Rectangle data and UI state are handled by the IndexedDB auto-save system
           * to separate user preferences from working data.
           */
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
            },
            heatmap: {
              enabled: state.heatmap.enabled,
              selectedPaletteId: state.heatmap.selectedPaletteId,
              palettes: state.heatmap.palettes,
              undefinedValueColor: state.heatmap.undefinedValueColor,
              showLegend: state.heatmap.showLegend
            }
          }),
          /**
           * Post-rehydration cleanup and initialization.
           * Resets transient state that shouldn't persist across sessions
           * and triggers necessary re-initialization processes.
           */
          onRehydrateStorage: () => (state) => {
            if (state) {
              // Reset transient font loading state
              state.settings.fontsLoading = true;
              state.settings.isRestoring = false;
              // Re-detect available fonts after browser restart
              state.settingsActions.reloadFonts();
            }
          }
        }
      ),
      { name: 'domain-designer-store' }
    )
  )
);

/**
 * Initializes reactive auto-save subscriptions for data persistence.
 * Monitors changes to rectangles and settings, automatically triggering
 * IndexedDB saves when modifications occur. Uses deep equality checking
 * to prevent unnecessary save operations.
 */
export const initializeAutoSaveSubscription = () => {
  if (autoSaveUnsubscribe) {
    autoSaveUnsubscribe();
  }
  
  // Subscribe to state changes that require persistence
  autoSaveUnsubscribe = useAppStore.subscribe(
    (state) => ({ rectangles: state.rectangles, settings: state.settings, virtualDragActive: state.canvas.virtualDragState.isActive }),
    (current, previous) => {
      // Skip expensive operations during virtual drag for optimal performance
      if (current.virtualDragActive) {
        return;
      }
      
      // Deep equality check to avoid saves on reference changes without content changes
      const rectanglesChanged = JSON.stringify(current.rectangles) !== JSON.stringify(previous.rectangles);
      const settingsChanged = JSON.stringify(current.settings) !== JSON.stringify(previous.settings);
      
      if (rectanglesChanged || settingsChanged) {
        // Trigger IndexedDB save with current state
        const state = useAppStore.getState();
        state.autoSaveActions.saveData();
      }
    },
    {
      equalityFn: (a, b) => {
        // Skip expensive JSON comparison during virtual drag operations
        if (a.virtualDragActive || b.virtualDragActive) {
          return true; // Prevent triggering during virtual drag
        }
        return JSON.stringify(a) === JSON.stringify(b);
      }
    }
  );
  
  return autoSaveUnsubscribe;
};

/**
 * Cleanup function for auto-save subscriptions.
 * Should be called when the application is unmounting or during
 * testing to prevent memory leaks and unwanted side effects.
 */
export const cleanupAutoSaveSubscription = () => {
  if (autoSaveUnsubscribe) {
    autoSaveUnsubscribe();
    autoSaveUnsubscribe = null;
  }
};

// Export store type for TypeScript inference in components
export type { AppStore } from './types';