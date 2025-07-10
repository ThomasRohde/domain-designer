import { ILayoutAlgorithm, LayoutInput, LayoutResult } from './interfaces';
import { Rectangle, LayoutPreferences, FlowOrientation } from '../../types';

/**
 * Constants for flow layout calculations (in grid units)
 */
const LEAF_W = 6;   // Minimum width for leaf nodes in grid units
const LEAF_H = 4;   // Minimum height for leaf nodes in grid units  
const H_GUTTER = 0.5; // Horizontal spacing between elements in grid units
const V_GUTTER = 0.5; // Vertical spacing between elements in grid units
const PADDING = 0.5;  // Container padding in grid units

/**
 * Type for margin-like objects
 */
interface MarginsLike {
  margin?: number;
  labelMargin?: number;
}

/**
 * Calculate inner box size after removing margins and padding
 */
function innerBoxSize(maxW: number, maxH: number, m: MarginsLike) {
  const hori = 2 * (m.margin ?? 1) + 2 * PADDING;
  const vert = 2 * (m.margin ?? 1) + (m.labelMargin ?? 2) + 2 * PADDING;
  return { innerW: Math.max(maxW - hori, 0), innerH: Math.max(maxH - vert, 0) };
}

/**
 * Calculate outer offset for positioning children
 */
function outerOffset(parent: Rectangle, m: MarginsLike) {
  return {
    x: parent.x + (m.margin ?? 1),
    y: parent.y + (m.labelMargin ?? 2) + (m.margin ?? 1),
  };
}

/**
 * Extended rectangle interface for flow layout with orientation
 */
interface FlowRectangle extends Rectangle {
  orient?: FlowOrientation;
  minW?: number;
  minH?: number;
  weight?: number;
}

/**
 * Flow-based layout algorithm implementing the FLOW.md specification
 * Uses alternating row/column orientation for hierarchical capability maps
 */
export class FlowLayoutAlgorithm implements ILayoutAlgorithm {
  readonly name = 'Flow Layout';
  readonly description = 'Flow-based hierarchical layout with alternating row/column orientation';

  /**
   * Calculate layout for children within a parent rectangle using flow algorithm
   */
  calculateLayout(input: LayoutInput): LayoutResult {
    const { parentRect, children, fixedDimensions, margins, depth, allRectangles } = input;
    
    if (children.length === 0) {
      return { rectangles: [] };
    }

    // Convert rectangles to flow rectangles with orientation
    const flowChildren = this.prepareFlowRectangles(children, parentRect, allRectangles, depth);
    
    // Calculate text measurements and set minimum sizes
    this.calculateMinimumSizes(flowChildren, fixedDimensions);
    
    // Calculate inner box size using helper function
    const innerBox = innerBoxSize(parentRect.w, parentRect.h, margins || {});
    const maxW = Math.max(innerBox.innerW, 10); // Minimum viable width
    const maxH = Math.max(innerBox.innerH, 6); // Minimum viable height
    
    // Create a virtual parent for packing if needed
    const virtualParent: FlowRectangle = {
      ...parentRect,
      orient: this.determineOrientation(this.calculateDepth(parentRect, allRectangles, depth)),
      minW: 0,
      minH: 0
    };
    
    const packedSize = this.pack(virtualParent, flowChildren, maxW, maxH, margins, allRectangles);
    
    // Convert back to regular rectangles and adjust positions relative to parent
    const result = this.convertToRectangles(flowChildren, parentRect, margins);
    
    return {
      rectangles: result,
      minParentSize: packedSize
    };
  }

  /**
   * Calculate minimum dimensions needed for parent to fit children
   */
  calculateMinimumParentSize(input: LayoutInput): { w: number; h: number } {
    const { children, fixedDimensions, margins, depth, allRectangles } = input;
    
    if (children.length === 0) {
      return { w: 100, h: 60 };
    }

    // Create a temporary parent for sizing calculation
    const tempParent: FlowRectangle = {
      id: 'temp',
      x: 0, y: 0, w: 0, h: 0,
      label: '', color: '', type: 'parent',
      orient: this.determineOrientation(depth || 0)
    };

    const flowChildren = this.prepareFlowRectangles(children, tempParent, allRectangles, depth);
    this.calculateMinimumSizes(flowChildren, fixedDimensions);
    
    const packedSize = this.pack(tempParent, flowChildren, Infinity, Infinity, margins, allRectangles);
    
    // Add margins using consistent calculations
    const marginH = 2 * (margins?.margin || 1);
    const marginV = (margins?.labelMargin || 2) + 2 * (margins?.margin || 1);
    
    return {
      w: packedSize.w + marginH,
      h: packedSize.h + marginV
    };
  }

  /**
   * Calculate grid dimensions (not used in flow layout, returns 1x1)
   */
  calculateGridDimensions(_childrenCount: number, _layoutPreferences?: LayoutPreferences): { cols: number; rows: number } {
    return { cols: 1, rows: 1 };
  }

  /**
   * Prepare rectangles for flow layout by adding orientation data
   */
  private prepareFlowRectangles(children: Rectangle[], parent: Rectangle, allRectangles?: Rectangle[], parentDepth?: number): FlowRectangle[] {
    const actualParentDepth = this.calculateDepth(parent, allRectangles, parentDepth);
    
    return children.map(child => ({
      ...child,
      orient: child.layoutPreferences?.orientation || this.determineOrientation(actualParentDepth + 1),
      weight: 1
    }));
  }

  /**
   * Calculate the depth of a rectangle in the hierarchy
   */
  private calculateDepth(rect: Rectangle, allRectangles?: Rectangle[], providedDepth?: number): number {
    // Use provided depth if available
    if (providedDepth !== undefined) {
      return providedDepth;
    }
    
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

  /**
   * Determine orientation based on tree depth following the pattern from FLOW.md
   */
  private determineOrientation(depth: number): FlowOrientation {
    // Pattern: root=COL (0), level1=ROW (1), level2=COL (2), etc.
    return depth % 2 === 0 ? 'COL' : 'ROW';
  }

  /**
   * Calculate minimum sizes for rectangles based on text content and fixed dimensions
   */
  private calculateMinimumSizes(rectangles: FlowRectangle[], fixedDimensions?: {
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
  }): void {
    rectangles.forEach(rect => {
      if (rect.type === 'leaf') {
        // For leaves, use fixed dimensions if available, otherwise use current size or minimum
        if (fixedDimensions?.leafFixedWidth) {
          rect.minW = fixedDimensions.leafWidth;
        } else {
          rect.minW = Math.max(rect.w, LEAF_W);
        }
        
        if (fixedDimensions?.leafFixedHeight) {
          rect.minH = fixedDimensions.leafHeight;
        } else {
          rect.minH = Math.max(rect.h, LEAF_H);
        }
      } else {
        // For containers, use current dimensions or calculate based on text
        const textWidth = Math.max(rect.label.length * 0.5, 2); // Rough estimate in grid units
        rect.minW = Math.max(rect.w, textWidth + 1); // Current width or text width + padding
        rect.minH = Math.max(rect.h, 2); // Current height or minimum
      }
    });
  }

  /**
   * Pack rectangles using the flow algorithm
   */
  private pack(parent: FlowRectangle, children: FlowRectangle[], maxW: number, _maxH: number, margins?: MarginsLike, allRectangles?: Rectangle[]): { w: number; h: number } {
    if (children.length === 0) {
      return { w: parent.minW || 100, h: parent.minH || 60 };
    }

    // Pack children first (bottom-up)
    children.forEach(child => {
      // Ensure child has proper orientation before recursive packing
      if (!child.orient) {
        // Calculate the current depth of this child
        const childDepth = this.calculateDepth(child, allRectangles, undefined);
        child.orient = this.determineOrientation(childDepth);
      }
      
      // FlowRectangle already carries a `children?: FlowRectangle[]` in most layouts.
      // If your Rectangle type doesn't expose children, add it or build a lookup map.
      const kids = (child as FlowRectangle & { children?: FlowRectangle[] }).children ?? [];
      this.pack(child, kids, Infinity, Infinity, margins, allRectangles);   // real recursive pack
    });

    const orient = parent.orient || 'COL';
    
    if (orient === 'ROW') {
      return this.packRow(parent, children, maxW);
    } else {
      return this.packColumn(parent, children);
    }
  }

  /**
   * Pack children in a row with wrapping (horizontal flow)
   */
  private packRow(parent: FlowRectangle, children: FlowRectangle[], maxW: number): { w: number; h: number } {
    let currentX = PADDING;
    let currentY = PADDING;
    let rowH = 0;
    let maxRowW = 0;

    children.forEach(child => {
      const usableW = maxW - 2 * PADDING;
      const childW = Math.min(child.minW || LEAF_W, usableW);
      const childH = child.minH || LEAF_H;

      // Check if we need to wrap to next row
      if (currentX + childW > maxW && currentX > PADDING) {
        maxRowW = Math.max(maxRowW, currentX - H_GUTTER); // drop last gutter
        currentY += rowH + V_GUTTER;
        currentX = PADDING;
        rowH = 0;
      }

      // Position child
      child.x = currentX;
      child.y = currentY;
      child.w = childW;
      child.h = childH;

      currentX += childW + H_GUTTER;
      rowH = Math.max(rowH, childH);
    });

    // Remove the last gutter from width calculation
    maxRowW = Math.max(maxRowW, currentX - H_GUTTER);   // same trick at the very end
    const totalH = currentY + rowH;

    // Update parent size with padding only (margins are applied in convertToRectangles)
    parent.w = maxRowW + 2 * PADDING;
    parent.h = totalH + 2 * PADDING;

    return { w: parent.w, h: parent.h };
  }

  /**
   * Pack children in a column (vertical stack)
   */
  private packColumn(parent: FlowRectangle, children: FlowRectangle[]): { w: number; h: number } {
    let currentY = PADDING;
    let colW = 0;

    children.forEach(child => {
      const childW = child.minW || LEAF_W;
      const childH = child.minH || LEAF_H;

      child.x = PADDING;
      child.y = currentY;
      child.w = childW;
      child.h = childH;

      currentY += childH + V_GUTTER;
      colW = Math.max(colW, childW);
    });

    // Remove the last gutter from height calculation
    const totalH = Math.max(0, currentY - V_GUTTER);

    // Update parent size with padding only (margins are applied in convertToRectangles)
    parent.w = colW + 2 * PADDING;
    parent.h = totalH + 2 * PADDING;

    return { w: parent.w, h: parent.h };
  }

  /**
   * Convert flow rectangles back to regular rectangles with proper positioning
   */
  private convertToRectangles(flowChildren: FlowRectangle[], parent: Rectangle, margins?: {
    margin: number;
    labelMargin: number;
  }): Rectangle[] {
    const offset = outerOffset(parent, margins || {});

    return flowChildren.map(flowRect => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { orient, minW, minH, weight, ...rect } = flowRect;
      // Remove flow-specific properties and convert to regular rectangles
      return {
        ...rect,
        x: rect.x + offset.x,
        y: rect.y + offset.y,
        w: rect.w, // Already in grid units
        h: rect.h  // Already in grid units
      };
    });
  }
}