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
 * UI state managed by the store
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
}

/**
 * Canvas state managed by the store
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
  // Internal state for complex interactions
  initialPositions: Record<string, { x: number; y: number }> | null;
  needsLayoutUpdate: { type: 'reparent' | 'resize'; rectangleId?: string } | null;
  keyboardTimeoutId: number | null;
}

/**
 * History state managed by the store
 */
export interface HistoryState {
  stack: Rectangle[][];
  index: number;
}

/**
 * Auto-save state managed by the store
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
 * Rectangle actions slice
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
  setRectangles: (rectangles: Rectangle[]) => void;
  setRectanglesWithHistory: (rectangles: Rectangle[]) => void;
  generateId: () => string;
  updateNextId: (newNextId: number) => void;
  recalculateZOrder: () => void;
  updateRectanglesDuringDrag: (updateFn: (rectangles: Rectangle[]) => Rectangle[]) => void;
}

/**
 * UI actions slice
 */
export interface UIActions {
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleLeftMenu: () => void;
  openLeftMenu: () => void;
  closeLeftMenu: () => void;
  showContextMenu: (x: number, y: number, rectangleId: string) => void;
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
  // Internal methods for UI management
  _handleResize: () => void;
  _cleanupContextMenuListener: () => void;
}

/**
 * Settings actions slice
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
  // Additional computed values and utilities
  getFixedDimensions: () => FixedDimensions;
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;
  setIsRestoring: (isRestoring: boolean) => void;
  reloadFonts: () => Promise<void>;
}

/**
 * Canvas actions slice
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
  
  // Complex interaction handlers
  handleCanvasMouseDown: (e: React.MouseEvent, containerRef: React.RefObject<HTMLDivElement | null>) => void;
  handleRectangleMouseDown: (e: React.MouseEvent, rect: Rectangle, action: 'drag' | 'resize' | 'hierarchy-drag', containerRef: React.RefObject<HTMLDivElement | null>) => void;
  handleMouseMove: (e: MouseEvent, containerRef: React.RefObject<HTMLDivElement | null>) => void;
  handleMouseUp: () => void;
  handleWheel: (e: WheelEvent, containerRef: React.RefObject<HTMLDivElement | null>) => void;
  cancelDrag: () => void;
  
  // Internal state management
  setInitialPositions: (positions: Record<string, { x: number; y: number }> | null) => void;
  setNeedsLayoutUpdate: (update: { type: 'reparent' | 'resize'; rectangleId?: string } | null) => void;
  setResizeConstraintState: (state: ResizeConstraintState | null) => void;
  
  // Computed values for interactions
  isDragging: () => boolean;
  isResizing: () => boolean;
  isPanning: () => boolean;
  isHierarchyDragging: () => boolean;
  
  // Drop target detection (for hierarchy drag)
  detectDropTargets: (mouseX: number, mouseY: number, draggedRectId: string) => DropTarget[];
}

/**
 * History actions slice
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
 * Auto-save actions slice
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
  checkAndAutoRestore: () => Promise<boolean>;
  validate: (rectangles: Rectangle[], settings: GlobalSettings) => { isValid: boolean; errors: string[]; warnings: string[] };
}

/**
 * Computed getters for the store
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
 * Complete app store interface combining all slices
 */
export interface AppStore {
  // State
  rectangles: Rectangle[];
  selectedId: string | null;
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
 * State setter function type for Zustand
 */
export type SetState = (
  partial: AppStore | Partial<AppStore> | ((state: AppStore) => AppStore | Partial<AppStore>),
  replace?: boolean | undefined
) => void;

/**
 * State getter function type for Zustand
 */
export type GetState = () => AppStore;

/**
 * Store API type for Zustand
 */
export interface StoreApi {
  setState: SetState;
  getState: GetState;
  subscribe: (listener: (state: AppStore, prevState: AppStore) => void) => () => void;
  destroy: () => void;
}

/**
 * Slice creator function type
 */
export type SliceCreator<T> = (
  set: SetState,
  get: GetState,
  api: StoreApi
) => T;