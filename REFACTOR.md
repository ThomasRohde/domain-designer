# HierarchicalDrawingApp Refactoring Plan

## Overview
The `HierarchicalDrawingApp.tsx` component has grown to 735 lines and violates the Single Responsibility Principle. This plan breaks it down into smaller, focused components and custom hooks for better maintainability, testability, and reusability.

## Current Issues
- ❌ 735 lines in a single component
- ❌ 15+ state variables mixed together
- ❌ Multiple responsibilities (UI, state, interactions, business logic)
- ❌ Hard to test individual features
- ❌ Difficult for multiple developers to work on simultaneously

## Refactoring Goals
- ✅ Single Responsibility Principle
- ✅ Improved testability
- ✅ Better code organization
- ✅ Enhanced reusability
- ✅ Easier collaboration

---

## Phase 1: Extract State Management Hooks

### 1.1 Rectangle Management Hook
- [x] Create `src/hooks/useRectangleManager.ts`
- [x] Extract state: `rectangles`, `selectedId`, `nextId`
- [x] Extract functions:
  - [x] `generateId()`
  - [x] `findRectangle(id: string)`
  - [x] `addRectangle(parentId?: string)`
  - [x] `removeRectangle(id: string)`
  - [x] `updateRectangleLabel(id: string, label: string)`
  - [x] `updateRectangleColor(id: string, color: string)`
  - [x] `fitToChildren(id: string)`
  - [x] `getAllDescendantsWrapper(parentId: string)`
- [x] Add proper TypeScript types
- [x] Test the hook

### 1.2 App Settings Hook
- [x] Create `src/hooks/useAppSettings.ts`
- [x] Extract state:
  - [x] `gridSize`
  - [x] `leafFixedWidth`, `leafFixedHeight`
  - [x] `leafWidth`, `leafHeight`
  - [x] `rootFontSize`, `dynamicFontSizing`
- [x] Extract functions:
  - [x] `getFixedDimensions()`
  - [x] `calculateFontSize(rectangleId: string)`
  - [x] `handleLeafFixedWidthChange(enabled: boolean)`
  - [x] `handleLeafFixedHeightChange(enabled: boolean)`
  - [x] `handleLeafWidthChange(width: number)`
  - [x] `handleLeafHeightChange(height: number)`
  - [x] `handleRootFontSizeChange(size: number)`
  - [x] `handleDynamicFontSizingChange(enabled: boolean)`
- [x] Test the hook

### 1.3 UI State Hook
- [x] Create `src/hooks/useUIState.ts`
- [x] Extract state:
  - [x] `sidebarOpen`
  - [x] `contextMenu`
  - [x] `exportModalOpen`
- [x] Extract functions:
  - [x] `toggleSidebar()`
  - [x] `openSidebar()`, `closeSidebar()`
  - [x] `showContextMenu(x: number, y: number, rectangleId: string)`
  - [x] `hideContextMenu()`
  - [x] `openExportModal()`, `closeExportModal()`
- [x] Test the hook

---

## Phase 2: Extract Interaction Hooks

### 2.1 Drag and Resize Hook
- [x] Create `src/hooks/useDragAndResize.ts`
- [x] Extract state: `dragState`, `resizeState`
- [x] Extract functions:
  - [x] `handleMouseDown(e: React.MouseEvent, rect: Rectangle, action: 'drag' | 'resize')`
  - [x] `handleDragMove(e: MouseEvent, containerRect: DOMRect)`
  - [x] `handleResizeMove(e: MouseEvent, containerRect: DOMRect)`
  - [x] `handleMouseUp()`
- [x] Add proper event cleanup
- [x] Test drag and resize operations

### 2.2 Canvas Panning Hook
- [ ] Create `src/hooks/useCanvasPanning.ts`
- [ ] Extract state: `panState`, `panOffset`, `panOffsetRef`, `isSpacePressed`
- [ ] Extract functions:
  - [ ] `handleCanvasMouseDown(e: React.MouseEvent)`
  - [ ] `handlePanMove(e: MouseEvent, containerRect: DOMRect)`
  - [ ] `handleSpaceKeyEvents()`
- [ ] Add keyboard event listeners
- [ ] Test panning functionality

### 2.3 Canvas Interactions Hook (Coordinator)
- [ ] Create `src/hooks/useCanvasInteractions.ts`
- [ ] Combine drag, resize, and pan hooks
- [ ] Handle mouse move coordination
- [ ] Handle mouse up coordination
- [ ] Add global event listeners
- [ ] Test all interactions work together

---

## Phase 3: Extract UI Components

### 3.1 Canvas Component
- [ ] Create `src/components/Canvas.tsx`
- [ ] Extract canvas div with grid background
- [ ] Props interface:
  ```typescript
  interface CanvasProps {
    containerRef: RefObject<HTMLDivElement>;
    gridSize: number;
    panOffset: { x: number; y: number };
    isSpacePressed: boolean;
    panState: PanState | null;
    onMouseDown: (e: React.MouseEvent) => void;
    onSelect: (id: string | null) => void;
    children: React.ReactNode;
  }
  ```
- [ ] Test canvas rendering and interactions

### 3.2 Rectangle Renderer Component
- [ ] Create `src/components/RectangleRenderer.tsx`
- [ ] Extract rectangle mapping logic
- [ ] Props interface:
  ```typescript
  interface RectangleRendererProps {
    rectangles: Rectangle[];
    selectedId: string | null;
    dragState: DragState | null;
    resizeState: ResizeState | null;
    gridSize: number;
    panOffset: { x: number; y: number };
    onMouseDown: (e: React.MouseEvent, rect: Rectangle, action?: 'drag' | 'resize') => void;
    onContextMenu: (e: React.MouseEvent, rectangleId: string) => void;
    onSelect: (id: string) => void;
    onUpdateLabel: (id: string, label: string) => void;
    onAddChild: (parentId: string) => void;
    onRemove: (id: string) => void;
    onFitToChildren: (id: string) => void;
    calculateFontSize: (rectangleId: string) => number;
  }
  ```
- [ ] Test rectangle rendering

### 3.3 Sidebar Component
- [ ] Create `src/components/Sidebar.tsx`
- [ ] Extract entire sidebar structure
- [ ] Props interface:
  ```typescript
  interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
  }
  ```
- [ ] Include mobile overlay logic
- [ ] Test responsive behavior

### 3.4 Property Panel Component
- [ ] Create `src/components/PropertyPanel.tsx`
- [ ] Extract sidebar content logic
- [ ] Props interface:
  ```typescript
  interface PropertyPanelProps {
    selectedId: string | null;
    selectedRectangle: Rectangle | null;
    rectangles: Rectangle[];
    onColorChange: (id: string, color: string) => void;
    appSettings: AppSettings;
    onSettingsChange: (settings: Partial<AppSettings>) => void;
  }
  ```
- [ ] Test property panel switching

### 3.5 Mobile Overlay Component
- [ ] Create `src/components/MobileOverlay.tsx`
- [ ] Extract overlay logic
- [ ] Props interface:
  ```typescript
  interface MobileOverlayProps {
    isVisible: boolean;
    onClick: () => void;
  }
  ```
- [ ] Test mobile overlay

### Phase 3 Integration
- [ ] Update `HierarchicalDrawingApp.tsx` to use new components
- [ ] Verify UI layout and responsiveness
- [ ] Test all component interactions

---

## Phase 4: Extract Business Logic

### 4.1 Rectangle Operations Utility
- [ ] Create `src/utils/rectangleOperations.ts`
- [ ] Extract pure functions:
  - [ ] `createRectangle(id: string, parentId?: string, ...)`
  - [ ] `updateRectangleType(rectangles: Rectangle[], parentId: string)`
  - [ ] `validateRectanglePosition(rect: Rectangle, containerRect: DOMRect)`
  - [ ] `applyFixedDimensions(rect: Rectangle, fixedDimensions: FixedDimensions)`
- [ ] Add comprehensive tests

### 4.2 Canvas Utilities
- [ ] Create `src/utils/canvasUtils.ts`
- [ ] Extract coordinate transformation functions:
  - [ ] `screenToGrid(screenX: number, screenY: number, gridSize: number)`
  - [ ] `gridToScreen(gridX: number, gridY: number, gridSize: number)`
  - [ ] `getViewportBounds(containerRect: DOMRect, panOffset: PanOffset, gridSize: number)`
  - [ ] `calculateOptimalPosition(existing: Rectangle[], containerRect: DOMRect)`
- [ ] Add comprehensive tests

### 4.3 Event Utilities
- [ ] Create `src/utils/eventUtils.ts`
- [ ] Extract event handling helpers:
  - [ ] `getMousePosition(e: MouseEvent, containerRect: DOMRect)`
  - [ ] `isRightClick(e: MouseEvent)`, `isMiddleClick(e: MouseEvent)`
  - [ ] `shouldStartPan(e: MouseEvent, isSpacePressed: boolean)`
- [ ] Add comprehensive tests

### Phase 4 Integration
- [ ] Update hooks to use utility functions
- [ ] Verify all functionality remains intact
- [ ] Test edge cases

---

## Phase 5: Improve Type Safety and API Design

### 5.1 Enhanced Type Definitions
- [ ] Update `src/types/index.ts` with new interfaces:
  ```typescript
  interface AppSettings {
    gridSize: number;
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
    rootFontSize: number;
    dynamicFontSizing: boolean;
  }

  interface FixedDimensions {
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
    leafWidth: number;
    leafHeight: number;
  }

  interface PanOffset {
    x: number;
    y: number;
  }

  interface ViewportBounds {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  ```
- [ ] Add JSDoc comments for all interfaces
- [ ] Export types from a central location

### 5.2 Hook Return Types
- [ ] Define consistent return types for all hooks
- [ ] Use discriminated unions where appropriate
- [ ] Add proper error handling types

### 5.3 Component Prop Validation
- [ ] Add PropTypes or use TypeScript strict mode
- [ ] Validate required props
- [ ] Add default props where appropriate

---

## Phase 6: Finalize and Optimize

### 6.1 Main Component Cleanup
- [ ] Simplify `HierarchicalDrawingApp.tsx` to orchestration only
- [ ] Target: Reduce to ~100-150 lines
- [ ] Focus on:
  - [ ] Hook usage
  - [ ] Component composition
  - [ ] Event coordination
  - [ ] Effect management

### 6.2 Performance Optimization
- [ ] Add React.memo to appropriate components
- [ ] Optimize useCallback dependencies
- [ ] Add useMemo for expensive calculations
- [ ] Profile and optimize re-renders

### 6.3 Testing
- [ ] Unit tests for all hooks
- [ ] Integration tests for component interactions
- [ ] E2E tests for critical user flows
- [ ] Performance tests

### 6.4 Documentation
- [ ] Update component documentation
- [ ] Add hook usage examples
- [ ] Document breaking changes
- [ ] Update README.md

---

## Final File Structure

```
src/
├── components/
│   ├── HierarchicalDrawingApp.tsx (simplified)
│   ├── Canvas.tsx
│   ├── RectangleRenderer.tsx
│   ├── Sidebar.tsx
│   ├── PropertyPanel.tsx
│   ├── MobileOverlay.tsx
│   ├── RectangleComponent.tsx (existing)
│   ├── ColorPalette.tsx (existing)
│   ├── ContextMenu.tsx (existing)
│   ├── Toolbar.tsx (existing)
│   ├── ExportModal.tsx (existing)
│   └── GlobalSettings.tsx (existing)
├── hooks/
│   ├── useRectangleManager.ts
│   ├── useAppSettings.ts
│   ├── useUIState.ts
│   ├── useDragAndResize.ts
│   ├── useCanvasPanning.ts
│   ├── useCanvasInteractions.ts
│   └── useKeyboardShortcuts.ts (existing)
├── utils/
│   ├── rectangleOperations.ts
│   ├── canvasUtils.ts
│   ├── eventUtils.ts
│   ├── constants.ts (existing)
│   ├── exportUtils.ts (existing)
│   └── layoutUtils.ts (existing)
└── types/
    └── index.ts (enhanced)
```

## Success Criteria

- [ ] Main component reduced to <150 lines
- [ ] Each file has a single responsibility
- [ ] All functionality preserved
- [ ] Improved test coverage (>80%)
- [ ] Better TypeScript coverage
- [ ] Performance maintained or improved
- [ ] Easier for new developers to understand

## Migration Strategy

1. **Backward Compatibility**: Each phase maintains full functionality
2. **Incremental Testing**: Test after each phase completion
3. **Feature Flags**: Use feature flags for major changes if needed
4. **Code Reviews**: Review each phase before moving to the next
5. **Documentation**: Update docs as we go, not at the end

## Estimated Timeline

- Phase 1: 2-3 days
- Phase 2: 2-3 days  
- Phase 3: 3-4 days
- Phase 4: 1-2 days
- Phase 5: 1-2 days
- Phase 6: 2-3 days

**Total: 11-17 days**

## Notes

- Each checkbox represents a discrete, testable unit of work
- Phases can be worked on by different developers
- All changes should maintain existing functionality
- Consider pair programming for complex phases
- Regular integration testing is crucial
