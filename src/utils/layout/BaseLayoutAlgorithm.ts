import { Rectangle, LayoutPreferences } from '../../types';
import { LayoutMetadata, shouldPreserveExactLayout } from '../../types/layoutSnapshot';
import { ILayoutAlgorithm, LayoutInput, LayoutResult } from './interfaces';

/**
 * Base class for layout algorithms with layout preservation support
 * 
 * This abstract class provides common functionality for all layout algorithms,
 * including layout preservation logic and standard utilities.
 */
export abstract class BaseLayoutAlgorithm implements ILayoutAlgorithm {
  abstract readonly name: string;
  abstract readonly description: string;
  
  /**
   * Check if layout can be modified based on metadata
   * 
   * This is the standard implementation that checks for layout preservation flags.
   * Subclasses can override this if they need custom preservation logic.
   */
  canApplyLayout(layoutMetadata?: LayoutMetadata): boolean {
    if (!layoutMetadata) return true;
    
    // Don't apply layout if positions should be preserved exactly
    return !shouldPreserveExactLayout(layoutMetadata);
  }
  
  /**
   * Calculate layout for children within a parent rectangle
   * 
   * This method checks preservation rules before delegating to the concrete
   * implementation. If layout should be preserved, it returns the original rectangles.
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
   * Abstract method for concrete layout calculation
   * 
   * Subclasses must implement this method to provide the actual layout logic.
   * This method is only called when layout preservation allows modifications.
   */
  protected abstract doCalculateLayout(input: LayoutInput): LayoutResult;
  
  /**
   * Calculate minimum dimensions needed for parent to fit children
   * 
   * This method is always available regardless of preservation rules,
   * as it doesn't modify positions, only calculates requirements.
   */
  abstract calculateMinimumParentSize(input: LayoutInput): { w: number; h: number };
  
  /**
   * Calculate grid dimensions based on children count and preferences
   * 
   * This method is always available regardless of preservation rules,
   * as it only performs calculations without modifying layout.
   */
  abstract calculateGridDimensions(childrenCount: number, layoutPreferences?: LayoutPreferences): { cols: number; rows: number };
  
  /**
   * Utility method to ensure rectangles fit within parent bounds
   * 
   * This helper method can be used by subclasses to ensure child rectangles
   * don't exceed the parent boundaries while respecting margins.
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
   * Utility method to calculate total content area of rectangles
   * 
   * This helper calculates the bounding box containing all rectangles,
   * useful for parent size calculations.
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