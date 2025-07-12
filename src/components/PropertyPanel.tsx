import React from 'react';
import { Rectangle, AppSettings, LayoutPreferences } from '../types';
import { getChildren } from '../utils/layoutUtils';
import ColorPalette from './ColorPalette';
import GlobalSettings from './GlobalSettings';

export interface PropertyPanelProps {
  selectedId: string | null;
  selectedRectangle: Rectangle | null;
  rectangles: Rectangle[];
  onColorChange: (id: string, color: string) => void;
  onLayoutPreferencesChange: (id: string, preferences: LayoutPreferences) => void;
  appSettings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onAddCustomColor: (color: string) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedId,
  selectedRectangle,
  rectangles,
  onColorChange,
  onLayoutPreferencesChange,
  appSettings,
  onSettingsChange,
  onAddCustomColor,
}) => {
  const {
    gridSize,
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight,
    rootFontSize,
    dynamicFontSizing,
    borderRadius,
    borderColor,
    borderWidth,
    predefinedColors,
    margin,
    labelMargin,
    layoutAlgorithm,
  } = appSettings;

  if (selectedId && selectedRectangle) {
    // Node is selected: Show color picker and node details
    const children = getChildren(selectedId, rectangles);
    
    return (
      <>
        <ColorPalette
          selectedColor={selectedRectangle.color}
          onColorChange={(color) => onColorChange(selectedId, color)}
          predefinedColors={predefinedColors}
          onAddCustomColor={onAddCustomColor}
        />

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2 text-sm lg:text-base">Selected: {selectedId}</h3>
          <div className="text-xs lg:text-sm text-gray-600 space-y-1">
            <div>Position: ({selectedRectangle.x}, {selectedRectangle.y})</div>
            <div>Size: {selectedRectangle.w} × {selectedRectangle.h}</div>
            <div>Children: {children.length}</div>
            <div>Type: {selectedRectangle.parentId ? 'Child' : 'Root'}</div>
            <div>Color: {selectedRectangle.color}</div>
          </div>
        </div>

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
                    if (e.target.value === 'default') {
                      // Set to default behavior (fill columns first)
                      const newPreferences: LayoutPreferences = {
                        fillStrategy: 'fill-columns-first'
                      };
                      onLayoutPreferencesChange(selectedId, newPreferences);
                    } else {
                      const newPreferences: LayoutPreferences = {
                        ...selectedRectangle.layoutPreferences,
                        fillStrategy: e.target.value as 'fill-columns-first' | 'fill-rows-first'
                      };
                      onLayoutPreferencesChange(selectedId, newPreferences);
                    }
                  }}
                >
                  <option value="default">Default (Fill Columns First)</option>
                  <option value="fill-columns-first">Fill Columns First</option>
                  <option value="fill-rows-first">Fill Rows First</option>
                </select>
              </div>

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
                      onLayoutPreferencesChange(selectedId, newPreferences);
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
                      onLayoutPreferencesChange(selectedId, newPreferences);
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

  // No node selected: Show global settings
  return (
    <GlobalSettings
      gridSize={gridSize}
      onGridSizeChange={(size) => onSettingsChange({ gridSize: size })}
      leafFixedWidth={leafFixedWidth}
      onLeafFixedWidthChange={(enabled) => onSettingsChange({ leafFixedWidth: enabled })}
      leafFixedHeight={leafFixedHeight}
      onLeafFixedHeightChange={(enabled) => onSettingsChange({ leafFixedHeight: enabled })}
      leafWidth={leafWidth}
      onLeafWidthChange={(width) => onSettingsChange({ leafWidth: width })}
      leafHeight={leafHeight}
      onLeafHeightChange={(height) => onSettingsChange({ leafHeight: height })}
      rootFontSize={rootFontSize}
      onRootFontSizeChange={(size) => onSettingsChange({ rootFontSize: size })}
      dynamicFontSizing={dynamicFontSizing}
      onDynamicFontSizingChange={(enabled) => onSettingsChange({ dynamicFontSizing: enabled })}
      borderRadius={borderRadius}
      onBorderRadiusChange={(radius) => onSettingsChange({ borderRadius: radius })}
      borderColor={borderColor}
      onBorderColorChange={(color) => onSettingsChange({ borderColor: color })}
      borderWidth={borderWidth}
      onBorderWidthChange={(width) => onSettingsChange({ borderWidth: width })}
      margin={margin}
      onMarginChange={(margin) => onSettingsChange({ margin: margin })}
      labelMargin={labelMargin}
      onLabelMarginChange={(labelMargin) => onSettingsChange({ labelMargin: labelMargin })}
      layoutAlgorithm={layoutAlgorithm}
      onLayoutAlgorithmChange={(algorithm) => onSettingsChange({ layoutAlgorithm: algorithm })}
    />
  );
};

export default React.memo(PropertyPanel);
