# Domain Designer Improvement TODO List

Based on comprehensive user testing feedback from browser agent testing. This list prioritizes critical UX issues and missing features that impact production readiness.

## High Priority - Critical UX Issues

### 1. Ambiguous UI Icons and Controls
**Status:** Partially Implemented
**Issue:** Manual positioning and layout controls lack clear labeling
**Impact:** Users cannot understand what controls do
**Tasks:**
- [ ] Add tooltips to manual positioning handles in `RectangleComponent.tsx`
- [ ] Add explanatory text for "cross-arrow" icon behavior
- [ ] Improve labeling for "Fit to Children" vs "Lock As-Is" functionality
- [ ] Add help text in PropertyPanel for layout controls
- [ ] Create visual indicators for manual vs auto-layout modes

## Medium Priority - Functional Enhancements

### 6. Enhanced Responsive Design
**Status:** Partial
**Issue:** Small screen layouts have button overlap and usability issues
**Impact:** Poor mobile/tablet experience
**Tasks:**
- [ ] Fix button overlap in `Toolbar.tsx` at small widths
- [ ] Improve mobile context menu positioning
- [ ] Add touch-friendly drag handles
- [ ] Optimize property panel for mobile
- [ ] Test and fix canvas interactions on touch devices
- [ ] Add mobile-specific zoom controls

### 8. Keyboard Shortcut Completion
**Status:** Partial
**Issue:** Missing standard shortcuts (Ctrl+A, Escape, arrow keys)
**Impact:** Reduced productivity for power users
**Tasks:**
- [ ] Implement Ctrl+A (select all same-level) in `useKeyboardShortcuts.ts`
- [ ] Add Escape key to clear selection
- [ ] Add arrow key navigation between rectangles
- [x] ~~Implement Ctrl+D for duplicate~~ ✅ **COMPLETED** - Implemented with single history entry
- [x] ~~Add keyboard shortcut help overlay~~ ✅ **COMPLETED** - Help modal implemented
- [ ] Test shortcuts across different browsers

## Medium Priority - Data and Performance

### 9. Auto-Save Visibility and Reliability
**Status:** Needs Improvement
**Issue:** No clear save status indicator, untested persistence
**Impact:** Users unsure if work is saved
**Tasks:**
- [ ] Make auto-save indicator more prominent in `OfflineIndicator.tsx`
- [ ] Add last saved timestamp display
- [ ] Test persistence across browser refresh
- [ ] Implement save conflict resolution
- [ ] Add manual save option
- [ ] Test offline functionality thoroughly

## Low Priority - Polish and Enhancements

### 15. Visual Polish and Consistency
**Status:** Good Base
**Issue:** Minor visual and interaction improvements needed
**Impact:** Professional appearance and user confidence
**Tasks:**
- [ ] Standardize button hover states and animations
- [ ] Improve loading states and transitions
- [ ] Add consistent spacing and typography
- [ ] Implement theme customization options
- [ ] Add animation for layout changes
- [ ] Polish modal and dialog appearances