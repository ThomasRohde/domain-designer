import { Rectangle, LayoutPreferences } from '../../types';
import { ILayoutAlgorithm, LayoutAlgorithmType, LayoutInput } from './interfaces';
import { layoutAlgorithmFactory } from './LayoutAlgorithmFactory';
import { MIN_WIDTH, MIN_HEIGHT } from '../constants';

/**
 * Central layout coordinator implementing the Strategy pattern
 * 
 * Manages algorithm selection, coordinates layout calculations, and provides
 * a unified interface for all layout operations. Handles algorithm switching
 * and delegates complex layout tasks to specialized algorithm implementations.
 */
export class LayoutManager {
  private currentAlgorithmType: LayoutAlgorithmType = 'grid';
  private currentAlgorithm: ILayoutAlgorithm;

  constructor(algorithmType: LayoutAlgorithmType = 'grid') {
    this.currentAlgorithm = layoutAlgorithmFactory.createAlgorithm(algorithmType);
    this.currentAlgorithmType = algorithmType;
  }

  getCurrentAlgorithmType(): LayoutAlgorithmType {
    return this.currentAlgorithmType;
  }

  /**
   * Change active layout algorithm with lazy instantiation
   * 
   * Only creates new algorithm instance if type differs from current.
   * Maintains algorithm state consistency across layout operations.
   * 
   * @param type - Algorithm identifier to activate
   */
  setAlgorithm(type: LayoutAlgorithmType): void {
    if (type !== this.currentAlgorithmType) {
      this.currentAlgorithm = layoutAlgorithmFactory.createAlgorithm(type);
      this.currentAlgorithmType = type;
    }
  }

  getAvailableAlgorithms(): LayoutAlgorithmType[] {
    return layoutAlgorithmFactory.getAvailableTypes();
  }

  /**
   * Perform layout calculation with manual positioning precedence
   * 
   * Implements "manual positioning first" strategy: if parent has manual
   * positioning enabled, returns children unchanged without algorithm execution.
   * Otherwise, coordinates algorithmic layout by calculating depth and
   * delegating to the active algorithm.
   * 
   * @param parentRect - Parent rectangle defining boundaries
   * @param children - Child rectangles to arrange
   * @param fixedDimensions - Optional fixed sizing for leaf nodes
   * @param margins - Spacing configuration
   * @param allRectangles - Complete rectangle set for hierarchy navigation
   * @returns Array of positioned child rectangles (unchanged if manual mode)
   */
  calculateChildLayout(
    parentRect: Rectangle,
    children: Rectangle[],
    margins: {
      margin: number;
      labelMargin: number;
    },
    fixedDimensions?: {
      leafFixedWidth: boolean;
      leafFixedHeight: boolean;
      leafWidth: number;
      leafHeight: number;
    },
    allRectangles?: Rectangle[]
  ): Rectangle[] {
    // Manual positioning takes precedence - preserve user-defined child positions
    if (parentRect.isManualPositioningEnabled) {
      return children;
    }

    const depth = this.calculateDepth(parentRect, allRectangles);
    
    const input: LayoutInput = {
      parentRect,
      children,
      fixedDimensions,
      margins,
      allRectangles,
      depth
    };

    // Parent layout preferences override global algorithm selection
    const algorithmToUse = parentRect.layoutPreferences?.fillStrategy 
      ? layoutAlgorithmFactory.createAlgorithm('grid')
      : this.currentAlgorithm;

    const result = algorithmToUse.calculateLayout(input);
    return result.rectangles;
  }

  /**
   * Calculate optimal parent sizing with manual positioning precedence
   * 
   * For manual positioning mode: calculates bounding box of child positions
   * without algorithm involvement, respecting user-defined layouts.
   * For automatic mode: delegates to layout algorithm for optimal sizing.
   * 
   * @param parentId - ID of parent rectangle to size
   * @param rectangles - Complete rectangle set for relationship lookup
   * @param fixedDimensions - Optional fixed sizing for leaf nodes
   * @param margins - Spacing configuration
   * @returns Minimum required parent dimensions
   */
  calculateMinimumParentSize(
    parentId: string,
    rectangles: Rectangle[],
    margins: {
      margin: number;
      labelMargin: number;
    },
    fixedDimensions?: {
      leafFixedWidth: boolean;
      leafFixedHeight: boolean;
      leafWidth: number;
      leafHeight: number;
    }
  ): { w: number; h: number } {
    const parent = rectangles.find(r => r.id === parentId);
    const children = rectangles.filter(r => r.parentId === parentId);

    if (!parent || children.length === 0) {
      return { w: MIN_WIDTH, h: MIN_HEIGHT };
    }

    // Manual positioning: calculate bounding box of actual child positions
    if (parent.isManualPositioningEnabled) {
      if (children.length === 0) {
        return { w: MIN_WIDTH, h: MIN_HEIGHT };
      }

      // Find extremes of all child rectangles to determine required parent bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      children.forEach(child => {
        minX = Math.min(minX, child.x);
        minY = Math.min(minY, child.y);
        maxX = Math.max(maxX, child.x + child.w);
        maxY = Math.max(maxY, child.y + child.h);
      });

      // Ensure parent encompasses all children with proper margins
      const requiredWidth = Math.max(MIN_WIDTH, maxX - parent.x + margins.margin);
      const requiredHeight = Math.max(MIN_HEIGHT, maxY - parent.y + margins.margin);

      return { w: requiredWidth, h: requiredHeight };
    }

    const depth = this.calculateDepth(parent, rectangles);

    const input: LayoutInput = {
      parentRect: parent,
      children,
      fixedDimensions,
      margins,
      allRectangles: rectangles,
      depth
    };

    // Parent layout preferences override global algorithm selection
    const algorithmToUse = parent.layoutPreferences?.fillStrategy 
      ? layoutAlgorithmFactory.createAlgorithm('grid')
      : this.currentAlgorithm;

    const result = algorithmToUse.calculateMinimumParentSize(input);
    return result;
  }

  calculateGridDimensions(
    childrenCount: number,
    layoutPreferences?: LayoutPreferences
  ): { cols: number; rows: number } {
    // Layout preferences force grid algorithm usage for consistent fill behavior
    const algorithmToUse = layoutPreferences?.fillStrategy 
      ? layoutAlgorithmFactory.createAlgorithm('grid')
      : this.currentAlgorithm;
    
    return algorithmToUse.calculateGridDimensions(childrenCount, layoutPreferences);
  }

  /**
   * Calculate optimal placement for newly created rectangles
   * 
   * For manual positioning mode: uses left-to-right, top-to-bottom placement
   * strategy that respects parent boundaries and existing child positions.
   * For automatic mode: uses grid-based algorithmic positioning.
   * 
   * @param parentId - Parent ID (null for root rectangles)
   * @param rectangles - Existing rectangles for context
   * @param defaultSizes - Default dimensions by rectangle type
   * @param margins - Spacing configuration
   * @returns Initial position and dimensions for new rectangle
   */
  calculateNewRectangleLayout(
    parentId: string | null,
    rectangles: Rectangle[],
    defaultSizes: { root: { w: number; h: number }, leaf: { w: number; h: number } },
    margins: {
      margin: number;
      labelMargin: number;
    }
  ): { x: number; y: number; w: number; h: number } {
    let x = 0, y = 0;
    let { w, h } = parentId ? defaultSizes.leaf : defaultSizes.root;

    if (parentId) {
      const parent = rectangles.find(rect => rect.id === parentId);
      if (parent) {
        // Manual positioning: natural left-to-right, top-to-bottom flow
        if (parent.isManualPositioningEnabled) {
          const existingChildren = rectangles.filter(rect => rect.parentId === parentId);
          
          if (existingChildren.length === 0) {
            // First child positioned at top-left with proper margins
            x = parent.x + margins.margin;
            y = parent.y + margins.labelMargin;
          } else {
            // Find rightmost child for horizontal placement attempt
            const rightmostChild = existingChildren.reduce((max, child) => 
              (child.x + child.w) > (max.x + max.w) ? child : max
            );
            
            const nextX = rightmostChild.x + rightmostChild.w + margins.margin;
            const nextY = rightmostChild.y;
            
            // Place horizontally if space available, otherwise wrap to new row
            if (nextX + w <= parent.x + parent.w - margins.margin) {
              x = nextX;
              y = nextY;
            } else {
              // Row wrap: position below bottommost existing child
              const bottommostChild = existingChildren.reduce((max, child) => 
                (child.y + child.h) > (max.y + max.h) ? child : max
              );
              x = parent.x + margins.margin;
              y = bottommostChild.y + bottommostChild.h + margins.margin;
            }
          }
          
          w = defaultSizes.leaf.w;
          h = defaultSizes.leaf.h;
        } else {
          // Automatic mode: algorithmic grid-based positioning
          const existingChildren = rectangles.filter(rect => rect.parentId === parentId);
          const totalChildren = existingChildren.length + 1;
          
          const topMargin = margins.labelMargin;
          const sideMargin = margins.margin;
          
          const availableWidth = Math.max(MIN_WIDTH, parent.w - (sideMargin * 2));
          const availableHeight = Math.max(MIN_HEIGHT, parent.h - topMargin - sideMargin);
          
          const { cols, rows } = this.calculateGridDimensions(totalChildren, parent.layoutPreferences);
          
          const childWidth = Math.max(MIN_WIDTH, Math.floor(availableWidth / cols));
          const childHeight = Math.max(MIN_HEIGHT, Math.floor(availableHeight / rows));
          
          const childSpacing = margins.margin;
          
          const totalSpacingWidth = (cols - 1) * childSpacing;
          const totalSpacingHeight = (rows - 1) * childSpacing;
          const totalChildrenWidth = cols * childWidth + totalSpacingWidth;
          const totalChildrenHeight = rows * childHeight + totalSpacingHeight;
          
          const extraHorizontalSpace = Math.max(0, availableWidth - totalChildrenWidth);
          const extraVerticalSpace = Math.max(0, availableHeight - totalChildrenHeight);
          
          // Center grid within available parent space
          const horizontalOffset = extraHorizontalSpace / 2;
          const verticalOffset = extraVerticalSpace / 2;
          
          const col = existingChildren.length % cols;
          const row = Math.floor(existingChildren.length / cols);
          
          x = parent.x + sideMargin + horizontalOffset + (col * (childWidth + childSpacing));
          y = parent.y + topMargin + verticalOffset + (row * (childHeight + childSpacing));
          w = childWidth;
          h = childHeight;
          
          w = Math.max(MIN_WIDTH, w);
          h = Math.max(MIN_HEIGHT, h);
        }
      }
    } else {
      const rootRects = rectangles.filter(rect => !rect.parentId);
      if (rootRects.length > 0) {
        const lastRect = rootRects[rootRects.length - 1];
        x = lastRect.x + lastRect.w + margins.margin;
        y = lastRect.y;
      }
    }

    return { x, y, w, h };
  }

  getCurrentAlgorithmInfo(): { name: string; description: string } {
    return {
      name: this.currentAlgorithm.name,
      description: this.currentAlgorithm.description
    };
  }

  getAllAlgorithmInfo(): Array<{ type: LayoutAlgorithmType; name: string; description: string }> {
    return this.getAvailableAlgorithms().map(type => {
      const info = layoutAlgorithmFactory.getAlgorithmInfo(type);
      return {
        type,
        name: info?.name || type,
        description: info?.description || `${type} layout algorithm`
      };
    });
  }

  /**
   * Calculate hierarchy depth for flow algorithm orientation alternation
   * 
   * Traverses parent chain to determine depth level. Used by flow-based algorithms
   * to alternate between row/column orientation at different hierarchy levels.
   * Includes cycle detection to handle malformed parent relationships safely.
   * 
   * @param rect - Rectangle to calculate depth for
   * @param allRectangles - Complete rectangle set for parent lookup
   * @returns Depth level (0 = root, 1 = first child level, etc.)
   */
  private calculateDepth(rect: Rectangle, allRectangles?: Rectangle[]): number {
    if (!rect.parentId) {
      return 0;
    }
    
    if (allRectangles) {
      let currentRect = rect;
      let depth = 0;
      
      while (currentRect.parentId) {
        depth++;
        const parent = allRectangles.find(r => r.id === currentRect.parentId);
        if (!parent) {
          break;
        }
        currentRect = parent;
      }
      
      return depth;
    }
    
    return 1;
  }
}

// Export a singleton instance for global use with correct default algorithm
export const layoutManager = new LayoutManager('mixed-flow');