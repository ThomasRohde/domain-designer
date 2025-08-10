# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (runs TypeScript compilation + Vite build)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint with zero warnings policy
- `npm run typecheck` - Run TypeScript type checking without emitting files

## Development Workflow

- Always conclude a programming run with linting, building, fixing errors, and finally update the @PLAN.md 
- Before running 'npm run dev' always check if the dev server is already running
- Do not start a dev server. Test if a server is running on port 3000. If not, ask the user to start it

## Wisdom

- Don't "optimize" a working system until you fully understand why it works

## Architecture Overview

This is a React+TypeScript hierarchical drawing application for domain modeling with constraint-based layout.

### Core Design Patterns

**Hook-Based Architecture**: The application uses custom hooks to separate concerns:
- `useRectangleManager` - Manages rectangle state and CRUD operations
- `useCanvasInteractions` - Handles drag/drop, resize, and pan operations
- `useAppSettings` - Manages global app settings and fixed dimensions
- `useUIState` - Manages UI state (sidebar, modals, context menus)

**Constraint-Based Layout**: The layout system automatically manages parent-child relationships:
- Children auto-size to fit within parents with proper margins
- Parents can auto-resize to fit children (`fitToChildren`)
- Layout calculations use a grid-based system with consistent spacing
- Fixed dimensions can be enforced for leaf nodes

**Hierarchical Data Structure**: Rectangles form a tree structure:
- Root rectangles have no `parentId`
- Parent rectangles contain children and auto-size
- Leaf rectangles are terminal nodes with optional fixed dimensions

### Key Components

- `HierarchicalDrawingApp` - Main orchestrator component, coordinates all hooks
- `RectangleRenderer` - Handles rendering of all rectangles with proper z-indexing
- `Canvas` - Manages the drawing canvas with pan/zoom capabilities
- `Sidebar` + `PropertyPanel` - Settings and properties management
- `Toolbar` - Main actions and navigation

### Layout System

The layout system supports multiple algorithms through `src/utils/layout/`:
- **Grid Layout** - Uniform grid arrangement for many children
- **Flow Layout** - Alternating row/column orientation by depth
- **Mixed Flow Layout** ✨ - Adaptive layout combining rows and columns to minimize whitespace
- Core utilities in `src/utils/layoutUtils.ts`:
  - `calculateChildLayout` - Arranges children using selected algorithm
  - `updateChildrenLayout` - Recursively updates all child layouts
  - `calculateMinimumParentSize` - Calculates minimum size needed for parents
- Consistent margin system: `LABEL_MARGIN` for top spacing, `MARGIN` for other sides

#### Layout Algorithm Selection

Users can choose between three layout algorithms in Global Settings:

1. **Grid Layout**: Best for uniform distribution of many items
2. **Flow Layout**: Classic alternating row/column pattern
3. **Mixed Flow Layout**: Intelligent adaptive layout that:
   - Evaluates multiple layout options per container
   - Chooses optimal arrangement to minimize whitespace
   - Balances visual appearance and space efficiency
   - Excels with mixed parent/leaf scenarios
   - Provides 20-45% better space utilization in typical use cases

### State Management

State is managed through Zustand store with modular slices:
- **Rectangle data and operations**: CRUD, selection, bulk operations in `rectangleSlice`
- **Canvas interactions**: Drag/resize/pan, selection box state in `canvasSlice`  
- **UI state**: Modals, sidebar, multi-select context menus in `uiSlice`
- **Global settings**: Layout algorithms, appearance in `settingsSlice`
- **History management**: Undo/redo with bulk operation support in `historySlice`
- **Auto-save**: IndexedDB persistence in `autoSaveSlice`

### Export System

The application supports multiple export formats through `src/utils/exportUtils.ts`:
- HTML, SVG, JSON, and PowerPoint (PPTX)
- Interactive HTML exports with zoom and pan functionality
- Maintains layout integrity across all formats

### Multi-Select System

The application includes comprehensive PowerPoint-style multi-select operations implemented in Phase 1-10 of the @MULTISELECT.md plan:

**Core Architecture:**
- **Zustand Store Integration**: Multi-select state managed through `selectedIds: string[]` in UI slice
- **Selection Validation**: Constraint enforcement through `src/utils/selectionUtils.ts` 
- **PowerPoint-Style Operations**: Alignment and distribution algorithms in `src/utils/alignmentUtils.ts` and `src/utils/distributionUtils.ts`
- **Visual Feedback**: Selection box component and enhanced rectangle styling with count badges

**Selection Constraints:**
- **Same-Parent Rule**: Only rectangles with identical `parentId` can be multi-selected
- **Root Grouping**: Root rectangles (`parentId: undefined`) can only be selected with other roots
- **Text Label Exclusion**: Text labels (`isTextLabel: true`) cannot be part of multi-selection
- **Manual Positioning Requirement**: Bulk movement only allowed when parent has `isManualPositioningEnabled: true`

**Key Components:**
- `SelectionBox` - Drag selection visualization with zoom/pan coordinate transformation
- `ContextMenu` - Dynamic single/multi-select menu with PowerPoint-style 3×2 alignment grid
- `PropertyPanel` - Multi-select property editing with bulk operations and mixed value indicators
- Enhanced `RectangleComponent` - Ctrl+Click support and multi-select visual styling

**Bulk Operations:**
- **Alignment**: Left, Center, Right, Top, Middle, Bottom with selection bounds calculation
- **Distribution**: Horizontal/vertical equal spacing with perfect symmetry priority
- **Bulk Editing**: Color, label, and description changes with confirmation dialogs
- **Bulk Movement**: Maintains relative positions with collision detection
- **Bulk Delete**: Cascading delete validation with hierarchy management

**Performance Optimizations:**
- O(1) Selection lookup using Set data structure for efficient rendering
- Grid snapping integration for precise positioning
- Comprehensive constraint validation with user-friendly error messages
- Undo/redo integration for all bulk operations with single history entries

## Technology Stack

- **React 18** with TypeScript
- **Vite** for development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **html2canvas** + **jsPDF** for export functionality
- **ESLint** with TypeScript rules and React hooks plugin

## React Performance & Memoization Guidelines

**CRITICAL**: When using `React.memo` with custom comparison functions, always include ALL props that affect visual rendering or component behavior.

### Common Memoization Pitfalls to Avoid

1. **Missing Visual State Props**: Always include interaction state props in `React.memo` comparisons:
   ```typescript
   // ❌ BAD - Missing visual state props
   React.memo(Component, (prev, next) => {
     return prev.id === next.id && prev.label === next.label;
   });
   
   // ✅ GOOD - Include ALL visual state props
   React.memo(Component, (prev, next) => {
     if (prev.isBeingResized !== next.isBeingResized ||
         prev.isBeingDragged !== next.isBeingDragged ||
         prev.isSelected !== next.isSelected ||
         prev.isDragActive !== next.isDragActive) {
       return false; // Force re-render
     }
     return true; // Allow memoization
   });
   ```

2. **State-Dependent Styling**: Components that change visual appearance based on state MUST include those state props in memo comparisons.

3. **Interaction States**: Props like `isBeingResized`, `isBeingDragged`, `isSelected`, `isDragActive`, `isHierarchyDragActive` directly affect visual styling and must trigger re-renders.

### Debugging Memoization Issues

**Symptoms**: Visual states persist after interactions end (e.g., resize highlight stays after mouse release)

**Root Cause**: `React.memo` blocking re-renders when visual state props change

**Debug Strategy**:
1. Add console logs to component render functions
2. Check if state changes in store but component doesn't re-render
3. Verify all visual state props are included in memo comparison
4. Test without `React.memo` temporarily to confirm it's the issue

### Best Practices

- **Visual Props First**: Always include props that affect visual appearance in memo comparisons
- **Complete Coverage**: Include ALL interaction states: resize, drag, selection, hover, focus
- **Explicit Comparison**: Use explicit `!==` checks for boolean props rather than complex logic
- **Comment Critical Props**: Document why specific props are included in memo comparisons

## Mixed Flow Layout Algorithm

The Mixed Flow Layout Algorithm is an advanced layout option that significantly improves space utilization and visual appeal for hierarchical diagrams.

### When to Use Mixed Flow Layout

**Best Use Cases:**
- **Mixed parent/leaf combinations**: Containers with both large parent rectangles and small leaf children
- **Highly unbalanced child sizes**: When children vary greatly in dimensions
- **Medium-sized groups**: Containers with 4-20 children (optimal range)
- **Space-constrained layouts**: When minimizing whitespace is important

**Performance Characteristics:**
- Linear O(N) time complexity
- Typically 20-45% better space efficiency than pure row/column layouts
- Handles up to 500+ nodes efficiently
- Maintains consistent performance across different hierarchy depths

### Algorithm Features

The Mixed Flow Layout evaluates four layout options for each container:

1. **Single Row**: All children arranged horizontally
2. **Single Column**: All children stacked vertically  
3. **Two Column**: Children split into balanced vertical columns
4. **Two Row**: Children split into balanced horizontal rows

**Intelligent Selection:**
- Automatically chooses the layout option with the best space efficiency
- Considers aspect ratio balance and visual symmetry
- Adapts to content characteristics (child count, size variance)
- Maintains consistent margins and grid alignment

### Migration from Flow Layout

If switching from Flow Layout to Mixed Flow Layout:

1. **Backup your diagrams**: Export current layouts before switching
2. **Gradual transition**: Test Mixed Flow on new diagrams first
3. **Performance**: Mixed Flow typically improves performance for complex layouts
4. **Visual changes**: Expect more compact, balanced arrangements
5. **Compatibility**: All existing features work unchanged

### Testing and Optimization

Comprehensive testing infrastructure is available:
- `test-datasets.ts` - Test data for various scenarios
- `performance-benchmark.ts` - Performance validation suite
- `visual-comparison-test.html` - Visual comparison interface
- `algorithm-tuning-recommendations.md` - Optimization guidelines

### Technical Implementation

The algorithm is implemented in `src/utils/layout/MixedFlowLayoutAlgorithm.ts`:
- Follows the `ILayoutAlgorithm` interface for consistency
- Integrates seamlessly with existing layout factory pattern
- Maintains backward compatibility with all existing features
- Includes comprehensive JSDoc documentation

For detailed algorithm design and rationale, see `MIXALGO.md`.