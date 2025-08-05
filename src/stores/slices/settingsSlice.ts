import { GlobalSettings, Rectangle, FixedDimensions } from '../../types';
import { 
  GRID_SIZE, 
  DEFAULT_RECTANGLE_SIZE, 
  DEFAULT_FONT_SETTINGS, 
  DEFAULT_BORDER_SETTINGS, 
  DEFAULT_MARGIN_SETTINGS, 
  DEFAULT_FONT_FAMILY,
  FALLBACK_FONT_OPTIONS
} from '../../utils/constants';
import { getAvailableFonts, type FontOption } from '../../utils/fontDetection';
import { layoutManager } from '../../utils/layout';
import { getChildren } from '../../utils/layoutUtils';
import type { SliceCreator, SettingsActions } from '../types';

/**
 * Check if a rectangle is in a parent with manual positioning enabled.
 * Used to exempt rectangles from fixed dimension enforcement in manual mode.
 * 
 * @param rect - Rectangle to check
 * @param rectangles - All rectangles for parent lookup  
 * @returns true if rectangle is in manual mode parent
 */
const isInManualModeParent = (rect: Rectangle, rectangles: Rectangle[]): boolean => {
  if (!rect.parentId) return false;
  
  const parent = rectangles.find(r => r.id === rect.parentId);
  return parent?.isManualPositioningEnabled === true;
};

// Initial predefined color palette
const INITIAL_PREDEFINED_COLORS = [
  "#7dca90",
  "#98D8C8",
  "#ededed",
  "#F0E68C",
  "#FFB6C1",
  "#B0E0E6",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#ededed"
];

/**
 * Settings state slice managing global application configuration.
 * Handles font detection, color management, layout algorithms, and
 * visual styling with automatic layout updates and state persistence.
 */
export interface SettingsSlice {
  settings: GlobalSettings & {
    availableFonts: FontOption[];      // Detected system fonts
    fontsLoading: boolean;             // Font detection in progress
    customColors: string[];            // User-defined color palette additions
    isRestoring: boolean;              // Prevents layout updates during data restore
  };
  settingsActions: SettingsActions & {
    // Computed values and specialized utilities
    getFixedDimensions: () => FixedDimensions;
    calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;
    setIsRestoring: (isRestoring: boolean) => void;
    reloadFonts: () => Promise<void>;
  };
}

/**
 * Creates the settings slice for the store
 */
export const createSettingsSlice: SliceCreator<SettingsSlice> = (set, get) => {
  /**
   * Asynchronous font detection with fallback handling.
   * Detects available system fonts for the font picker UI.
   * Falls back to standard web fonts if detection fails.
   */
  const loadFonts = async () => {
    try {
      const fonts = await getAvailableFonts();
      set(state => ({
        settings: {
          ...state.settings,
          availableFonts: fonts,
          fontsLoading: false
        }
      }));
    } catch {
      // Fallback to web-safe fonts if detection fails
      set(state => ({
        settings: {
          ...state.settings,
          availableFonts: FALLBACK_FONT_OPTIONS,
          fontsLoading: false
        }
      }));
    }
  };

  // Start font loading
  loadFonts();

  return {
    // Initial state
    settings: {
      gridSize: GRID_SIZE,
      showGrid: true,
      leafFixedWidth: true,
      leafFixedHeight: true,
      leafWidth: DEFAULT_RECTANGLE_SIZE.leaf.w,
      leafHeight: DEFAULT_RECTANGLE_SIZE.leaf.h,
      rootFontSize: DEFAULT_FONT_SETTINGS.rootFontSize,
      dynamicFontSizing: DEFAULT_FONT_SETTINGS.dynamicFontSizing,
      fontFamily: DEFAULT_FONT_FAMILY,
      availableFonts: FALLBACK_FONT_OPTIONS,
      fontsLoading: true,
      borderRadius: DEFAULT_BORDER_SETTINGS.borderRadius,
      borderColor: DEFAULT_BORDER_SETTINGS.borderColor,
      borderWidth: DEFAULT_BORDER_SETTINGS.borderWidth,
      predefinedColors: INITIAL_PREDEFINED_COLORS,
      margin: DEFAULT_MARGIN_SETTINGS.margin,
      labelMargin: DEFAULT_MARGIN_SETTINGS.labelMargin,
      layoutAlgorithm: 'mixed-flow',
      customColors: [],
      isRestoring: false
    },

    // Actions
    settingsActions: {
      updateSettings: (newSettings: Partial<GlobalSettings>) => {
        set(state => {
          const updatedSettings = { ...state.settings, ...newSettings };
          
          // Update layout manager if algorithm changed
          if (newSettings.layoutAlgorithm && newSettings.layoutAlgorithm !== state.settings.layoutAlgorithm) {
            layoutManager.setAlgorithm(newSettings.layoutAlgorithm);
          }
          
          return { settings: updatedSettings };
        });
      },

      updateColorSquare: (index: number, color: string) => {
        set(state => {
          const { predefinedColors, customColors } = state.settings;
          
          if (index >= 0 && index < predefinedColors.length) {
            const updatedColors = [...predefinedColors];
            updatedColors[index] = color;
            
            let newCustomColors = [...(customColors || [])];
            
            // Update custom colors tracking if this color is not in the initial set
            if (!INITIAL_PREDEFINED_COLORS.includes(color)) {
              // Calculate which custom color slot this corresponds to
              const customColorSlot = INITIAL_PREDEFINED_COLORS.length - 1 - index;
              
              // If this position should hold a custom color, update the custom colors array
              if (customColorSlot >= 0 && customColorSlot < newCustomColors.length) {
                newCustomColors[newCustomColors.length - 1 - customColorSlot] = color;
              } else if (!INITIAL_PREDEFINED_COLORS[index] || INITIAL_PREDEFINED_COLORS[index] !== color) {
                // This is a new custom color, add it to the custom colors list
                if (!newCustomColors.includes(color)) {
                  newCustomColors.push(color);
                }
              }
            }
            
            return {
              settings: {
                ...state.settings,
                predefinedColors: updatedColors,
                customColors: newCustomColors
              }
            };
          }
          
          return state;
        });
      },

      addCustomColor: (color: string) => {
        set(state => {
          const { predefinedColors, customColors } = state.settings;
          
          // If the new color is not already in the predefined colors, add it
          if (!predefinedColors.includes(color)) {
            // Add to custom colors list
            const newCustomColors = [...(customColors || [])];
            if (!newCustomColors.includes(color)) {
              newCustomColors.push(color);
            }
            
            // Create updated palette by replacing from bottom-right
            const updatedColors = [...INITIAL_PREDEFINED_COLORS];
            const numCustomColors = newCustomColors.length;
            
            // Replace colors from the end (bottom-right of grid)
            for (let i = 0; i < numCustomColors && i < updatedColors.length; i++) {
              updatedColors[updatedColors.length - 1 - i] = newCustomColors[newCustomColors.length - 1 - i];
            }
            
            return {
              settings: {
                ...state.settings,
                predefinedColors: updatedColors,
                customColors: newCustomColors
              }
            };
          }
          
          return state;
        });
      },

      /**
       * Toggle fixed width for leaf rectangles with automatic layout updates.
       * When enabled, applies the fixed width to all existing leaf rectangles
       * and triggers parent layout recalculation to maintain visual consistency.
       */
      handleLeafFixedWidthChange: (enabled: boolean, skipLayoutUpdates = false) => {
        const state = get();
        
        set(currentState => ({
          settings: {
            ...currentState.settings,
            leafFixedWidth: enabled
          }
        }));

        if (enabled) {
          // Apply fixed width constraint to all existing leaf rectangles
          const updatedRectangles = state.rectangles.map(rect => 
            rect.type === 'leaf' && !rect.isLockedAsIs && !isInManualModeParent(rect, state.rectangles) ? { ...rect, w: state.settings.leafWidth } : rect
          );
          
          set(() => ({ rectangles: updatedRectangles }));
          
          // Cascade layout updates to parent rectangles (unless restoring)
          if (!state.settings.isRestoring && !skipLayoutUpdates) {
            // Identify parents requiring layout recalculation
            const parentsToUpdate = updatedRectangles.filter(rect => 
              (rect.type === 'parent' || rect.type === 'root') && 
              !rect.isManualPositioningEnabled &&
              !rect.isLockedAsIs &&
              getChildren(rect.id, updatedRectangles).length > 0
            );
            
            // Trigger automatic resizing for affected parents
            parentsToUpdate.forEach(parent => {
              state.rectangleActions.fitToChildren(parent.id);
            });
          }
        }
      },

      handleLeafFixedHeightChange: (enabled: boolean, skipLayoutUpdates = false) => {
        const state = get();
        
        set(currentState => ({
          settings: {
            ...currentState.settings,
            leafFixedHeight: enabled
          }
        }));

        if (enabled) {
          // Apply fixed height to all existing leaf nodes
          const updatedRectangles = state.rectangles.map(rect => 
            rect.type === 'leaf' && !rect.isLockedAsIs && !isInManualModeParent(rect, state.rectangles) ? { ...rect, h: state.settings.leafHeight } : rect
          );
          
          set(() => ({ rectangles: updatedRectangles }));
          
          // Trigger layout update for parents if needed
          if (!state.settings.isRestoring && !skipLayoutUpdates) {
            // Find parents that need layout updates
            const parentsToUpdate = updatedRectangles.filter(rect => 
              (rect.type === 'parent' || rect.type === 'root') && 
              !rect.isManualPositioningEnabled &&
              !rect.isLockedAsIs &&
              getChildren(rect.id, updatedRectangles).length > 0
            );
            
            // Use fitToChildren for each parent
            parentsToUpdate.forEach(parent => {
              state.rectangleActions.fitToChildren(parent.id);
            });
          }
        }
      },

      handleLeafWidthChange: (width: number, skipLayoutUpdates = false) => {
        const state = get();
        
        set(currentState => ({
          settings: {
            ...currentState.settings,
            leafWidth: width
          }
        }));

        if (state.settings.leafFixedWidth) {
          // Apply new width to all existing leaf nodes
          const updatedRectangles = state.rectangles.map(rect => 
            rect.type === 'leaf' && !rect.isLockedAsIs && !isInManualModeParent(rect, state.rectangles) ? { ...rect, w: width } : rect
          );
          
          set(() => ({ rectangles: updatedRectangles }));
          
          // Trigger layout update for parents if needed
          if (!state.settings.isRestoring && !skipLayoutUpdates) {
            // Find parents that need layout updates
            const parentsToUpdate = updatedRectangles.filter(rect => 
              (rect.type === 'parent' || rect.type === 'root') && 
              !rect.isManualPositioningEnabled &&
              !rect.isLockedAsIs &&
              getChildren(rect.id, updatedRectangles).length > 0
            );
            
            // Use fitToChildren for each parent
            parentsToUpdate.forEach(parent => {
              state.rectangleActions.fitToChildren(parent.id);
            });
          }
        }
      },

      handleLeafHeightChange: (height: number, skipLayoutUpdates = false) => {
        const state = get();
        
        set(currentState => ({
          settings: {
            ...currentState.settings,
            leafHeight: height
          }
        }));

        if (state.settings.leafFixedHeight) {
          // Apply new height to all existing leaf nodes
          const updatedRectangles = state.rectangles.map(rect => 
            rect.type === 'leaf' && !rect.isLockedAsIs && !isInManualModeParent(rect, state.rectangles) ? { ...rect, h: height } : rect
          );
          
          set(() => ({ rectangles: updatedRectangles }));
          
          // Trigger layout update for parents if needed
          if (!state.settings.isRestoring && !skipLayoutUpdates) {
            // Find parents that need layout updates
            const parentsToUpdate = updatedRectangles.filter(rect => 
              (rect.type === 'parent' || rect.type === 'root') && 
              !rect.isManualPositioningEnabled &&
              !rect.isLockedAsIs &&
              getChildren(rect.id, updatedRectangles).length > 0
            );
            
            // Use fitToChildren for each parent
            parentsToUpdate.forEach(parent => {
              state.rectangleActions.fitToChildren(parent.id);
            });
          }
        }
      },

      handleRootFontSizeChange: (size: number) => {
        set(state => ({
          settings: {
            ...state.settings,
            rootFontSize: size
          }
        }));
      },

      handleDynamicFontSizingChange: (enabled: boolean) => {
        set(state => ({
          settings: {
            ...state.settings,
            dynamicFontSizing: enabled
          }
        }));
      },

      handleFontFamilyChange: (fontFamily: string) => {
        set(state => ({
          settings: {
            ...state.settings,
            fontFamily
          }
        }));
      },

      handleBorderRadiusChange: (radius: number) => {
        set(state => ({
          settings: {
            ...state.settings,
            borderRadius: radius
          }
        }));
      },

      handleBorderColorChange: (color: string) => {
        set(state => ({
          settings: {
            ...state.settings,
            borderColor: color
          }
        }));
      },

      handleBorderWidthChange: (width: number) => {
        set(state => ({
          settings: {
            ...state.settings,
            borderWidth: width
          }
        }));
      },

      handleMarginChange: (margin: number, skipLayoutUpdates = false) => {
        const state = get();
        
        set(currentState => ({
          settings: {
            ...currentState.settings,
            margin
          }
        }));

        // Trigger layout update if needed
        if (!state.settings.isRestoring && !skipLayoutUpdates) {
          // Find parents that need layout updates
          const parentsToUpdate = state.rectangles.filter(rect => 
            (rect.type === 'parent' || rect.type === 'root') && 
            !rect.isManualPositioningEnabled &&
            !rect.isLockedAsIs &&
            getChildren(rect.id, state.rectangles).length > 0
          );
          
          // Use fitToChildren for each parent
          parentsToUpdate.forEach(parent => {
            state.rectangleActions.fitToChildren(parent.id);
          });
        }
      },

      handleLabelMarginChange: (labelMargin: number, skipLayoutUpdates = false) => {
        const state = get();
        
        set(currentState => ({
          settings: {
            ...currentState.settings,
            labelMargin
          }
        }));

        // Trigger layout update if needed
        if (!state.settings.isRestoring && !skipLayoutUpdates) {
          // Find parents that need layout updates
          const parentsToUpdate = state.rectangles.filter(rect => 
            (rect.type === 'parent' || rect.type === 'root') && 
            !rect.isManualPositioningEnabled &&
            !rect.isLockedAsIs &&
            getChildren(rect.id, state.rectangles).length > 0
          );
          
          // Use fitToChildren for each parent
          parentsToUpdate.forEach(parent => {
            state.rectangleActions.fitToChildren(parent.id);
          });
        }
      },

      handleLayoutAlgorithmChange: (algorithm, skipLayoutUpdates = false) => {
        const state = get();
        
        set(currentState => ({
          settings: {
            ...currentState.settings,
            layoutAlgorithm: algorithm
          }
        }));

        // Update layout manager immediately
        layoutManager.setAlgorithm(algorithm);

        // Trigger layout update if needed
        if (!state.settings.isRestoring && !skipLayoutUpdates) {
          // Find parents that need layout updates
          const parentsToUpdate = state.rectangles.filter(rect => 
            (rect.type === 'parent' || rect.type === 'root') && 
            !rect.isManualPositioningEnabled &&
            !rect.isLockedAsIs &&
            getChildren(rect.id, state.rectangles).length > 0
          );
          
          // Use fitToChildren for each parent
          parentsToUpdate.forEach(parent => {
            state.rectangleActions.fitToChildren(parent.id);
          });
        }
      },

      handlePredefinedColorsChange: (colors: string[]) => {
        set(state => {
          // Extract custom colors from the imported palette
          const importedCustomColors: string[] = [];
          for (let i = colors.length - 1; i >= 0; i--) {
            if (!INITIAL_PREDEFINED_COLORS.includes(colors[i])) {
              importedCustomColors.unshift(colors[i]);
            } else {
              break; // Stop when we reach initial colors
            }
          }
          
          return {
            settings: {
              ...state.settings,
              predefinedColors: colors,
              customColors: importedCustomColors
            }
          };
        });
      },

      setGridSize: (size: number) => {
        set(state => ({
          settings: {
            ...state.settings,
            gridSize: size
          }
        }));
      },

      handleGridSizeChange: (size: number, skipLayoutUpdates = false) => {
        const state = get();
        
        set(currentState => ({
          settings: {
            ...currentState.settings,
            gridSize: size
          }
        }));

        // Trigger layout update for parents if needed - grid size affects positioning
        if (!state.settings.isRestoring && !skipLayoutUpdates) {
          // Find parents that need layout updates
          const parentsToUpdate = state.rectangles.filter(rect => 
            (rect.type === 'parent' || rect.type === 'root') && 
            !rect.isManualPositioningEnabled &&
            !rect.isLockedAsIs &&
            getChildren(rect.id, state.rectangles).length > 0
          );
          
          // Use fitToChildren for each parent
          parentsToUpdate.forEach(parent => {
            state.rectangleActions.fitToChildren(parent.id);
          });
        }
      },

      handleShowGridChange: (show: boolean) => {
        set(state => ({
          settings: {
            ...state.settings,
            showGrid: show
          }
        }));
      },

      // Computed values and utilities
      getFixedDimensions: () => {
        const state = get();
        return {
          leafFixedWidth: state.settings.leafFixedWidth,
          leafFixedHeight: state.settings.leafFixedHeight,
          leafWidth: state.settings.leafWidth,
          leafHeight: state.settings.leafHeight
        };
      },

      /**
       * Calculate dynamic font size based on rectangle hierarchy depth.
       * Implements visual hierarchy by scaling font size down with nesting depth.
       * Prevents infinite recursion and maintains readability with minimum size limits.
       */
      calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => {
        const state = get();
        const { dynamicFontSizing, rootFontSize } = state.settings;
        
        if (!dynamicFontSizing) return rootFontSize;
        
        // Calculate hierarchy depth with cycle detection
        const getDepth = (rectId: string): number => {
          const rect = rectangles.find(r => r.id === rectId);
          if (!rect || !rect.parentId) return 0;
          
          let depth = 0;
          let current = rect;
          
          while (current && current.parentId) {
            depth++;
            const parent = rectangles.find(r => r.id === current!.parentId);
            if (!parent || depth > 10) break; // Prevent infinite loops in corrupted data
            current = parent;
          }
          
          return depth;
        };
        
        const depth = getDepth(rectangleId);
        // Progressive font scaling: 10% smaller per level, minimum 60% of root size
        return Math.max(rootFontSize * Math.pow(0.9, depth), rootFontSize * 0.6);
      },

      setIsRestoring: (isRestoring: boolean) => {
        set(state => ({
          settings: {
            ...state.settings,
            isRestoring
          }
        }));
      },

      reloadFonts: async () => {
        set(state => ({
          settings: {
            ...state.settings,
            fontsLoading: true
          }
        }));
        
        try {
          const fonts = await getAvailableFonts();
          set(state => ({
            settings: {
              ...state.settings,
              availableFonts: fonts,
              fontsLoading: false
            }
          }));
        } catch {
          set(state => ({
            settings: {
              ...state.settings,
              availableFonts: FALLBACK_FONT_OPTIONS,
              fontsLoading: false
            }
          }));
        }
      },

      resetSettings: (skipLayoutUpdates = false) => {
        const state = get();
        
        set(() => ({
          settings: {
            gridSize: GRID_SIZE,
            showGrid: true,
            leafFixedWidth: true,
            leafFixedHeight: true,
            leafWidth: DEFAULT_RECTANGLE_SIZE.leaf.w,
            leafHeight: DEFAULT_RECTANGLE_SIZE.leaf.h,
            rootFontSize: DEFAULT_FONT_SETTINGS.rootFontSize,
            dynamicFontSizing: DEFAULT_FONT_SETTINGS.dynamicFontSizing,
            fontFamily: DEFAULT_FONT_FAMILY,
            availableFonts: state.settings.availableFonts, // Keep detected fonts
            fontsLoading: state.settings.fontsLoading,
            borderRadius: DEFAULT_BORDER_SETTINGS.borderRadius,
            borderColor: DEFAULT_BORDER_SETTINGS.borderColor,
            borderWidth: DEFAULT_BORDER_SETTINGS.borderWidth,
            predefinedColors: INITIAL_PREDEFINED_COLORS,
            margin: DEFAULT_MARGIN_SETTINGS.margin,
            labelMargin: DEFAULT_MARGIN_SETTINGS.labelMargin,
            layoutAlgorithm: 'mixed-flow',
            customColors: [],
            isRestoring: state.settings.isRestoring
          }
        }));

        // Update layout manager
        layoutManager.setAlgorithm('mixed-flow');

        // Trigger layout update if needed
        if (!skipLayoutUpdates) {
          // Find parents that need layout updates
          const parentsToUpdate = state.rectangles.filter(rect => 
            (rect.type === 'parent' || rect.type === 'root') && 
            !rect.isManualPositioningEnabled &&
            !rect.isLockedAsIs &&
            getChildren(rect.id, state.rectangles).length > 0
          );
          
          // Use fitToChildren for each parent
          parentsToUpdate.forEach(parent => {
            state.rectangleActions.fitToChildren(parent.id);
          });
        }
      }
    }
  };
};