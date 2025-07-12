# Hierarchical Drawing Program

A React+TypeScript application for creating domain models and hierarchical diagrams with constraint-based layout.

**🚀 Live Demo**: [https://thomasrohde.github.io/domain-designer/](https://thomasrohde.github.io/domain-designer/)

## Features

- **Multiple Layout Algorithms**: Choose between Grid and Flow layout algorithms for different diagram styles
- **Grid-based Drawing**: Rectangles snap to a grid for precise alignment
- **Hierarchical Structure**: Create parent-child relationships between rectangles
- **Advanced Layout System**: 
  - Flow layout with depth-based alternating orientations
  - Grid layout with consistent spacing and alignment
  - Auto-sizing with intelligent parent-child constraints
- **Advanced Global Settings**: Configure layout algorithms, margins, fonts, and sizing preferences
- **Categories**: Different rectangle types for domain modeling (Channels, Business Support, Products, etc.)
- **Interactive Editing**: 
  - Drag and drop for root rectangles
  - Resize parent rectangles
  - Double-click to edit labels
  - Right-click context menus
  - Arrow key movement for precise positioning
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

### Technology Stack

- **React 18** with TypeScript
- **Vite** for development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **html2canvas** + **jsPDF** for export functionality
- **ESLint** with TypeScript rules and React hooks plugin
- **Progressive Web App**: `vite-plugin-pwa` + `workbox-window`
- **Local Storage**: `idb` for IndexedDB-based persistence

## Usage

### Creating Rectangles

1. Click "Add Root" to create a top-level rectangle
2. Select a rectangle and click "Add Child" to create nested rectangles
3. Use the category selector to change rectangle types

### Layout Algorithm Selection

- **Open Settings**: Click the settings icon in the toolbar to access global settings
- **Choose Algorithm**: Select between "Grid" and "Flow" layout algorithms
- **Configure Settings**: 
  - Adjust margin and label margin values
  - Set fixed dimensions for leaf nodes
  - Customize font sizes and border styles
- **Live Updates**: Changes apply immediately to your diagram

### Editing

- **Double-click** any rectangle to edit its label
- **Drag** root rectangles to reposition them
- **Resize** parent rectangles using the resize handle (bottom-right corner)
- **Right-click** for context menu options
- **Arrow keys** to move selected rectangles with pixel-level precision

#### Manual Positioning

To enable arrow key movement for child rectangles:
1. Select a parent rectangle
2. Click the unlock icon (padlock) to enable manual positioning
3. Child rectangles be moved with arrow keys:
   - **Arrow keys**: 1 pixel precision movement
   - **Shift + Arrow keys**: 10 pixel fast movement
4. Click the lock icon to return to automatic layout

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
- `Arrow Keys` - Move selected rectangle by 1 pixel (precise movement)
- `Shift+Arrow Keys` - Move selected rectangle by 10 pixels (fast movement)
- `Escape` - Cancel current drag operation

**Note**: Arrow key movement only works for root rectangles or children of unlocked parents (manual positioning enabled). When moving a parent rectangle, all its children move together to maintain the hierarchy.

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
- **Offline Support**: Continue working even without internet connection using service worker caching
- **Auto-save**: Your work is automatically saved to IndexedDB as you edit
- **Instant Loading**: App loads instantly after first visit, even offline
- **Data Persistence**: All diagrams are saved locally using IndexedDB and restored on app restart
- **Background Sync**: Seamless data synchronization when connection is restored

### How to Install
1. Open the app in Chrome, Edge, or similar browser
2. Look for the "Install" button in the address bar or menu
3. Click "Install Domain Designer" to add it to your system
4. Launch the app from your desktop or start menu

### Offline Status
The app displays your connection status and auto-save information in the toolbar:
- **Online/Offline indicator**: Shows current network status
- **Auto-save status**: Displays when your work was last saved to IndexedDB
- **Save confirmation**: Shows "Saved" message when changes are persisted locally

## Technical Architecture

### Core Components

- `HierarchicalDrawingApp`: Main application component and orchestrator
- `RectangleRenderer`: Handles rendering of all rectangles with proper z-indexing
- `Canvas`: Manages the drawing canvas with pan/zoom capabilities
- `Sidebar` + `PropertyPanel`: Settings and properties management
- `Toolbar`: Top navigation and actions
- `CategorySelector`: Rectangle category management
- `ContextMenu`: Right-click menu
- `ExportModal`: Export configuration dialog

### Layout System Architecture

The application uses a **Factory Pattern** for pluggable layout algorithms:

- **`LayoutManager`**: Central orchestrator for all layout operations
- **`ILayoutAlgorithm`**: Interface defining the contract for layout algorithms
- **`LayoutAlgorithmFactory`**: Creates algorithm instances based on user selection
- **`GridLayoutAlgorithm`**: Grid-based layout with consistent spacing
- **`FlowLayoutAlgorithm`**: Hierarchical flow layout with depth-based alternating orientations

### Hook-Based Architecture

The application uses custom hooks to separate concerns:
- `useRectangleManager` - Manages rectangle state and CRUD operations
- `useCanvasInteractions` - Handles drag/drop, resize, and pan operations
- `useAppSettings` - Manages global app settings and layout preferences
- `useUIState` - Manages UI state (sidebar, modals, context menus)

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

### Layout Algorithms

**Grid Layout**: Traditional grid-based positioning with consistent spacing and alignment
**Flow Layout**: Hierarchical flow layout using:
- Depth-based calculations for parent-child relationships
- Alternating row/column orientation based on tree depth
- Dynamic size calculations based on content and hierarchy
- Intelligent margin and spacing management

## Layout System

The layout system provides two distinct algorithms optimized for different use cases:

### Grid Layout Algorithm (`GridLayoutAlgorithm`)
- **Purpose**: Traditional grid-based positioning with consistent spacing
- **Features**:
  - Arranges children in a grid pattern within parent bounds
  - Uses consistent margin system: `LABEL_MARGIN` for top spacing, `MARGIN` for other sides
  - Calculates minimum parent size based on child requirements
  - Provides `calculateChildLayout` and `updateChildrenLayout` methods
- **Best for**: Structured diagrams with regular spacing requirements

### Flow Layout Algorithm (`FlowLayoutAlgorithm`)
- **Purpose**: Hierarchical flow layout with depth-based alternating orientations
- **Features**:
  - Alternates between ROW and COLUMN orientations based on tree depth
  - Calculates optimal positions using hierarchical flow principles
  - Supports both horizontal and vertical flow directions
  - Implements intelligent size calculations based on content hierarchy
- **Best for**: Organizational charts, process flows, and hierarchical structures

### Layout Management
- **`LayoutManager`**: Central orchestrator that coordinates layout operations
- **`LayoutAlgorithmFactory`**: Factory for creating algorithm instances
- **Dynamic Switching**: Users can change algorithms via global settings
- **Consistent Interface**: All algorithms implement `ILayoutAlgorithm` for seamless switching

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