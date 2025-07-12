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

State is managed through React hooks with clear separation:
- Rectangle data and operations in `useRectangleManager`
- Canvas interactions (drag/resize/pan) in `useCanvasInteractions`
- Global settings persistence in `useAppSettings`
- UI state (modals, sidebar) in `useUIState`

### Export System

The application supports multiple export formats through `src/utils/exportUtils.ts`:
- PNG, SVG, PDF, and JSON formats
- Uses html2canvas for raster exports
- Maintains layout integrity across all formats

## Technology Stack

- **React 18** with TypeScript
- **Vite** for development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **html2canvas** + **jsPDF** for export functionality
- **ESLint** with TypeScript rules and React hooks plugin

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