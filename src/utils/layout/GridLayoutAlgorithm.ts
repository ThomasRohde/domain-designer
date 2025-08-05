import { LayoutPreferences } from '../../types';
import { LayoutInput, LayoutResult } from './interfaces';
import { BaseLayoutAlgorithm } from './BaseLayoutAlgorithm';
import { MIN_WIDTH, MIN_HEIGHT, DEFAULT_RECTANGLE_SIZE } from '../constants';

/**
 * Uniform grid layout algorithm with adaptive cell sizing and content-aware positioning.
 * 
 * This algorithm provides structured rectangular arrangements where all children are
 * positioned within a uniform grid of cells. Each cell is sized to accommodate the
 * largest child dimension, ensuring consistent visual rhythm while allowing individual
 * children to be centered within their allocated grid cells.
 * 
 * Key Features:
 * - Configurable fill strategies (row-first vs column-first)
 * - Automatic grid dimension calculation based on content
 * - Margin-aware spacing with separate label margins
 * - Content-centered positioning within grid cells
 * - Type-aware dimension calculation (leaf, parent, text label handling)
 */
export class GridLayoutAlgorithm extends BaseLayoutAlgorithm {
  readonly name = 'grid';
  readonly description = 'Arranges children in a grid pattern with configurable fill strategy';

  /**
   * Grid dimension optimization with constraint-based calculation.
   * 
   * Algorithm Strategy:
   * 1. Default behavior creates square-ish grid using square root approximation
   * 2. Fill-rows-first respects column limits, filling horizontally before wrapping
   * 3. Fill-columns-first respects row limits, filling vertically before wrapping
   * 
   * Constraint handling ensures the grid accommodates all children while respecting
   * user-defined maximum row/column limits for custom layout control.
   */
  calculateGridDimensions(
    childrenCount: number,
    layoutPreferences?: LayoutPreferences
  ): { cols: number; rows: number } {
    if (!layoutPreferences) {
      // Default: near-square grid minimizing aspect ratio distortion
      const cols = Math.ceil(Math.sqrt(childrenCount));
      const rows = Math.ceil(childrenCount / cols);
      return { cols, rows };
    }

    const { fillStrategy, maxColumns, maxRows } = layoutPreferences;

    if (fillStrategy === 'fill-rows-first') {
      // Horizontal expansion with column constraints
      const cols = maxColumns ? Math.min(maxColumns, childrenCount) : Math.ceil(Math.sqrt(childrenCount));
      const rows = Math.ceil(childrenCount / cols);
      return { cols, rows };
    } else {
      // Vertical expansion with row constraints
      const rows = maxRows ? Math.min(maxRows, childrenCount) : Math.ceil(Math.sqrt(childrenCount));
      const cols = Math.ceil(childrenCount / rows);
      return { cols, rows };
    }
  }

  /**
   * Main layout computation with multi-phase positioning algorithm.
   * 
   * Algorithm Phases:
   * 1. Grid dimension calculation based on preferences and child count
   * 2. Individual child dimension calculation based on type (leaf/parent/text)
   * 3. Uniform cell sizing using maximum child dimensions
   * 4. Grid positioning with consistent spacing and centering
   * 5. Individual child centering within assigned grid cells
   * 
   * This approach ensures visual consistency while accommodating varying content sizes.
   */
  protected doCalculateLayout(input: LayoutInput): LayoutResult {
    const { parentRect, children, fixedDimensions, margins, allRectangles } = input;
    
    if (!parentRect || children.length === 0) {
      return { rectangles: [] };
    }

    // Asymmetric margin system: extra top space for labels, uniform side spacing
    // Match Flow algorithm behavior: labelMargin + margin for top spacing
    const topMargin = margins.labelMargin + margins.margin;
    const sideMargin = margins.margin;
    
    const availableWidth = parentRect.w - (sideMargin * 2);
    const availableHeight = parentRect.h - topMargin - sideMargin;

    // Use layout preferences from parent rectangle
    const { cols, rows } = this.calculateGridDimensions(children.length, parentRect.layoutPreferences);

    // Use consistent spacing between children (same as margin)
    const childSpacing = margins.margin;
    
    // Type-aware dimension calculation for heterogeneous content
    const childDimensions = children.map(child => {
      if (child.isTextLabel || child.type === 'textLabel') {
        // Text dimensions approximated from font metrics
        const textWidth = Math.max(MIN_WIDTH, (child.textFontSize || 14) * (child.label?.length || 5) * 0.6);
        const textHeight = Math.max(MIN_HEIGHT, (child.textFontSize || 14) * 1.5);
        return { width: textWidth, height: textHeight };
      } else if (child.type === 'leaf') {
        // Leaf dimensions from global fixed settings or defaults
        let childWidth = (fixedDimensions?.leafFixedWidth) ? fixedDimensions.leafWidth : DEFAULT_RECTANGLE_SIZE.leaf.w;
        let childHeight = (fixedDimensions?.leafFixedHeight) ? fixedDimensions.leafHeight : DEFAULT_RECTANGLE_SIZE.leaf.h;
        return { width: childWidth, height: childHeight };
      } else if (child.type === 'parent') {
        // Recursive minimum size calculation for nested hierarchies
        const rectanglesToUse = allRectangles || children;
        const childMinSize = this.calculateMinimumParentSize({
          parentRect: child,
          children: rectanglesToUse.filter(r => r.parentId === child.id),
          fixedDimensions,
          margins,
          allRectangles: rectanglesToUse
        });
        return { width: childMinSize.w, height: childMinSize.h };
      } else {
        // Fallback: space-filling calculation for edge cases
        let childWidth = Math.max(MIN_WIDTH, Math.floor((availableWidth - (cols - 1) * childSpacing) / cols));
        let childHeight = Math.max(MIN_HEIGHT, Math.floor((availableHeight - (rows - 1) * childSpacing) / rows));
        return { width: childWidth, height: childHeight };
      }
    });

    // Calculate maximum dimensions needed (for layout grid calculations)
    const maxChildWidth = Math.max(...childDimensions.map(d => d.width));
    const maxChildHeight = Math.max(...childDimensions.map(d => d.height));
    
    // Calculate total space needed for all children including spacing
    const totalSpacingWidth = (cols - 1) * childSpacing;
    const totalSpacingHeight = (rows - 1) * childSpacing;
    const totalChildrenWidth = cols * maxChildWidth + totalSpacingWidth;
    const totalChildrenHeight = rows * maxChildHeight + totalSpacingHeight;

    // Centering calculation with overflow protection
    const extraHorizontalSpace = Math.max(0, availableWidth - totalChildrenWidth);
    const extraVerticalSpace = Math.max(0, availableHeight - totalChildrenHeight);

    // Center grid within parent bounds for balanced visual composition
    const horizontalOffset = extraHorizontalSpace / 2;
    const verticalOffset = extraVerticalSpace / 2;

    const layoutRectangles = children.map((child, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      // Individual child dimensions within uniform grid cells
      const childWidth = childDimensions[index].width;
      const childHeight = childDimensions[index].height;

      // Calculate grid cell position with consistent spacing
      const gridCellX = parentRect.x + sideMargin + horizontalOffset + (col * (maxChildWidth + childSpacing));
      const gridCellY = parentRect.y + topMargin + verticalOffset + (row * (maxChildHeight + childSpacing));
      
      
      // Center child within its assigned grid cell for visual balance
      const availableCellWidth = maxChildWidth;
      const availableCellHeight = maxChildHeight;
      const centerOffsetX = Math.max(0, (availableCellWidth - childWidth) / 2);
      const centerOffsetY = Math.max(0, (availableCellHeight - childHeight) / 2);
      
      const x = gridCellX + centerOffsetX;
      const y = gridCellY + centerOffsetY;


      return {
        ...child,
        x: x,
        y: y,
        w: childWidth,
        h: childHeight
      };
    });

    return {
      rectangles: layoutRectangles,
      minParentSize: this.calculateMinimumParentSize(input)
    };
  }

  /**
   * Calculate minimum size needed to fit all children snugly
   */
  calculateMinimumParentSize(input: LayoutInput): { w: number; h: number } {
    const { parentRect, children, fixedDimensions, margins, allRectangles } = input;
    
    if (children.length === 0) {
      return { w: MIN_WIDTH, h: MIN_HEIGHT };
    }

    // Use labelMargin + margin for top spacing to match Flow algorithm behavior
    const topMargin = margins.labelMargin + margins.margin;
    const sideMargin = margins.margin;

    // Use layout preferences from parent rectangle
    const { cols, rows } = this.calculateGridDimensions(children.length, parentRect?.layoutPreferences);

    // Calculate theoretical optimal child dimensions (not actual current dimensions)
    // This ensures consistent sizing and prevents growth on repeated fit-to-children
    const childSpacing = margins.margin;
    
    // Calculate theoretical optimal child dimensions to avoid resize traps
    // Use default sizes rather than current expanded dimensions
    const actualChildDimensions = children.map(child => {
      if (child.type === 'leaf') {
        // For leaf rectangles, always respect fixed dimensions if they are enabled
        return {
          width: (fixedDimensions?.leafFixedWidth) ? fixedDimensions.leafWidth : DEFAULT_RECTANGLE_SIZE.leaf.w,
          height: (fixedDimensions?.leafFixedHeight) ? fixedDimensions.leafHeight : DEFAULT_RECTANGLE_SIZE.leaf.h
        };
      }
      // For parent rectangles, calculate their minimum size recursively
      if (child.type === 'parent') {
        const rectanglesToUse = allRectangles || children;
        const childMinSize = this.calculateMinimumParentSize({
          parentRect: child,
          children: rectanglesToUse.filter(r => r.parentId === child.id),
          fixedDimensions,
          margins,
          allRectangles: rectanglesToUse
        });
        return { width: childMinSize.w, height: childMinSize.h };
      }
      // For other rectangle types, use default leaf size as fallback
      return { 
        width: DEFAULT_RECTANGLE_SIZE.leaf.w, 
        height: DEFAULT_RECTANGLE_SIZE.leaf.h 
      };
    });
    
    // Use the actual child dimensions we calculated above
    const childDimensions = actualChildDimensions;

    // Calculate maximum dimensions needed for grid cell size (for proper spacing)
    const maxChildWidth = Math.max(...childDimensions.map(d => d.width));
    const maxChildHeight = Math.max(...childDimensions.map(d => d.height));

    // Calculate total space needed using max dimensions for grid layout
    // This ensures all children fit within their grid cells
    const totalChildrenWidth = cols * maxChildWidth;
    const totalChildrenHeight = rows * maxChildHeight;

    // Add consistent spacing between children
    const horizontalSpacing = cols > 1 ? (cols - 1) * childSpacing : 0;
    const verticalSpacing = rows > 1 ? (rows - 1) * childSpacing : 0;

    // Calculate minimum required parent size with proper margins
    const minParentWidth = totalChildrenWidth + horizontalSpacing + (sideMargin * 2);
    const minParentHeight = totalChildrenHeight + verticalSpacing + topMargin + sideMargin;

    return {
      w: Math.max(MIN_WIDTH, minParentWidth),
      h: Math.max(MIN_HEIGHT, minParentHeight)
    };
  }
}