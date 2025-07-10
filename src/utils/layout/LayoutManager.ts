import { Rectangle, LayoutPreferences } from '../../types';
import { ILayoutAlgorithm, LayoutAlgorithmType, LayoutInput } from './interfaces';
import { layoutAlgorithmFactory } from './LayoutAlgorithmFactory';
import { MARGIN, LABEL_MARGIN, MIN_WIDTH, MIN_HEIGHT } from '../constants';

/**
 * Central layout management class that uses the factory pattern
 * to handle different layout algorithms
 */
export class LayoutManager {
  private currentAlgorithmType: LayoutAlgorithmType = 'grid';
  private currentAlgorithm: ILayoutAlgorithm;

  constructor(algorithmType: LayoutAlgorithmType = 'grid') {
    this.currentAlgorithm = layoutAlgorithmFactory.createAlgorithm(algorithmType);
    this.currentAlgorithmType = algorithmType;
  }

  /**
   * Get the current layout algorithm type
   */
  getCurrentAlgorithmType(): LayoutAlgorithmType {
    return this.currentAlgorithmType;
  }

  /**
   * Switch to a different layout algorithm
   */
  setAlgorithm(type: LayoutAlgorithmType): void {
    if (type !== this.currentAlgorithmType) {
      this.currentAlgorithm = layoutAlgorithmFactory.createAlgorithm(type);
      this.currentAlgorithmType = type;
    }
  }

  /**
   * Get available algorithm types
   */
  getAvailableAlgorithms(): LayoutAlgorithmType[] {
    return layoutAlgorithmFactory.getAvailableTypes();
  }

  /**
   * Calculate layout for children within a parent rectangle
   */
  calculateChildLayout(
    parentRect: Rectangle,
    children: Rectangle[],
    fixedDimensions?: {
      leafFixedWidth: boolean;
      leafFixedHeight: boolean;
      leafWidth: number;
      leafHeight: number;
    },
    margins?: {
      margin: number;
      labelMargin: number;
    },
    allRectangles?: Rectangle[]
  ): Rectangle[] {
    // Calculate depth of parent for proper orientation alternation
    const depth = this.calculateDepth(parentRect, allRectangles);
    
    const input: LayoutInput = {
      parentRect,
      children,
      fixedDimensions,
      margins,
      allRectangles,
      depth
    };

    const result = this.currentAlgorithm.calculateLayout(input);
    return result.rectangles;
  }

  /**
   * Calculate minimum parent size needed to fit children
   */
  calculateMinimumParentSize(
    parentId: string,
    rectangles: Rectangle[],
    fixedDimensions?: {
      leafFixedWidth: boolean;
      leafFixedHeight: boolean;
      leafWidth: number;
      leafHeight: number;
    },
    margins?: {
      margin: number;
      labelMargin: number;
    }
  ): { w: number; h: number } {
    const parent = rectangles.find(r => r.id === parentId);
    const children = rectangles.filter(r => r.parentId === parentId);

    if (!parent || children.length === 0) {
      return { w: MIN_WIDTH, h: MIN_HEIGHT };
    }

    // Calculate depth of parent for proper orientation alternation
    const depth = this.calculateDepth(parent, rectangles);

    const input: LayoutInput = {
      parentRect: parent,
      children,
      fixedDimensions,
      margins,
      allRectangles: rectangles,
      depth
    };

    return this.currentAlgorithm.calculateMinimumParentSize(input);
  }

  /**
   * Calculate grid dimensions based on layout preferences
   */
  calculateGridDimensions(
    childrenCount: number,
    layoutPreferences?: LayoutPreferences
  ): { cols: number; rows: number } {
    return this.currentAlgorithm.calculateGridDimensions(childrenCount, layoutPreferences);
  }

  /**
   * Calculate initial position and size for a new rectangle
   */
  calculateNewRectangleLayout(
    parentId: string | null,
    rectangles: Rectangle[],
    defaultSizes: { root: { w: number; h: number }, leaf: { w: number; h: number } },
    margins?: {
      margin: number;
      labelMargin: number;
    }
  ): { x: number; y: number; w: number; h: number } {
    let x = 0, y = 0;
    let { w, h } = parentId ? defaultSizes.leaf : defaultSizes.root;

    if (parentId) {
      const parent = rectangles.find(rect => rect.id === parentId);
      if (parent) {
        const existingChildren = rectangles.filter(rect => rect.parentId === parentId);
        const totalChildren = existingChildren.length + 1; // +1 for the new child
        
        // Use labelMargin for top spacing to accommodate labels, regular margin for other sides
        const topMargin = margins?.labelMargin ?? LABEL_MARGIN;
        const sideMargin = margins?.margin ?? MARGIN;
        
        const availableWidth = Math.max(MIN_WIDTH, parent.w - (sideMargin * 2));
        const availableHeight = Math.max(MIN_HEIGHT, parent.h - topMargin - sideMargin);
        
        // Use layout preferences from parent rectangle
        const { cols, rows } = this.calculateGridDimensions(totalChildren, parent.layoutPreferences);
        
        // Calculate child dimensions
        const childWidth = Math.max(MIN_WIDTH, Math.floor(availableWidth / cols));
        const childHeight = Math.max(MIN_HEIGHT, Math.floor(availableHeight / rows));
        
        // Use consistent spacing between children (same as margin)
        const childSpacing = margins?.margin ?? MARGIN;
        
        // Calculate total space needed including spacing
        const totalSpacingWidth = (cols - 1) * childSpacing;
        const totalSpacingHeight = (rows - 1) * childSpacing;
        const totalChildrenWidth = cols * childWidth + totalSpacingWidth;
        const totalChildrenHeight = rows * childHeight + totalSpacingHeight;
        
        const extraHorizontalSpace = Math.max(0, availableWidth - totalChildrenWidth);
        const extraVerticalSpace = Math.max(0, availableHeight - totalChildrenHeight);
        
        // Center the children grid within the available space
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
    } else {
      const rootRects = rectangles.filter(rect => !rect.parentId);
      if (rootRects.length > 0) {
        const lastRect = rootRects[rootRects.length - 1];
        x = lastRect.x + lastRect.w + (margins?.margin ?? MARGIN);
        y = lastRect.y;
      }
    }

    return { x, y, w, h };
  }

  /**
   * Get information about the current algorithm
   */
  getCurrentAlgorithmInfo(): { name: string; description: string } {
    return {
      name: this.currentAlgorithm.name,
      description: this.currentAlgorithm.description
    };
  }

  /**
   * Get information about all available algorithms
   */
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
   * Calculate the depth of a rectangle in the hierarchy
   */
  private calculateDepth(rect: Rectangle, allRectangles?: Rectangle[]): number {
    // If no parent, this is a root rectangle
    if (!rect.parentId) {
      return 0;
    }
    
    // If we have all rectangles, traverse up the parent chain
    if (allRectangles) {
      let currentRect = rect;
      let depth = 0;
      
      while (currentRect.parentId) {
        depth++;
        const parent = allRectangles.find(r => r.id === currentRect.parentId);
        if (!parent) {
          break; // Parent not found, stop traversal
        }
        currentRect = parent;
      }
      
      return depth;
    }
    
    // Fallback to simple heuristic
    return 1;
  }
}

// Export a singleton instance for global use
export const layoutManager = new LayoutManager();