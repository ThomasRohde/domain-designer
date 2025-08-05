import { Rectangle, LayoutPreferences } from '../../types';
import { LayoutMetadata, shouldPreserveExactLayout } from '../../types/layoutSnapshot';
import { ILayoutAlgorithm, LayoutInput, LayoutResult } from './interfaces';

/**
 * Abstract base class providing common layout algorithm infrastructure
 * 
 * Implements the Template Method pattern with dual-layer layout control:
 * - Manual positioning mode (user override) - Absolute precedence over all algorithms
 * - Layout preservation flags (temporary protection) - Prevents unwanted relayout during operations
 * 
 * This architecture ensures that user control always takes precedence while providing
 * fine-grained protection against layout disruption during complex UI operations.
 * All concrete algorithms inherit this control logic plus standard geometric utilities
 * for bounds checking, coordinate calculations, and content sizing.
 */
export abstract class BaseLayoutAlgorithm implements ILayoutAlgorithm {
  abstract readonly name: string;
  abstract readonly description: string;
  
  /**
   * Determine if algorithm should modify existing layout (secondary control layer)
   * 
   * Part of the dual-layer layout control system, this method provides temporary
   * protection against unwanted relayout during operations like drag/drop, imports,
   * or state transitions. This is SECONDARY to manual positioning mode - if manual
   * positioning is enabled, this check is bypassed entirely.
   * 
   * Used for temporary preservation scenarios:
   * - During active drag operations to prevent layout flickering
   * - When importing layouts that should maintain exact positions
   * - During undo/redo operations to preserve intermediate states
   * 
   * @param layoutMetadata - Optional layout state and preservation flags
   * @returns true if layout modifications are allowed (false = preserve current positions)
   */
  canApplyLayout(layoutMetadata?: LayoutMetadata): boolean {
    if (!layoutMetadata) return true;
    
    // Don't apply layout if positions should be preserved exactly
    return !shouldPreserveExactLayout(layoutMetadata);
  }
  
  /**
   * Main layout calculation with dual-layer layout control (Template Method)
   * 
   * Implements a hierarchical layout control system with two levels of protection:
   * 1. Manual positioning mode (highest precedence) - User has full control
   * 2. Layout preservation flags (secondary) - Temporary protection during operations
   * 3. Algorithm execution - Normal automatic layout processing
   * 
   * The manual positioning check takes absolute precedence over preservation flags,
   * ensuring that when users enable manual mode, no algorithm will ever execute
   * regardless of preservation state or layout metadata.
   * 
   * @param input - Complete layout parameters and constraints
   * @returns Layout result with positioned rectangles and parent sizing
   */
  calculateLayout(input: LayoutInput): LayoutResult {
    // PRIORITY 1: Manual positioning mode overrides all automatic layout
    // When enabled, user has complete control over child positioning and algorithms
    // must never modify or rearrange children, regardless of any other flags
    if (input.parentRect.isManualPositioningEnabled) {
      return {
        rectangles: input.children,
        minParentSize: this.calculateMinimumParentSize(input)
      };
    }

    // PRIORITY 2: Layout preservation flags protect against unwanted relayout
    // Temporary protection during drag operations, imports, or other state changes
    // where existing positions should be maintained until operation completes
    if (!this.canApplyLayout(input.layoutMetadata)) {
      return {
        rectangles: input.children,
        minParentSize: this.calculateMinimumParentSize(input)
      };
    }
    
    // PRIORITY 3: Execute algorithm-specific layout calculation
    // Normal path when both manual positioning is disabled and preservation allows changes
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
   * Calculate minimum parent dimensions for content (bypasses all layout controls)
   * 
   * This calculation is always performed regardless of manual positioning mode or
   * preservation flags since it's a pure computation that doesn't modify positions.
   * Essential for:
   * - Parent fit-to-children operations (both automatic and manual modes)
   * - Container size validation when children are repositioned
   * - Export bounds calculation for optimal output sizing
   * 
   * Even in manual positioning mode, parents may need to resize to accommodate
   * user-positioned children, making this calculation always necessary.
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