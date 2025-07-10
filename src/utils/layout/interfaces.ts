import { Rectangle, LayoutPreferences } from '../../types';

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
 */
export interface ILayoutAlgorithm {
  /** Unique name/identifier for this layout algorithm */
  readonly name: string;
  
  /** Human-readable description of the algorithm */
  readonly description: string;
  
  /**
   * Calculate layout for children within a parent rectangle
   * @param input Layout calculation input parameters
   * @returns Layout result with positioned rectangles
   */
  calculateLayout(input: LayoutInput): LayoutResult;
  
  /**
   * Calculate minimum dimensions needed for parent to fit children
   * @param input Layout calculation input parameters
   * @returns Minimum width and height required
   */
  calculateMinimumParentSize(input: LayoutInput): { w: number; h: number };
  
  /**
   * Calculate grid dimensions based on children count and preferences
   * @param childrenCount Number of children to arrange
   * @param layoutPreferences Optional layout preferences
   * @returns Grid columns and rows
   */
  calculateGridDimensions(childrenCount: number, layoutPreferences?: LayoutPreferences): { cols: number; rows: number };
}

/**
 * Layout algorithm type identifier
 */
export type LayoutAlgorithmType = 'grid' | 'flow' | 'tree' | 'force-directed' | 'custom';

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