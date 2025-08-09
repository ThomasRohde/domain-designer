import React from 'react';
import type { LayoutAlgorithmType } from '../utils/layout/interfaces';

/**
 * Rectangle type determines visual styling and layout behavior
 * - root: Top-level containers with no parent, typically larger
 * - parent: Containers with children, auto-size to fit contents
 * - leaf: Terminal nodes with optional fixed dimensions
 * - textLabel: Text-only elements with transparent background
 */
export type RectangleType = 'root' | 'parent' | 'leaf' | 'textLabel';

/**
 * Canvas interaction modes for mouse/touch handling
 * - drag: Moving rectangles within the canvas
 * - resize: Adjusting rectangle dimensions via handles
 * - pan: Navigating the canvas viewport
 * - select: Choosing rectangles for property editing
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
 * Orientation for flow-based layouts
 */
export type FlowOrientation = 'ROW' | 'COL';

/**
 * Layout configuration for child arrangement within parent rectangles
 * Controls how the layout algorithm arranges child elements
 */
export interface LayoutPreferences {
  /** Primary arrangement strategy - affects space utilization */
  fillStrategy: LayoutFillStrategy;
  /** Column limit for row-first layouts - prevents excessive horizontal spread */
  maxColumns?: number;
  /** Row limit for column-first layouts - prevents excessive vertical growth */
  maxRows?: number;
  /** Flow direction for hierarchical layouts - alternates by depth */
  orientation?: FlowOrientation;
}

/**
 * Core rectangle entity representing hierarchical diagram elements
 * Supports both container (parent) and terminal (leaf) nodes with flexible styling
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
  /** Disables automatic layout for children - enables drag-and-drop positioning */
  isManualPositioningEnabled?: boolean;
  /** Preserves exact position/size during layout updates - for imported diagrams */
  isLockedAsIs?: boolean;
  /** Optional description for tooltips and metadata */
  description?: string;
  /** Extensible metadata for templates, descriptions, and custom properties */
  metadata?: {
    tags?: string[];
    [key: string]: unknown;
  };
  /** Whether this rectangle is a text label */
  isTextLabel?: boolean;
  /** Font family for text labels (independent from global font settings) */
  textFontFamily?: string;
  /** Font size for text labels */
  textFontSize?: number;
  /** Font weight for text labels */
  fontWeight?: 'normal' | 'bold';
  /** Text alignment for text labels */
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  /** Heatmap value for color overlay visualization (0.0-1.0 range, undefined = no heatmap color) */
  heatmapValue?: number;
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
  /** Whether this is a multi-select bulk drag operation */
  isMultiSelectDrag?: boolean;
}

/**
 * Drop target validation during drag-and-drop reparenting operations
 * Prevents invalid hierarchy modifications (cycles, self-parenting)
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
 * Real-time state tracking for drag-and-drop reparenting
 * Manages visual feedback and validation during hierarchy modifications
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
 * Virtual drag position state for performance optimization
 * Decouples visual feedback from actual state updates during drag operations
 */
export interface VirtualDragPosition {
  /** Current virtual X position in grid units */
  x: number;
  /** Current virtual Y position in grid units */
  y: number;
  /** Initial X position when drag started */
  initialX: number;
  /** Initial Y position when drag started */
  initialY: number;
}

/**
 * Virtual drag layer state managing real-time visual feedback
 * Prevents expensive re-renders during mouse movement by using CSS transforms
 */
export interface VirtualDragState {
  /** Map of rectangle IDs to their virtual positions during drag */
  positions: Map<string, VirtualDragPosition>;
  /** Whether virtual drag layer is active */
  isActive: boolean;
  /** Primary dragged rectangle ID (for hierarchy and interaction logic) */
  primaryDraggedId: string | null;
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
 * State during canvas zooming operation
 */
export interface ZoomState {
  /** Current zoom level (1.0 = 100%) */
  level: number;
  /** Center point of zoom in screen coordinates */
  centerX: number;
  /** Center point of zoom in screen coordinates */
  centerY: number;
  /** Minimum zoom level */
  minLevel: number;
  /** Maximum zoom level */
  maxLevel: number;
}

/**
 * Centralized configuration affecting layout, styling, and behavior
 * Persisted to localStorage and synchronized across components
 */
export interface GlobalSettings {
  /** Canvas grid unit size - affects positioning precision and visual alignment */
  gridSize: number;
  /** Visual grid overlay toggle - helps with manual positioning */
  showGrid: boolean;
  /** Whether leaf rectangles have fixed width */
  leafFixedWidth: boolean;
  /** Whether leaf rectangles have fixed height */
  leafFixedHeight: boolean;
  /** Fixed width for leaf rectangles when enabled */
  leafWidth: number;
  /** Fixed height for leaf rectangles when enabled */
  leafHeight: number;
  /** Base text size for root elements - scales down for nested levels */
  rootFontSize: number;
  /** Automatically adjusts text size based on hierarchy depth and container size */
  dynamicFontSizing: boolean;
  /** Font family for all text in the application and exports */
  fontFamily: string;
  /** Available font options detected from the system */
  availableFonts?: Array<{ value: string; label: string; category: string }>;
  /** Whether fonts are currently being detected */
  fontsLoading?: boolean;
  /** Border radius for rectangles in pixels */
  borderRadius: number;
  /** Border color for rectangles (hex format) */
  borderColor: string;
  /** Border width for rectangles in pixels */
  borderWidth: number;
  /** Predefined color palette for rectangles */
  predefinedColors: string[];
  /** Margin around rectangles to prevent overlap */
  margin: number;
  /** Extra margin for nodes with children to accommodate labels */
  labelMargin: number;
  /** Active layout algorithm - affects child arrangement strategy and space utilization */
  layoutAlgorithm: LayoutAlgorithmType;
  /** Custom colors array for tracking user-added colors */
  customColors?: string[];
  /** Whether the settings are being restored from storage */
  isRestoring?: boolean;
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
 * Full application state snapshot for save/load operations
 * Includes all rectangles, selection, history, and configuration
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
 * Output format settings for diagram export functionality
 * Controls visual fidelity and compatibility with external tools
 */
export interface ExportOptions {
  /** Export format */
  format: 'html' | 'svg' | 'json' | 'mermaid';
  /** Image quality (0-1) for raster formats */
  quality?: number;
  /** Scale factor for export */
  scale?: number;
  /** Whether to include background in export */
  includeBackground?: boolean;
  /** Generates embeddable HTML without document structure - for wiki integration */
  confluenceMode?: boolean;
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
  /** IDs of selected rectangles for multi-select context menu */
  selectedIds?: string[];
}

/**
 * PWA update notification state
 */
export interface UpdateNotificationState {
  /** Whether an update is available */
  isUpdateAvailable: boolean;
  /** Whether update is currently being installed */
  isUpdating: boolean;
  /** Function to trigger immediate update */
  updateServiceWorker?: () => void;
  /** Function to dismiss the notification */
  dismiss?: () => void;
}

// Hook Return Types - Interface contracts for custom React hooks

/**
 * Rectangle CRUD operations and hierarchy management
 * Central interface for all rectangle manipulation logic
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
 * Global settings management with persistence and validation
 * Handles configuration changes and layout recalculation triggers
 */
export interface AppSettingsHook {
  gridSize: number;
  showGrid: boolean;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
  rootFontSize: number;
  dynamicFontSizing: boolean;
  fontFamily: string;
  availableFonts: Array<{ value: string; label: string; category: string }>;
  fontsLoading: boolean;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  predefinedColors: string[];
  margin: number;
  labelMargin: number;
  layoutAlgorithm: LayoutAlgorithmType;
  getFixedDimensions: () => FixedDimensions;
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;
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
  addCustomColor: (color: string) => void;
  updateColorSquare: (index: number, color: string) => void;
  handlePredefinedColorsChange: (colors: string[]) => void;
  setGridSize: (size: number) => void;
  handleShowGridChange: (show: boolean) => void;
  setRectanglesRef: (setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>) => void;
  setFitToChildrenRef: (fitToChildren: (id: string) => void) => void;
  setIsRestoring: (isRestoring: boolean) => void;
}

/**
 * Lock confirmation modal state
 */
export interface LockConfirmationModalState {
  rectangleId: string;
  rectangleLabel: string;
}

/**
 * Description edit modal state
 */
export interface DescriptionEditModalState {
  rectangleId: string;
  rectangleLabel: string;
  currentDescription: string;
}


/**
 * Canvas interaction state and event handling
 * Manages mouse/touch operations for drag, resize, pan, and zoom
 */
export interface CanvasInteractionsHook {
  // Canvas state
  panOffset: PanOffset;
  panOffsetRef: React.MutableRefObject<PanOffset>;
  isSpacePressed: boolean;
  zoomState: ZoomState;
  
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
  isKeyboardMoving: boolean;
  
  // Event handlers
  handleCanvasMouseDown: (e: React.MouseEvent) => void;
  handleRectangleMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize' | 'hierarchy-drag') => void;
  cancelDrag: () => void;
  startKeyboardMovement: () => void;
}

// Error Handling Types - Structured error management for robust operation

/**
 * Categorized error types for proper handling and user feedback
 * Enables specific recovery strategies and meaningful error messages
 */
export type AppErrorType = 
  | 'VALIDATION_ERROR'    // Data structure violations
  | 'EXPORT_ERROR'       // File generation failures
  | 'IMPORT_ERROR'       // File parsing/loading issues
  | 'LAYOUT_ERROR'       // Algorithm calculation problems
  | 'UNKNOWN_ERROR';     // Unexpected runtime errors

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
 * Type-safe result wrapper for fallible operations
 * Enforces explicit error handling without throwing exceptions
 */
export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Structured validation feedback with severity levels
 * Distinguishes between blocking errors and informational warnings
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}