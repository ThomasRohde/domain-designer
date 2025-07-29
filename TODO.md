- [x] Color picker error
- [x] Adding children to locked parent
- [-] Global color wheel
- [x] Reformat after importing, or restarting the app

## Support Onion Skinning
- [ ] **Onion Skinning Infrastructure**
  - [ ] Add version history tracking to useRectangleManager (store previous states)
  - [ ] Create onion skinning state management hook (useOnionSkinning)
  - [ ] Design data structure for storing historical diagram states with timestamps
  - [ ] Implement state compression/optimization for memory efficiency
  
- [ ] **Rendering System**
  - [ ] Create OnionSkinRenderer component for transparent overlay rendering
  - [ ] Add opacity/transparency controls (0-100%) for historical layers
  - [ ] Implement multi-layer rendering with proper z-indexing
  - [ ] Add visual differentiation between current state and historical states
  - [ ] Optimize rendering performance for multiple overlay layers
  
- [ ] **UI Controls**
  - [ ] Add onion skinning toggle button to Toolbar
  - [ ] Create timeline scrubber for navigating through historical states
  - [ ] Add opacity slider for controlling historical layer transparency
  - [ ] Implement keyboard shortcuts (Alt+O for toggle, arrow keys for timeline navigation)
  - [ ] Add "layers panel" showing all visible historical states with individual toggles
  
- [ ] **Advanced Features**
  - [ ] Add "ghost mode" showing predicted/suggested changes
  - [ ] Implement selective onion skinning (show only specific rectangles' history)
  - [ ] Add export functionality including onion skin layers
  - [ ] Memory management and cleanup for old states (configurable retention period)

## Allow True Infinite Canvas
- [ ] **Remove Canvas Boundaries**
  - [ ] Remove hardcoded canvas size limits in Canvas component
  - [ ] Update coordinate system to handle arbitrarily large positive/negative coordinates
  - [ ] Modify pan constraints to allow unlimited movement in all directions
  - [ ] Update zoom calculations to work with infinite coordinate space
  
- [ ] **Viewport-Based Rendering**
  - [ ] Implement viewport culling in RectangleRenderer (only render visible rectangles)
  - [ ] Add spatial indexing (quadtree/R-tree) for efficient viewport queries
  - [ ] Create viewport bounds calculation utilities
  - [ ] Add buffer zone rendering (render slightly outside viewport for smooth panning)
  - [ ] Optimize re-rendering to only update when viewport or visible rectangles change
  
- [ ] **Coordinate System Handling**
  - [ ] Update all coordinate calculations to handle very large numbers
  - [ ] Implement coordinate normalization for floating-point precision issues
  - [ ] Add coordinate system utilities for viewport-to-world and world-to-viewport conversion
  - [ ] Update export systems to handle large coordinate spaces (proper bounds calculation)
  
- [ ] **Memory Management**
  - [ ] Implement lazy loading for off-screen rectangle data
  - [ ] Add automatic garbage collection for far off-screen rectangles
  - [ ] Create configurable memory limits and cleanup policies
  - [ ] Add performance monitoring for large diagrams (frame rate, memory usage)
  
- [ ] **Enhanced Navigation**
  - [ ] Add "fit to content" button to zoom to show all rectangles
  - [ ] Implement minimap/navigator for large diagrams
  - [ ] Add "go to rectangle" search/navigation functionality
  - [ ] Create breadcrumb navigation for hierarchical traversal
  - [ ] Add coordinate display in status bar for debugging

## New Rectangle Panel Settings for Text Label Mode  
- [ ] **Data Model Extensions**
  - [ ] Add 'text-label' to RectangleType enum in types/index.ts
  - [ ] Extend Rectangle interface with isTextLabel boolean flag
  - [ ] Update createRectangle utility to support text label creation
  - [ ] Add text label specific properties (textFontFamily, textFontSize, fontWeight, textAlign, etc.)
  - [ ] Ensure text label font settings are independent from global font settings
  
- [ ] **Core Functionality**
  - [ ] Modify addRectangle in useRectangleManager to prevent children for text labels
  - [ ] Update layout algorithms to treat text labels as fixed-size elements
  - [ ] Implement text label sizing based on content (auto-size to text bounds)
  - [ ] Add validation to prevent converting parent rectangles to text labels
  
- [ ] **UI Integration**
  - [ ] Add "Text Label Mode" toggle in PropertyPanel
  - [ ] Reuse existing font logic from GlobalSettings for text label font controls
  - [ ] Create independent font family and font size dropdowns (only visible when Text Label Mode is checked)
  - [ ] Add text alignment controls (left, center, right, justify)
  - [ ] Hide/disable child-related actions when text label is selected
  - [ ] Remove resize handles from text labels (auto-size based on content)
  - [ ] Update context menus to exclude "Add Child" for text labels
  
- [ ] **Visual Styling**
  - [ ] Create distinct visual style for text labels (minimal border, focus on typography)
  - [ ] Add text editing mode with improved inline editing experience
  - [ ] Implement text wrapping and overflow handling
  - [ ] Add text formatting options (bold, italic, underline)
  - [ ] Create text label templates/presets
  
- [ ] **Layout System Integration**
  - [ ] Update calculateChildLayout to properly handle text labels in mixed layouts
  - [ ] Ensure text labels don't interfere with parent auto-sizing calculations
  - [ ] Add text label positioning options (relative to parent, absolute positioning)
  - [ ] Implement text label alignment within parent containers
  
- [ ] **Export and Persistence**
  - [ ] Update all export formats (HTML, SVG, PDF) to properly render text labels
  - [ ] Ensure text labels maintain formatting across import/export cycles
  - [ ] Add text label specific export options (font embedding, fallback fonts)
  - [ ] Update save/load functionality to preserve text label properties
