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
  FixedDimensions
} from '../types';
import type { LayoutAlgorithmType } from '../utils/layout/interfaces';

/**
 * Multi-select alignment types for PowerPoint-style operations
 */
export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/**
 * Distribution direction for equal spacing operations
 */
export type DistributionDirection = 'horizontal' | 'vertical';

/**
 * Selection box state for drag selection operations
 */
export interface SelectionBoxState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * User interface state slice - manages modal visibility and navigation
 * Centralizes UI state to prevent prop drilling and improve performance
 */
export interface UIState {
  sidebarOpen: boolean;
  leftMenuOpen: boolean;
  contextMenu: ContextMenuState | null;
  exportModalOpen: boolean;
  lockConfirmationModal: LockConfirmationModalState | null;
  descriptionEditModal: DescriptionEditModalState | null;
  templatePageOpen: boolean;
  helpModalOpen: boolean;
  updateNotification: UpdateNotificationState;
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
  zoomLevel: number;
  zoomState: ZoomState;
  panState: PanState | null;
  dragState: DragState | null;
  resizeState: ResizeState | null;
  hierarchyDragState: HierarchyDragState | null;
  resizeConstraintState: ResizeConstraintState | null;
  isSpacePressed: boolean;
  isKeyboardMoving: boolean;
  // Internal state for complex multi-step interactions
  initialPositions: Record<string, { x: number; y: number }> | null;  // Drag start positions for multi-select
  needsLayoutUpdate: { type: 'reparent' | 'resize'; rectangleId?: string } | null;  // Deferred layout recalculation
  keyboardTimeoutId: number | null;  // Debounce timer for keyboard navigation
  // Multi-select specific state
  multiSelectDragInitialPositions: Record<string, { x: number; y: number }> | null;  // Initial positions for bulk drag
  multiSelectRelativePositions: Map<string, { x: number; y: number; relativeX: number; relativeY: number }> | null;  // Relative positions for bulk drag
  // Navigation minimap state
  minimapVisible: boolean;  // Controls visibility of spatial navigation overlay
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
  toggleManualPositioning: (id: string) => void;
  lockAsIs: (id: string) => void;
  fitToChildren: (id: string) => void;
  moveRectangle: (id: string, deltaX: number, deltaY: number) => void;
  reparentRectangle: (childId: string, newParentId: string | null) => boolean;
  setSelectedId: (id: string | null) => void;
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
  showUpdateNotification: (updateServiceWorker: () => void) => void;
  hideUpdateNotification: () => void;
  // Selection box actions
  startSelectionBox: (startX: number, startY: number) => void;
  updateSelectionBox: (currentX: number, currentY: number) => void;
  endSelectionBox: () => void;
  // Internal lifecycle methods - prefixed to indicate private usage
  _handleResize: () => void;  // Window resize handler for responsive UI
  _cleanupContextMenuListener: () => void;  // Event cleanup on component unmount
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
  handleShowGridChange: (show: boolean) => void;
  // Computed utilities and lifecycle management
  getFixedDimensions: () => FixedDimensions;  // Current leaf rectangle sizing rules
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;  // Dynamic font scaling by hierarchy
  setIsRestoring: (isRestoring: boolean) => void;  // Loading state during data restoration
  reloadFonts: () => Promise<void>;  // Re-scan system fonts after changes
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
  selectedId: string | null; // Legacy - kept for backward compatibility during transition
  nextId: number;
  ui: UIState;
  settings: GlobalSettings;
  canvas: CanvasState;
  history: HistoryState;
  autoSave: AutoSaveState;

  // Action slices
  rectangleActions: RectangleActions;
  uiActions: UIActions;
  settingsActions: SettingsActions;
  canvasActions: CanvasActions;
  historyActions: HistoryActions;
  autoSaveActions: AutoSaveActions;

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