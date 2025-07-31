import React from 'react';
import { LayoutPreferences } from '../types';
import { useAppStore } from '../stores/useAppStore';
import ColorPalette from './ColorPalette';
import GlobalSettings from './GlobalSettings';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PropertyPanelProps {
  // No props needed - component will access store directly
}

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
  const selectedId = useAppStore(state => state.selectedId);
  const rectangles = useAppStore(state => state.rectangles);
  const settings = useAppStore(state => state.settings);
  
  // Rectangle manipulation actions
  const updateRectangleColor = useAppStore(state => state.rectangleActions.updateRectangleColor);
  const updateRectangleLayoutPreferences = useAppStore(state => state.rectangleActions.updateRectangleLayoutPreferences);
  const toggleTextLabel = useAppStore(state => state.rectangleActions.toggleTextLabel);
  const updateTextLabelProperties = useAppStore(state => state.rectangleActions.updateTextLabelProperties);
  const updateColorSquare = useAppStore(state => state.settingsActions.updateColorSquare);
  
  const selectedRectangle = selectedId ? rectangles.find(r => r.id === selectedId) || null : null;
  
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


  // Conditional rendering: selected rectangle properties vs global settings
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
