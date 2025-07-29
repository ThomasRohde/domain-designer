import { Rectangle, RectangleType } from '../types';
import { DEFAULT_COLORS, DEFAULT_RECTANGLE_SIZE, MIN_WIDTH, MIN_HEIGHT } from './constants';
import { getChildren } from './layoutUtils';

/**
 * Fixed dimensions interface for rectangle operations
 */
export interface FixedDimensions {
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
}

/**
 * Create a new rectangle with proper defaults
 */
export const createRectangle = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  parentId?: string,
  label?: string,
  isTextLabel?: boolean
): Rectangle => {
  const type: RectangleType = isTextLabel ? 'textLabel' : (parentId ? 'leaf' : 'root');
  const defaultColor = DEFAULT_COLORS[type] || DEFAULT_COLORS['leaf'];
  
  return {
    id,
    parentId,
    x,
    y,
    w: Math.max(MIN_WIDTH, w),
    h: Math.max(MIN_HEIGHT, h),
    label: label || (isTextLabel ? `Text Label ${id}` : `Rectangle ${id}`),
    color: defaultColor,
    type,
    isEditing: false,
    isLockedAsIs: false,
    isTextLabel,
    textFontFamily: isTextLabel ? 'Arial, sans-serif' : undefined,
    textFontSize: isTextLabel ? 14 : undefined,
    fontWeight: isTextLabel ? 'normal' : undefined,
    textAlign: isTextLabel ? 'center' : undefined
  };
};

/**
 * Update rectangle type based on its parent-child relationships
 */
export const updateRectangleType = (
  rectangles: Rectangle[],
  rectangleId: string
): Rectangle[] => {
  return rectangles.map(rect => {
    if (rect.id === rectangleId) {
      // Don't change type for text labels
      if (rect.isTextLabel) {
        return rect;
      }
      
      const hasChildren = getChildren(rect.id, rectangles).length > 0;
      const hasParent = rect.parentId !== undefined;
      
      let newType: RectangleType;
      if (!hasParent) {
        newType = 'root';
      } else if (hasChildren) {
        newType = 'parent';
      } else {
        newType = 'leaf';
      }
      
      return {
        ...rect,
        type: newType
      };
    }
    return rect;
  });
};

/**
 * Validate rectangle position within container bounds
 */
export const validateRectanglePosition = (
  rect: Rectangle,
  containerRect: DOMRect,
  panOffset: { x: number; y: number },
  gridSize: number
): { x: number; y: number } => {
  // Convert screen coordinates to grid coordinates
  const minX = Math.floor((0 - panOffset.x) / gridSize);
  const minY = Math.floor((0 - panOffset.y) / gridSize);
  const maxX = Math.floor((containerRect.width - panOffset.x) / gridSize) - rect.w;
  const maxY = Math.floor((containerRect.height - panOffset.y) / gridSize) - rect.h;
  
  return {
    x: Math.max(minX, Math.min(maxX, rect.x)),
    y: Math.max(minY, Math.min(maxY, rect.y))
  };
};

/**
 * Apply fixed dimensions to a rectangle based on settings
 */
export const applyFixedDimensions = (
  rect: Rectangle,
  fixedDimensions: FixedDimensions
): Rectangle => {
  if (rect.type !== 'leaf') {
    return rect;
  }
  
  let newW = rect.w;
  let newH = rect.h;
  
  if (fixedDimensions.leafFixedWidth) {
    newW = fixedDimensions.leafWidth;
  }
  
  if (fixedDimensions.leafFixedHeight) {
    newH = fixedDimensions.leafHeight;
  }
  
  return {
    ...rect,
    w: Math.max(MIN_WIDTH, newW),
    h: Math.max(MIN_HEIGHT, newH)
  };
};

/**
 * Get default size for a rectangle based on its type
 */
export const getDefaultRectangleSize = (type: RectangleType): { w: number; h: number } => {
  return DEFAULT_RECTANGLE_SIZE[type];
};

/**
 * Update all rectangle types in a collection based on their relationships
 */
export const updateAllRectangleTypes = (rectangles: Rectangle[]): Rectangle[] => {
  let updated = [...rectangles];
  
  // Update each rectangle's type based on its relationships
  for (const rect of rectangles) {
    updated = updateRectangleType(updated, rect.id);
  }
  
  return updated;
};

/**
 * Clone a rectangle with a new ID
 */
export const cloneRectangle = (
  rect: Rectangle,
  newId: string,
  offsetX: number = 0,
  offsetY: number = 0
): Rectangle => {
  return {
    ...rect,
    id: newId,
    x: rect.x + offsetX,
    y: rect.y + offsetY,
    label: `${rect.label} (Copy)`,
    isEditing: false
  };
};

/**
 * Check if a rectangle can be moved to a new parent
 */
export const canMoveToParent = (
  rectangleId: string,
  newParentId: string | undefined,
  rectangles: Rectangle[]
): boolean => {
  // Can't move to self
  if (rectangleId === newParentId) {
    return false;
  }
  
  // Can't move to own descendant
  if (newParentId) {
    const rect = rectangles.find(r => r.id === rectangleId);
    if (!rect) return false;
    
    const isDescendant = (parentId: string, targetId: string): boolean => {
      const children = getChildren(parentId, rectangles);
      return children.some(child => 
        child.id === targetId || isDescendant(child.id, targetId)
      );
    };
    
    if (isDescendant(rectangleId, newParentId)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Get rectangle bounds including all descendants
 */
export const getRectangleBounds = (
  rectangleId: string,
  rectangles: Rectangle[]
): { x: number; y: number; w: number; h: number } => {
  const rect = rectangles.find(r => r.id === rectangleId);
  if (!rect) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  
  const children = getChildren(rectangleId, rectangles);
  if (children.length === 0) {
    return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  }
  
  let minX = rect.x;
  let minY = rect.y;
  let maxX = rect.x + rect.w;
  let maxY = rect.y + rect.h;
  
  for (const child of children) {
    const childBounds = getRectangleBounds(child.id, rectangles);
    minX = Math.min(minX, childBounds.x);
    minY = Math.min(minY, childBounds.y);
    maxX = Math.max(maxX, childBounds.x + childBounds.w);
    maxY = Math.max(maxY, childBounds.y + childBounds.h);
  }
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
};