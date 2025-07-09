# Hierarchical Drawing Program

A React+TypeScript application for creating domain models and hierarchical diagrams with constraint-based layout.

**🚀 Live Demo**: [https://thomasrohde.github.io/domain-designer/](https://thomasrohde.github.io/domain-designer/)

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
- **Progressive Web App**: Installable on desktop, works offline with auto-save

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

## Progressive Web App Features

This application is built as a Progressive Web App (PWA) with the following capabilities:

### Installation
- **Desktop Installation**: Install the app on Windows, macOS, or Linux
- **App-like Experience**: Runs in its own window without browser UI
- **Easy Access**: Launch from desktop or start menu like any native app

### Offline Capabilities
- **Offline Support**: Continue working even without internet connection
- **Auto-save**: Your work is automatically saved to local storage as you edit
- **Instant Loading**: App loads instantly after first visit, even offline
- **Data Persistence**: All diagrams are saved locally and restored on app restart

### How to Install
1. Open the app in Chrome, Edge, or similar browser
2. Look for the "Install" button in the address bar or menu
3. Click "Install Domain Designer" to add it to your system
4. Launch the app from your desktop or start menu

### Offline Status
The app displays your connection status and auto-save information in the toolbar:
- **Online/Offline indicator**: Shows current network status
- **Auto-save status**: Displays when your work was last saved
- **Save confirmation**: Shows "Saved" message when changes are persisted

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

## Deployment

This project is automatically deployed to GitHub Pages via GitHub Actions. Every push to the main branch triggers a deployment.

- **Live Site**: [https://thomasrohde.github.io/domain-designer/](https://thomasrohde.github.io/domain-designer/)
- **Deployment**: Automated via GitHub Actions
- **Build**: Static files generated with Vite and served from GitHub Pages

### Local Production Testing

To test the production build locally:

```bash
# Build with GitHub Pages configuration
GITHUB_PAGES=true npm run build

# Preview the production build
npm run preview
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

The site will be automatically deployed when changes are merged to the main branch.

## License

MIT License - see LICENSE file for details