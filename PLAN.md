# Domain Designer Drag-and-Drop Improvement Plan

## Implementation Status
**Phase 1: Critical Bug Fixes** ✅ **COMPLETED** (2025-01-06)
- All major drag-and-drop bugs have been resolved
- Development server running at `http://localhost:3000/` for testing
- Build, lint, and type checking all successful

## Overview
This plan addresses critical bugs and UX improvements for the drag-and-drop system in Domain Designer, organized into phases that can be completed and tested incrementally.

## Phase 1: Critical Bug Fixes 🔥 ✅ **COMPLETED**
**Goal**: Fix the most jarring user experience issues that break core functionality

### 1.1 Fix Child Movement During Parent Drag ✅ **COMPLETED**
**Problem**: Children don't move with parent during drag, causing visual disconnect
**Files**: `src/hooks/useDragAndResize.ts` (modified hierarchy drag logic)
**Implementation**:
- [x] Modified hierarchy drag in `handleDragMove` to update all descendant positions in real-time
- [x] Added descendant movement logic using existing `getAllDescendants` function
- [x] Ensured drag delta is applied to entire subtree during hierarchy drag operations
- [x] Fixed visual disconnect where children were left behind during parent drag

**Solution Details**:
- Modified `src/hooks/useDragAndResize.ts:212-235` to include descendant movement in hierarchy drag
- Added calculation of actual movement delta and descendant position updates
- Children now move smoothly with parent during all drag operations

**Testing**:
- [x] Drag parent with children - children should move smoothly with parent
- [x] Drag parent with nested children - all descendants should move together
- [x] Verified no performance issues with descendant movement logic

### 1.2 Fix Parent Resize Constraints ✅ **COMPLETED**
**Problem**: Parents can be resized smaller than children, causing overlap
**Files**: `src/hooks/useDragAndResize.ts` (modified resize logic)
**Implementation**:
- [x] Modified `handleResizeMove` to calculate minimum required size for parents
- [x] Used existing `calculateMinimumParentSize` to enforce constraints
- [x] Prevented resize below minimum size needed for children
- [x] Added dynamic constraint checking during resize operations

**Solution Details**:
- Modified `src/hooks/useDragAndResize.ts:300-306` to check for children and enforce minimum size
- Added import for `calculateMinimumParentSize` and `getChildren` utilities
- Resize operations now respect parent-child size relationships

**Testing**:
- [x] Try to resize parent smaller than children - should stop at minimum size
- [x] Verified children don't overlap after any resize operation
- [x] Tested constraint enforcement for various child layouts

### 1.3 Fix Undo/Redo Functionality ✅ **COMPLETED**
**Problem**: Ctrl+Z/Ctrl+Y don't work despite history system existing
**Files**: Multiple files (fixed history saving for drag/resize operations)
**Implementation**:
- [x] Fixed history saving for drag and resize operations
- [x] Added `saveToHistory` parameter and function to properly save state before operations
- [x] Verified keyboard shortcuts were already properly connected
- [x] Fixed broken `setRectanglesWithHistory(prev => prev)` call that wasn't saving history

**Solution Details**:
- Added `saveToHistory` function to `useRectangleManager.ts:119-123`
- Modified drag/resize initialization to call `saveToHistory(rectangles)` instead of broken approach
- Updated all relevant hook interfaces and prop passing
- Keyboard shortcuts in `HierarchicalDrawingApp.tsx:187-191` were already working

**Testing**:
- [x] Create rectangle, press Ctrl+Z - should undo creation
- [x] Move rectangle, press Ctrl+Z - should return to original position
- [x] Resize rectangle, press Ctrl+Z - should revert size
- [x] Test Ctrl+Y (redo) functionality
- [x] Verified history works for all operations (drag, resize, create, delete)

## Phase 2: Enhanced User Experience 🎨
**Goal**: Improve visual feedback and interaction clarity

### 2.1 Real-time Hierarchy Drag Feedback
**Problem**: Confusing visual feedback during hierarchy reordering
**Files**: `src/hooks/useCanvasInteractions.ts`, `src/components/RectangleComponent.tsx`
**Implementation**:
- [ ] Move entire subtree together during hierarchy drag
- [ ] Add semi-transparent rendering for children during drag
- [ ] Show placeholder outline where children will be placed
- [ ] Clear visual distinction between normal drag and hierarchy drag

**Testing**:
- [ ] Ctrl+drag parent with children - children should move with parent
- [ ] Visual feedback should clearly show final placement
- [ ] No orphaned children left behind during drag

### 2.2 Smart Drop Target Highlighting
**Problem**: Invalid drop targets show green highlight, misleading users
**Files**: `src/hooks/useCanvasInteractions.ts`, `src/components/RectangleComponent.tsx`
**Implementation**:
- [ ] Use existing `isValid` property from `HierarchyDragState`
- [ ] Show red/no highlight for invalid drop targets
- [ ] Green highlight only for valid drops
- [ ] Special highlight for drop-to-root areas

**Testing**:
- [ ] Try to drop item on its own child - should show invalid feedback
- [ ] Try to drop item on itself - should show invalid feedback
- [ ] Drop on valid parent - should show green highlight
- [ ] Drop on canvas background - should show root drop feedback

### 2.3 Drag Operation Cancellation
**Problem**: No way to cancel drag operation once started
**Files**: `src/hooks/useCanvasInteractions.ts`, `src/hooks/useKeyboardShortcuts.ts`
**Implementation**:
- [ ] Detect drop on original parent as cancel (no-op)
- [ ] Add Escape key to cancel in-progress drag
- [ ] Reset position without state/history changes on cancel
- [ ] Visual feedback for cancel operation

**Testing**:
- [ ] Start drag, press Escape - should cancel and return to original position
- [ ] Drag item back to original parent - should cancel operation
- [ ] Verify no unnecessary history entries for cancelled operations

## Phase 3: Visual Polish & Performance 🚀
**Goal**: Smooth animations and responsive interactions

### 3.1 Improve Drag Smoothness
**Problem**: CSS transitions cause lag during drag operations
**Files**: `src/components/RectangleComponent.tsx`, CSS styles
**Implementation**:
- [ ] Disable CSS transitions during active drag
- [ ] Add drag state class that sets `transition: none`
- [ ] Restore transitions on drag end
- [ ] Consider `requestAnimationFrame` for large diagrams

**Testing**:
- [ ] Drag should feel immediately responsive to mouse movement
- [ ] Transitions should resume after drag ends
- [ ] Performance should remain good with 50+ rectangles

### 3.2 Resize Constraints with Live Feedback
**Problem**: Users don't know when they're approaching size limits
**Files**: `src/hooks/useCanvasInteractions.ts`, `src/components/RectangleComponent.tsx`
**Implementation**:
- [ ] Show visual indicator when approaching minimum size
- [ ] Color change or outline when at resize limit
- [ ] Optional auto-resize behavior for better UX
- [ ] Tooltip or hint about size constraints

**Testing**:
- [ ] Resize parent near limit - should show visual feedback
- [ ] Feedback should be clear but not intrusive
- [ ] Auto-resize (if implemented) should feel natural

## Phase 4: Code Quality & Maintainability 🔧
**Goal**: Clean, maintainable, and testable code

### 4.1 Unify Drag Handling Logic
**Problem**: Separate code paths for regular vs hierarchy drag create complexity
**Files**: `src/hooks/useCanvasInteractions.ts`
**Implementation**:
- [ ] Create unified drag state that handles both modes
- [ ] Extract common logic into helper functions
- [ ] Reduce code duplication between drag modes
- [ ] Maintain clear separation where behavior differs

**Testing**:
- [ ] All existing drag functionality should continue working
- [ ] Code should be easier to understand and modify
- [ ] No regressions in either drag mode

### 4.2 Clean Up Technical Debt
**Problem**: Magic timeouts and unclear logic make code fragile
**Files**: `src/hooks/useRectangleManager.ts`, various components
**Implementation**:
- [ ] Replace `setTimeout` with proper React effects
- [ ] Simplify hierarchy reparenting logic
- [ ] Guard against no-op reparenting operations
- [ ] Improve type assignment clarity

**Testing**:
- [ ] All operations should work without timing issues
- [ ] Code should be more predictable and reliable
- [ ] No unnecessary re-renders or state updates

### 4.3 Performance Optimizations
**Problem**: Rendering could be more efficient with larger diagrams
**Files**: `src/utils/layoutUtils.ts`, rendering components
**Implementation**:
- [ ] Cache depth calculations between renders
- [ ] Fix numeric ID sorting (avoid lexicographic issues)
- [ ] Improve z-index management
- [ ] Optimize sorting algorithm

**Testing**:
- [ ] Performance should improve with large diagrams
- [ ] Visual layering should remain correct
- [ ] No visual glitches or ordering issues

### 4.4 Documentation and Testing
**Problem**: Complex interactions need better documentation and test coverage
**Files**: Various, new test files
**Implementation**:
- [ ] Add comprehensive comments to complex functions
- [ ] Write unit tests for layout utilities
- [ ] Create integration tests for drag scenarios
- [ ] Document interaction patterns

**Testing**:
- [ ] Tests should catch regressions
- [ ] Code should be self-documenting
- [ ] New developers can understand the system

## Testing Strategy

### After Each Phase:
1. **Smoke Tests**: Basic functionality still works
2. **Regression Tests**: Previous fixes remain working
3. **Performance Tests**: No degradation in responsiveness
4. **User Testing**: Actual usage scenarios feel improved

### Key Test Scenarios:
- Create parent → add children → drag parent (children should follow)
- Resize parent with children (should respect constraints)
- Complex hierarchy operations with undo/redo
- Large diagrams (50+ rectangles) performance
- Keyboard shortcuts and accessibility

## Success Criteria

### Phase 1 Success: ✅ **ACHIEVED**
- ✅ Children move smoothly with parents during drag (completed - fixed hierarchy drag descendant movement)
- ✅ No more overlapping children from resize (completed - added dynamic resize constraints)  
- ✅ Undo/redo works for all operations (completed - fixed history saving for drag/resize operations)

### Phase 2 Success:
- ✅ Clear visual feedback for all drag operations
- ✅ Users can easily cancel unwanted operations
- ✅ Drop targets clearly indicate valid/invalid states

### Phase 3 Success:
- ✅ Drag operations feel smooth and responsive
- ✅ Users understand resize constraints intuitively

### Phase 4 Success:
- ✅ Code is maintainable and well-tested
- ✅ Performance is optimal for large diagrams
- ✅ Future enhancements are easier to implement

## Risk Mitigation

### High-Risk Changes:
- **Child movement during drag**: Could break existing layouts
- **Resize constraints**: Might prevent intended user operations
- **Undo/redo system**: Complex state management

### Mitigation Strategies:
- Implement feature flags for major changes
- Keep backup branches for rollback
- Test with real user scenarios
- Incremental rollout if possible

## Estimated Timeline

- **Phase 1**: 2-3 days (critical fixes)
- **Phase 2**: 2-3 days (UX improvements)
- **Phase 3**: 1-2 days (polish)
- **Phase 4**: 2-3 days (refactoring)

**Total**: 7-11 days of development time

Each phase builds on the previous one, ensuring the application remains functional throughout the improvement process.