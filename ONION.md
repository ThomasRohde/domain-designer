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
