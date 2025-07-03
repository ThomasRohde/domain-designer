import React, { useState } from 'react';
import { Palette, Plus } from 'lucide-react';

interface ColorPaletteProps {
  selectedColor?: string;
  onColorChange: (color: string) => void;
}

// Predefined color palette
const PREDEFINED_COLORS = [
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
  const [customColor, setCustomColor] = useState('#000000');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handleCustomColorSubmit = () => {
    onColorChange(customColor);
    setShowCustomPicker(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Palette size={16} />
          Color Palette
        </h3>
        <button
          onClick={() => setShowCustomPicker(!showCustomPicker)}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          title="Add custom color"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Predefined Colors */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PREDEFINED_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
              selectedColor === color
                ? 'border-gray-800 shadow-md ring-2 ring-gray-300'
                : 'border-gray-200 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Custom Color Picker */}
      {showCustomPicker && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#000000"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCustomColorSubmit}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Selected Color Display */}
      {selectedColor && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-300"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="text-sm font-medium">Selected: {selectedColor}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPalette;