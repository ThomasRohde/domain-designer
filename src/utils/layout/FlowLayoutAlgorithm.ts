import { ILayoutAlgorithm, LayoutInput, LayoutResult } from './interfaces';
import { Rectangle, LayoutPreferences, FlowOrientation } from '../../types';

/**
 * Constants for flow layout calculations (in grid units)
 * Updated to use integer values for perfect grid alignment
 */
const LEAF_W = 6;   // Minimum width for leaf nodes in grid units
const LEAF_H = 4;   // Minimum height for leaf nodes in grid units

/**
 * Stability constants to prevent row jumping during dynamic margin changes
 */
const WRAP_STABILITY_DELTA = 0.15;  // Tolerance for wrapping decisions
const PRECISION_EPSILON = 0.001;    // Floating-point precision tolerance
const HYSTERESIS_FACTOR = 0.05;     // Additional tolerance for sticky behavior

/**
 * Type for margin-like objects
 */
interface MarginsLike {
  margin?: number;
  labelMargin?: number;
}

/**
 * Calculate inner box size after removing margins and padding
 * Enhanced to handle sub-unit margins properly with stability considerations
 */
function innerBoxSize(maxW: number, maxH: number, m: MarginsLike) {
  const margin = m.margin ?? 1;
  const labelMargin = m.labelMargin ?? 2;
  
  // Use precise calculations for sub-unit margins with stability rounding
  const hori = 2 * margin;
  const vert = 2 * margin + labelMargin;
  
  // Ensure we don't go below minimum viable dimensions
  const minViableW = margin > 0 ? Math.max(margin * 2, 1) : 1;
  const minViableH = margin > 0 ? Math.max(margin * 2, 1) : 1;
  
  // Apply stability rounding to prevent micro-adjustments
  const innerW = Math.max(maxW - hori, minViableW);
  const innerH = Math.max(maxH - vert, minViableH);
  
  return { 
    innerW: Math.round(innerW * 1000) / 1000, 
    innerH: Math.round(innerH * 1000) / 1000 
  };
}

/**
 * Calculate outer offset for positioning children
 * Enhanced to handle sub-unit margins properly
 */
function outerOffset(parent: Rectangle, m: MarginsLike) {
  const margin = m.margin ?? 1;
  const labelMargin = m.labelMargin ?? 2;
  
  return {
    x: parent.x + margin,
    y: parent.y + labelMargin + margin,
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
   * Conditionally snap to grid based on margin values
   * Disables grid snapping for non-integer margins to preserve consistent spacing
   * Enhanced with stability considerations to prevent micro-adjustments
   */
  private snapToGrid(value: number, margins?: MarginsLike): number {
    // For very small values, preserve precision to avoid layout collapse
    if (Math.abs(value) < PRECISION_EPSILON) return 0;
    
    // Check if margins are whole numbers
    const margin = margins?.margin ?? 1;
    const labelMargin = margins?.labelMargin ?? 2;
    const hasIntegerMargins = Number.isInteger(margin) && Number.isInteger(labelMargin);
    
    // Only snap to grid if margins are integers
    if (hasIntegerMargins) {
      return Math.round(value);
    }
    
    // For non-integer margins, apply stability rounding to prevent micro-adjustments
    const precision = 1000;
    const rounded = Math.round(value * precision) / precision;
    
    // Apply stability threshold - if the change is tiny, keep the original value
    const delta = Math.abs(rounded - value);
    if (delta < PRECISION_EPSILON) {
      return value;
    }
    
    return rounded;
  }


  /**
   * Center children within parent for more pleasing, symmetric layouts
   * Enhanced to handle sub-unit margins properly with stability considerations
   */
  private centerChildrenInParent(children: FlowRectangle[], parentW: number, parentH: number, margins?: MarginsLike): void {
    if (children.length === 0) return;
    
    // Calculate actual bounds of all children
    const minX = Math.min(...children.map(c => c.x));
    const maxX = Math.max(...children.map(c => c.x + c.w));
    const minY = Math.min(...children.map(c => c.y));
    const maxY = Math.max(...children.map(c => c.y + c.h));
    
    const childrenWidth = maxX - minX;
    const childrenHeight = maxY - minY;
    
    // Calculate centering offset with conditional grid snapping
    const centerOffsetX = this.snapToGrid((parentW - childrenWidth) / 2, margins);
    const centerOffsetY = this.snapToGrid((parentH - childrenHeight) / 2, margins);
    
    // Enhanced stability check - use larger threshold to prevent micro-adjustments
    const stabilityThreshold = Math.max(WRAP_STABILITY_DELTA, 0.02);
    const shouldCenterX = Math.abs(centerOffsetX) > stabilityThreshold;
    const shouldCenterY = Math.abs(centerOffsetY) > stabilityThreshold;
    
    // Apply centering to all children only if the adjustment is significant
    children.forEach(child => {
      child.x = this.snapToGrid(child.x - minX + (shouldCenterX ? centerOffsetX : 0), margins);
      child.y = this.snapToGrid(child.y - minY + (shouldCenterY ? centerOffsetY : 0), margins);
    });
  }

  /**
   * Validate that all coordinates are properly aligned
   * Updated to handle sub-unit margins appropriately
   */
  private validateGridAlignment(rectangles: { x: number; y: number; w: number; h: number; id?: string }[]): void {
    rectangles.forEach(rect => {
      const hasSubunitValues = [rect.x, rect.y, rect.w, rect.h].some(val => 
        !Number.isInteger(val) && Math.abs(val - Math.round(val)) > 0.01
      );
      
      if (hasSubunitValues) {
        // Only warn for significantly non-aligned values
        const precision = 100;
        const isWellAligned = [rect.x, rect.y, rect.w, rect.h].every(val => 
          Math.abs(val - Math.round(val * precision) / precision) < 0.001
        );
        
        if (!isWellAligned) {
          console.warn(`Poorly aligned coordinates detected: ${rect.id || 'unknown'}`, rect);
        }
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
    this.calculateMinimumSizes(flowChildren, fixedDimensions, margins);
    
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
    this.calculateMinimumSizes(flowChildren, fixedDimensions, margins);
    
    const packedSize = this.pack(tempParent, flowChildren, Infinity, Infinity, margins, allRectangles);
    
    // Add margins using consistent calculations with conditional snapping
    const marginH = 2 * (margins?.margin || 1);
    const marginV = (margins?.labelMargin || 2) + 2 * (margins?.margin || 1);
    
    return {
      w: this.snapToGrid(packedSize.w + marginH, margins),
      h: this.snapToGrid(packedSize.h + marginV, margins)
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
   * Updated to handle conditional grid snapping based on margins
   */
  private calculateMinimumSizes(rectangles: FlowRectangle[], fixedDimensions?: {
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
  }, margins?: MarginsLike): void {
    rectangles.forEach(rect => {
      if (rect.type === 'leaf') {
        // For leaves, use fixed dimensions if available, otherwise use current size or minimum
        if (fixedDimensions?.leafFixedWidth) {
          rect.minW = fixedDimensions.leafWidth;
        } else {
          rect.minW = Math.max(this.snapToGrid(rect.w, margins), LEAF_W);
        }
        
        if (fixedDimensions?.leafFixedHeight) {
          rect.minH = fixedDimensions.leafHeight;
        } else {
          rect.minH = Math.max(this.snapToGrid(rect.h, margins), LEAF_H);
        }
      } else {
        // For containers, calculate text-based sizing with consistent spacing
        const textWidth = Math.max(Math.ceil(rect.label.length * 0.6), 2);
        rect.minW = Math.max(this.snapToGrid(rect.w, margins), textWidth + 1);
        rect.minH = Math.max(this.snapToGrid(rect.h, margins), 2);
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
      return this.packRow(parent, children, maxW, margins);
    } else {
      return this.packColumn(parent, children, margins);
    }
  }

  /**
   * Pack children in a row with wrapping (horizontal flow)
   * Enhanced with stability delta to prevent row jumping during dynamic margin changes
   */
  private packRow(parent: FlowRectangle, children: FlowRectangle[], maxW: number, margins?: MarginsLike): { w: number; h: number } {
    const gap = margins?.margin || 1;
    let currentX = 0;
    let currentY = 0;
    let rowH = 0;
    let maxRowW = 0;

    children.forEach((child, index) => {
      const childW = child.minW || LEAF_W;
      const childH = child.minH || LEAF_H;

      // Enhanced wrapping logic with hysteresis to prevent jumping
      const projectedX = currentX + childW;
      const hasRoomForChild = currentX > PRECISION_EPSILON; // Only wrap if we have at least one child in current row
      
      // Multi-tier stability check to prevent oscillation during dynamic margin changes
      const exceedsHardLimit = projectedX > (maxW + WRAP_STABILITY_DELTA);
      const exceedsSoftLimit = projectedX > maxW;
      const isInHysteresisZone = Math.abs(projectedX - maxW) <= (WRAP_STABILITY_DELTA + HYSTERESIS_FACTOR);
      
      // Decision matrix for wrapping (prevents jumping between rows):
      // - If we exceed hard limit, always wrap
      // - If we're in hysteresis zone, prefer current layout (sticky behavior)
      // - Only wrap if we clearly exceed and have room for at least one child
      const shouldWrap = exceedsHardLimit || (exceedsSoftLimit && !isInHysteresisZone);
      
      if (shouldWrap && hasRoomForChild) {
        // Complete current row
        maxRowW = Math.max(maxRowW, currentX - gap); // Remove trailing gap
        currentY += rowH + gap; // Parent must expand vertically
        currentX = 0;
        rowH = 0;
      }

      // Position child with conditional grid snapping
      child.x = this.snapToGrid(currentX, margins);
      child.y = this.snapToGrid(currentY, margins);
      child.w = this.snapToGrid(childW, margins);
      child.h = this.snapToGrid(childH, margins);

      // Update row tracking with stability considerations
      currentX += childW + gap;
      rowH = Math.max(rowH, childH);
      
      // Ensure we don't accumulate floating-point errors
      currentX = Math.round(currentX * 1000) / 1000;
      rowH = Math.round(rowH * 1000) / 1000;
      
      // For last child, ensure we capture the final row width
      if (index === children.length - 1) {
        maxRowW = Math.max(maxRowW, currentX - gap);
      }
    });

    // Calculate final dimensions ensuring parent expands vertically when needed
    const finalWidth = this.snapToGrid(maxRowW, margins);
    const finalHeight = this.snapToGrid(currentY + rowH, margins);

    // Update parent size with validation - ensure minimum dimensions
    parent.w = Math.max(finalWidth, 0);
    parent.h = Math.max(finalHeight, 0);

    // Center children for more pleasing layout
    this.centerChildrenInParent(children, parent.w, parent.h, margins);

    return { w: parent.w, h: parent.h };
  }

  /**
   * Pack children in a column (vertical stack)
   * Enhanced to handle sub-unit margins and ensure proper sizing
   */
  private packColumn(parent: FlowRectangle, children: FlowRectangle[], margins?: MarginsLike): { w: number; h: number } {
    const gap = margins?.margin || 1;
    let currentY = 0;
    let colW = 0;

    children.forEach((child, index) => {
      const childW = child.minW || LEAF_W;
      const childH = child.minH || LEAF_H;

      // Position child with conditional grid snapping
      child.x = this.snapToGrid(0, margins);
      child.y = this.snapToGrid(currentY, margins);
      child.w = this.snapToGrid(childW, margins);
      child.h = this.snapToGrid(childH, margins);

      // Update column tracking
      if (index < children.length - 1) {
        currentY += childH + gap;
      } else {
        currentY += childH; // No gap after last child
      }
      colW = Math.max(colW, childW);
    });

    // Calculate final dimensions with proper precision
    const finalWidth = this.snapToGrid(colW, margins);
    const finalHeight = this.snapToGrid(currentY, margins);

    // Update parent size with validation
    parent.w = Math.max(finalWidth, 0);
    parent.h = Math.max(finalHeight, 0);

    // Center children for more pleasing layout
    this.centerChildrenInParent(children, parent.w, parent.h, margins);

    return { w: parent.w, h: parent.h };
  }

  /**
   * Convert flow rectangles back to regular rectangles with proper positioning
   * Updated to include conditional grid alignment based on margins
   */
  private convertToRectangles(flowChildren: FlowRectangle[], parent: Rectangle, margins?: {
    margin: number;
    labelMargin: number;
  }): Rectangle[] {
    const offset = outerOffset(parent, margins || {});

    const result = flowChildren.map(flowRect => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { orient, minW, minH, weight, ...rect } = flowRect;
      
      // Apply offset with conditional grid snapping
      const finalRect = {
        ...rect,
        x: this.snapToGrid(rect.x + offset.x, margins),
        y: this.snapToGrid(rect.y + offset.y, margins),
        w: this.snapToGrid(rect.w, margins),
        h: this.snapToGrid(rect.h, margins)
      };
      
      return finalRect;
    });

    // Validate alignment of final result
    this.validateGridAlignment(result);

    return result;
  }
}