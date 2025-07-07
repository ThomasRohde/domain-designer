import React from 'react';

/**
 * Type of rectangle in the hierarchy
 */
export type RectangleType = 'root' | 'parent' | 'leaf';

/**
 * Interaction types for canvas operations
 */
export type InteractionType = 'drag' | 'resize' | 'pan' | 'select';

/**
 * Resize handle positions
 */
export type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w';

/**
 * Layout filling strategy for arranging children
 */
export type LayoutFillStrategy = 'fill-columns-first' | 'fill-rows-first';

/**
 * Layout preferences for a rectangle's children
 */
export interface LayoutPreferences {
  /** How to arrange children - fill columns first or rows first */
  fillStrategy: LayoutFillStrategy;
  /** Maximum number of columns (only used when fillStrategy is 'fill-rows-first') */
  maxColumns?: number;
  /** Maximum number of rows (only used when fillStrategy is 'fill-columns-first') */
  maxRows?: number;
}

/**
 * Rectangle data structure for hierarchical drawing
 */
export interface Rectangle {
  /** Unique identifier for the rectangle */
  id: string;
  /** Parent rectangle ID (undefined for root rectangles) */
  parentId?: string;
  /** X coordinate in grid units */
  x: number;
  /** Y coordinate in grid units */
  y: number;
  /** Width in grid units */
  w: number;
  /** Height in grid units */
  h: number;
  /** Display label for the rectangle */
  label: string;
  /** Background color (hex format) */
  color: string;
  /** Type of rectangle in the hierarchy */
  type: RectangleType;
  /** Whether the rectangle is currently being edited */
  isEditing?: boolean;
  /** Layout preferences for arranging children */
  layoutPreferences?: LayoutPreferences;
  /** Whether manual positioning is enabled for direct children (unlocked padlock) */
  isManualPositioningEnabled?: boolean;
  /** Optional metadata for extensibility */
  metadata?: {
    description?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

/**
 * State during rectangle dragging operation
 */
export interface DragState {
  /** ID of the rectangle being dragged */
  id: string;
  /** Mouse X position when drag started */
  startX: number;
  /** Mouse Y position when drag started */
  startY: number;
  /** Initial rectangle X position */
  initialX: number;
  /** Initial rectangle Y position */
  initialY: number;
  /** Whether this is a hierarchy rearrangement drag */
  isHierarchyDrag?: boolean;
}

/**
 * Information about a potential drop target during hierarchy drag
 */
export interface DropTarget {
  /** ID of the target rectangle (null for canvas background) */
  targetId: string | null;
  /** Whether this is a valid drop target */
  isValid: boolean;
  /** Type of drop operation */
  dropType: 'parent' | 'root';
  /** Bounds of the drop zone */
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * State during hierarchy drag and drop operation
 */
export interface HierarchyDragState {
  /** ID of the rectangle being dragged */
  draggedRectangleId: string;
  /** Current potential drop target */
  currentDropTarget: DropTarget | null;
  /** All potential drop targets */
  potentialTargets: DropTarget[];
  /** Mouse position for drop zone detection */
  mousePosition: { x: number; y: number };
}

/**
 * State during rectangle resizing operation
 */
export interface ResizeState {
  /** ID of the rectangle being resized */
  id: string;
  /** Mouse X position when resize started */
  startX: number;
  /** Mouse Y position when resize started */
  startY: number;
  /** Initial rectangle width */
  initialW: number;
  /** Initial rectangle height */
  initialH: number;
}

/**
 * State tracking resize constraints for visual feedback
 */
export interface ResizeConstraintState {
  /** ID of the rectangle being resized */
  rectangleId: string;
  /** Whether the rectangle is at minimum width */
  isAtMinWidth: boolean;
  /** Whether the rectangle is at minimum height */
  isAtMinHeight: boolean;
  /** Minimum required width for the rectangle */
  minRequiredWidth: number;
  /** Minimum required height for the rectangle */
  minRequiredHeight: number;
}

/**
 * State during canvas panning operation
 */
export interface PanState {
  /** Mouse X position when pan started */
  startX: number;
  /** Mouse Y position when pan started */
  startY: number;
  /** Initial pan offset X */
  initialOffsetX: number;
  /** Initial pan offset Y */
  initialOffsetY: number;
}

/**
 * Global application settings for the drawing app
 */
export interface GlobalSettings {
  /** Grid size in pixels for snapping */
  gridSize: number;
  /** Whether leaf rectangles have fixed width */
  leafFixedWidth: boolean;
  /** Whether leaf rectangles have fixed height */
  leafFixedHeight: boolean;
  /** Fixed width for leaf rectangles when enabled */
  leafWidth: number;
  /** Fixed height for leaf rectangles when enabled */
  leafHeight: number;
  /** Base font size for root rectangles */
  rootFontSize: number;
  /** Whether to use dynamic font sizing based on rectangle size */
  dynamicFontSizing: boolean;
  /** Border radius for rectangles in pixels */
  borderRadius: number;
  /** Border color for rectangles (hex format) */
  borderColor: string;
  /** Border width for rectangles in pixels */
  borderWidth: number;
  /** Predefined color palette for rectangles */
  predefinedColors: string[];
}

/**
 * Alias for consistency with hooks
 */
export type AppSettings = GlobalSettings;

/**
 * Fixed dimensions configuration for rectangles
 */
export interface FixedDimensions {
  /** Whether leaf rectangles have fixed width */
  leafFixedWidth: boolean;
  /** Whether leaf rectangles have fixed height */
  leafFixedHeight: boolean;
  /** Fixed width for leaf rectangles when enabled */
  leafWidth: number;
  /** Fixed height for leaf rectangles when enabled */
  leafHeight: number;
}

/**
 * Pan offset coordinates
 */
export interface PanOffset {
  /** Horizontal offset in pixels */
  x: number;
  /** Vertical offset in pixels */
  y: number;
}

/**
 * Viewport bounds for calculating visible area
 */
export interface ViewportBounds {
  /** Left edge of viewport */
  x: number;
  /** Top edge of viewport */
  y: number;
  /** Width of viewport */
  width: number;
  /** Height of viewport */
  height: number;
}

/**
 * Complete diagram state for serialization
 */
export interface DiagramState {
  /** All rectangles in the diagram */
  rectangles: Rectangle[];
  /** ID of currently selected rectangle */
  selectedId: string | null;
  /** Next ID to use for new rectangles */
  nextId: number;
  /** Current drag operation state */
  dragState: DragState | null;
  /** Current resize operation state */
  resizeState: ResizeState | null;
  /** Undo/redo history */
  history: Rectangle[][];
  /** Current position in history */
  historyIndex: number;
  /** Global application settings */
  globalSettings: GlobalSettings;
}

/**
 * Export configuration options
 */
export interface ExportOptions {
  /** Export format */
  format: 'png' | 'svg' | 'pdf' | 'json';
  /** Image quality (0-1) for raster formats */
  quality?: number;
  /** Scale factor for export */
  scale?: number;
  /** Whether to include background in export */
  includeBackground?: boolean;
}

/**
 * Context menu state and position
 */
export interface ContextMenuState {
  /** X coordinate for menu positioning */
  x: number;
  /** Y coordinate for menu positioning */
  y: number;
  /** ID of rectangle that triggered the menu */
  rectangleId: string;
}

// Hook Return Types

/**
 * Return type for useRectangleManager hook
 */
export interface RectangleManagerHook {
  rectangles: Rectangle[];
  selectedId: string | null;
  nextId: number;
  generateId: () => string;
  findRectangle: (id: string) => Rectangle | undefined;
  addRectangle: (parentId?: string) => void;
  removeRectangle: (id: string) => void;
  updateRectangleLabel: (id: string, label: string) => void;
  updateRectangleColor: (id: string, color: string) => void;
  fitToChildren: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setRectangles: (rectangles: Rectangle[]) => void;
  getAllDescendantsWrapper: (parentId: string) => Rectangle[];
  reparentRectangle: (childId: string, newParentId: string | null) => boolean;
  canReparent: (childId: string, newParentId: string | null) => boolean;
  recalculateZOrder: () => void;
}

/**
 * Return type for useAppSettings hook
 */
export interface AppSettingsHook {
  gridSize: number;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
  rootFontSize: number;
  dynamicFontSizing: boolean;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  predefinedColors: string[];
  getFixedDimensions: () => FixedDimensions;
  calculateFontSize: (rectangleId: string) => number;
  handleLeafFixedWidthChange: (enabled: boolean) => void;
  handleLeafFixedHeightChange: (enabled: boolean) => void;
  handleLeafWidthChange: (width: number) => void;
  handleLeafHeightChange: (height: number) => void;
  handleRootFontSizeChange: (size: number) => void;
  handleDynamicFontSizingChange: (enabled: boolean) => void;
  handleBorderRadiusChange: (radius: number) => void;
  handleBorderColorChange: (color: string) => void;
  handleBorderWidthChange: (width: number) => void;
  addCustomColor: (color: string) => void;
  handlePredefinedColorsChange: (colors: string[]) => void;
  setGridSize: (size: number) => void;
  setRectanglesRef: (setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>) => void;
}

/**
 * Lock confirmation modal state
 */
export interface LockConfirmationModalState {
  rectangleId: string;
  rectangleLabel: string;
}

/**
 * Return type for useUIState hook
 */
export interface UIStateHook {
  sidebarOpen: boolean;
  leftMenuOpen: boolean;
  contextMenu: ContextMenuState | null;
  exportModalOpen: boolean;
  lockConfirmationModal: LockConfirmationModalState | null;
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
}

/**
 * Return type for useCanvasInteractions hook
 */
export interface CanvasInteractionsHook {
  // Canvas state
  panOffset: PanOffset;
  panOffsetRef: React.MutableRefObject<PanOffset>;
  isSpacePressed: boolean;
  
  // Interaction states
  dragState: DragState | null;
  resizeState: ResizeState | null;
  panState: PanState | null;
  hierarchyDragState: HierarchyDragState | null;
  resizeConstraintState: ResizeConstraintState | null;
  isDragging: boolean;
  isResizing: boolean;
  isPanning: boolean;
  isHierarchyDragging: boolean;
  
  // Event handlers
  handleCanvasMouseDown: (e: React.MouseEvent) => void;
  handleRectangleMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => void;
  cancelDrag: () => void;
}

// Error Handling Types

/**
 * Application error types
 */
export type AppErrorType = 
  | 'VALIDATION_ERROR'
  | 'EXPORT_ERROR'
  | 'IMPORT_ERROR'
  | 'LAYOUT_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Application error structure
 */
export interface AppError {
  type: AppErrorType;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Validation result for rectangle operations
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}