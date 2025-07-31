/**
 * Layout System Entry Point
 * 
 * This module exports the complete layout system including:
 * - Type definitions and interfaces for layout algorithms
 * - Concrete algorithm implementations (Grid, Flow, Mixed Flow)
 * - Factory pattern for algorithm creation and management
 * - High-level layout manager for simplified usage
 * - Backward compatibility wrappers for legacy code
 */

// Core type definitions and abstractions
export type { 
  ILayoutAlgorithm, 
  ILayoutAlgorithmFactory, 
  LayoutInput, 
  LayoutResult, 
  LayoutAlgorithmType 
} from './interfaces';

// Available layout algorithm implementations
export { GridLayoutAlgorithm } from './GridLayoutAlgorithm';
export { FlowLayoutAlgorithm } from './FlowLayoutAlgorithm';
export { MixedFlowLayoutAlgorithm } from './MixedFlowLayoutAlgorithm';

// Factory and management layer
export { LayoutAlgorithmFactory, layoutAlgorithmFactory } from './LayoutAlgorithmFactory';
export { LayoutManager, layoutManager } from './LayoutManager';

// Re-export utility functions from the main manager for backwards compatibility
import { layoutManager } from './LayoutManager';

/**
 * Calculate auto-sized dimensions and positions for child rectangles
 * @deprecated Use layoutManager.calculateChildLayout instead
 */
export const calculateChildLayout = layoutManager.calculateChildLayout.bind(layoutManager);

/**
 * Calculate minimum size needed to fit all children snugly
 * @deprecated Use layoutManager.calculateMinimumParentSize instead
 */
export const calculateMinimumParentSize = layoutManager.calculateMinimumParentSize.bind(layoutManager);

/**
 * Calculate grid dimensions based on layout preferences
 * @deprecated Use layoutManager.calculateGridDimensions instead
 */
export const calculateGridDimensions = layoutManager.calculateGridDimensions.bind(layoutManager);

/**
 * Calculate initial position and size for a new rectangle
 * @deprecated Use layoutManager.calculateNewRectangleLayout instead
 */
export const calculateNewRectangleLayout = layoutManager.calculateNewRectangleLayout.bind(layoutManager);