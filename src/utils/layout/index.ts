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

