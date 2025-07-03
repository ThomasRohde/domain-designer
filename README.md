# Hierarchical Drawing Program

A React+TypeScript application for creating domain models and hierarchical diagrams with constraint-based layout.

## Features

- **Grid-based Drawing**: Rectangles snap to a grid for precise alignment
- **Hierarchical Structure**: Create parent-child relationships between rectangles
- **Auto-sizing**: Child rectangles automatically resize to fit within their parents
- **Categories**: Different rectangle types for domain modeling (Channels, Business Support, Products, etc.)
- **Interactive Editing**: 
  - Drag and drop for root rectangles
  - Resize parent rectangles
  - Double-click to edit labels
  - Right-click context menus
- **Save/Load**: Persist diagrams as JSON files
- **Export**: Export to PNG, SVG, PDF, or JSON formats
- **Undo/Redo**: Full history management
- **Professional Styling**: Color-coded categories with professional appearance

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

## Usage

### Creating Rectangles

1. Click "Add Root" to create a top-level rectangle
2. Select a rectangle and click "Add Child" to create nested rectangles
3. Use the category selector to change rectangle types

### Editing

- **Double-click** any rectangle to edit its label
- **Drag** root rectangles to reposition them
- **Resize** parent rectangles using the resize handle (bottom-right corner)
- **Right-click** for context menu options

### Categories

- **Channels**: Digital and communication channels
- **Relationships**: Customer and partner relationships  
- **Business Support**: Core business capabilities
- **Products & Services**: Product offerings
- **Business Control**: Governance and oversight
- **Risk Management**: Risk and compliance
- **IT Platform**: Technology infrastructure
- **Data Platform**: Data management and analytics
- **Organisational Support**: HR and organizational functions

### Keyboard Shortcuts

- `Ctrl+S` - Save diagram
- `Ctrl+O` - Load diagram
- `Ctrl+Z` - Undo
- `Ctrl+Y` or `Ctrl+Shift+Z` - Redo
- `Delete` - Remove selected rectangle

### Export Options

- **PNG**: High-quality raster image
- **SVG**: Scalable vector graphics
- **PDF**: Print-ready document format
- **JSON**: Raw diagram data for backup/sharing

## Technical Architecture

### Core Components

- `HierarchicalDrawingApp`: Main application component
- `RectangleComponent`: Individual rectangle rendering
- `Toolbar`: Top navigation and actions
- `CategorySelector`: Rectangle category management
- `ContextMenu`: Right-click menu
- `ExportModal`: Export configuration dialog

### Data Structure

```typescript
interface Rectangle {
  id: string;
  parentId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
  category: RectangleCategory;
  type: 'root' | 'parent' | 'leaf';
}
```

### Constraint System

- Parent rectangles auto-resize to contain children
- Child rectangles auto-size to fit within parent minus margins
- Minimum/maximum size constraints per rectangle type
- Grid-based positioning for alignment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details