import React, { useState } from 'react';
import { Palette } from 'lucide-react';

interface ColorPaletteProps {
  selectedColor?: string;
  onColorChange: (color: string) => void;
}

// Initial predefined color palette
const INITIAL_PREDEFINED_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
  '#F8C471', // Orange
  '#82E0AA', // Light Green
  '#EC7063', // Light Red
  '#AED6F1', // Sky Blue
  '#F9E79F', // Pale Yellow
  '#D7BDE2', // Pale Purple
];

const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorChange
}) => {
  const [predefinedColors, setPredefinedColors] = useState(INITIAL_PREDEFINED_COLORS);
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  const handleCustomColorChange = (newColor: string) => {
    onColorChange(newColor);
    
    // If the new color is not already in the predefined colors, replace the last one
    if (!predefinedColors.includes(newColor)) {
      const updatedColors = [...predefinedColors];
      updatedColors[updatedColors.length - 1] = newColor;
      setPredefinedColors(updatedColors);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-3 lg:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm lg:text-base">
          <Palette size={16} />
          <span className="hidden sm:inline">Color Palette</span>
          <span className="sm:hidden">Colors</span>
        </h3>
      </div>

      {/* Predefined Colors */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 lg:gap-2 mb-4">
        {predefinedColors.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
              selectedColor === color
                ? 'border-gray-800 shadow-md ring-2 ring-gray-300'
                : 'border-gray-200 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Selected Color Display */}
      {selectedColor && (
        <div className="mt-4 p-2 lg:p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 lg:w-6 lg:h-6 rounded border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors relative"
              style={{ backgroundColor: selectedColor }}
              title="Click to change color"
            >
              {/* Invisible color input positioned over the color square */}
              <input
                ref={colorInputRef}
                type="color"
                value={selectedColor || '#000000'}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                tabIndex={-1}
              />
            </div>
            <span className="text-xs lg:text-sm font-medium">
              <span className="hidden sm:inline">Selected: </span>
              {selectedColor}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

export default ColorPalette;