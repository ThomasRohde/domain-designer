# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-07-14

### Added
- Git push command to permissions and update development workflow guidance
- isLockedAsIs property and update layout handling in rectangle management
- isRestoring state and update settings handling in HierarchicalDrawingApp
- Initial release of hierarchical drawing program for domain modeling
- React+TypeScript based architecture with hook-based design patterns
- Constraint-based layout system with automatic parent-child relationships
- Multiple layout algorithms: Grid, Flow, and Mixed Flow Layout
- PWA support with offline functionality
- Viewer mode with routing integration
- Export functionality (HTML, SVG, JSON, Mermaid)
- Keyboard shortcuts and arrow key movement for precise positioning
- Undo/redo functionality with comprehensive history management
- Font detection and management system
- Lock as-is functionality for rectangle positioning
- Help modal and user assistance features
- Context menu with right-click interactions
- Description editing modal for rectangles
- Template insertion system with multiple hierarchy levels

### Changed
- Upgraded Vite to v7.0.4 for security improvements
- Updated Node.js requirement to 20+ with npm as package manager
- Removed PDF export functionality (replaced with HTML export)
- Enhanced navigation handling for PWA and GitHub Pages compatibility
- Improved font size calculation with hierarchy depth consideration
- Optimized layout management and parent resizing logic
- Enhanced Mixed Flow Layout algorithm with matrix grid options
- Refined FlowLayoutAlgorithm for better margin handling and grid alignment

### Fixed
- Copyright name in LICENSE and README
- Event listener for context menu using capture phase
- Favicon link to use PNG format for better compatibility
- Font availability detection to prevent memory leaks
- Race conditions during undo/redo operations
- State recording and initialization in history management
- Layout update logic to respect manual positioning settings

### Security
- Upgraded Vite to v7.0.4 and updated dependencies
- Added npm audit commands to settings

### Performance
- Implemented high-impact React hooks performance optimizations
- Enhanced keyboard movement handling in canvas interactions
- Optimized layout calculations and rendering performance

### Documentation
- Added MIT License
- Updated README with detailed layout algorithms and usage instructions
- Enhanced technology stack documentation
- Removed outdated FIXES.md file
- Streamlined documentation to focus on current features

### Technical Improvements
- Integrated pako for Mermaid diagram compression
- Added select-none class to prevent text selection during interactions
- Enhanced font family selection across components and exports
- Improved back navigation for PWA compatibility
- Configured Vite for PWA routing with basename support
- Replaced anchor tags with Link components for better navigation
- Added idb for IndexedDB storage functionality
- Integrated react-router-dom for routing capabilities
- Added workbox-window for PWA service worker management