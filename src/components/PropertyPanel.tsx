import React from 'react';
import { Rectangle, AppSettings } from '../types';
import { getChildren } from '../utils/layoutUtils';
import ColorPalette from './ColorPalette';
import GlobalSettings from './GlobalSettings';

export interface PropertyPanelProps {
  selectedId: string | null;
  selectedRectangle: Rectangle | null;
  rectangles: Rectangle[];
  onColorChange: (id: string, color: string) => void;
  appSettings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onAddCustomColor: (color: string) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedId,
  selectedRectangle,
  rectangles,
  onColorChange,
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
    />
  );
};

export default React.memo(PropertyPanel);
