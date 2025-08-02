import { Rectangle, LayoutPreferences } from '../../types';
import { ILayoutAlgorithm, LayoutAlgorithmType, LayoutInput } from './interfaces';
import { layoutAlgorithmFactory } from './LayoutAlgorithmFactory';
import { MARGIN, LABEL_MARGIN, MIN_WIDTH, MIN_HEIGHT } from '../constants';

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

  /**
   * Get active algorithm identifier
   * 
   * @returns Currently selected algorithm type string
   */
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

  /**
   * List all registered algorithm types
   * 
   * @returns Array of available algorithm identifiers
   */
  getAvailableAlgorithms(): LayoutAlgorithmType[] {
    return layoutAlgorithmFactory.getAvailableTypes();
  }

  /**
   * Perform layout calculation using active algorithm
   * 
   * Coordinates the layout process by calculating parent depth, preparing
   * input parameters, and delegating to the active algorithm. Handles
   * depth-dependent layout decisions (e.g., flow orientation alternation).
   * 
   * @param parentRect - Parent rectangle defining boundaries
   * @param children - Child rectangles to arrange
   * @param fixedDimensions - Optional fixed sizing for leaf nodes
   * @param margins - Spacing configuration
   * @param allRectangles - Complete rectangle set for hierarchy navigation
   * @returns Array of positioned child rectangles
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

    // Check if this parent has layout preferences that should override global algorithm
    const algorithmToUse = parentRect.layoutPreferences?.fillStrategy 
      ? layoutAlgorithmFactory.createAlgorithm('grid')
      : this.currentAlgorithm;

    const result = algorithmToUse.calculateLayout(input);
    return result.rectangles;
  }

  /**
   * Calculate optimal parent sizing for fit-to-children operations
   * 
   * Finds parent rectangle, determines its children, and delegates to
   * the active algorithm for minimum size calculation. Used for automatic
   * parent resizing and validation of space requirements.
   * 
   * @param parentId - ID of parent rectangl to size
   * @param rectangles - Complete rectangle set for relationship lookup
   * @param fixedDimensions - Optional fixed sizing for leaf nodes
   * @param margins - Spacing configuration
   * @returns Minimum required parent dimensions
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

    // Check if this parent has layout preferences that should override global algorithm
    const algorithmToUse = parent.layoutPreferences?.fillStrategy 
      ? layoutAlgorithmFactory.createAlgorithm('grid')
      : this.currentAlgorithm;

    const result = algorithmToUse.calculateMinimumParentSize(input);
    return result;
  }

  /**
   * Delegate grid dimension calculation to active algorithm
   * 
   * @param childrenCount - Number of items to arrange
   * @param layoutPreferences - Optional grid constraints
   * @returns Optimal grid dimensions for current algorithm
   */
  calculateGridDimensions(
    childrenCount: number,
    layoutPreferences?: LayoutPreferences
  ): { cols: number; rows: number } {
    // If layout preferences are provided, use Grid algorithm for calculation
    const algorithmToUse = layoutPreferences?.fillStrategy 
      ? layoutAlgorithmFactory.createAlgorithm('grid')
      : this.currentAlgorithm;
    
    return algorithmToUse.calculateGridDimensions(childrenCount, layoutPreferences);
  }

  /**
   * Calculate optimal placement for newly created rectangles
   * 
   * Determines appropriate position and size for new rectangles based on
   * parent context. For child rectangles, calculates grid-based positioning
   * within parent bounds. For root rectangles, places adjacent to existing content.
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
   * Get metadata about the active algorithm
   * 
   * @returns Name and description of currently selected algorithm
   */
  getCurrentAlgorithmInfo(): { name: string; description: string } {
    return {
      name: this.currentAlgorithm.name,
      description: this.currentAlgorithm.description
    };
  }

  /**
   * Get metadata for all registered algorithms
   * 
   * @returns Array of algorithm metadata for UI display
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
   * Traverse parent chain to determine hierarchy depth
   * 
   * Used for depth-dependent layout decisions (e.g., flow orientation alternation).
   * Implements cycle detection to prevent infinite loops in malformed hierarchies.
   * 
   * @param rect - Rectangle to calculate depth for
   * @param allRectangles - Complete rectangle set for parent lookup
   * @returns Depth level (0 = root, 1 = first child level, etc.)
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