# Comprehensive Redesign Plan: Complete Roundtrip Fidelity

## Problem Statement
The current system has layout corruption during import/restore due to multiple interacting systems that trigger unwanted layout calculations. Users expect exact preservation of saved layouts without needing to undo changes.

## Root Cause Analysis
1. **Timing Issues**: Multiple async effects trigger layout updates after import/restore
2. **State Fragmentation**: Layout state scattered across multiple hooks with different timing
3. **Auto-save Corruption**: Empty states being saved during transitions
4. **Mixed Responsibilities**: Single functions handling both layout AND dimension updates
5. **Race Conditions**: `isRestoring` flags cleared before all effects complete

## Proposed Solution: Clean Architecture Redesign

### 1. Immutable Layout Snapshots
**Change**: Treat imported/restored layouts as immutable snapshots that are never modified.

```typescript
interface LayoutSnapshot {
  rectangles: Rectangle[];
  metadata: {
    version: string;
    timestamp: number;
    isImported: boolean;
    preserveExactLayout: boolean;
  };
}
```

**Implementation**:
- All imported/restored data gets `preserveExactLayout: true`
- Layout engines check this flag and skip processing
- Only user actions can create new layouts

### 2. Separation of Layout vs Dimension Updates
**Change**: Split layout positioning from dimension enforcement into separate systems.

```typescript
// Current mixed responsibility
useAppSettings() // Does BOTH layout + dimensions

// New separated responsibilities  
useLayoutEngine()    // Only handles positioning/arrangement
useDimensionEngine() // Only handles width/height enforcement
```

**Benefits**:
- Import can update dimensions without triggering layout
- Clear separation of concerns
- Easier to control when each system runs

### 3. State Machine for Import/Restore Process
**Change**: Replace boolean flags with a proper state machine.

```typescript
type AppState = 
  | { type: 'IDLE' }
  | { type: 'IMPORTING', stage: 'loading' | 'processing' | 'applying' }
  | { type: 'RESTORING', stage: 'loading' | 'applying' }
  | { type: 'LAYOUT_LOCKED', reason: 'import' | 'restore' }

const useAppStateMachine = () => {
  // Centralized state management
  // Clear transitions between states
  // Guards prevent invalid operations
}
```

**Benefits**:
- No race conditions with boolean flags
- Clear state transitions
- Easy to debug current operation

### 4. Enhanced Schema with Layout Preservation
**Change**: Extend JSON schema to explicitly track layout preservation intent.

```typescript
interface SavedDiagram {
  version: '2.0';  // Bump version
  rectangles: Rectangle[];
  globalSettings: GlobalSettings;
  layoutMetadata: {
    algorithm: LayoutAlgorithmType;
    isUserArranged: boolean;      // True if user manually positioned
    preservePositions: boolean;   // True for exact position preservation
    boundingBox: { w: number; h: number }; // For validation
  };
  timestamp: number;
}
```

**Migration Strategy**:
- v1.0 files automatically get `preservePositions: true`
- New exports ask user: "Preserve exact layout?" vs "Allow re-layout"

### 5. Robust Auto-Save with Rollback
**Change**: Auto-save with validation and rollback capability.

```typescript
interface AutoSaveManager {
  save(data: SavedDiagram): Promise<void>;
  restore(): Promise<SavedDiagram | null>;
  validateBeforeSave(data: SavedDiagram): ValidationResult;
  rollbackToLastGood(): Promise<void>;
}
```

**Implementation**:
- Never save states with 0 rectangles (unless intentional)
- Validate data integrity before saving
- Keep last known good state for rollback
- Atomic saves (all-or-nothing)

### 6. Layout Engine Redesign
**Change**: Make layout engines explicitly opt-in rather than automatic.

```typescript
interface LayoutEngine {
  canApplyTo(rectangles: Rectangle[], metadata: LayoutMetadata): boolean;
  apply(rectangles: Rectangle[], settings: GlobalSettings): Rectangle[];
  shouldPreserveExact(metadata: LayoutMetadata): boolean;
}

// Usage
if (!layoutEngine.shouldPreserveExact(metadata)) {
  rectangles = layoutEngine.apply(rectangles, settings);
}
```

**Benefits**:
- Layout engines can't run on preserved layouts
- Explicit control over when layout happens
- Easy to add new preservation rules

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)
1. **Create AppStateMachine hook** - Replace all boolean flags
2. **Implement LayoutSnapshot system** - Immutable layout preservation
3. **Add schema validation** - Prevent corrupt data from being processed
4. **Update JSON schema to v2.0** - Add layout preservation metadata

### Phase 2: Engine Separation (Architecture)
1. **Split useAppSettings** - Extract layout logic to separate hook
2. **Create useLayoutEngine** - Centralized layout processing
3. **Create useDimensionEngine** - Pure dimension enforcement
4. **Update all layout algorithms** - Add preservation checks

### Phase 3: Import/Restore Redesign (User Experience)
1. **Redesign import flow** - Use state machine, validate, preserve
2. **Redesign auto-restore** - Atomic restore with validation
3. **Add migration logic** - Handle v1.0 → v2.0 conversion
4. **Remove all temporary fixes** - Clean up current band-aids

### Phase 4: Auto-Save Robustness (Reliability)
1. **Implement robust auto-save** - Validation, rollback, atomic saves
2. **Add data integrity checks** - Prevent corruption at source
3. **Add recovery mechanisms** - Handle edge cases gracefully
4. **Performance optimization** - Efficient change detection

## Success Criteria
✅ **Perfect Import Fidelity**: Imported layouts are pixel-perfect, no undo needed
✅ **Perfect Restore Fidelity**: Browser refresh preserves exact layout
✅ **No Auto-Save Corruption**: Never save invalid/empty states
✅ **Clean Error Handling**: Graceful recovery from corrupt data
✅ **Performance**: No layout thrashing during import/restore
✅ **Maintainability**: Clear separation of concerns, easy to debug

## Risk Mitigation
- **Backward Compatibility**: Support existing v1.0 files with migration
- **Incremental Rollout**: Feature flags for new vs old system
- **Comprehensive Testing**: Unit tests for each component
- **Data Validation**: Multiple layers of validation prevent corruption
- **Recovery Mechanisms**: Rollback options for users

## Alternative Considered: Minimal Patch
Continue adding more boolean flags and timing fixes. **Rejected** because:
- Increasing complexity with diminishing returns
- Race conditions will continue to emerge
- Technical debt accumulating rapidly
- Poor user experience with workarounds

## Conclusion
This redesign addresses the root architectural issues rather than symptoms. The investment in clean architecture will provide:
- **Immediate**: Perfect import/restore fidelity
- **Long-term**: Maintainable, extensible codebase
- **User Experience**: Reliable, predictable behavior

The complexity is front-loaded in the design phase rather than accumulated through patches.