import { ILayoutAlgorithm, LayoutInput, LayoutResult } from './interfaces';
import { Rectangle, LayoutPreferences, FlowOrientation } from '../../types';

/**
 * Constants for flow layout calculations (in grid units)
 * Updated to use integer values for perfect grid alignment
 */
const LEAF_W = 6;   // Minimum width for leaf nodes in grid units
const LEAF_H = 4;   // Minimum height for leaf nodes in grid units  
const H_GUTTER = 1; // Horizontal spacing between elements in grid units (changed from 0.5 for grid alignment)
const V_GUTTER = 1; // Vertical spacing between elements in grid units (changed from 0.5 for grid alignment)
const PADDING = 1;  // Container padding in grid units (changed from 0.5 for grid alignment)

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
   * Snap a value to the nearest grid unit (integer)
   */
  private snapToGrid(value: number): number {
    return Math.round(value);
  }


  /**
   * Center children within parent for more pleasing, symmetric layouts
   */
  private centerChildrenInParent(children: FlowRectangle[], parentW: number, parentH: number, padding: number): void {
    if (children.length === 0) return;
    
    // Calculate actual bounds of all children
    const minX = Math.min(...children.map(c => c.x));
    const maxX = Math.max(...children.map(c => c.x + c.w));
    const minY = Math.min(...children.map(c => c.y));
    const maxY = Math.max(...children.map(c => c.y + c.h));
    
    const childrenWidth = maxX - minX;
    const childrenHeight = maxY - minY;
    
    // Calculate centering offset (ensure grid-aligned)
    const availableWidth = parentW - 2 * padding;
    const availableHeight = parentH - 2 * padding;
    
    const centerOffsetX = this.snapToGrid((availableWidth - childrenWidth) / 2);
    const centerOffsetY = this.snapToGrid((availableHeight - childrenHeight) / 2);
    
    // Apply centering to all children
    children.forEach(child => {
      child.x = this.snapToGrid(child.x - minX + padding + centerOffsetX);
      child.y = this.snapToGrid(child.y - minY + padding + centerOffsetY);
    });
  }

  /**
   * Validate that all coordinates are integers (grid-aligned)
   */
  private validateGridAlignment(rectangles: { x: number; y: number; w: number; h: number; id?: string }[]): void {
    rectangles.forEach(rect => {
      if (!Number.isInteger(rect.x) || !Number.isInteger(rect.y) || 
          !Number.isInteger(rect.w) || !Number.isInteger(rect.h)) {
        console.warn(`Non-integer coordinates detected: ${rect.id || 'unknown'}`, rect);
      }
    });
  }

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
   * Updated to ensure grid-aligned dimensions
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
          rect.minW = Math.max(this.snapToGrid(rect.w), LEAF_W);
        }
        
        if (fixedDimensions?.leafFixedHeight) {
          rect.minH = fixedDimensions.leafHeight;
        } else {
          rect.minH = Math.max(this.snapToGrid(rect.h), LEAF_H);
        }
      } else {
        // For containers, ensure grid-aligned text-based sizing
        const textWidth = Math.max(Math.ceil(rect.label.length * 0.6), 2); // Round up for grid alignment
        rect.minW = Math.max(this.snapToGrid(rect.w), textWidth + 1); // Current width or text width + padding
        rect.minH = Math.max(this.snapToGrid(rect.h), 2); // Current height or minimum
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
   * Updated to ensure grid-aligned positioning
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

      // Position child with grid snapping
      child.x = this.snapToGrid(currentX);
      child.y = this.snapToGrid(currentY);
      child.w = this.snapToGrid(childW);
      child.h = this.snapToGrid(childH);

      currentX += childW + H_GUTTER;
      rowH = Math.max(rowH, childH);
    });

    // Remove the last gutter from width calculation and ensure grid alignment
    maxRowW = this.snapToGrid(Math.max(maxRowW, currentX - H_GUTTER));
    const totalH = this.snapToGrid(currentY + rowH);

    // Update parent size with padding only (margins are applied in convertToRectangles)
    parent.w = this.snapToGrid(maxRowW + 2 * PADDING);
    parent.h = this.snapToGrid(totalH + 2 * PADDING);

    // Center children for more pleasing layout
    this.centerChildrenInParent(children, parent.w, parent.h, PADDING);

    return { w: parent.w, h: parent.h };
  }

  /**
   * Pack children in a column (vertical stack)
   * Updated to ensure grid-aligned positioning
   */
  private packColumn(parent: FlowRectangle, children: FlowRectangle[]): { w: number; h: number } {
    let currentY = PADDING;
    let colW = 0;

    children.forEach(child => {
      const childW = child.minW || LEAF_W;
      const childH = child.minH || LEAF_H;

      // Position child with grid snapping
      child.x = this.snapToGrid(PADDING);
      child.y = this.snapToGrid(currentY);
      child.w = this.snapToGrid(childW);
      child.h = this.snapToGrid(childH);

      currentY += childH + V_GUTTER;
      colW = Math.max(colW, childW);
    });

    // Remove the last gutter from height calculation and ensure grid alignment
    const totalH = this.snapToGrid(Math.max(0, currentY - V_GUTTER));

    // Update parent size with padding only (margins are applied in convertToRectangles)
    parent.w = this.snapToGrid(colW + 2 * PADDING);
    parent.h = this.snapToGrid(totalH + 2 * PADDING);

    // Center children for more pleasing layout
    this.centerChildrenInParent(children, parent.w, parent.h, PADDING);

    return { w: parent.w, h: parent.h };
  }

  /**
   * Convert flow rectangles back to regular rectangles with proper positioning
   * Updated to include final grid alignment check
   */
  private convertToRectangles(flowChildren: FlowRectangle[], parent: Rectangle, margins?: {
    margin: number;
    labelMargin: number;
  }): Rectangle[] {
    const offset = outerOffset(parent, margins || {});

    const result = flowChildren.map(flowRect => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { orient, minW, minH, weight, ...rect } = flowRect;
      
      // Apply offset and ensure final grid alignment
      const finalRect = {
        ...rect,
        x: this.snapToGrid(rect.x + offset.x),
        y: this.snapToGrid(rect.y + offset.y),
        w: this.snapToGrid(rect.w),
        h: this.snapToGrid(rect.h)
      };
      
      return finalRect;
    });

    // Validate grid alignment of final result
    this.validateGridAlignment(result);

    return result;
  }
}