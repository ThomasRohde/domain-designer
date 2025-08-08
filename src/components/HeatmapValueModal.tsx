import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

interface HeatmapValueModalProps {
  isOpen: boolean;
  rectangleId: string;
  rectangleLabel: string;
  currentValue?: number;
  onClose: () => void;
}

/**
 * Heat Map Value Assignment Modal
 * 
 * Provides interface for setting individual rectangle heat map values:
 * - Slider for intuitive 0-1 range selection
 * - Number input for precise values
 * - Live color preview based on current palette
 * - Clear value option
 * - Immediate value validation and feedback
 */
const HeatmapValueModal: React.FC<HeatmapValueModalProps> = ({
  isOpen,
  rectangleId,
  rectangleLabel,
  currentValue,
  onClose
}) => {
  const [value, setValue] = useState<number>(currentValue ?? 0.5);
  const [inputValue, setInputValue] = useState<string>(currentValue?.toString() ?? '0.5');
  const [hasValue, setHasValue] = useState<boolean>(currentValue !== undefined);

  // Store selectors
  const heatmapEnabled = useAppStore(state => state.heatmap.enabled);
  const palettes = useAppStore(state => state.heatmap.palettes);
  const selectedPaletteId = useAppStore(state => state.heatmap.selectedPaletteId);
  const undefinedValueColor = useAppStore(state => state.heatmap.undefinedValueColor);
  
  // Store actions
  const setRectangleHeatmapValue = useAppStore(state => state.heatmapActions.setRectangleHeatmapValue);

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialValue = currentValue ?? 0.5;
      setValue(initialValue);
      setInputValue(initialValue.toString());
      setHasValue(currentValue !== undefined);
    }
  }, [isOpen, currentValue]);

  const selectedPalette = palettes.find(p => p.id === selectedPaletteId);

  // Get preview color for current value
  const getPreviewColor = () => {
    if (!hasValue) {
      return undefinedValueColor;
    }
    
    if (!selectedPalette) {
      return undefinedValueColor;
    }

    // Simulate color calculation (same logic as in heatmapSlice)
    const clampedValue = Math.max(0, Math.min(1, value));
    const stops = [...selectedPalette.stops].sort((a, b) => a.value - b.value);
    
    // Find the two stops to interpolate between
    for (let i = 0; i < stops.length - 1; i++) {
      const stop1 = stops[i];
      const stop2 = stops[i + 1];
      
      if (clampedValue >= stop1.value && clampedValue <= stop2.value) {
        const factor = (clampedValue - stop1.value) / (stop2.value - stop1.value);
        return interpolateColor(stop1.color, stop2.color, factor);
      }
    }
    
    // If value is before first stop or after last stop
    if (clampedValue <= stops[0].value) {
      return stops[0].color;
    }
    return stops[stops.length - 1].color;
  };

  // Helper function for color interpolation
  const interpolateColor = (color1: string, color2: string, factor: number): string => {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const handleSliderChange = (newValue: number) => {
    setValue(newValue);
    setInputValue(newValue.toString());
    setHasValue(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputStr = e.target.value;
    setInputValue(inputStr);

    // Try to parse the input
    const parsedValue = parseFloat(inputStr);
    if (!isNaN(parsedValue)) {
      const clampedValue = Math.max(0, Math.min(1, parsedValue));
      setValue(clampedValue);
      setHasValue(true);
      
      // Update input to show clamped value if it was out of range
      if (parsedValue !== clampedValue) {
        setInputValue(clampedValue.toString());
      }
    }
  };

  const handleClearValue = () => {
    setHasValue(false);
    setValue(0.5);
    setInputValue('0.5');
  };

  const handleSave = () => {
    if (hasValue) {
      setRectangleHeatmapValue(rectangleId, value);
    } else {
      setRectangleHeatmapValue(rectangleId, undefined);
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  const previewColor = getPreviewColor();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold">Set Heat Map Value</h2>
            <p className="text-sm text-gray-600 mt-1">
              Rectangle: <span className="font-medium">{rectangleLabel}</span>
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Close without saving"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Value Status */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasValue}
                onChange={(e) => {
                  setHasValue(e.target.checked);
                  if (!e.target.checked) {
                    setValue(0.5);
                    setInputValue('0.5');
                  }
                }}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <span className="font-medium">Assign heat map value</span>
            </label>
            
            {hasValue && (
              <button
                onClick={handleClearValue}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                title="Clear heat map value"
              >
                <Trash2 size={14} />
                Clear
              </button>
            )}
          </div>

          {!hasValue && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">
                Rectangle will use the undefined value color when heat map is enabled.
              </p>
            </div>
          )}

          {hasValue && (
            <>
              {/* Slider */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Value (0.0 - 1.0)
                </label>
                <div className="px-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value}
                    onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-orange"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.0 (Low)</span>
                    <span className="font-medium">{value.toFixed(2)}</span>
                    <span>1.0 (High)</span>
                  </div>
                </div>
              </div>

              {/* Number Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Precise Value
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={inputValue}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="0.50"
                />
                <p className="text-xs text-gray-500">
                  Enter a value between 0.00 and 1.00
                </p>
              </div>

              {/* Color Preview */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Color Preview
                </label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 border-2 border-gray-300 rounded-lg shadow-sm"
                    style={{ backgroundColor: previewColor }}
                    title={`Color for value ${value.toFixed(2)}`}
                  />
                  <div className="text-sm text-gray-600">
                    <p><strong>Current value:</strong> {value.toFixed(2)}</p>
                    <p><strong>Color:</strong> {previewColor}</p>
                    {selectedPalette && (
                      <p><strong>Palette:</strong> {selectedPalette.name}</p>
                    )}
                  </div>
                </div>
              </div>

              {!heatmapEnabled && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Heat map overlay is currently disabled. 
                    Enable it in Heat Map Settings to see this color applied.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Save Value
          </button>
        </div>
      </div>

      {/* Custom slider styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .slider-orange::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #ea580c;
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider-orange::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #ea580c;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}} />
    </div>
  );
};

export default HeatmapValueModal;