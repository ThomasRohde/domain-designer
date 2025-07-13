Looking through this Domain Modeling Tool codebase, I've identified several potential bug fixes that would improve the application's stability and user experience:

## 1. **Fix Race Condition in Auto-Save with Undo/Redo Operations**

**Issue**: In `useRectangleManager.ts`, there's a potential race condition where auto-save might trigger during an undo/redo operation, causing the history state to become inconsistent.

**Location**: `src/hooks/useRectangleManager.ts` and `src/hooks/useAutoSaveManager.ts`

**Fix**:
```typescript
// In useRectangleManager.ts
const setRectanglesWithHistory = useCallback((value: React.SetStateAction<Rectangle[]>) => {
  setRectangles(prev => {
    const newRectangles = typeof value === 'function' ? value(prev) : value;
    
    // Don't save to history or trigger auto-save during undo/redo
    if (!isUndoRedoInProgress.current) {
      history.pushState(newRectangles);
      // Defer auto-save to ensure state consistency
      requestAnimationFrame(() => triggerSave?.());
    }
    
    return newRectangles;
  });
}, [history, triggerSave]);
```

## 2. **Fix Memory Leak in Font Detection**

**Issue**: The font detection cache in `fontDetection.ts` creates canvas elements that aren't properly cleaned up, potentially causing memory leaks during repeated font detection calls.

**Location**: `src/utils/fontDetection.ts`

**Fix**:
```typescript
function isFontAvailableCanvas(fontName: string): boolean {
  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return false;
    }
    
    // ... existing font detection logic ...
    
    return false;
  } catch (error) {
    console.warn(`Error checking font "${fontName}" with canvas method:`, error);
    return false;
  } finally {
    // Clean up canvas to prevent memory leak
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
  }
}
```

## 3. **Fix Hierarchy Drag State Persistence Bug**

**Issue**: When hierarchy dragging is cancelled with ESC key, the visual state doesn't always reset properly, leaving rectangles in their dragged position.

**Location**: `src/hooks/useDragAndResize.ts`

**Fix**:
```typescript
const cancelDrag = useCallback(() => {
  if (dragState) {
    // Reset dragged rectangle to original position
    setRectangles(prev => prev.map(rect => {
      if (rect.id === dragState.id) {
        return { ...rect, x: dragState.initialX, y: dragState.initialY };
      }
      
      // For hierarchy drag, also reset all descendants
      if (dragState.isHierarchyDrag) {
        const draggedRect = prev.find(r => r.id === dragState.id);
        if (draggedRect) {
          const descendantIds = new Set(getAllDescendants(dragState.id, prev));
          if (descendantIds.has(rect.id)) {
            // Calculate original position based on parent's movement delta
            const parentDeltaX = draggedRect.x - dragState.initialX;
            const parentDeltaY = draggedRect.y - dragState.initialY;
            return { 
              ...rect, 
              x: Math.max(0, rect.x - parentDeltaX), 
              y: Math.max(0, rect.y - parentDeltaY) 
            };
          }
        }
      }
      return rect;
    }));
  }
  
  // Clear all drag states
  setDragState(null);
  setResizeState(null);
  setHierarchyDragState(null);
  setResizeConstraintState(null);
  
  // Trigger save after cancel
  triggerSave?.();
}, [dragState, setRectangles, triggerSave]);
```

## 4. **Fix Rectangle Movement Boundary Constraints**

**Issue**: In `moveRectangle` function, rectangles can be moved partially outside their parent's bounds when using arrow keys, violating the containment constraint.

**Location**: `src/hooks/useRectangleManager.ts`

**Fix**:
```typescript
const moveRectangle = useCallback((id: string, deltaXPixels: number, deltaYPixels: number) => {
  const rect = findRectangle(id);
  if (!rect) return;

  // Check movement constraints
  if (rect.parentId) {
    const parent = findRectangle(rect.parentId);
    if (!parent || !parent.isManualPositioningEnabled) {
      return;
    }
  }

  setRectanglesWithHistory(prevRectangles => {
    const descendants = getAllDescendants(id, prevRectangles);
    const idsToMove = new Set([id, ...descendants]);

    // Calculate constraints for the main rectangle
    const mainRect = prevRectangles.find(r => r.id === id);
    if (!mainRect) return prevRectangles;

    let actualDeltaXPixels = deltaXPixels;
    let actualDeltaYPixels = deltaYPixels;

    // Apply parent boundary constraints
    if (mainRect.parentId) {
      const parent = prevRectangles.find(p => p.id === mainRect.parentId);
      if (parent) {
        const { margin, labelMargin } = getMargins();
        const marginPixels = margin * gridSize;
        const labelMarginPixels = labelMargin * gridSize;
        
        const currentXPixels = mainRect.x * gridSize;
        const currentYPixels = mainRect.y * gridSize;
        const rectWPixels = mainRect.w * gridSize;
        const rectHPixels = mainRect.h * gridSize;
        
        // Calculate maximum allowed movement
        const minX = marginPixels;
        const minY = labelMarginPixels;
        const maxX = (parent.w * gridSize) - rectWPixels - marginPixels;
        const maxY = (parent.h * gridSize) - rectHPixels - marginPixels;
        
        const newXPixels = Math.max(minX, Math.min(maxX, currentXPixels + deltaXPixels));
        const newYPixels = Math.max(minY, Math.min(maxY, currentYPixels + deltaYPixels));
        
        actualDeltaXPixels = newXPixels - currentXPixels;
        actualDeltaYPixels = newYPixels - currentYPixels;
      }
    }

    // Apply movement to all rectangles
    return prevRectangles.map(r => {
      if (idsToMove.has(r.id)) {
        const newX = (r.x * gridSize + actualDeltaXPixels) / gridSize;
        const newY = (r.y * gridSize + actualDeltaYPixels) / gridSize;
        return { ...r, x: newX, y: newY };
      }
      return r;
    });
  });
}, [findRectangle, setRectanglesWithHistory, getMargins, gridSize]);
```

## 5. **Fix Zoom Level Persistence in Pan Calculations**

**Issue**: When zooming and panning simultaneously, the pan offset calculations don't properly account for the zoom level, causing the canvas to jump unexpectedly.

**Location**: `src/hooks/useCanvasInteractions.ts` and `src/components/Canvas.tsx`

**Fix**:
```typescript
// In useCanvasInteractions.ts
const handleWheel = (e: WheelEvent) => {
  if (!e.ctrlKey) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const containerRect = container.getBoundingClientRect();
  const mouseX = e.clientX - containerRect.left;
  const mouseY = e.clientY - containerRect.top;
  
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  
  setZoomState(prev => {
    const newLevel = Math.max(prev.minLevel, Math.min(prev.maxLevel, prev.level + delta));
    
    if (newLevel === prev.level) return prev;
    
    // Calculate new pan offset to keep mouse position fixed during zoom
    const scale = newLevel / prev.level;
    
    // Update pan offset to maintain mouse position
    const worldX = (mouseX - panOffset.x) / prev.level;
    const worldY = (mouseY - panOffset.y) / prev.level;
    
    const newPanX = mouseX - worldX * newLevel;
    const newPanY = mouseY - worldY * newLevel;
    
    // Update pan offset
    setPanOffset({ x: newPanX, y: newPanY });
    panOffsetRef.current = { x: newPanX, y: newPanY };
    
    return {
      ...prev,
      level: newLevel,
      centerX: mouseX,
      centerY: mouseY
    };
  });
};
```

These fixes address critical issues that affect data integrity, performance, and user experience. Each fix is focused on a specific problem and provides a clear solution that maintains backward compatibility while improving the application's robustness.