import { Rectangle, LayoutPreferences } from '../../types';
import { LayoutMetadata } from '../../types/layoutSnapshot';

/**
 * Input parameters for layout calculations
 */
export interface LayoutInput {
  /** Parent rectangle containing the children */
  parentRect: Rectangle;
  /** Array of child rectangles to be laid out */
  children: Rectangle[];
  /** Fixed dimension settings for leaf rectangles */
  fixedDimensions?: {
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
  };
  /** Margin configuration for spacing */
  margins?: {
    margin: number;
    labelMargin: number;
  };
  /** All rectangles in the diagram (for parent size calculations) */
  allRectangles?: Rectangle[];
  /** Depth of the parent rectangle in the hierarchy (for orientation alternation) */
  depth?: number;
  /** Layout metadata for preservation rules */
  layoutMetadata?: LayoutMetadata;
}

/**
 * Result of layout calculation
 */
export interface LayoutResult {
  /** Updated rectangles with new positions and dimensions */
  rectangles: Rectangle[];
  /** Minimum required parent size to fit all children */
  minParentSize?: { w: number; h: number };
}

/**
 * Abstract interface for layout algorithms
 * 
 * All layout algorithms must implement this interface to be compatible
 * with the Domain Designer layout system. The interface provides a
 * standardized way to calculate layouts, determine parent sizes, and
 * handle grid arrangements.
 * 
 * Implementation requirements:
 * - Must maintain O(N) linear time complexity where possible
 * - Should handle edge cases gracefully (empty containers, single children)
 * - Must preserve consistent margin and grid alignment
 * - Should be deterministic (same input produces same output)
 */
export interface ILayoutAlgorithm {
  /** Unique name/identifier for this layout algorithm */
  readonly name: string;
  
  /** Human-readable description of the algorithm */
  readonly description: string;
  
  /**
   * Check if layout can be modified based on metadata
   * 
   * This method determines whether the algorithm should apply layout changes
   * based on preservation rules in the layout metadata.
   * 
   * @param layoutMetadata Layout metadata containing preservation rules
   * @returns True if layout can be modified, false if it should be preserved
   */
  canApplyLayout(layoutMetadata?: LayoutMetadata): boolean;
  
  /**
   * Calculate layout for children within a parent rectangle
   * 
   * This is the core method that arranges child rectangles within a parent.
   * The algorithm should optimize for space utilization, visual balance,
   * and maintainability of hierarchical structure.
   * 
   * @param input Layout calculation input parameters including parent, children, and settings
   * @returns Layout result with positioned rectangles and optional parent size info
   */
  calculateLayout(input: LayoutInput): LayoutResult;
  
  /**
   * Calculate minimum dimensions needed for parent to fit children
   * 
   * Used for auto-sizing parent containers. Should calculate the smallest
   * possible parent size that can accommodate all children with proper
   * margins and spacing.
   * 
   * @param input Layout calculation input parameters
   * @returns Minimum width and height required for the parent container
   */
  calculateMinimumParentSize(input: LayoutInput): { w: number; h: number };
  
  /**
   * Calculate grid dimensions based on children count and preferences
   * 
   * Determines the optimal number of columns and rows for arranging
   * a given number of children. Used for grid-based layouts and
   * compatibility with other layout systems.
   * 
   * @param childrenCount Number of children to arrange
   * @param layoutPreferences Optional layout preferences (aspect ratio, max columns, etc.)
   * @returns Grid dimensions with optimal columns and rows
   */
  calculateGridDimensions(childrenCount: number, layoutPreferences?: LayoutPreferences): { cols: number; rows: number };
}

/**
 * Layout algorithm type identifier
 * 
 * Available algorithm types:
 * - 'grid': Uniform grid arrangement for many items
 * - 'flow': Alternating row/column orientation by depth
 * - 'mixed-flow': Adaptive layout combining rows and columns to minimize whitespace
 * - 'tree': Tree-like hierarchical arrangement (future)
 * - 'force-directed': Physics-based layout (future)
 * - 'custom': User-defined custom algorithm (future)
 */
export type LayoutAlgorithmType = 'grid' | 'flow' | 'mixed-flow' | 'tree' | 'force-directed' | 'custom';

/**
 * Factory for creating layout algorithms
 */
export interface ILayoutAlgorithmFactory {
  /**
   * Create a layout algorithm instance by type
   * @param type The type of layout algorithm to create
   * @returns Layout algorithm instance
   */
  createAlgorithm(type: LayoutAlgorithmType): ILayoutAlgorithm;
  
  /**
   * Get all available algorithm types
   * @returns Array of available algorithm types
   */
  getAvailableTypes(): LayoutAlgorithmType[];
  
  /**
   * Register a new layout algorithm
   * @param type The type identifier for the algorithm
   * @param algorithmClass Constructor for the algorithm
   */
  registerAlgorithm(type: LayoutAlgorithmType, algorithmClass: new () => ILayoutAlgorithm): void;
}