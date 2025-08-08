# Heat Map Overlay Feature Implementation Plan

## Overview

Add a heat map overlay system that assigns values (0-1) to rectangles and visualizes them using customizable color palettes. The feature will include:
- Manual value assignment via context menu
- Color palette management page
- CSV import for bulk value assignment
- Toggle between normal colors and heat map colors
- **No visual indicators beyond color change** - values shown only in property panel

## Phase 1: Data Model Updates ✅ COMPLETE

### 1.1 Rectangle Type Extension ✅
- ✅ Add `heatmapValue?: number` field to Rectangle interface (0-1 range)
- ✅ Add this to `src/types/index.ts`

### 1.2 Store Updates ✅
- ✅ Add heat map slice to store:
  - `heatmapEnabled: boolean` - toggle for heat map display
  - `heatmapPalette: HeatmapPalette` - selected palette configuration
  - `customPalettes: HeatmapPalette[]` - user-defined palettes
  - `undefinedValueColor: string` - color for rectangles without values
- ✅ Created `src/stores/slices/heatmapSlice.ts` with full implementation
- ✅ Integrated heatmap slice into main store with persistence
- ✅ Added predefined palettes: Temperature, Viridis, Traffic Light, Grayscale
- ✅ Implemented color interpolation and palette management

## Phase 2: Heat Map Settings Page ✅ COMPLETE

### 2.1 Create HeatmapSettings Component ✅
- ✅ New component in `src/components/HeatmapSettings.tsx`
- ✅ Access from burger menu (LeftMenu) with Palette icon
- ✅ Features implemented:
  - ✅ Palette selector (predefined palettes working)
  - ✅ Color gradient visualization with live previews
  - ✅ Current active palette display when enabled
  - ✅ CSV import button (placeholder for Phase 4)
  - ✅ Toggle to enable/disable heat map overlay with immediate effect
  - ✅ "Apply Palette" button when palette changes
  - ✅ Special color selector for undefined values with color picker
  - ✅ Legend toggle for future display
  - ✅ Clear all values management option

### 2.2 Predefined Palettes ✅
- ✅ Temperature (blue → red) with 3 stops
- ✅ Viridis (scientific visualization) with 5 stops
- ✅ Traffic light (green → yellow → red) with 3 stops
- ✅ Grayscale (white → black) with 2 stops
- ✅ Infrastructure for custom user palettes

## Phase 3: Value Assignment UI ✅ COMPLETE

### 3.1 Context Menu Enhancement ✅
- ✅ Add "Set Heat Map Value" option to single-select context menu with Palette icon
- ✅ Opens modal with:
  - ✅ Slider (0-1 range, 0.01 increments) with custom orange styling
  - ✅ Number input for precise values with validation
  - ✅ Clear value button (checkbox to enable/disable value)
  - ✅ Live preview of resulting color with palette interpolation
  - ✅ Color information display (value, color code, palette name)
  - ✅ Status indicator when heat map is disabled

### 3.2 Property Panel Integration ✅
- ✅ Show current heat map value in PropertyPanel when rectangle selected
- ✅ Allow inline editing with Enter/Escape keyboard shortcuts
- ✅ Display "Not set" when no value assigned
- ✅ Show computed heat map color preview with hex color
- ✅ Visual status indicators (enabled/disabled eye icons)
- ✅ Current palette name display
- ✅ Contextual status messages for better UX

## Phase 4: CSV Import Feature ✅ COMPLETE

### 4.1 CSV Parser ✅
- ✅ Created `src/utils/heatmapImport.ts` with full CSV parsing functionality
- ✅ Expected format: `rectangleName,value` with automatic header detection
- ✅ Case-insensitive rectangle label matching
- ✅ Validation: values must be 0-1 range with detailed error messages
- ✅ Comprehensive error reporting for invalid entries
- ✅ File validation with size limits and format checking
- ✅ Sample CSV generation for user guidance

### 4.2 Import Modal ✅
- ✅ Created `src/components/HeatmapImportModal.tsx` with full functionality
- ✅ File selection with drag-and-drop support and visual feedback
- ✅ Preview table showing:
  - ✅ Rectangle name with matched status
  - ✅ Values to be assigned
  - ✅ Status indicators (successful/failed/unmatched)
  - ✅ Detailed error messages for failed entries
- ✅ Summary statistics with color-coded counts
- ✅ Apply/Cancel buttons with bulk value assignment
- ✅ Sample CSV download functionality integrated
- ✅ Connected to HeatmapSettings with working Import CSV button

## Phase 5: Color Calculation & Rendering ✅ COMPLETE

### 5.1 Color Interpolation Utility ✅
- ✅ Created `src/utils/heatmapColors.ts` with comprehensive color calculation system
- ✅ Linear interpolation between palette stops with caching for performance
- ✅ Handle undefined values with special color support  
- ✅ Memoized computed colors with cache management utilities
- ✅ Advanced features: precomputation, cache size monitoring, and cache clearing
- ✅ Comprehensive color interpolation with RGB conversion and hex output

### 5.2 Rectangle Component Updates ✅
- ✅ Modified `RectangleComponent.tsx` with seamless heat map integration:
  - ✅ Added useAppStore integration for heat map state access
  - ✅ Implemented heat map color override system using getHeatmapColor action
  - ✅ Clean color replacement without any badges, tooltips, or visual indicators
  - ✅ Updated text color calculation to work with heat map colors for proper contrast
  - ✅ Maintains all existing styling logic and state priorities
  - ✅ Zero visual impact beyond color replacement

## Phase 6: Export Integration ✅ COMPLETE

### 6.1 Export Utils Enhancement ✅
- ✅ Updated all export formats to respect heat map colors when enabled:
  - ✅ HTML export - uses heat map colors with `applyHeatmapColorsForExport` function
  - ✅ SVG export - applies heat map colors to rectangle fills automatically
  - ✅ JSON export - includes complete heat map state and palette information
  - ✅ Mermaid export - respects heat map colors for diagram styling
- ✅ Created `applyHeatmapColorsForExport` utility function for consistent color application
- ✅ Enhanced `exportDiagram` function with optional `heatmapState` parameter
- ✅ Updated `SavedDiagram` type to include `heatmapState` field for JSON exports
- ✅ Integrated heat map color calculation with `calculateHeatmapColor` utility
- ✅ Full backward compatibility - exports work correctly with or without heat map enabled

### 6.2 Viewer Mode ✅
- ✅ Heat map colors automatically applied in all export formats when enabled
- ✅ Exported diagrams maintain heat map visualization without requiring active heat map mode
- ✅ JSON exports preserve complete heat map configuration for future imports
- ✅ All exported formats use consistent color calculations matching canvas display

## Phase 7: Heat Map Legend Component ✅ COMPLETE

### 7.1 Optional Legend ✅
- ✅ Created `src/components/HeatmapLegend.tsx` with comprehensive legend functionality
- ✅ Floating legend showing color scale (0-1) with precise value markers
- ✅ Toggle visibility controlled by heat map settings `showLegend` state
- ✅ Positioned in bottom-right corner with fixed positioning and proper z-index
- ✅ Semi-transparent background with backdrop blur for modern glass effect
- ✅ Gradient visualization using current palette with dynamic color generation
- ✅ Value labels at 0.0, 0.25, 0.5, 0.75, 1.0 with tick marks for precision
- ✅ Displays current palette name for context
- ✅ Auto-hides when heat map is disabled or legend toggle is off
- ✅ Integrated seamlessly into HierarchicalDrawingApp as floating overlay
- ✅ Responsive design with proper pointer-events handling
- ✅ Professional styling with borders, shadows, and proper spacing

## Implementation Order

1. Data model and store updates
2. Basic heat map settings page with toggle
3. Value assignment in context menu
4. Property panel integration
5. Color calculation and rendering
6. Predefined palettes
7. CSV import
8. Custom palette editor
9. Export integration
10. Optional legend component

## Key Files to Modify

- `src/types/index.ts` - Add heatmapValue to Rectangle
- `src/stores/types.ts` - Add heat map state interfaces
- `src/stores/slices/heatmapSlice.ts` - New slice for heat map state
- `src/components/HeatmapSettings.tsx` - New settings page
- `src/components/HeatmapValueModal.tsx` - New value assignment modal
- `src/components/ContextMenu.tsx` - Add value assignment option
- `src/components/PropertyPanel.tsx` - Show heat map value
- `src/components/RectangleComponent.tsx` - Apply heat map colors (no indicators)
- `src/utils/heatmapColors.ts` - Color calculation utilities
- `src/utils/heatmapImport.ts` - CSV import logic
- `src/components/LeftMenu.tsx` - Add heat map settings menu item
- `src/utils/exportUtils.ts` - Include heat map in exports

## Design Principles

- **Minimal visual changes** - only color replacement, no badges or tooltips
- Heat map values visible only in property panel
- Clean, uncluttered interface
- Performance-optimized color calculation
- Seamless toggle between normal and heat map colors

## Type Definitions

```typescript
// Heat map palette configuration
interface HeatmapPalette {
  id: string;
  name: string;
  stops: ColorStop[];
  isCustom?: boolean;
}

interface ColorStop {
  value: number; // 0-1
  color: string; // hex color
}

// Heat map state in store
interface HeatmapState {
  enabled: boolean;
  selectedPaletteId: string;
  palettes: HeatmapPalette[];
  undefinedValueColor: string;
  showLegend: boolean;
}

// CSV import result
interface HeatmapImportResult {
  successful: Array<{
    rectangleId: string;
    label: string;
    value: number;
  }>;
  failed: Array<{
    label: string;
    value: string;
    error: string;
  }>;
  unmatched: Array<{
    label: string;
    value: number;
  }>;
}
```

## User Workflow

1. **Enable Heat Map**: User navigates to Heat Map Settings from burger menu
2. **Choose Palette**: Select from predefined palettes or create custom
3. **Assign Values**:
   - Individual: Right-click rectangle → "Set Heat Map Value"
   - Bulk: Import CSV file with name-value pairs
4. **Deploy**: Click "Deploy" to apply heat map colors to canvas
5. **Export**: All export formats respect heat map colors when enabled
6. **Toggle**: Quick toggle between normal and heat map view

## Performance Considerations

- Memoize color calculations to avoid recomputation
- Use React.memo for RectangleComponent to prevent unnecessary re-renders
- Cache palette interpolations
- Debounce value updates during slider interaction
- Lazy load CSV parser only when needed

## Future Enhancements

- Multiple heat map layers (different metrics)
- Animated transitions between color states
- Heat map history/snapshots
- Export heat map as separate layer
- Integration with external data sources
- Conditional formatting rules