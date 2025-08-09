import React, { useState } from 'react';
import { LayoutPreferences, Rectangle } from '../types';
import { useAppStore } from '../stores/useAppStore';
import { Palette, Eye, EyeOff } from 'lucide-react';
import ColorPalette from './ColorPalette';
import GlobalSettings from './GlobalSettings';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PropertyPanelProps {
  // No props needed - component will access store directly
}

/**
 * Heatmap Value Section Component for Property Panel Integration
 * 
 * Provides comprehensive heatmap value management within the property panel:
 * - Inline editing with real-time validation (0-1 range enforcement)
 * - Live color preview showing how values map to current palette
 * - Visual status indicators (enabled/disabled, has value/undefined)
 * - Keyboard shortcuts (Enter to save, Escape to cancel)
 * - Automatic integration with global heatmap state and color computation
 * 
 * This component demonstrates how heatmap functionality integrates seamlessly
 * with existing UI patterns while maintaining consistent user experience.
 */
const HeatmapValueSection: React.FC<{ rectangleId: string }> = ({ rectangleId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');

  // Store selectors
  const rectangle = useAppStore(state => state.rectangles.find(r => r.id === rectangleId));
  const heatmapEnabled = useAppStore(state => state.heatmap.enabled);
  const selectedPaletteId = useAppStore(state => state.heatmap.selectedPaletteId);
  const palettes = useAppStore(state => state.heatmap.palettes);
  const undefinedValueColor = useAppStore(state => state.heatmap.undefinedValueColor);
  
  // Store actions
  const setRectangleHeatmapValue = useAppStore(state => state.heatmapActions.setRectangleHeatmapValue);
  const getHeatmapColor = useAppStore(state => state.heatmapActions.getHeatmapColor);

  if (!rectangle) return null;

  const currentValue = rectangle.heatmapValue;
  const hasValue = currentValue !== undefined;
  const selectedPalette = palettes.find(p => p.id === selectedPaletteId);

  const handleStartEdit = () => {
    setEditValue(currentValue?.toString() ?? '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const value = parseFloat(editValue);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      setRectangleHeatmapValue(rectangleId, value);
    } else if (editValue === '') {
      setRectangleHeatmapValue(rectangleId, undefined);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const previewColor = hasValue && heatmapEnabled ? getHeatmapColor(rectangleId) : undefinedValueColor;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-3">
        <Palette size={16} className="text-orange-600" />
        <h3 className="font-semibold text-sm lg:text-base">Heat Map Value</h3>
        <div title={heatmapEnabled ? "Heat map enabled" : "Heat map disabled"}>
          {heatmapEnabled ? (
            <Eye size={14} className="text-green-600" />
          ) : (
            <EyeOff size={14} className="text-gray-400" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Current Value Display/Editor */}
        <div className="flex items-center gap-3">
          <span className="text-xs lg:text-sm font-medium text-gray-700 w-16">Value:</span>
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyPress}
                className="px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded w-20"
                placeholder="0.0-1.0"
                autoFocus
              />
              <button
                onClick={handleSaveEdit}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs lg:text-sm text-gray-600">
                {hasValue ? currentValue.toFixed(2) : 'Not set'}
              </span>
              <button
                onClick={handleStartEdit}
                className="px-2 py-1 text-xs text-orange-600 hover:text-orange-700 border border-orange-300 rounded hover:border-orange-400"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Color Preview */}
        {(hasValue || !heatmapEnabled) && (
          <div className="flex items-center gap-3">
            <span className="text-xs lg:text-sm font-medium text-gray-700 w-16">Color:</span>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 border border-gray-300 rounded"
                style={{ backgroundColor: previewColor || undefinedValueColor }}
                title={`${hasValue ? `Value: ${currentValue?.toFixed(2)}` : 'No value set'}`}
              />
              <span className="text-xs text-gray-500">
                {previewColor || undefinedValueColor}
              </span>
            </div>
          </div>
        )}

        {/* Palette Info */}
        {heatmapEnabled && selectedPalette && (
          <div className="flex items-center gap-3">
            <span className="text-xs lg:text-sm font-medium text-gray-700 w-16">Palette:</span>
            <span className="text-xs lg:text-sm text-gray-600">{selectedPalette.name}</span>
          </div>
        )}

        {/* Status Messages */}
        {!hasValue && (
          <p className="text-xs text-gray-500">
            No heat map value assigned. Rectangle will use the undefined value color when heat map is enabled.
          </p>
        )}

        {hasValue && !heatmapEnabled && (
          <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
            Heat map value is set but heat map overlay is currently disabled. 
            Enable it in Heat Map Settings to see this color applied.
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Bulk Heatmap Value Editor Component
 * 
 * Provides comprehensive bulk heatmap value management for multiple selected rectangles:
 * - Displays mixed value indicators when rectangles have different heatmap values
 * - Allows setting a common heatmap value for all selected rectangles
 * - Shows live color preview with current palette
 * - Integrates with bulk heatmap value store actions for efficient updates
 * - Provides clear indication of heatmap enabled/disabled state
 */
interface BulkHeatmapValueEditorProps {
  selectedRectangles: Rectangle[];
  heatmapEnabled: boolean;
  selectedPaletteId: string;
  palettes: Array<{ id: string; name: string; }>;
  undefinedValueColor: string;
  bulkSetHeatmapValues: (values: Array<{ rectangleId: string; value: number }>) => void;
  getHeatmapColor: (rectangleId: string) => string | null;
}

const BulkHeatmapValueEditor: React.FC<BulkHeatmapValueEditorProps> = ({
  selectedRectangles,
  heatmapEnabled,
  selectedPaletteId,
  palettes,
  undefinedValueColor,
  bulkSetHeatmapValues,
  getHeatmapColor
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');

  // Get current heatmap values from selected rectangles
  const heatmapValues = selectedRectangles.map(r => r.heatmapValue);
  const uniqueValues = [...new Set(heatmapValues.filter(v => v !== undefined))];
  const hasValues = uniqueValues.length > 0;
  const allSameValue = uniqueValues.length === 1;
  const someHaveValues = heatmapValues.some(v => v !== undefined);
  const allHaveValues = heatmapValues.every(v => v !== undefined);
  const selectedPalette = palettes.find(p => p.id === selectedPaletteId);

  const displayValue = allSameValue ? uniqueValues[0]?.toFixed(2) : 
                      someHaveValues ? 'Mixed values' : 'Not set';

  const handleStartEdit = () => {
    setEditValue(allSameValue ? uniqueValues[0]?.toString() ?? '' : '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const value = parseFloat(editValue);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      // Apply to all selected rectangles
      const updates = selectedRectangles.map(rect => ({
        rectangleId: rect.id,
        value: value
      }));
      bulkSetHeatmapValues(updates);
    } else if (editValue === '') {
      // Clear all values - use individual updates for undefined values
      selectedRectangles.forEach(rect => {
        const setRectangleHeatmapValue = useAppStore.getState().heatmapActions.setRectangleHeatmapValue;
        setRectangleHeatmapValue(rect.id, undefined);
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Sample preview color (use first rectangle with a value, or first rectangle for undefined color)
  const previewRect = selectedRectangles.find(r => r.heatmapValue !== undefined) || selectedRectangles[0];
  const previewColor = previewRect && heatmapEnabled ? getHeatmapColor(previewRect.id) : undefinedValueColor;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Palette size={16} className="text-orange-600" />
        <h3 className="font-semibold text-sm lg:text-base">Bulk Heat Map Values</h3>
        <div title={heatmapEnabled ? "Heat map enabled" : "Heat map disabled"}>
          {heatmapEnabled ? (
            <Eye size={14} className="text-green-600" />
          ) : (
            <EyeOff size={14} className="text-gray-400" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Current Value Display/Editor */}
        <div className="flex items-center gap-3">
          <span className="text-xs lg:text-sm font-medium text-gray-700 w-16">Value:</span>
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyPress}
                className="px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded w-20"
                placeholder="0.0-1.0"
                autoFocus
              />
              <button
                onClick={handleSaveEdit}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs lg:text-sm text-gray-600">
                {displayValue}
              </span>
              <button
                onClick={handleStartEdit}
                className="px-2 py-1 text-xs text-orange-600 hover:text-orange-700 border border-orange-300 rounded hover:border-orange-400"
              >
                Edit All
              </button>
            </div>
          )}
        </div>

        {/* Color Preview */}
        {(hasValues || !heatmapEnabled) && (
          <div className="flex items-center gap-3">
            <span className="text-xs lg:text-sm font-medium text-gray-700 w-16">Preview:</span>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 border border-gray-300 rounded"
                style={{ backgroundColor: previewColor || undefinedValueColor }}
                title={allSameValue ? `Value: ${uniqueValues[0]?.toFixed(2)}` : 'Mixed or no values'}
              />
              <span className="text-xs text-gray-500">
                {previewColor || undefinedValueColor}
              </span>
            </div>
          </div>
        )}

        {/* Palette Info */}
        {heatmapEnabled && selectedPalette && (
          <div className="flex items-center gap-3">
            <span className="text-xs lg:text-sm font-medium text-gray-700 w-16">Palette:</span>
            <span className="text-xs lg:text-sm text-gray-600">{selectedPalette.name}</span>
          </div>
        )}

        {/* Status Messages */}
        <div className="text-xs">
          {!allHaveValues && someHaveValues && (
            <p className="text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200 mb-2">
              ⚠️ {selectedRectangles.filter(r => r.heatmapValue !== undefined).length} of {selectedRectangles.length} rectangles have heatmap values set.
            </p>
          )}
          
          {!hasValues && (
            <p className="text-gray-500">
              No heat map values assigned. Rectangles will use the undefined value color when heat map is enabled.
            </p>
          )}

          {hasValues && !heatmapEnabled && (
            <p className="text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
              Heat map values are set but heat map overlay is currently disabled. 
              Enable it in Heat Map Settings to see colors applied.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Adaptive property panel that displays different content based on selection state:
 * - When a rectangle is selected: Shows rectangle-specific properties (color, layout, text settings)
 * - When no selection: Shows global application settings
 * 
 * Features context-aware UI sections:
 * - Color picker with predefined palette and custom color management
 * - Text label mode controls for typography-focused rectangles
 * - Layout preferences for parent rectangles with advanced fill strategies
 * - Rectangle information display with hierarchy details
 */
const PropertyPanel: React.FC<PropertyPanelProps> = () => {
  // Core application state for selected rectangle and settings
  const selectedIds = useAppStore(state => state.ui.selectedIds);
  const selectedId = selectedIds.length > 0 ? selectedIds[0] : null;
  const rectangles = useAppStore(state => state.rectangles);
  const settings = useAppStore(state => state.settings);
  
  // Rectangle manipulation actions
  const updateRectangleColor = useAppStore(state => state.rectangleActions.updateRectangleColor);
  const bulkUpdateColor = useAppStore(state => state.rectangleActions.bulkUpdateColor);
  const updateRectangleLayoutPreferences = useAppStore(state => state.rectangleActions.updateRectangleLayoutPreferences);
  const toggleTextLabel = useAppStore(state => state.rectangleActions.toggleTextLabel);
  const updateTextLabelProperties = useAppStore(state => state.rectangleActions.updateTextLabelProperties);
  const updateColorSquare = useAppStore(state => state.settingsActions.updateColorSquare);
  
  // Heatmap selectors and actions
  const heatmapEnabled = useAppStore(state => state.heatmap.enabled);
  const selectedPaletteId = useAppStore(state => state.heatmap.selectedPaletteId);
  const palettes = useAppStore(state => state.heatmap.palettes);
  const undefinedValueColor = useAppStore(state => state.heatmap.undefinedValueColor);
  const bulkSetHeatmapValues = useAppStore(state => state.heatmapActions.bulkSetHeatmapValues);
  const getHeatmapColor = useAppStore(state => state.heatmapActions.getHeatmapColor);
  
  const selectedRectangle = selectedId ? rectangles.find(r => r.id === selectedId) || null : null;
  const selectedRectangles = selectedIds.map(id => rectangles.find(r => r.id === id)).filter(Boolean) as Rectangle[];
  const isMultiSelect = selectedIds.length > 1;
  
  const {
    gridSize,
    showGrid,
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight,
    rootFontSize,
    dynamicFontSizing,
    fontFamily,
    availableFonts,
    fontsLoading,
    borderRadius,
    borderColor,
    borderWidth,
    predefinedColors,
    margin,
    labelMargin,
    layoutAlgorithm,
  } = settings;



  // Helper function to get mixed value indicator
  const getMixedValueIndicator = (values: (string | number | boolean | undefined)[]): string | undefined => {
    const uniqueValues = [...new Set(values.filter(v => v !== undefined))];
    return uniqueValues.length > 1 ? 'Mixed values' : uniqueValues[0]?.toString();
  };

  // Multi-select rendering
  if (isMultiSelect) {
    const colors = selectedRectangles.map(r => r.color);
    const positions = selectedRectangles.map(r => `(${r.x}, ${r.y})`);
    const sizes = selectedRectangles.map(r => `${r.w} × ${r.h}`);
    const types = selectedRectangles.map(r => r.parentId ? 'Child' : 'Root');
    
    // Check if all selected rectangles have same values
    const allSameColor = colors.every(color => color === colors[0]);
    const commonColor = allSameColor ? colors[0] : undefined;

    return (
      <>
        {/* Multi-select header */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2 text-sm lg:text-base">
            Multiple Selected ({selectedIds.length} rectangles)
          </h3>
          <div className="text-xs lg:text-sm text-blue-700 space-y-1">
            <div>Colors: {getMixedValueIndicator(colors) || 'Mixed values'}</div>
            <div>Positions: {positions.length > 3 ? `${positions.slice(0, 3).join(', ')}...` : positions.join(', ')}</div>
            <div>Sizes: {getMixedValueIndicator(sizes) || 'Mixed values'}</div>
            <div>Types: {getMixedValueIndicator(types) || 'Mixed values'}</div>
          </div>
        </div>

        {/* Bulk color picker */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold mb-2 text-sm lg:text-base">Bulk Color Change</h3>
          <ColorPalette
            selectedColor={commonColor || colors[0]}
            onColorChange={(color) => {
              if (allSameColor && color === colors[0]) {
                // No change needed
                return;
              }
              
              // Apply color immediately without confirmation
              bulkUpdateColor(selectedIds, color);
            }}
            predefinedColors={predefinedColors}
            onUpdateColorSquare={updateColorSquare}
          />
          {!allSameColor && (
            <p className="text-xs text-gray-500 mt-2">
              ⚠️ Selected rectangles have different colors. New color will be applied to all.
            </p>
          )}
        </div>

        {/* Bulk heatmap value editor */}
        <BulkHeatmapValueEditor 
          selectedRectangles={selectedRectangles}
          heatmapEnabled={heatmapEnabled}
          selectedPaletteId={selectedPaletteId}
          palettes={palettes}
          undefinedValueColor={undefinedValueColor}
          bulkSetHeatmapValues={bulkSetHeatmapValues}
          getHeatmapColor={getHeatmapColor}
        />

        {/* Bulk operation shortcuts */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2 text-sm lg:text-base">Bulk Operations</h3>
          <div className="space-y-2">
            <p className="text-xs lg:text-sm text-gray-600">
              Use the context menu (right-click) for alignment, distribution, and other bulk operations.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-gray-100 px-2 py-1 rounded">Right-click → Align</span>
              <span className="bg-gray-100 px-2 py-1 rounded">Right-click → Distribute</span>
              <span className="bg-gray-100 px-2 py-1 rounded">Right-click → Delete</span>
            </div>
          </div>
        </div>

      </>
    );
  }

  // Single-select rendering: existing functionality preserved
  if (selectedId && selectedRectangle) {
    const children = useAppStore.getState().getters.getChildren(selectedId);
    
    return (
      <>
        {/* Color selection interface with palette and custom color support */}
        <ColorPalette
          selectedColor={selectedRectangle.color}
          onColorChange={(color) => updateRectangleColor(selectedId, color)}
          predefinedColors={predefinedColors}
          onUpdateColorSquare={updateColorSquare}
        />

        {/* Rectangle information panel showing key properties and hierarchy context */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2 text-sm lg:text-base">Selected: {selectedId}</h3>
          <div className="text-xs lg:text-sm text-gray-600 space-y-1">
            <div>Position: ({selectedRectangle.x}, {selectedRectangle.y})</div>
            <div>Size: {selectedRectangle.w} × {selectedRectangle.h}</div>
            <div>Children: {children.length}</div>
            <div>Type: {selectedRectangle.parentId ? 'Child' : 'Root'}</div>
            <div>Color: {selectedRectangle.color}</div>
            {selectedRectangle.isTextLabel && (
              <div>Mode: Text Label</div>
            )}
          </div>
        </div>

        {/* Heat Map Value section */}
        <HeatmapValueSection rectangleId={selectedId} />

        {/* Text Label Mode: Typography controls for leaf rectangles (no children) */}
        {children.length === 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2 text-sm lg:text-base">Text Label Mode</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="textLabelMode"
                  checked={selectedRectangle.isTextLabel || false}
                  onChange={() => toggleTextLabel(selectedId)}
                  className="rounded"
                />
                <label htmlFor="textLabelMode" className="text-xs lg:text-sm font-medium text-gray-700">
                  Enable Text Label Mode
                </label>
              </div>

              {selectedRectangle.isTextLabel && (
                <>
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                      Font Family
                    </label>
                    <select
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                      value={selectedRectangle.textFontFamily || 'Arial, sans-serif'}
                      onChange={(e) => updateTextLabelProperties(selectedId, { textFontFamily: e.target.value })}
                    >
                      {(availableFonts || []).map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                      Font Size
                    </label>
                    <input
                      type="number"
                      min="8"
                      max="72"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                      value={selectedRectangle.textFontSize || 14}
                      onChange={(e) => updateTextLabelProperties(selectedId, { textFontSize: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                      Font Weight
                    </label>
                    <select
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                      value={selectedRectangle.fontWeight || 'normal'}
                      onChange={(e) => updateTextLabelProperties(selectedId, { fontWeight: e.target.value as 'normal' | 'bold' })}
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                      Text Alignment
                    </label>
                    <select
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                      value={selectedRectangle.textAlign || 'center'}
                      onChange={(e) => updateTextLabelProperties(selectedId, { textAlign: e.target.value as 'left' | 'center' | 'right' | 'justify' })}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                      <option value="justify">Justify</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Layout Preferences: Advanced layout controls for parent rectangles */}
        {children.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2 text-sm lg:text-base">Layout Preferences</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                  Fill Strategy
                </label>
                <select
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                  value={selectedRectangle.layoutPreferences?.fillStrategy || 'default'}
                  onChange={(e) => {
                    /* Layout preference change handler with default fallback logic */
                    if (e.target.value === 'default') {
                      const newPreferences: LayoutPreferences = {
                        fillStrategy: 'fill-columns-first'
                      };
                      updateRectangleLayoutPreferences(selectedId, newPreferences);
                    } else {
                      const newPreferences: LayoutPreferences = {
                        ...selectedRectangle.layoutPreferences,
                        fillStrategy: e.target.value as 'fill-columns-first' | 'fill-rows-first'
                      };
                      updateRectangleLayoutPreferences(selectedId, newPreferences);
                    }
                  }}
                >
                  <option value="default">Default (Fill Columns First)</option>
                  <option value="fill-columns-first">Fill Columns First</option>
                  <option value="fill-rows-first">Fill Rows First</option>
                </select>
              </div>

              {/* Conditional layout constraint controls based on selected fill strategy */}
              {selectedRectangle.layoutPreferences?.fillStrategy === 'fill-rows-first' && (
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                    Max Columns
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                    value={selectedRectangle.layoutPreferences?.maxColumns || ''}
                    placeholder="Auto"
                    onChange={(e) => {
                      const maxColumns = e.target.value ? parseInt(e.target.value) : undefined;
                      const newPreferences: LayoutPreferences = {
                        ...selectedRectangle.layoutPreferences,
                        fillStrategy: 'fill-rows-first',
                        maxColumns: maxColumns
                      };
                      updateRectangleLayoutPreferences(selectedId, newPreferences);
                    }}
                  />
                </div>
              )}

              {selectedRectangle.layoutPreferences?.fillStrategy === 'fill-columns-first' && (
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                    Max Rows
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs lg:text-sm"
                    value={selectedRectangle.layoutPreferences?.maxRows || ''}
                    placeholder="Auto"
                    onChange={(e) => {
                      const maxRows = e.target.value ? parseInt(e.target.value) : undefined;
                      const newPreferences: LayoutPreferences = {
                        ...selectedRectangle.layoutPreferences,
                        fillStrategy: 'fill-columns-first',
                        maxRows: maxRows
                      };
                      updateRectangleLayoutPreferences(selectedId, newPreferences);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // Default state: Display global application settings when no rectangle is selected
  return (
    <GlobalSettings
      gridSize={gridSize}
      showGrid={showGrid}
      leafFixedWidth={leafFixedWidth}
      leafFixedHeight={leafFixedHeight}
      leafWidth={leafWidth}
      leafHeight={leafHeight}
      rootFontSize={rootFontSize}
      dynamicFontSizing={dynamicFontSizing}
      fontFamily={fontFamily}
      availableFonts={availableFonts || []}
      fontsLoading={fontsLoading || false}
      borderRadius={borderRadius}
      borderColor={borderColor}
      borderWidth={borderWidth}
      margin={margin}
      labelMargin={labelMargin}
      layoutAlgorithm={layoutAlgorithm}
    />
  );
};

export default PropertyPanel;
