import type { AppStore } from './types';

/**
 * Zustand store selectors for optimized component subscriptions
 * 
 * These selectors provide fine-grained access to specific store slices,
 * enabling React components to subscribe only to the data they need.
 * This reduces unnecessary re-renders and improves performance.
 * 
 * Usage pattern:
 * const rectangles = useAppStore(selectRectangles);
 * const selectedId = useAppStore(selectSelectedId);
 */

// Rectangle state selectors - core diagram data
export const selectRectangles = (state: AppStore) => state.rectangles;
export const selectSelectedId = (state: AppStore) => state.ui.selectedIds.length > 0 ? state.ui.selectedIds[0] : null;
export const selectNextId = (state: AppStore) => state.nextId;

export const selectSelectedRectangle = (state: AppStore) => {
  const selectedId = state.ui.selectedIds.length > 0 ? state.ui.selectedIds[0] : null;
  return selectedId ? state.rectangles.find(r => r.id === selectedId) : undefined;
};

export const selectRootRectangles = (state: AppStore) =>
  state.rectangles.filter(r => !r.parentId);

export const selectChildrenOf = (parentId: string) => (state: AppStore) =>
  state.rectangles.filter(r => r.parentId === parentId);

// UI state selectors - modal visibility and navigation
export const selectUI = (state: AppStore) => state.ui;
export const selectSidebarOpen = (state: AppStore) => state.ui.sidebarOpen;
export const selectLeftMenuOpen = (state: AppStore) => state.ui.leftMenuOpen;
export const selectContextMenu = (state: AppStore) => state.ui.contextMenu;
export const selectExportModalOpen = (state: AppStore) => state.ui.exportModalOpen;
export const selectLockConfirmationModal = (state: AppStore) => state.ui.lockConfirmationModal;
export const selectDescriptionEditModal = (state: AppStore) => state.ui.descriptionEditModal;
export const selectTemplatePageOpen = (state: AppStore) => state.ui.templatePageOpen;
export const selectHelpModalOpen = (state: AppStore) => state.ui.helpModalOpen;
export const selectUpdateNotification = (state: AppStore) => state.ui.updateNotification;

// Application settings selectors - configuration and preferences
export const selectSettings = (state: AppStore) => state.settings;
export const selectGridSize = (state: AppStore) => state.settings.gridSize;
export const selectShowGrid = (state: AppStore) => state.settings.showGrid;
export const selectLeafFixedWidth = (state: AppStore) => state.settings.leafFixedWidth;
export const selectLeafFixedHeight = (state: AppStore) => state.settings.leafFixedHeight;
export const selectLeafWidth = (state: AppStore) => state.settings.leafWidth;
export const selectLeafHeight = (state: AppStore) => state.settings.leafHeight;
export const selectRootFontSize = (state: AppStore) => state.settings.rootFontSize;
export const selectDynamicFontSizing = (state: AppStore) => state.settings.dynamicFontSizing;
export const selectFontFamily = (state: AppStore) => state.settings.fontFamily;
export const selectAvailableFonts = (state: AppStore) => state.settings.availableFonts;
export const selectFontsLoading = (state: AppStore) => state.settings.fontsLoading;
export const selectBorderRadius = (state: AppStore) => state.settings.borderRadius;
export const selectBorderColor = (state: AppStore) => state.settings.borderColor;
export const selectBorderWidth = (state: AppStore) => state.settings.borderWidth;
export const selectPredefinedColors = (state: AppStore) => state.settings.predefinedColors;
export const selectMargin = (state: AppStore) => state.settings.margin;
export const selectLabelMargin = (state: AppStore) => state.settings.labelMargin;
export const selectLayoutAlgorithm = (state: AppStore) => state.settings.layoutAlgorithm;

// Canvas interaction selectors - drag, resize, pan, and zoom state
export const selectCanvas = (state: AppStore) => state.canvas;
export const selectPanOffset = (state: AppStore) => state.canvas.panOffset;
export const selectZoomLevel = (state: AppStore) => state.canvas.zoomState.level;
export const selectDragState = (state: AppStore) => state.canvas.dragState;
export const selectResizeState = (state: AppStore) => state.canvas.resizeState;
export const selectHierarchyDragState = (state: AppStore) => state.canvas.hierarchyDragState;
export const selectIsSpacePressed = (state: AppStore) => state.canvas.isSpacePressed;
export const selectIsKeyboardMoving = (state: AppStore) => state.canvas.isKeyboardMoving;

// Derived canvas state selectors - computed boolean flags for interaction state
export const selectIsDragging = (state: AppStore) => state.canvas.dragState !== null;
export const selectIsResizing = (state: AppStore) => state.canvas.resizeState !== null;
export const selectIsHierarchyDragging = (state: AppStore) => state.canvas.hierarchyDragState !== null;
export const selectIsPanning = (state: AppStore) => state.canvas.isSpacePressed;

// Undo/redo history selectors - state snapshots and navigation
export const selectHistory = (state: AppStore) => state.history;
export const selectHistoryStack = (state: AppStore) => state.history.stack;
export const selectHistoryIndex = (state: AppStore) => state.history.index;
export const selectCanUndo = (state: AppStore) => state.getters.canUndo();
export const selectCanRedo = (state: AppStore) => state.getters.canRedo();

// Auto-save persistence selectors - data backup and recovery status
export const selectAutoSave = (state: AppStore) => state.autoSave;
export const selectAutoSaveEnabled = (state: AppStore) => state.autoSave.enabled;
export const selectLastSaved = (state: AppStore) => state.autoSave.lastSaved;
export const selectHasSavedData = (state: AppStore) => state.autoSave.hasSavedData;

// Action dispatchers - function references for triggering state changes
export const selectRectangleActions = (state: AppStore) => state.rectangleActions;
export const selectUIActions = (state: AppStore) => state.uiActions;
export const selectSettingsActions = (state: AppStore) => state.settingsActions;
export const selectCanvasActions = (state: AppStore) => state.canvasActions;
export const selectHistoryActions = (state: AppStore) => state.historyActions;
export const selectAutoSaveActions = (state: AppStore) => state.autoSaveActions;

// Computed getters - derived state calculations and business logic queries
export const selectGetters = (state: AppStore) => state.getters;