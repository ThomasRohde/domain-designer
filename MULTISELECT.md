# 🎯 Multi-Select Features Implementation Plan
## **PowerPoint-Inspired Shape Arrangement with Domain Designer Logic**

---

## **🚀 Implementation Progress**

### **Phase Status Overview**
- **Phase 1**: ✅ **COMPLETED** - Zustand Store Architecture Updates
- **Phase 2**: ✅ **COMPLETED** - Selection Logic & Validation System
- **Phase 3**: ✅ **COMPLETED** - Visual Selection Interface  
- **Phase 4**: ✅ **COMPLETED** - PowerPoint-Style Context Menu
- **Phase 5**: ✅ **COMPLETED** - Alignment & Distribution Algorithms
- **Phase 6**: ⏳ **PENDING** - Bulk Operations with Layout Logic
- **Phase 7**: ⏳ **PENDING** - Property Panel Integration
- **Phase 8**: ⏳ **PENDING** - Keyboard Shortcuts & UX Polish
- **Phase 9**: ⏳ **PENDING** - Component Integration & Testing
- **Phase 10**: ⏳ **PENDING** - Documentation & Polish

### **✅ Completed Deliverables**
- **Full Zustand store integration** with multi-select state management
- **Core validation system** (`src/utils/selectionUtils.ts`) with 8 utility functions
- **Comprehensive test suite** (36 test cases, all passing)
- **Multi-select constraint enforcement** (same-parent, text label exclusion, manual positioning)
- **Bulk operation validation** with detailed error messages
- **Performance-optimized algorithms** with TypeScript type safety
- **Complete store architecture** supporting all planned multi-select operations
- **Visual selection interface** with SelectionBox component and enhanced rectangle styling
- **Ctrl+Click multi-select support** with selection toggle functionality
- **Selection count indicators** and multi-select visual feedback system
- **Canvas integration** with proper zoom/pan coordinate transformations
- **PowerPoint-style context menu** with alignment, distribution, and bulk operations
- **Multi-select context menu detection** with automatic switching between single/multi-select layouts
- **Complete alignment interface** (Left, Center, Right, Top, Middle, Bottom) with proper Lucide React icons
- **Distribution operations** (Horizontal, Vertical) with minimum selection validation (3+ rectangles)
- **Bulk operations integration** (Change Color, Delete Selected) with store action connections
- **PowerPoint-style alignment algorithms** with Left, Center, Right, Top, Middle, Bottom operations
- **Equal spacing distribution algorithms** with boundary preservation and grid snapping
- **Comprehensive test suite** for alignment and distribution utilities (150+ test cases)

### **🎯 Next Priority: Phase 6 - Bulk Operations with Layout Logic**
Ready to implement bulk operations that integrate with the layout constraint system and respect hierarchical rules.

### **📝 Implementation Notes**
**Discovery**: Upon audit, Phase 1 (Zustand Store Architecture) was already completed! The store contains full multi-select support including:
- ✅ Multi-select state management (`selectedIds`, `selectionBoxState`, `bulkOperationInProgress`)
- ✅ Complete bulk operation actions (align, distribute, bulk edit, bulk move, bulk delete)
- ✅ Selection box management and multi-select drag operations
- ✅ Context menu support for multi-select scenarios
- ✅ All required TypeScript interfaces and types

**Phase 1, 2, 3 & 4 Complete**: All foundational phases and PowerPoint-style context menu are now complete, providing a solid foundation for Phase 5 alignment algorithm implementation.

### **⚠️ Implementation Instruction**
**IMPORTANT**: Always finish each phase by updating the progress markers in this file. Mark phases as ✅ **COMPLETED** only when:

1. **All deliverables are implemented and tested**
2. **All quality checks pass:**
   - `npm run typecheck` - Zero TypeScript errors
   - `npm run lint` - Zero ESLint warnings (max-warnings 0 policy)  
   - `npm run build` - Successful production build with optimized assets
3. **Progress documentation updated in this file**

**Quality gates are mandatory** - no phase should be marked complete without passing all checks.

---

## **Project Context & Background**

### About Domain Designer
Domain Designer is a React+TypeScript PWA for creating hierarchical diagrams and domain models. It's built with:
- **Frontend**: React 19, TypeScript 5.8, Vite 7.0, TailwindCSS 4.1
- **State Management**: Zustand with Immer for immutable updates
- **Architecture**: Hook-based with custom layout algorithms (Grid, Flow, Mixed Flow)
- **Storage**: IndexedDB for offline persistence, localStorage for settings
- **Deployment**: GitHub Pages with automated CI/CD
- **PWA Features**: Offline-first, installable, service worker caching

### Current Architecture Overview
```
src/
├── components/           # React components (Canvas, Toolbar, PropertyPanel, etc.)
├── hooks/               # Custom React hooks for business logic
├── stores/              # Zustand store with domain-specific slices
│   ├── slices/         # Modular state slices (UI, Rectangle, Canvas, etc.)
│   └── types.ts        # Store type definitions
├── types/              # Application type definitions
└── utils/              # Pure functions and utilities
    └── layout/         # Pluggable layout algorithm system
```

### Key Existing Features
- **Hierarchical rectangles** with parent-child relationships
- **Three layout algorithms**: Grid, Flow, and Mixed Flow (20-45% better space efficiency)
- **Manual positioning mode** with drag-and-drop when parents are "unlocked"
- **Constraint-based layout** with automatic child sizing and positioning
- **Export formats**: HTML (interactive), SVG, JSON, Mermaid
- **URL-based sharing** of JSON diagrams without data upload
- **Undo/redo system** with bounded history stack
- **Auto-save** to IndexedDB with corruption detection
- **Progressive Web App** with offline support

### Current Limitations Addressed by Multi-Select
1. **Individual operations only**: Users must edit rectangles one at a time
2. **No bulk alignment**: Cannot align multiple rectangles like PowerPoint
3. **No bulk spacing**: Cannot distribute rectangles with equal spacing
4. **Tedious bulk editing**: Changing colors/properties requires individual clicks
5. **No group operations**: Cannot move or delete multiple rectangles together

---

## **Multi-Select Feature Requirements**

### Core Selection Constraints
- **Same-level only**: Multi-select limited to siblings (rectangles with same `parentId`)
- **Root grouping**: Root rectangles (`parentId: undefined`) can only be selected with other roots
- **Text label exclusion**: Text labels (`isTextLabel: true`) cannot be multi-selected
- **Manual positioning respect**: Bulk drag only works when parent has `isManualPositioningEnabled: true`
- **Layout algorithm agnostic**: Must work with Grid, Flow, and Mixed Flow layouts

### User Interaction Requirements
- **Ctrl+Click**: Toggle individual rectangles in/out of selection
- **Drag selection**: Canvas drag creates selection box, selects intersecting rectangles
- **Context menu**: Right-click on selection shows bulk operations menu
- **Property panel**: Shows multi-select state with bulk editing options
- **Keyboard shortcuts**: Ctrl+A (select siblings), Escape (clear), Delete (bulk delete)

### PowerPoint-Style Operations
- **Alignment**: Left, Center, Right, Top, Middle, Bottom (align to selection bounds)
- **Distribution**: Horizontal and Vertical equal spacing between rectangles
- **Bulk editing**: Color, description, and other properties applied to all selected
- **Bulk movement**: Drag entire selection while maintaining relative positions
- **Bulk delete**: Remove all selected rectangles with confirmation

---

## **Current State Management Architecture**

### Zustand Store Structure
The application uses Zustand with multiple domain-specific slices:

```typescript
// Main store composition (src/stores/useAppStore.ts)
interface AppStore {
  // State slices
  rectangles: Rectangle[];
  selectedId: string | null;        // ← Will become selectedIds: string[]
  ui: UIState;
  canvas: CanvasState; 
  settings: GlobalSettings;
  history: HistoryState;
  autoSave: AutoSaveState;
  
  // Action collections
  rectangleActions: RectangleActions;
  uiActions: UIActions;
  canvasActions: CanvasActions;
  // ... other action collections
}
```

### Key Files to Modify
- **`src/stores/slices/uiSlice.ts`**: UI state and modal management
- **`src/stores/slices/rectangleSlice.ts`**: Rectangle CRUD operations
- **`src/stores/slices/canvasSlice.ts`**: Canvas interactions and drag states
- **`src/stores/types.ts`**: TypeScript interfaces for store slices
- **`src/components/HierarchicalDrawingApp.tsx`**: Main app orchestrator

### Current Rectangle Selection Model
```typescript
// Current single-select model (to be extended)
interface Rectangle {
  id: string;
  parentId?: string;
  x: number; y: number; w: number; h: number;
  label: string; color: string;
  type: 'root' | 'parent' | 'leaf' | 'textLabel';
  isManualPositioningEnabled?: boolean;  // ← Key for bulk drag
  // ... other properties
}
```

---

## **Phase 1: Zustand Store Architecture Updates**
> **Status**: ✅ **COMPLETED** - Full store architecture implemented with comprehensive multi-select support

### 1.1 UI Slice Extensions (`src/stores/slices/uiSlice.ts`) ✅ **Completed**
**Context**: Currently manages modals, context menus, and responsive sidebar behavior. Needs multi-select state.

- [x] Add `selectedIds: string[]` to UIState interface (replace single selectedId)
- [x] Add `selectionBoxState` interface for drag selection box tracking
- [x] Add `bulkOperationInProgress: boolean` flag  
- [x] Update context menu to handle multi-select state
- [x] Add selection box event handlers in UI actions
- [x] **BONUS**: Added `showMultiSelectContextMenu()` action for bulk operations

**Current UIState structure**:
```typescript
interface UIState {
  sidebarOpen: boolean;
  leftMenuOpen: boolean;
  contextMenu: ContextMenuState | null;
  exportModalOpen: boolean;
  // ... other modal states
}
```

### 1.2 Store Types Updates (`src/stores/types.ts`) ✅ **Completed**
**Context**: Central type definitions for all store slices. Contains interfaces for state and actions.

- [x] Update UIState interface with new multi-select properties
- [x] Add AlignmentType enum: `'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'`
- [x] Add DistributionDirection type: `'horizontal' | 'vertical'`
- [x] Add SelectionBoxState interface
- [x] Update RectangleActions interface with bulk operation methods
- [x] **BONUS**: Added complete multi-select drag state management

**New types to add**:
```typescript
export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionDirection = 'horizontal' | 'vertical';

export interface SelectionBoxState {
  isActive: boolean;
  startX: number; startY: number;
  currentX: number; currentY: number;
}
```

### 1.3 Rectangle Slice Updates (`src/stores/slices/rectangleSlice.ts`) ✅ **Completed**
**Context**: Core rectangle CRUD operations. Currently uses `updateRectanglesWithHistory()` helper for undo/redo integration.

- [x] Replace `selectedId` with `selectedIds` array in state (maintained both for backward compatibility)
- [x] Add `setSelectedIds(ids: string[])` action
- [x] Add `addToSelection(id: string): boolean` action with validation
- [x] Add `removeFromSelection(id: string)` action
- [x] Add `clearSelection()` action
- [x] Add `toggleSelection(id: string)` action
- [x] Add `bulkUpdateColor(ids: string[], color: string)` action
- [x] Add `bulkDelete(ids: string[])` action
- [x] Add `bulkMove(ids: string[], deltaX: number, deltaY: number): boolean` action
- [x] Add `alignRectangles(ids: string[], type: AlignmentType)` action
- [x] Add `distributeRectangles(ids: string[], direction: DistributionDirection)` action
- [x] **BONUS**: Full integration with validation system and undo/redo

**Current rectangle operations pattern**:
```typescript
// All rectangle updates follow this pattern for undo/redo
const updateRectanglesWithHistory = (
  set: Function, get: Function, 
  updater: (current: Rectangle[]) => Rectangle[]
) => {
  // Update state + trigger history save
};
```

### 1.4 Canvas Slice Updates (`src/stores/slices/canvasSlice.ts`) ✅ **Completed**
**Context**: Manages canvas interactions, drag states, zoom/pan. Currently tracks single rectangle drag operations.

- [x] Add selection box state to CanvasState interface
- [x] Add `multiSelectDragInitialPositions` for bulk drag operations
- [x] Add selection box actions: start, update, end selection
- [x] Add bulk drag state management
- [x] **BONUS**: Added `startMultiSelectDrag()`, `updateMultiSelectDrag()`, `endMultiSelectDrag()` actions

**Current CanvasState includes**:
```typescript
interface CanvasState {
  panOffset: PanOffset;
  dragState: DragState | null;          // ← Single drag
  resizeState: ResizeState | null;
  hierarchyDragState: HierarchyDragState | null;
  // ... other interaction states
}
```

---

## **Phase 2: Selection Logic & Validation**
> **Status**: ✅ **COMPLETED** - Full validation system implemented with comprehensive testing

### Core Validation Requirements
The application has strict hierarchical rules that multi-select must respect:

1. **Hierarchy constraint**: Only rectangles with the same `parentId` can be selected together
2. **Layout system respect**: Operations must work with all three layout algorithms (Grid, Flow, Mixed Flow)  
3. **Manual positioning gates**: Bulk drag only allowed when parent has `isManualPositioningEnabled: true`
4. **Text label restrictions**: Text labels (`isTextLabel: true`) are excluded from multi-select operations

### 2.1 Selection Validation Utils (`src/utils/selectionUtils.ts` - ✅ **Implemented**)
**Context**: New utility file for selection constraint validation. Follows existing utils pattern with pure functions.
- [x] Create `validateSelection(rectangleIds: string[], rectangles: Rectangle[]): boolean`
- [x] Create `canAddToSelection(newId: string, currentSelection: string[], rectangles: Rectangle[]): boolean`
- [x] Create `getSelectionParent(selectedIds: string[], rectangles: Rectangle[]): string | null`
- [x] Create `areAllSameLevelSiblings(rectangleIds: string[], rectangles: Rectangle[]): boolean`
- [x] Create `filterValidSelection(rectangleIds: string[], rectangles: Rectangle[]): string[]`
- [x] Add comprehensive JSDoc documentation for all validation functions
- [x] **BONUS**: Added `canBulkMove()`, `getMinimumSelectionSize()`, and `validateBulkOperation()` utilities

### 2.2 Selection Constraint Rules Implementation ✅ **Completed**
**Context**: These rules maintain the application's hierarchical integrity and layout system constraints.

- [x] Same Parent Rule: Only rectangles with identical `parentId` can be multi-selected
- [x] Root Group Rule: Root rectangles (`parentId: undefined`) can only be selected with other roots  
- [x] Text Label Exclusion: Text labels cannot be part of multi-selection operations
- [x] Minimum Selection Validation: Alignment requires 2+, distribution requires 3+
- [x] Manual Positioning Check: Bulk operations respect parent locking state
- [x] **BONUS**: Added comprehensive unit tests (36 test cases) covering all edge cases

### 2.3 Implementation Details ✅ **Added**
**Files Created**:
- `src/utils/selectionUtils.ts` (248 lines) - Core validation logic with 8 utility functions
- `src/test/selectionUtils.test.ts` (362 lines) - Comprehensive test suite

**Key Functions Implemented**:
- `validateSelection()` - Enforces same-parent and text label constraints
- `canAddToSelection()` - Validates additions to current selection  
- `getSelectionParent()` - Gets common parent for selection context
- `areAllSameLevelSiblings()` - Checks hierarchy constraints
- `filterValidSelection()` - Returns largest valid subset from mixed selection
- `canBulkMove()` - Validates movement permissions based on parent settings
- `validateBulkOperation()` - Comprehensive operation validation with error messages

**Quality Assurance**:
- ✅ All 36 unit tests passing
- ✅ Full TypeScript type safety
- ✅ Lint and build validation passing
- ✅ Extensive JSDoc documentation
- ✅ Performance-optimized algorithms

**Example validation logic**:
```typescript
const validateSelection = (ids: string[], rectangles: Rectangle[]): boolean => {
  const rects = ids.map(id => rectangles.find(r => r.id === id)).filter(Boolean);
  if (rects.length <= 1) return true;
  
  // Check same parent constraint
  const firstParentId = rects[0].parentId;
  return rects.every(rect => rect.parentId === firstParentId);
};
```

---

## **Phase 3: Visual Selection Interface**
> **Status**: ✅ **COMPLETED** - Full visual selection interface implemented with comprehensive styling and interaction support

### Current Visual Architecture
The application uses a Canvas component for rendering rectangles with:
- **Zoom/pan transforms**: All coordinates scaled by zoom level and pan offset
- **Z-index layering**: Rectangles rendered in hierarchy order, UI elements on top
- **Grid overlay**: Optional visual grid for manual positioning aid
- **Selection indicators**: Currently shows single selected rectangle with thicker border

### 3.1 Selection Box Component (`src/components/SelectionBox.tsx` - ✅ **Completed**)
**Context**: New component for drag selection visualization. Must integrate with existing zoom/pan system.
- [x] Create SelectionBox functional component
- [x] Add props interface: startX, startY, currentX, currentY, zoom, panOffset
- [x] Implement dashed rectangle overlay rendering
- [x] Add proper z-index layering (above rectangles, below UI)
- [x] Apply zoom and pan transformations correctly
- [x] Add smooth animation transitions

### 3.2 Rectangle Component Updates (`src/components/RectangleComponent.tsx` - ✅ **Completed**)
**Context**: Individual rectangle rendering. Currently handles single selection styling and click events.

- [x] Update rectangle styling for multi-select state (thicker border, selection color)
- [x] Add Ctrl+Click event handling for selection toggle
- [x] Add visual selection indicators (selection count badge for first selected)
- [x] Update hover states to work with multi-selection
- [x] Ensure proper event propagation for selection operations

**Current styling approach**:
```tsx
// Uses dynamic className based on selection state
<div className={`rectangle ${isSelected ? 'selected' : ''}`}>
  {/* Rectangle content */}
</div>
```

### 3.3 Canvas Component Updates (`src/components/Canvas.tsx` - ✅ **Completed**)
**Context**: Main drawing surface with pan/zoom. Currently handles single rectangle drag and canvas navigation.

- [x] Add drag selection box rendering
- [x] Implement empty canvas drag for selection box creation
- [x] Add hit detection for rectangle intersection with selection box
- [x] Add constraint validation during selection box drag
- [x] Auto-filter invalid rectangles from selection during drag
- [x] Update mouse event handlers for multi-select scenarios

**Current Canvas event flow**:
```tsx
// Mouse events currently handled:
onMouseDown -> start drag/pan/resize
onMouseMove -> update drag/pan/resize  
onMouseUp -> end operation
// New: add selection box logic to this flow
```

### 3.4 Selection Visual Feedback (✅ **Completed**)
**Context**: Application uses TailwindCSS for styling. Current selection uses simple border highlighting.

- [x] Define selection color scheme (primary: #3B82F6, secondary: #93C5FD)
- [x] Add selection state CSS classes
- [x] Implement selection count indicator component  
- [x] Add selection box styling (dashed border, semi-transparent fill)

**Implemented CSS classes**:
```css
.multi-selected { @apply border-blue-500 border-2 shadow-lg; }
.selection-box { @apply border-dashed border-blue-400 bg-blue-100/20 pointer-events-none; }
.selection-count { @apply bg-blue-500 text-white text-xs rounded-full px-2 py-1 font-bold; }
```

### 3.5 Implementation Summary (✅ **Completed**)
**Files Created/Modified**:
- `src/components/SelectionBox.tsx` (67 lines) - New drag selection visualization component
- `src/components/RectangleComponent.tsx` - Enhanced with multi-select styling and Ctrl+Click support
- `src/components/Canvas.tsx` - Integrated SelectionBox rendering with zoom/pan coordination
- `src/components/RectangleRenderer.tsx` - Added multi-select state management and selection handlers
- `src/components/ViewerRectangleRenderer.tsx` - Added multi-select props compatibility
- `src/index.css` - Added visual feedback CSS classes for multi-select operations

**Key Features Delivered**:
- **Visual Selection Interface**: Complete multi-select styling with enhanced borders and shadows
- **Selection Count Badges**: Blue circular indicators showing selection count on multi-selected rectangles
- **Ctrl+Click Support**: Toggle individual rectangles in/out of selection with keyboard modifier
- **Selection Box Component**: Drag selection visualization with proper coordinate transformations
- **Canvas Integration**: SelectionBox rendering integrated with existing zoom/pan system
- **Backward Compatibility**: All existing single-select functionality preserved and enhanced

**Quality Assurance**:
- ✅ **TypeScript**: `npm run typecheck` - Zero compilation errors
- ✅ **ESLint**: `npm run lint` - Zero warnings (max-warnings 0 policy enforced)
- ✅ **Production Build**: `npm run build` - Successful (1726 modules transformed, optimized assets)
- ✅ **PWA Compatibility**: Service worker and manifest generated successfully
- ✅ **CSS Integration**: TailwindCSS 4.1 classes working correctly
- ✅ **Component Integration**: All multi-select components integrated and functional

---

## **Phase 4: PowerPoint-Style Context Menu**
> **Status**: ✅ **COMPLETED** - Full PowerPoint-style context menu implemented with comprehensive multi-select operations

### Current Context Menu Architecture
The application now supports both single-select and multi-select context menus:
- **Single-select**: Rectangle ID header, "Add Child", "Edit Description", "Remove" (original functionality preserved)
- **Multi-select**: "X rectangles selected" header, alignment grid, distribution options, bulk operations
- **Dynamic switching**: Automatically detects multi-select state and shows appropriate menu layout
- **PowerPoint-style layout**: 3x2 grid for alignment options, grouped distribution and bulk operations

### 4.1 Context Menu Component Updates (`src/components/ContextMenu.tsx`) ✅ **Completed**
**Context**: Enhanced to handle both single rectangle and multi-select operations with separate layouts.
- [x] Add multi-select detection in context menu props (`selectedIds?: string[]`)
- [x] Create separate multi-select context menu layout with conditional rendering
- [x] Add alignment group: Left, Center, Right, Top, Middle, Bottom in 3x2 grid layout
- [x] Add distribution group: Distribute Horizontally, Distribute Vertically (min 3 rectangles)
- [x] Add bulk operations group: Change Color, Delete Selected with proper styling
- [x] Update context menu positioning for larger multi-select menu (`min-w-64`)
- [x] Add proper menu item icons using Lucide React (AlignLeft, AlignCenter, etc.)

**PowerPoint-style menu structure**:
```
┌─────────────────────────────┐
│ 3 rectangles selected       │
├─────────────────────────────┤
│ ▢ Align Left    ▢ Align Top │
│ ▢ Align Center  ▢ Align Mid │ 
│ ▢ Align Right   ▢ Align Bot │
├─────────────────────────────┤
│ ↔ Distribute Horizontally   │
│ ↕ Distribute Vertically     │
├─────────────────────────────┤
│ 🎨 Change Color             │
│ 🗑 Delete Selected          │
└─────────────────────────────┘
```

### 4.2 Context Menu Logic Updates ✅ **Completed**
**Context**: Updated HierarchicalDrawingApp to support multi-select context menu triggering and operations.
- [x] Update context menu trigger logic to handle multi-selection (detects if right-clicked rectangle is in multi-selection)
- [x] Add menu item availability logic (distribution only shown for 3+ rectangles)
- [x] Add multi-select operation handlers (`handleAlign`, `handleDistribute`, `handleBulkUpdateColor`, `handleBulkDelete`)
- [x] Update context menu close behavior for bulk operations (auto-close after action)

### 4.3 Implementation Summary ✅ **Completed**
**Files Created/Modified**:
- `src/components/ContextMenu.tsx` - Enhanced with multi-select support and PowerPoint-style layout
- `src/components/HierarchicalDrawingApp.tsx` - Added multi-select context menu handlers and trigger logic

**Key Features Delivered**:
- **Dynamic Context Menu**: Automatically switches between single/multi-select layouts
- **PowerPoint-Style Alignment Grid**: 3x2 button layout for all alignment operations (Left, Center, Right, Top, Middle, Bottom)
- **Distribution Operations**: Horizontal and Vertical distribution with proper validation (3+ rectangles required)
- **Bulk Operations**: Change Color and Delete Selected with immediate action and menu closure
- **Smart Triggering**: Right-click detection checks if clicked rectangle is part of multi-selection
- **Icon Integration**: Proper Lucide React icons for all operations with tooltips
- **Responsive Design**: Larger menu width (`min-w-64`) to accommodate grid layout
- **Backward Compatibility**: All existing single-select functionality preserved

**Quality Assurance**:
- ✅ **TypeScript**: `npm run typecheck` - Zero compilation errors
- ✅ **ESLint**: `npm run lint` - Zero warnings (max-warnings 0 policy enforced)
- ✅ **Production Build**: `npm run build` - Successful (1726 modules transformed, optimized assets)
- ✅ **PWA Compatibility**: Service worker and manifest generated successfully
- ✅ **Icon Compatibility**: Lucide React icons properly imported and displayed

---

## **Phase 5: Alignment & Distribution Algorithms**
> **Status**: ✅ **COMPLETED** - Full PowerPoint-style alignment and distribution algorithms implemented with comprehensive testing

### PowerPoint Alignment Reference
PowerPoint alignment behavior that we're replicating:
- **Left/Right/Top/Bottom**: Align to the extremes of the selection bounding box
- **Center/Middle**: Align to the mathematical center of the selection bounding box
- **Distribute**: Equal spacing between rectangle centers, keeping outermost rectangles fixed
- **Grid snapping**: Final positions snap to the application's grid system

### Integration with Layout System
Must respect Domain Designer's existing constraints:
- **Grid system**: All positions snap to `settings.gridSize` units
- **Margins**: Maintain `settings.margin` and `settings.labelMargin` spacing
- **Layout algorithms**: Work with Grid, Flow, and Mixed Flow layouts
- **Manual positioning**: Only allowed when parent has `isManualPositioningEnabled: true`

### 5.1 Alignment Implementation (`src/utils/alignmentUtils.ts` - ✅ **Completed**)
**Context**: New utility following existing pure function pattern with full grid system integration.
- [x] Create AlignmentType enum and interfaces
- [x] Implement `alignLeft(rectangles: Rectangle[]): Rectangle[]`
- [x] Implement `alignCenter(rectangles: Rectangle[]): Rectangle[]`
- [x] Implement `alignRight(rectangles: Rectangle[]): Rectangle[]`
- [x] Implement `alignTop(rectangles: Rectangle[]): Rectangle[]`
- [x] Implement `alignMiddle(rectangles: Rectangle[]): Rectangle[]`
- [x] Implement `alignBottom(rectangles: Rectangle[]): Rectangle[]`
- [x] Add grid snapping integration for aligned positions
- [x] Add master `alignRectangles()` function with unified interface
- [x] Add `canAlign()` validation and `getAlignmentDescription()` utility functions

### 5.2 Distribution Implementation (`src/utils/distributionUtils.ts` - ✅ **Completed**)
- [x] Create distribution interfaces and types
- [x] Implement `distributeHorizontally(rectangles: Rectangle[]): Rectangle[]` with perfect symmetry priority
- [x] Implement `distributeVertically(rectangles: Rectangle[]): Rectangle[]` with perfect symmetry priority
- [x] Add perfect equal spacing calculation algorithms (symmetry paramount)
- [x] Maintain original rectangle ordering during distribution
- [x] Allow boundary rectangle adjustment to achieve perfect grid-aligned spacing
- [x] Integrate with grid system for precise positioning with symmetric distribution
- [x] Add master `distributeRectangles()` function with unified interface
- [x] Add `canDistribute()`, `calculateCurrentSpacing()`, and `areEvenlyDistributed()` utilities
- [x] **CRITICAL**: Completely rewritten algorithm prioritizing perfect symmetry over boundary preservation

### 5.3 PowerPoint-Style Logic ✅ **Completed**
**Context**: Exact replication of PowerPoint's shape arrangement behavior for user familiarity.

- [x] Implement boundary-based alignment (align to selection extremes)
- [x] Add center-based alignment (mathematical center of selection)
- [x] Add equal spacing distribution (calculate gaps between centers)
- [x] Respect original ordering in distribution operations
- [x] Add comprehensive unit tests for alignment algorithms (80+ test cases)
- [x] Add comprehensive unit tests for distribution algorithms (70+ test cases)

### 5.4 Implementation Summary ✅ **Completed**
**Files Created**:
- `src/utils/alignmentUtils.ts` (176 lines) - PowerPoint-style alignment algorithms with grid snapping
- `src/utils/distributionUtils.ts` (224 lines) - Equal spacing distribution with boundary preservation
- `src/test/alignmentUtils.test.ts` (434 lines) - Comprehensive alignment algorithm test suite
- `src/test/distributionUtils.test.ts` (477 lines) - Comprehensive distribution algorithm test suite

**Key Features Delivered**:
- **PowerPoint-Style Alignment**: Complete implementation of Left, Center, Right, Top, Middle, Bottom alignment
- **Equal Spacing Distribution**: Horizontal and vertical distribution with boundary rectangle preservation and corrected spacing algorithm
- **Grid System Integration**: All operations snap to application's grid system for precise positioning
- **Algorithm Validation**: Comprehensive validation functions with user-friendly error messages
- **Utility Functions**: Helper functions for spacing calculation, distribution detection, and operation descriptions
- **Comprehensive Testing**: 150+ test cases covering edge cases, grid snapping, and property preservation
- **Perfect Symmetric Distribution**: Completely rewritten algorithm that prioritizes absolute symmetry over boundary preservation
- **Grid-Aligned Equal Spacing**: Creates perfectly equal spacing between rectangles with grid-aligned spacing values

**Quality Assurance**:
- ✅ **TypeScript**: `npm run typecheck` - Zero compilation errors
- ✅ **ESLint**: `npm run lint` - Zero warnings (max-warnings 0 policy enforced)
- ✅ **Production Build**: `npm run build` - Successful (1726 modules transformed, optimized assets)
- ✅ **PWA Compatibility**: Service worker and manifest generated successfully
- ✅ **Test Coverage**: All algorithms tested with edge cases, grid snapping, and error handling
- ✅ **Code Quality**: Full JSDoc documentation and consistent naming conventions
- ✅ **Critical Fix**: Distribution algorithm completely rewritten to ensure perfect symmetric spacing (symmetry paramount)
- ✅ **PowerPoint Behavior**: True equal spacing achieved by allowing slight boundary rectangle adjustment

**PowerPoint alignment formulas**:
```typescript
// Left align: all rectangles align to leftmost x position
const leftmostX = Math.min(...rectangles.map(r => r.x));

// Center align: all rectangles align to average center x position  
const avgCenterX = rectangles.reduce((sum, r) => sum + r.x + r.w/2, 0) / rectangles.length;

// Distribute: equal spacing between centers, fix outermost
const spacing = (rightmostCenter - leftmostCenter) / (rectangles.length - 1);
```

---

## **Phase 6: Bulk Operations with Layout Logic**

### Layout Constraint System Integration
Domain Designer has a sophisticated constraint system that multi-select must respect:

1. **Manual positioning locks**: Parents with `isManualPositioningEnabled: false` have locked layouts
2. **Automatic layout updates**: Changes trigger layout recalculation via `updateChildrenLayout()`
3. **Layout algorithms**: Grid, Flow, and Mixed Flow each have different constraint behaviors
4. **Hierarchy preservation**: Operations cannot create orphaned children or circular references

### 6.1 Bulk Movement Implementation
**Context**: Must integrate with existing drag system and respect manual positioning constraints.
- [ ] Create `canBulkMove(selectedIds: string[], rectangles: Rectangle[]): boolean`
- [ ] Implement parent manual positioning validation
- [ ] Add collision detection for bulk movement
- [ ] Implement relative position preservation during bulk drag
- [ ] Add grid snapping for bulk movement operations
- [ ] Integrate with existing drag system

### 6.2 Layout Constraint Integration
- [ ] Validate auto-layout respect (operations only when parent unlocked)
- [ ] Ensure hierarchy preservation in bulk operations
- [ ] Add collision avoidance algorithms
- [ ] Implement constraint violation feedback to users
- [ ] Add layout recalculation triggers after bulk operations

### 6.3 Bulk Delete Implementation
- [ ] Add cascading delete validation (prevent orphaned children)
- [ ] Implement confirmation dialog for bulk delete operations
- [ ] Add undo support for bulk delete
- [ ] Update selection state after bulk delete
- [ ] Add progress feedback for large bulk delete operations

---

## **Phase 7: Property Panel Integration**

### 7.1 Multi-Select Property Display (`src/components/PropertyPanel.tsx`)
- [ ] Add multi-select detection logic
- [ ] Display "Multiple Selected (X rectangles)" header
- [ ] Implement bulk color picker with immediate application
- [ ] Add bulk description editor with append/replace options
- [ ] Disable fields that cannot be bulk-edited
- [ ] Add visual indicators for mixed values in selection

### 7.2 Bulk Edit Confirmations
- [ ] Create confirmation dialog component for bulk operations
- [ ] Add "Apply same label to X rectangles?" confirmation
- [ ] Implement description change options (append/replace)
- [ ] Add bulk operation progress indicators
- [ ] Add validation feedback for bulk edit operations

### 7.3 Property Panel UX Enhancements
- [ ] Show property value consistency indicators (all same/mixed values)
- [ ] Add bulk operation shortcuts in property panel
- [ ] Implement property panel state management for multi-select
- [ ] Add accessibility support for bulk edit operations

---

## **Phase 8: Keyboard Shortcuts & UX Polish**

### 8.1 Keyboard Integration (`src/hooks/useKeyboardShortcuts.ts`)
- [ ] Add `Ctrl+A` for select all siblings of current rectangle
- [ ] Add `Escape` for clear selection
- [ ] Add `Delete` for bulk delete with confirmation
- [ ] Add arrow keys for bulk movement (when parent allows)
- [ ] Update existing shortcuts to work with multi-selection
- [ ] Add keyboard shortcut help documentation

### 8.2 Visual Feedback Enhancements
- [ ] Implement selection hierarchy indicators (primary vs secondary)
- [ ] Add alignment guide previews before applying operations
- [ ] Create progress feedback components for bulk operations
- [ ] Add operation success/failure notifications
- [ ] Implement smooth transitions for bulk operations

### 8.3 Undo/Redo Integration
- [ ] Ensure all bulk operations create single history entries
- [ ] Add bulk operation descriptions in undo/redo history
- [ ] Test undo/redo with complex multi-select scenarios
- [ ] Add history compression for rapid bulk operations

### 8.4 Performance Optimizations
- [ ] Implement efficient selection state updates
- [ ] Add memoization for selection validation calculations
- [ ] Optimize rendering for large multi-selections
- [ ] Add performance monitoring for bulk operations
- [ ] Implement lazy loading for selection box hit detection

---

## **Phase 9: Component Integration & Testing**

### 9.1 Main App Integration (`src/components/HierarchicalDrawingApp.tsx`)
**Context**: Main orchestrator component that coordinates all hooks and components. Currently handles single-select with `selectedId`.

- [ ] Update app component to use new multi-select store state
- [ ] Replace single selection handling with multi-select logic
- [ ] Update event handlers for multi-select operations
- [ ] Add multi-select keyboard shortcut integration
- [ ] Test integration with existing features (export, templates, etc.)

**Current app structure**:
```tsx
const HierarchicalDrawingApp = () => {
  const selectedId = useAppStore(state => state.selectedId);  // ← becomes selectedIds
  const rectangles = useAppStore(state => state.rectangles);
  // ... other hooks and state
  
  return (
    <div>
      <Canvas />
      <Sidebar />
      <PropertyPanel />
      {/* ... other components */}
    </div>
  );
};
```

### 9.2 Event Handler Updates
- [ ] Update rectangle click handlers for multi-select
- [ ] Update context menu handlers for bulk operations
- [ ] Update keyboard event handlers for multi-select shortcuts
- [ ] Add proper event propagation for selection operations
- [ ] Test event handling edge cases

### 9.3 Error Handling & Validation
- [ ] Add comprehensive error handling for bulk operations
- [ ] Implement graceful degradation for invalid selections
- [ ] Add user feedback for constraint violations
- [ ] Create error boundary components for multi-select operations
- [ ] Add logging for debugging multi-select issues

---

## **Phase 10: Documentation & Polish**

### 10.1 User Documentation Updates
- [ ] Update README.md with multi-select feature documentation
- [ ] Add multi-select keyboard shortcuts to help modal
- [ ] Create visual guides for alignment and distribution operations
- [ ] Document multi-select constraints and limitations
- [ ] Add troubleshooting section for multi-select issues

### 10.2 Code Documentation
- [ ] Add comprehensive JSDoc comments for all new functions
- [ ] Update CLAUDE.md with multi-select implementation details
- [ ] Create inline code comments for complex selection logic
- [ ] Document multi-select state management patterns
- [ ] Add performance optimization notes

### 10.3 Final Testing & QA
- [ ] Test multi-select with all layout algorithms
- [ ] Test multi-select with manual positioning enabled/disabled
- [ ] Test multi-select with nested hierarchies
- [ ] Test multi-select with text labels and mixed selections
- [ ] Test multi-select performance with large numbers of rectangles
- [ ] Test multi-select accessibility features
- [ ] Test multi-select with undo/redo operations
- [ ] Test multi-select export functionality
- [ ] Test multi-select on mobile/tablet devices
- [ ] Perform comprehensive regression testing

---

## **Success Criteria**

✅ **Intuitive Selection**: Ctrl+click and drag selection work seamlessly  
✅ **PowerPoint Familiarity**: Alignment and distribution match PowerPoint behavior  
✅ **Layout System Integration**: All operations respect existing constraints  
✅ **Visual Feedback**: Clear selection indicators and operation previews  
✅ **Performance**: Smooth operation with hundreds of rectangles  
✅ **Accessibility**: Full keyboard navigation and screen reader support  
✅ **Undo/Redo**: All bulk operations properly integrated with history  
✅ **Mobile Support**: Touch-friendly selection on tablets and phones  

---

## **Technical Constraints & Notes**

- **Same-Level Selection Only**: Multi-select limited to siblings (same parent)
- **Manual Positioning Respect**: Bulk operations only when parent allows
- **Grid System Integration**: All operations snap to existing grid
- **Layout Algorithm Agnostic**: Works with Grid, Flow, and Mixed Flow layouts  
- **Backward Compatibility**: Existing single-select workflows unchanged
- **PWA Compliance**: All features work offline and in browser-only environment

---

## **Implementation Timeline Estimate**

### Development Phases
- **Phase 1-2**: Store architecture and validation logic (1-2 weeks)
- **Phase 3-4**: Visual interface and context menu (1-2 weeks)  
- **Phase 5-6**: Alignment algorithms and bulk operations (2-3 weeks)
- **Phase 7-8**: Property panel and UX polish (1-2 weeks)
- **Phase 9-10**: Integration, testing, and documentation (1-2 weeks)

**Total Estimated Timeline: 6-11 weeks** (depending on complexity and testing depth)

### Implementation Priority Order *(Updated)*
1. ✅ **Phase 1**: Zustand store architecture - **COMPLETED** (discovered already implemented)
2. ✅ **Phase 2**: Selection validation ensures constraints are respected - **COMPLETED**
3. ✅ **Phase 3**: Visual feedback provides immediate user value - **COMPLETED**
4. 🎯 **Phase 4**: Context menu for bulk operations - **NEXT PRIORITY**
5. **Phase 5**: Alignment and distribution algorithms - **READY FOR IMPLEMENTATION**
6. **Phases 6-8**: Bulk operations and polish complete the feature set
7. **Phases 9-10**: Integration and testing ensure production readiness

### Key Milestones *(Updated)*
- ✅ **Week 1**: Phase 1 & 2 complete - Store architecture and validation system ready
- ✅ **Week 2**: Visual selection interface working (Phase 3) - **COMPLETED**
- **Week 3**: Context menu and alignment algorithms (Phases 4-5)
- **Week 4**: Bulk operations and property panel integration (Phases 6-7)
- **Week 5**: UX polish and keyboard shortcuts (Phase 8)
- **Week 6**: Integration, testing and documentation (Phases 9-10)

---

## **Getting Started**

### Prerequisites for Implementation
- Familiarity with Zustand store patterns used in the application
- Understanding of the existing layout algorithm system
- Knowledge of React event handling and Canvas API
- Experience with TypeScript interfaces and type safety

### First Steps
1. **Review existing store architecture** in `src/stores/`
2. **Understand current selection system** in Rectangle slice
3. **Examine layout constraint system** in `src/utils/layout/`
4. **Study PowerPoint alignment behavior** for reference implementation
5. **Set up development environment** with Domain Designer running locally

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production  
npm run lint     # Run ESLint with zero warnings (required for phase completion)
npm run typecheck # Run TypeScript validation (required for phase completion)
```

### Quality Gate Workflow
**Before marking any phase as complete, run the complete quality validation:**
```bash
npm run typecheck && npm run lint && npm run build
```
All three commands must pass without errors or warnings.

This plan provides a comprehensive roadmap for implementing PowerPoint-style multi-select features while respecting Domain Designer's existing architecture and constraints.