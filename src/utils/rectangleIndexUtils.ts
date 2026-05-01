import type { DragState, HierarchyDragState, Rectangle, ResizeState } from '../types';

export interface RectangleRenderIndex {
  rectById: Map<string, Rectangle>;
  childrenByParentId: Map<string | undefined, Rectangle[]>;
  childCountById: Map<string, number>;
  depthById: Map<string, number>;
  descendantsById: Map<string, string[]>;
  hasLockedAncestorById: Map<string, boolean>;
  sortedByDepth: Rectangle[];
}

const getNumericId = (id: string): number => {
  const match = id.match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
};

const calculateDepth = (rect: Rectangle, rectById: Map<string, Rectangle>): number => {
  let depth = 0;
  let current: Rectangle | undefined = rect;
  const visited = new Set<string>();

  while (current?.parentId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    depth++;
    current = rectById.get(current.parentId);
    if (!current || depth > 10) break;
  }

  return depth;
};

const calculateDescendants = (
  parentId: string,
  childrenByParentId: Map<string | undefined, Rectangle[]>
): string[] => {
  const descendants: string[] = [];
  const visited = new Set<string>();

  const visit = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    for (const child of childrenByParentId.get(currentId) ?? []) {
      descendants.push(child.id);
      visit(child.id);
    }
  };

  visit(parentId);
  return descendants;
};

const calculateHasLockedAncestor = (rect: Rectangle, rectById: Map<string, Rectangle>): boolean => {
  let current: Rectangle | undefined = rect;
  const visited = new Set<string>();

  while (current?.parentId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);

    const parent = rectById.get(current.parentId);
    if (!parent) break;
    if (parent.isLockedAsIs) return true;
    current = parent;
  }

  return false;
};

export const buildRectangleRenderIndex = (rectangles: Rectangle[]): RectangleRenderIndex => {
  const rectById = new Map<string, Rectangle>();
  const childrenByParentId = new Map<string | undefined, Rectangle[]>();
  const childCountById = new Map<string, number>();
  const depthById = new Map<string, number>();
  const descendantsById = new Map<string, string[]>();
  const hasLockedAncestorById = new Map<string, boolean>();

  rectangles.forEach(rect => {
    rectById.set(rect.id, rect);
    childCountById.set(rect.id, 0);
  });

  rectangles.forEach(rect => {
    const siblings = childrenByParentId.get(rect.parentId) ?? [];
    siblings.push(rect);
    childrenByParentId.set(rect.parentId, siblings);

    if (rect.parentId) {
      childCountById.set(rect.parentId, (childCountById.get(rect.parentId) ?? 0) + 1);
    }
  });

  rectangles.forEach(rect => {
    depthById.set(rect.id, calculateDepth(rect, rectById));
    descendantsById.set(rect.id, calculateDescendants(rect.id, childrenByParentId));
    hasLockedAncestorById.set(rect.id, calculateHasLockedAncestor(rect, rectById));
  });

  const sortedByDepth = [...rectangles].sort((a, b) => {
    const depthA = depthById.get(a.id) ?? 0;
    const depthB = depthById.get(b.id) ?? 0;

    if (depthA !== depthB) {
      return depthB - depthA;
    }

    return getNumericId(a.id) - getNumericId(b.id);
  });

  return {
    rectById,
    childrenByParentId,
    childCountById,
    depthById,
    descendantsById,
    hasLockedAncestorById,
    sortedByDepth,
  };
};

export const getIndexedChildren = (
  index: RectangleRenderIndex,
  parentId: string | undefined
): Rectangle[] => {
  return index.childrenByParentId.get(parentId) ?? [];
};

export const getIndexedZIndex = (
  rect: Rectangle,
  index: RectangleRenderIndex,
  selectedId: string | null,
  dragState: DragState | null,
  resizeState: ResizeState | null,
  hierarchyDragState?: HierarchyDragState | null
): number => {
  const depth = index.depthById.get(rect.id) ?? 0;
  const baseZ = 10 + depth * 10;

  if (dragState || hierarchyDragState) {
    const draggedId = dragState?.id || hierarchyDragState?.draggedRectangleId;
    if (draggedId) {
      const isDraggedRect = rect.id === draggedId;
      const isDescendantOfDragged = index.descendantsById.get(draggedId)?.includes(rect.id) ?? false;

      if (isDraggedRect || isDescendantOfDragged) {
        return 1000 + depth;
      }
    }
  }

  if (resizeState && rect.id === resizeState.id) {
    return 900 + depth;
  }

  let selectedBoost = 0;
  if (selectedId === rect.id && !dragState && !resizeState) {
    selectedBoost = (index.childCountById.get(rect.id) ?? 0) > 0 ? 5 : 100;
  }

  return baseZ + selectedBoost;
};

export const calculateIndexedFontSize = (
  rectangleId: string,
  index: RectangleRenderIndex,
  rootFontSize: number,
  dynamicFontSizing: boolean
): number => {
  if (!dynamicFontSizing) return rootFontSize;

  const depth = index.depthById.get(rectangleId) ?? 0;
  return Math.max(rootFontSize * Math.pow(0.9, depth), rootFontSize * 0.6);
};

export const getRectanglePath = (
  rectangleId: string,
  index: RectangleRenderIndex
): Rectangle[] => {
  const path: Rectangle[] = [];
  const visited = new Set<string>();
  let current = index.rectById.get(rectangleId);

  while (current && !visited.has(current.id)) {
    path.unshift(current);
    visited.add(current.id);
    current = current.parentId ? index.rectById.get(current.parentId) : undefined;
  }

  return path;
};
