import React, { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

interface ColorPaletteProps {
  selectedColor?: string;
  onColorChange: (color: string) => void;
  predefinedColors: string[];
  onUpdateColorSquare: (index: number, color: string) => void;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorChange,
  predefinedColors,
  onUpdateColorSquare
}) => {
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedSquareIndex, setSelectedSquareIndex] = useState<number | null>(null);
  const [hexInput, setHexInput] = useState('');

  // Find if the selected rectangle color matches any predefined color
  useEffect(() => {
    if (selectedColor) {
      const matchingIndex = predefinedColors.findIndex(color => color === selectedColor);
      if (matchingIndex !== -1) {
        setSelectedSquareIndex(matchingIndex);
      } else {
        // No match found, don't auto-select any square
        setSelectedSquareIndex(null);
      }
      // Update hex input to match selected color
      setHexInput(selectedColor);
    }
  }, [selectedColor, predefinedColors]);

  const isValidHexColor = (hex: string): boolean => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
  };

  const handleHexInputChange = (value: string) => {
    setHexInput(value);
    
    // If it's a valid hex color, update the color
    if (isValidHexColor(value)) {
      handleCustomColorChange(value);
    }
  };

  const handleHexInputBlur = () => {
    // On blur, if the input is not a valid hex color, reset it to the current selected color
    if (!isValidHexColor(hexInput) && selectedColor) {
      setHexInput(selectedColor);
    }
  };

  const handleCustomColorChange = (newColor: string) => {
    // If no square is selected, select the bottom-right square (last index)
    const targetIndex = selectedSquareIndex !== null ? selectedSquareIndex : predefinedColors.length - 1;
    
    // Update the specific color square
    onUpdateColorSquare(targetIndex, newColor);
    
    // Update the rectangle color
    onColorChange(newColor);
    
    // Keep the same square selected
    setSelectedSquareIndex(targetIndex);
  };

  const handleSquareClick = (color: string, index: number) => {
    setSelectedSquareIndex(index);
    onColorChange(color);
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
        {predefinedColors.map((color, index) => (
          <button
            key={`${color}-${index}`}
            onClick={() => handleSquareClick(color, index)}
            className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
              selectedSquareIndex === index
                ? 'border-blue-500 shadow-md ring-2 ring-blue-200'
                : selectedColor === color && selectedSquareIndex === null
                ? 'border-gray-800 shadow-md ring-2 ring-gray-300'
                : 'border-gray-200 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={`${color} (Square ${index + 1})`}
          />
        ))}
      </div>

      {/* Selected Color Display */}
      {selectedColor && (
        <div className="mt-4 p-2 lg:p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
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
          
          {/* Hex Input Field */}
          <div className="flex items-center gap-2">
            <label className="text-xs lg:text-sm font-medium text-gray-600 whitespace-nowrap">
              Hex:
            </label>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexInputChange(e.target.value)}
              onBlur={handleHexInputBlur}
              className="flex-1 px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default ColorPalette;