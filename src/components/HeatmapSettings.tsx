import React, { useState } from 'react';
import { ArrowLeft, Palette, Upload, Download, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { HeatmapPalette } from '../stores/types';
import HeatmapImportModal from './HeatmapImportModal';

interface HeatmapSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Heat Map Settings Page Component
 * 
 * Provides heat map configuration including:
 * - Enable/disable toggle with immediate preview
 * - Palette selection and color gradient visualization
 * - Undefined value color configuration
 * - CSV import and custom palette management
 */
const HeatmapSettings: React.FC<HeatmapSettingsProps> = ({ isOpen, onClose }) => {
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Store selectors
  const heatmapEnabled = useAppStore(state => state.heatmap.enabled);
  const currentPaletteId = useAppStore(state => state.heatmap.selectedPaletteId);
  const palettes = useAppStore(state => state.heatmap.palettes);
  const undefinedValueColor = useAppStore(state => state.heatmap.undefinedValueColor);
  const showLegend = useAppStore(state => state.heatmap.showLegend);
  
  // Store actions
  const setEnabled = useAppStore(state => state.heatmapActions.setEnabled);
  const setSelectedPalette = useAppStore(state => state.heatmapActions.setSelectedPalette);
  const setUndefinedValueColor = useAppStore(state => state.heatmapActions.setUndefinedValueColor);
  const setShowLegend = useAppStore(state => state.heatmapActions.setShowLegend);
  const clearAllHeatmapValues = useAppStore(state => state.heatmapActions.clearAllHeatmapValues);
  
  // Initialize local state with current palette
  React.useEffect(() => {
    setSelectedPaletteId(currentPaletteId);
  }, [currentPaletteId]);
  
  const handlePaletteChange = (paletteId: string) => {
    setSelectedPaletteId(paletteId);
  };
  
  const handleDeploy = () => {
    setSelectedPalette(selectedPaletteId);
  };
  
  const handleClearValues = () => {
    if (window.confirm('Clear all heat map values? This cannot be undone.')) {
      clearAllHeatmapValues();
    }
  };
  
  const currentPalette = palettes.find(p => p.id === currentPaletteId);
  
  /**
   * Renders a color gradient preview for a palette
   */
  const PalettePreview: React.FC<{ palette: HeatmapPalette; className?: string }> = ({ 
    palette, 
    className = "h-8 w-full" 
  }) => {
    const gradientStops = palette.stops
      .sort((a, b) => a.value - b.value)
      .map(stop => `${stop.color} ${stop.value * 100}%`)
      .join(', ');
    
    return (
      <div 
        className={`rounded border border-gray-300 ${className}`}
        style={{
          background: `linear-gradient(to right, ${gradientStops})`
        }}
        title={`${palette.name} palette`}
      />
    );
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Close heat map settings"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-orange-600" />
            <h2 className="text-xl font-semibold">Heat Map Settings</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Enable/Disable Toggle */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              {heatmapEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
              Heat Map Overlay
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heatmapEnabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="font-medium">
                  {heatmapEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
              {heatmapEnabled && (
                <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  Heat map colors active
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              When enabled, rectangles with heat map values will display using the selected color palette 
              instead of their normal colors.
            </p>
          </div>

          {/* Current Palette Display */}
          {heatmapEnabled && currentPalette && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900">Currently Active Palette</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{currentPalette.name}</span>
                  {currentPalette.isCustom && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      Custom
                    </span>
                  )}
                </div>
                <PalettePreview palette={currentPalette} />
                <div className="flex text-xs text-gray-600 justify-between">
                  <span>0.0 (Low)</span>
                  <span>1.0 (High)</span>
                </div>
              </div>
            </div>
          )}

          {/* Palette Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Choose Palette</h3>
            <div className="grid gap-3">
              {palettes.map((palette) => (
                <label
                  key={palette.id}
                  className={`
                    cursor-pointer p-4 rounded-lg border-2 transition-all
                    ${selectedPaletteId === palette.id 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="palette"
                    value={palette.id}
                    checked={selectedPaletteId === palette.id}
                    onChange={() => handlePaletteChange(palette.id)}
                    className="sr-only"
                  />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{palette.name}</span>
                      {palette.isCustom && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <PalettePreview palette={palette} />
                    <div className="flex text-xs text-gray-500 justify-between">
                      <span>0.0</span>
                      <span>0.5</span>
                      <span>1.0</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            {/* Palette Change Indicator */}
            {selectedPaletteId !== currentPaletteId && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Palette changed.</strong> Click "Apply Palette" below to update the heat map.
                </p>
              </div>
            )}
          </div>

          {/* Undefined Value Color */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Undefined Value Color</h3>
            <p className="text-sm text-gray-600">
              Color used for rectangles that don't have a heat map value assigned.
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium">Color:</span>
                <input
                  type="color"
                  value={undefinedValueColor}
                  onChange={(e) => setUndefinedValueColor(e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </label>
              <div 
                className="w-16 h-8 border border-gray-300 rounded"
                style={{ backgroundColor: undefinedValueColor }}
              />
              <button
                onClick={() => setUndefinedValueColor('#e5e7eb')}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Reset to default
              </button>
            </div>
          </div>

          {/* Legend Toggle */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Legend</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLegend}
                onChange={(e) => setShowLegend(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <span>Show color scale legend on canvas</span>
            </label>
            <p className="text-sm text-gray-600">
              Displays a floating legend showing the color scale from 0.0 to 1.0.
            </p>
          </div>

          {/* Management Actions */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium">Management</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleClearValues}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <RotateCcw size={16} />
                Clear All Values
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                title="Import heat map values from CSV file"
              >
                <Upload size={16} />
                Import CSV
              </button>
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
                title="Custom palette creation"
              >
                <Download size={16} />
                Export Values
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
          
          <div className="flex gap-3">
            {selectedPaletteId !== currentPaletteId && (
              <button
                onClick={handleDeploy}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Apply Palette
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* CSV Import Modal */}
      <HeatmapImportModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
};

export default HeatmapSettings;