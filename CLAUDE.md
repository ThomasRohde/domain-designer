# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production (TypeScript compilation + Vite build)
npm run preview      # Preview production build locally
npm run typecheck    # Run TypeScript type checking without emitting files
npm run lint         # Run ESLint with TypeScript support
```

### Development Workflow
- Always run `npm run typecheck` before committing changes
- Use `npm run lint` to catch potential issues and enforce code style
- The build process requires both TypeScript compilation and Vite bundling to succeed

## Architecture Overview

### Core Data Flow
The application centers around a **constraint-based hierarchical rectangle system**:

1. **Rectangle Hierarchy**: Root → Parent → Leaf rectangles with automatic layout
2. **Constraint Engine**: Child rectangles auto-size to fit within parents with margins
3. **State Management**: Centralized in `HierarchicalDrawingApp` with history tracking
4. **Export Pipeline**: Multi-format export via `html2canvas`, SVG generation, and jsPDF

### Key Architecture Patterns

#### Rectangle Management System
- **Grid-based positioning**: All coordinates are multiples of `GRID_SIZE` (20px)
- **Auto-layout algorithm**: Children are arranged in a grid pattern within parents
- **Z-index hierarchy**: Deeper nested rectangles have higher z-index values
- **Type classification**: `root` (draggable), `parent` (resizable), `leaf` (fixed size)

#### State Management Strategy
```typescript
// Central state in HierarchicalDrawingApp.tsx
const [rectangles, setRectangles] = useState<Rectangle[]>([]);
const [history, setHistory] = useState<Rectangle[][]>([]);  // Undo/redo
const [dragState, setDragState] = useState<DragState | null>(null);
const [resizeState, setResizeState] = useState<ResizeState | null>(null);
```

#### Category System
9 predefined enterprise domain categories in `CATEGORY_CONFIGS`:
- Each category has: `name`, `backgroundColor`, `borderColor`, `textColor`, `icon`
- Categories map to business domains (Channels, Business Support, Risk Management, etc.)
- Visual styling is driven by category configuration

#### Constraint Resolution
The layout engine processes rectangles level-by-level:
1. **Process parent positioning first** (roots don't move)
2. **Calculate available space** within each parent
3. **Apply grid packing algorithm** for child placement
4. **Enforce minimum sizes** and margin constraints
5. **Update z-index hierarchy** based on nesting depth

### Component Architecture

#### Core Components
- **`HierarchicalDrawingApp`**: Main state container and coordination logic
- **`RectangleComponent`**: Individual rectangle rendering with edit capabilities
- **`Toolbar`**: Action commands (add, save, load, export, undo/redo)
- **`CategorySelector`**: Visual category picker with live preview
- **`ContextMenu`**: Right-click operations context-sensitive to rectangle type
- **`ExportModal`**: Multi-format export configuration

#### Export System
Multi-format export pipeline in `utils/exportUtils.ts`:
- **PNG/PDF**: Uses `html2canvas` to capture DOM elements
- **SVG**: Programmatic SVG generation from rectangle data
- **JSON**: Serialized diagram state with metadata

### Critical Constants and Configuration

#### Layout Constants (`utils/constants.ts`)
```typescript
GRID_SIZE = 20          // Base grid unit for all positioning
MARGIN = 2              // Grid units between parent and child
MIN_WIDTH = 3           // Minimum rectangle width in grid units  
MIN_HEIGHT = 3          // Minimum rectangle height in grid units
MAX_HISTORY_SIZE = 50   // Undo/redo history limit
```

#### Type System (`types/index.ts`)
The `Rectangle` interface is central to all operations:
- **Positioning**: `x`, `y`, `w`, `h` (all in grid units)
- **Hierarchy**: `parentId` links create the tree structure
- **Categorization**: `category` determines visual styling
- **Type**: `'root' | 'parent' | 'leaf'` controls behavior

### Key Behavioral Rules

#### Interaction Model
- **Root rectangles**: Can be dragged and resized
- **Child rectangles**: Position/size controlled by parent's constraint system
- **Leaf rectangles**: Fixed size, cannot be resized
- **Double-click**: Enters label editing mode
- **Right-click**: Opens context menu with category-specific actions

#### Constraint Enforcement
- Children must fit within parent bounds minus `MARGIN`
- Parent rectangles auto-expand to contain all children
- Grid-based positioning ensures pixel-perfect alignment
- Z-index prevents parent rectangles from obscuring children during interactions

#### State Persistence
- **Save/Load**: JSON format with versioning and metadata
- **Undo/Redo**: Command pattern with 50-state history buffer
- **Export**: Preserves styling and layout across all formats

### Development Notes

#### Adding New Categories
1. Update `RectangleCategory` type in `types/index.ts`
2. Add configuration to `CATEGORY_CONFIGS` in `utils/constants.ts`
3. Update context menu options in `ContextMenu.tsx` if needed

#### Modifying Layout Algorithm
The constraint resolution happens in `calculateChildLayout()` and `updateChildrenLayout()`:
- Grid packing algorithm can be swapped for different arrangements
- Margin and spacing logic is centralized in these functions
- Changes affect the entire hierarchy due to cascading layout updates

#### Export Format Extensions
Add new formats by:
1. Extending `ExportOptions.format` type
2. Adding handler in `exportDiagram()` function
3. Implementing format-specific logic in `utils/exportUtils.ts`