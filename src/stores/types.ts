import React from 'react';
import type {
  Rectangle,
  DragState,
  ResizeState,
  HierarchyDragState,
  PanOffset,
  PanState,
  ZoomState,
  ResizeConstraintState,
  DropTarget,
  ContextMenuState,
  UpdateNotificationState,
  LockConfirmationModalState,
  DescriptionEditModalState,
  GlobalSettings,
  FixedDimensions,
  VirtualDragState
} from '../types';
import type { LayoutAlgorithmType } from '../utils/layout/interfaces';

/**
 * Multi-select alignment types for PowerPoint-style operations.
 * Used by alignment algorithms to position rectangles relative to selection bounds.
 */
export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/**
 * Distribution direction for equal spacing operations.
 * Controls whether rectangles are spaced evenly horizontally or vertically.
 */
export type DistributionDirection = 'horizontal' | 'vertical';

/**
 * Heat map color palette configuration
 */
export interface HeatmapPalette {
  /** Unique identifier for the palette */
  id: string;
  /** Display name for the palette */
  name: string;
  /** Color stops defining the gradient */
  stops: ColorStop[];
  /** Whether this is a user-created custom palette */
  isCustom?: boolean;
}

/**
 * Color stop definition for heat map palettes
 */
export interface ColorStop {
  /** Value position (0-1) */
  value: number;
  /** Hex color at this position */
  color: string;
}

/**
 * CSV import result for heat map values
 */
export interface HeatmapImportResult {
  /** Successfully matched and imported entries */
  successful: Array<{
    rectangleId: string;
    label: string;
    value: number;
  }>;
  /** Failed entries with validation errors */
  failed: Array<{
    label: string;
    value: string;
    error: string;
  }>;
  /** Entries that couldn't be matched to rectangles */
  unmatched: Array<{
    label: string;
    value: number;
  }>;
}

/**
 * Selection box state for drag selection operations.
 * Tracks mouse coordinates during rectangle selection dragging.
 */
export interface SelectionBoxState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Clipboard data structure for copy/paste operations
 * Maintains hierarchy relationships and positioning metadata
 */
export interface ClipboardData {
  rectangles: Rectangle[];
  timestamp: number;
  sourceParentId?: string;
  relativeBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/**
 * Clipboard state slice - manages copy/paste functionality
 * Stores copied rectangles with hierarchy preservation
 */
export interface ClipboardState {
  clipboardData: ClipboardData | null;
}

/**
 * Heat map state slice - manages heat map visualization
 * Controls palette selection and rendering behavior
 */
export interface HeatmapState {
  /** Whether heat map overlay is currently enabled */
  enabled: boolean;
  /** ID of the currently selected palette */
  selectedPaletteId: string;
  /** All available heat map palettes (predefined + custom) */
  palettes: HeatmapPalette[];
  /** Color to use for rectangles without heat map values */
  undefinedValueColor: string;
  /** Whether to show the heat map legend */
  showLegend: boolean;
}

/**
 * User interface state slice - manages modal visibility and navigation
 * Centralizes UI state to prevent prop drilling and improve performance
 */
export interface UIState {
  sidebarOpen: boolean;
  leftMenuOpen: boolean;
  hierarchyOutlineOpen: boolean;
  contextMenu: ContextMenuState | null;
  exportModalOpen: boolean;
  lockConfirmationModal: LockConfirmationModalState | null;
  descriptionEditModal: DescriptionEditModalState | null;
  templatePageOpen: boolean;
  helpModalOpen: boolean;
  keyboardShortcutHelpOpen: boolean;
  updateNotification: UpdateNotificationState;
  // Layout undo state for smart default behavior
  layoutUndo: {
    isVisible: boolean;
    rectangleId: string | null;
    timeoutId: number | null;
  } | null;
  // Multi-select state
  selectedIds: string[];
  selectionBoxState: SelectionBoxState | null;
  bulkOperationInProgress: boolean;
}

/**
 * Canvas interaction state slice - tracks real-time user operations
 * Manages complex multi-step interactions like drag-drop and resize
 */
export interface CanvasState {
  panOffset: PanOffset;
  zoomState: ZoomState;
  panState: PanState | null;
  dragState: DragState | null;
  resizeState: ResizeState | null;
  hierarchyDragState: HierarchyDragState | null;
  resizeConstraintState: ResizeConstraintState | null;
  isSpacePressed: boolean;
  isKeyboardMoving: boolean;
  // Internal state for complex multi-step interactions
  initialPositions: Record<string, { x: number; y: number }> | null;  // Stores starting positions before drag operations begin
  needsLayoutUpdate: { type: 'reparent' | 'resize'; rectangleId?: string } | null;  // Queues layout updates for after interaction completion
  keyboardTimeoutId: number | null;  // Prevents rapid-fire keyboard movement from creating excessive history entries
  // Multi-select specific state
  multiSelectDragInitialPositions: Record<string, { x: number; y: number }> | null;  // Captures positions at start of multi-rectangle drag
  multiSelectRelativePositions: Map<string, { x: number; y: number; relativeX: number; relativeY: number }> | null;  // Maintains relative spacing during group movement
  // Navigation minimap state  
  minimapVisible: boolean;  // Toggle for bird's-eye view navigation panel
  // Virtual drag layer for performance optimization during complex operations
  virtualDragState: VirtualDragState;  // Provides immediate visual feedback while deferring expensive state updates
}

/**
 * Undo/redo history slice - implements command pattern for state changes
 * Maintains bounded stack with efficient serialization
 */
export interface HistoryState {
  stack: Rectangle[][];
  index: number;
}

/**
 * Auto-save functionality slice - provides data persistence and recovery
 * Handles validation, corruption detection, and graceful degradation
 */
export interface AutoSaveState {
  enabled: boolean;
  lastSaved: number | null;
  hasSavedData: boolean;
  lastGoodSave: number | null;
  hasAutoRestored: boolean;
  isValidating: boolean;
  manualClearInProgress: boolean;
}

/**
 * Rectangle CRUD operations slice - core domain logic for diagram manipulation
 * Maintains referential integrity and triggers layout recalculation
 */
export interface RectangleActions {
  addRectangle: (parentId?: string) => void;
  removeRectangle: (id: string) => void;
  updateRectangle: (id: string, updates: Partial<Rectangle>) => void;
  updateRectangleLabel: (id: string, label: string) => void;
  updateRectangleColor: (id: string, color: string) => void;
  updateRectangleDescription: (id: string, description: string) => void;
  toggleTextLabel: (id: string) => void;
  updateTextLabelProperties: (id: string, properties: Partial<Rectangle>) => void;
  updateRectangleLayoutPreferences: (id: string, preferences: Partial<Rectangle['layoutPreferences']>) => void;
  toggleManualPositioning: (id: string, shiftKey?: boolean) => void;
  lockAsIs: (id: string) => void;
  unlockLayout: (id: string) => void;
  fitToChildren: (id: string) => void;
  moveRectangle: (id: string, deltaX: number, deltaY: number) => void;
  moveRectangleDuringDrag: (id: string, deltaX: number, deltaY: number) => void;
  moveRectangleToAbsolutePosition: (id: string, deltaXPixelsFromInitial: number, deltaYPixelsFromInitial: number) => void;
  reparentRectangle: (childId: string, newParentId: string | null) => boolean;
  setSelectedIds: (ids: string[]) => void;
  addToSelection: (id: string) => boolean;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  toggleSelection: (id: string) => void;
  bulkUpdateColor: (ids: string[], color: string) => void;
  bulkDelete: (ids: string[]) => void;
  bulkMove: (ids: string[], deltaX: number, deltaY: number) => boolean;
  alignRectangles: (ids: string[], type: AlignmentType) => void;
  distributeRectangles: (ids: string[], direction: DistributionDirection) => void;
  setRectangles: (rectangles: Rectangle[]) => void;
  setRectanglesWithHistory: (rectangles: Rectangle[]) => void;
  generateId: () => string;
  updateNextId: (newNextId: number) => void;
  recalculateZOrder: () => void;
  updateRectanglesDuringDrag: (updateFn: (rectangles: Rectangle[]) => Rectangle[]) => void;
}

/**
 * User interface action slice - handles modal state and navigation events
 * Provides consistent interaction patterns across components
 */
export interface UIActions {
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleLeftMenu: () => void;
  openLeftMenu: () => void;
  closeLeftMenu: () => void;
  toggleHierarchyOutline: () => void;
  openHierarchyOutline: () => void;
  closeHierarchyOutline: () => void;
  showContextMenu: (x: number, y: number, rectangleId: string) => void;
  showMultiSelectContextMenu: (x: number, y: number, selectedIds: string[]) => void;
  hideContextMenu: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  showLockConfirmationModal: (rectangleId: string, rectangleLabel: string) => void;
  hideLockConfirmationModal: () => void;
  showDescriptionEditModal: (rectangleId: string, rectangleLabel: string, currentDescription: string) => void;
  hideDescriptionEditModal: () => void;
  openTemplatePage: () => void;
  closeTemplatePage: () => void;
  openHelpModal: () => void;
  closeHelpModal: () => void;
  openKeyboardShortcutHelp: () => void;
  closeKeyboardShortcutHelp: () => void;
  showUpdateNotification: (updateServiceWorker: () => void) => void;
  hideUpdateNotification: () => void;
  // Layout undo actions
  showLayoutUndo: (rectangleId: string) => void;
  hideLayoutUndo: () => void;
  performLayoutUndo: () => void;
  // Selection box actions
  startSelectionBox: (startX: number, startY: number) => void;
  updateSelectionBox: (currentX: number, currentY: number) => void;
  endSelectionBox: () => void;
  // Internal lifecycle methods - prefixed to indicate private usage patterns
  _handleResize: () => void;  // Recalculates UI dimensions when browser window changes size
  _cleanupContextMenuListener: () => void;  // Removes event listeners to prevent memory leaks on unmount
}

/**
 * Global settings management slice - configuration with persistence
 * Triggers layout updates and manages font detection lifecycle
 */
export interface SettingsActions {
  updateSettings: (settings: Partial<GlobalSettings>) => void;
  updateColorSquare: (index: number, color: string) => void;
  addCustomColor: (color: string) => void;
  handleLeafFixedWidthChange: (enabled: boolean, skipLayoutUpdates?: boolean) => void;
  handleLeafFixedHeightChange: (enabled: boolean, skipLayoutUpdates?: boolean) => void;
  handleLeafWidthChange: (width: number, skipLayoutUpdates?: boolean) => void;
  handleLeafHeightChange: (height: number, skipLayoutUpdates?: boolean) => void;
  handleRootFontSizeChange: (size: number) => void;
  handleDynamicFontSizingChange: (enabled: boolean) => void;
  handleFontFamilyChange: (fontFamily: string) => void;
  handleBorderRadiusChange: (radius: number) => void;
  handleBorderColorChange: (color: string) => void;
  handleBorderWidthChange: (width: number) => void;
  handleMarginChange: (margin: number, skipLayoutUpdates?: boolean) => void;
  handleLabelMarginChange: (labelMargin: number, skipLayoutUpdates?: boolean) => void;
  handleLayoutAlgorithmChange: (algorithm: LayoutAlgorithmType, skipLayoutUpdates?: boolean) => void;
  handlePredefinedColorsChange: (colors: string[]) => void;
  setGridSize: (size: number) => void;
  handleGridSizeChange: (size: number, skipLayoutUpdates?: boolean) => void;
  handleShowGridChange: (show: boolean) => void;
  // Computed utilities and lifecycle management
  getFixedDimensions: () => FixedDimensions;  // Current leaf rectangle sizing rules
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;  // Dynamic font scaling by hierarchy
  setIsRestoring: (isRestoring: boolean) => void;  // Loading state during data restoration
  reloadFonts: () => Promise<void>;  // Re-scan system fonts after changes
  resetSettings: (skipLayoutUpdates?: boolean) => void;  // Reset all settings to default values
}

/**
 * Canvas interaction management slice - coordinates complex user operations
 * Handles event delegation and state transitions for drag/resize/pan operations
 */
export interface CanvasActions {
  // Drag actions
  startDrag: (dragState: DragState) => void;
  updateDrag: (updates: Partial<DragState>) => void;
  endDrag: () => void;
  
  // Resize actions
  startResize: (resizeState: ResizeState) => void;
  updateResize: (updates: Partial<ResizeState>) => void;
  endResize: () => void;
  
  // Hierarchy drag actions
  startHierarchyDrag: (hierarchyDragState: HierarchyDragState) => void;
  updateHierarchyDrag: (updates: Partial<HierarchyDragState>) => void;
  endHierarchyDrag: () => void;
  
  // Pan actions
  setPanOffset: (offset: PanOffset) => void;
  startPan: (panState: PanState) => void;
  updatePan: (updates: Partial<PanState>) => void;
  endPan: () => void;
  
  // Zoom actions
  setZoomLevel: (level: number) => void;
  setZoomState: (zoomState: ZoomState) => void;
  updateZoom: (delta: number, mouseX: number, mouseY: number) => void;
  
  // Keyboard and interaction state
  setIsSpacePressed: (pressed: boolean) => void;
  setIsKeyboardMoving: (moving: boolean) => void;
  startKeyboardMovement: () => void;
  
  // High-level interaction orchestration - manages complex multi-step operations
  handleCanvasMouseDown: (e: React.MouseEvent, containerRef: React.RefObject<HTMLDivElement | null>) => void;
  handleRectangleMouseDown: (e: React.MouseEvent, rect: Rectangle, action: 'drag' | 'resize' | 'hierarchy-drag', containerRef: React.RefObject<HTMLDivElement | null>) => void;
  handleMouseMove: (e: MouseEvent, containerRef: React.RefObject<HTMLDivElement | null>) => void;
  handleMouseUp: () => void;
  handleWheel: (e: WheelEvent, containerRef: React.RefObject<HTMLDivElement | null>) => void;
  cancelDrag: () => void;
  
  // Internal state coordination - manages interaction lifecycle
  setInitialPositions: (positions: Record<string, { x: number; y: number }> | null) => void;  // Multi-select drag preparation
  setNeedsLayoutUpdate: (update: { type: 'reparent' | 'resize'; rectangleId?: string } | null) => void;  // Deferred layout trigger
  setResizeConstraintState: (state: ResizeConstraintState | null) => void;  // Visual feedback for size limits
  
  // Interaction state queries - computed boolean flags for UI logic
  isDragging: () => boolean;  // Active rectangle drag operation
  isResizing: () => boolean;  // Active resize handle manipulation
  isPanning: () => boolean;  // Active canvas pan/zoom operation
  isHierarchyDragging: () => boolean;  // Active drag-and-drop reparenting
  
  // Drop target calculation - validates reparenting operations during drag
  detectDropTargets: (mouseX: number, mouseY: number, draggedRectId: string) => DropTarget[];
  
  // Multi-select drag operations
  startMultiSelectDrag: (initialPositions: Record<string, { x: number; y: number }>) => void;
  startMultiSelectDragWithDescendants: (initialPositions: Record<string, { x: number; y: number }>, allAffectedIds: string[]) => void;
  updateMultiSelectDrag: (deltaX: number, deltaY: number) => void;
  endMultiSelectDrag: (applyChanges?: boolean) => void;
  
  // Navigation minimap actions
  toggleMinimap: () => void;  // Toggle spatial navigation overlay visibility
  jumpToPosition: (x: number, y: number, containerWidth?: number, containerHeight?: number) => void;  // Center viewport on target position (called from minimap clicks)
  
  // Virtual drag layer actions for performance optimization
  startVirtualDrag: (primaryId: string, affectedIds: string[], initialPositions: Record<string, { x: number; y: number }>) => void;  // Initialize virtual drag layer
  updateVirtualDragPositions: (deltaX: number, deltaY: number) => void;  // Update virtual positions in real-time
  commitVirtualDrag: () => void;  // Apply virtual positions to actual state
  cancelVirtualDrag: () => void;  // Clear virtual layer without applying changes
  getVirtualPosition: (rectangleId: string) => import('../types').VirtualDragPosition | null;  // Get current virtual position for a rectangle
}

/**
 * History management slice - implements undo/redo with state snapshots
 * Optimizes memory usage and provides operation grouping
 */
export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  pushState: (rectangles: Rectangle[]) => void;
  clearHistory: () => void;
  initializeHistory: (initialState: Rectangle[]) => void;
}

/**
 * Persistent storage slice - automated backup and recovery system
 * Includes data validation and corruption recovery mechanisms
 */
export interface AutoSaveActions {
  setEnabled: (enabled: boolean) => void;
  setLastSaved: (timestamp: number | null) => void;
  setHasSavedData: (hasSaved: boolean) => void;
  setLastGoodSave: (timestamp: number | null) => void;
  setIsValidating: (validating: boolean) => void;
  setHasAutoRestored: (restored: boolean) => void;
  setManualClearInProgress: (inProgress: boolean) => void;
  resetAutoRestoreFlag: () => void;
  initialize: () => Promise<void>;
  saveData: () => void;
  restoreData: () => Promise<boolean>;
  rollbackToLastGood: () => Promise<boolean>;
  clearData: () => Promise<void>;
  clearModel: () => Promise<void>;
  checkAndAutoRestore: () => Promise<boolean>;
  validate: (rectangles: Rectangle[], settings: GlobalSettings) => { isValid: boolean; errors: string[]; warnings: string[] };
}

/**
 * Clipboard operations slice - handles copy/paste functionality
 * Manages hierarchy preservation and intelligent positioning
 */
export interface ClipboardActions {
  duplicateRectangles: (ids: string[]) => void;
  copyRectangles: (ids: string[]) => void;
  pasteRectangles: (targetParentId?: string) => void;
  canPaste: () => boolean;
  clearClipboard: () => void;
}

/**
 * Heat map operations slice - manages heat map functionality
 * Controls palette management and value assignments
 */
export interface HeatmapActions {
  /** Enable or disable heat map overlay */
  setEnabled: (enabled: boolean) => void;
  /** Select a different heat map palette */
  setSelectedPalette: (paletteId: string) => void;
  /** Add a new custom palette */
  addCustomPalette: (palette: HeatmapPalette) => void;
  /** Remove a custom palette */
  removeCustomPalette: (paletteId: string) => void;
  /** Update an existing custom palette */
  updateCustomPalette: (paletteId: string, palette: Partial<HeatmapPalette>) => void;
  /** Set color for rectangles without heat map values */
  setUndefinedValueColor: (color: string) => void;
  /** Toggle heat map legend visibility */
  setShowLegend: (show: boolean) => void;
  /** Assign heat map value to a rectangle */
  setRectangleHeatmapValue: (rectangleId: string, value: number | undefined) => void;
  /** Bulk assign heat map values from CSV import */
  bulkSetHeatmapValues: (values: Array<{ rectangleId: string; value: number }>) => void;
  /** Get computed color for a rectangle based on current palette */
  getHeatmapColor: (rectangleId: string) => string | null;
  /** Clear all heat map values */
  clearAllHeatmapValues: () => void;
  /** Apply an imported heatmap state (palettes, selection, toggles) in one call */
  applyImportedHeatmapState: (state: HeatmapState) => void;
}

/**
 * Computed selectors slice - derived state calculations with memoization
 * Provides consistent business logic queries across components
 */
export interface StoreGetters {
  canUndo: () => boolean;
  canRedo: () => boolean;
  getFixedDimensions: () => FixedDimensions;
  findRectangle: (id: string) => Rectangle | undefined;
  getChildren: (parentId: string) => Rectangle[];
  getAllDescendants: (parentId: string) => Rectangle[];
  canReparent: (childId: string, newParentId: string | null) => boolean;
  calculateFontSize: (rectangleId: string) => number;
}

/**
 * Root store interface - unified Zustand store combining all feature slices
 * Provides type-safe access to all application state and operations
 */
export interface AppStore {
  // State
  rectangles: Rectangle[];
  nextId: number;
  ui: UIState;
  settings: GlobalSettings;
  canvas: CanvasState;
  history: HistoryState;
  autoSave: AutoSaveState;
  clipboard: ClipboardState;
  heatmap: HeatmapState;

  // Action slices
  rectangleActions: RectangleActions;
  uiActions: UIActions;
  settingsActions: SettingsActions;
  canvasActions: CanvasActions;
  historyActions: HistoryActions;
  autoSaveActions: AutoSaveActions;
  clipboardActions: ClipboardActions;
  heatmapActions: HeatmapActions;

  // Computed getters
  getters: StoreGetters;
}

/**
 * Zustand state mutation function - enables immutable state updates
 * Supports both partial updates and functional transformations
 */
export type SetState = (
  partial: AppStore | Partial<AppStore> | ((state: AppStore) => AppStore | Partial<AppStore>),
  replace?: boolean | undefined
) => void;

/**
 * Zustand state accessor function - provides current store snapshot
 * Used for computed values and cross-slice dependencies
 */
export type GetState = () => AppStore;

/**
 * Zustand store instance interface - low-level store control
 * Provides subscription management and lifecycle methods
 */
export interface StoreApi {
  setState: SetState;
  getState: GetState;
  subscribe: (listener: (state: AppStore, prevState: AppStore) => void) => () => void;
  destroy: () => void;
}

/**
 * Zustand slice factory function - creates feature-specific store slices
 * Enables modular store composition with shared dependencies
 */
export type SliceCreator<T> = (
  set: SetState,
  get: GetState,
  api: StoreApi
) => T;