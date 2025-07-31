import { Rectangle, LayoutPreferences } from '../../types';
import { LayoutMetadata, shouldPreserveExactLayout } from '../../types/layoutSnapshot';
import { ILayoutAlgorithm, LayoutInput, LayoutResult } from './interfaces';

/**
 * Abstract base class providing common layout algorithm infrastructure
 * 
 * Implements the Template Method pattern with layout preservation capabilities.
 * Provides utility methods for bounds checking, coordinate calculations, and
 * layout metadata handling. All concrete algorithms inherit preservation logic
 * and standard geometric operations.
 */
export abstract class BaseLayoutAlgorithm implements ILayoutAlgorithm {
  abstract readonly name: string;
  abstract readonly description: string;
  
  /**
   * Determine if algorithm should modify existing layout
   * 
   * Checks layout preservation flags to prevent unwanted automatic relayout
   * of user-positioned content. Standard implementation defers to metadata
   * preservation flags.
   * 
   * @param layoutMetadata - Optional layout state and preservation flags
   * @returns true if layout modifications are allowed
   */
  canApplyLayout(layoutMetadata?: LayoutMetadata): boolean {
    if (!layoutMetadata) return true;
    
    // Don't apply layout if positions should be preserved exactly
    return !shouldPreserveExactLayout(layoutMetadata);
  }
  
  /**
   * Main layout calculation with preservation checks (Template Method)
   * 
   * Implements the preservation-aware layout workflow:
   * 1. Check if layout modifications are allowed
   * 2. If preserved, return existing rectangles unchanged
   * 3. Otherwise, delegate to concrete algorithm implementation
   * 
   * @param input - Complete layout parameters and constraints
   * @returns Layout result with positioned rectangles and parent sizing
   */
  calculateLayout(input: LayoutInput): LayoutResult {
    // Check if we should preserve the current layout
    if (!this.canApplyLayout(input.layoutMetadata)) {
      return {
        rectangles: input.children,
        minParentSize: this.calculateMinimumParentSize(input)
      };
    }
    
    // Delegate to concrete implementation
    return this.doCalculateLayout(input);
  }
  
  /**
   * Abstract method for algorithm-specific layout implementation
   * 
   * Called by calculateLayout() after preservation checks pass.
   * Concrete algorithms implement their positioning logic here without
   * concern for preservation rules.
   * 
   * @param input - Layout parameters validated for modification
   * @returns Algorithm-specific layout result
   */
  protected abstract doCalculateLayout(input: LayoutInput): LayoutResult;
  
  /**
   * Calculate minimum parent dimensions for content (always callable)
   * 
   * This calculation is always performed regardless of preservation state
   * since it doesn't modify existing layouts, only computes space requirements.
   * Used for fit-to-children operations and parent sizing validation.
   * 
   * @param input - Layout parameters for size calculation
   * @returns Minimum required parent dimensions
   */
  abstract calculateMinimumParentSize(input: LayoutInput): { w: number; h: number };
  
  /**
   * Compute grid dimensions for given constraints (always callable)
   * 
   * Pure calculation method that doesn't modify layouts, only determines
   * optimal grid structure based on content count and user preferences.
   * 
   * @param childrenCount - Number of items to arrange
   * @param layoutPreferences - Optional grid constraints and fill strategy
   * @returns Optimal grid dimensions
   */
  abstract calculateGridDimensions(childrenCount: number, layoutPreferences?: LayoutPreferences): { cols: number; rows: number };
  
  /**
   * Clamp child rectangles within parent boundaries
   * 
   * Utility for subclasses to prevent child overflow beyond parent edges.
   * Applies margin constraints and moves rectangles to valid positions
   * without changing their dimensions.
   * 
   * @param rectangles - Child rectangles to constrain
   * @param parentRect - Parent boundaries
   * @param margins - Margin constraints for positioning
   * @returns Rectangles with positions clamped to valid bounds
   */
  protected ensureWithinBounds(rectangles: Rectangle[], parentRect: Rectangle, margins: { margin: number; labelMargin: number }): Rectangle[] {
    return rectangles.map(rect => {
      const minX = parentRect.x + margins.margin;
      const minY = parentRect.y + margins.labelMargin;
      const maxX = parentRect.x + parentRect.w - margins.margin - rect.w;
      const maxY = parentRect.y + parentRect.h - margins.margin - rect.h;
      
      return {
        ...rect,
        x: Math.max(minX, Math.min(maxX, rect.x)),
        y: Math.max(minY, Math.min(maxY, rect.y))
      };
    });
  }
  
  /**
   * Calculate minimal bounding box containing all rectangles
   * 
   * Computes the smallest rectangle that encompasses all provided rectangles.
   * Useful for parent sizing calculations and content bounds determination.
   * 
   * @param rectangles - Array of rectangles to bound
   * @returns Minimal bounding box coordinates and dimensions
   */
  protected calculateBoundingBox(rectangles: Rectangle[]): { x: number; y: number; w: number; h: number } {
    if (rectangles.length === 0) {
      return { x: 0, y: 0, w: 0, h: 0 };
    }
    
    const minX = Math.min(...rectangles.map(r => r.x));
    const minY = Math.min(...rectangles.map(r => r.y));
    const maxX = Math.max(...rectangles.map(r => r.x + r.w));
    const maxY = Math.max(...rectangles.map(r => r.y + r.h));
    
    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY
    };
  }
}