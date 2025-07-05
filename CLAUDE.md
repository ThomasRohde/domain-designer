# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (runs TypeScript compilation + Vite build)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint with zero warnings policy
- `npm run typecheck` - Run TypeScript type checking without emitting files

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

The layout system in `src/utils/layoutUtils.ts` provides:
- `calculateChildLayout` - Arranges children in a grid within parent bounds
- `updateChildrenLayout` - Recursively updates all child layouts
- `calculateMinimumParentSize` - Calculates minimum size needed for parents
- Consistent margin system: `LABEL_MARGIN` for top spacing, `MARGIN` for other sides

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