import React, { useState } from 'react';
import { X, Palette, Upload, Download, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { generateHeatmapCSV } from '../utils/heatmapImport';
import { exportFile } from '../utils/exportUtils';
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
  const [exportIncludeMissingAsZero, setExportIncludeMissingAsZero] = useState<boolean>(false);
  
  // Store selectors
  const heatmapEnabled = useAppStore(state => state.heatmap.enabled);
  const rectangles = useAppStore(state => state.rectangles);
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

  // Close on ESC
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Ensure nested Import CSV modal is closed whenever settings closes
  React.useEffect(() => {
    if (!isOpen) {
      setShowImportModal(false);
    }
  }, [isOpen]);

  const handleCloseSettings = () => {
    setShowImportModal(false);
    onClose();
  };
  
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

  const handleExportCSV = async () => {
    // Generate CSV from current rectangles with heatmap values
    const csv = generateHeatmapCSV(rectangles, exportIncludeMissingAsZero);
    const hasData = csv.split('\n').length > 1; // header + at least one row
    if (!hasData) {
      alert('No heat map values to export. Assign values first or import from CSV.');
      return;
    }
    await exportFile({
      filename: 'heatmap-values',
      content: csv,
      mimeType: 'text/csv',
      extension: 'csv',
      description: 'CSV files'
    });
  };
  
  const currentPalette = palettes.find(p => p.id === currentPaletteId);
  
  /**
   * Renders a color gradient preview for a palette
   */
  const PalettePreview: React.FC<{ palette: HeatmapPalette; className?: string }> = ({ 
    palette, 
    className = "h-8 w-full" 
  }) => {
    const gradientStops = [...palette.stops]
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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleCloseSettings}
      role="dialog"
      aria-modal="true"
      aria-labelledby="heatmap-settings-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[82vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-orange-600" />
            <h2 id="heatmap-settings-title" className="text-lg font-semibold">Heat Map Settings</h2>
          </div>
          <button
            onClick={handleCloseSettings}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            title="Close (Esc)"
            aria-label="Close heat map settings (Esc)"
          >
            <X size={16} />
            <span>Close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(82vh-104px)]">
          {/* Enable/Disable Toggle */}
          <div className="space-y-3">
            <h3 className="text-base font-medium flex items-center gap-2">
              {heatmapEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
              Heat Map Overlay
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heatmapEnabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="font-medium">
                  {heatmapEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
              {heatmapEnabled && (
                <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                  Heat map colors active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600">
              When enabled, rectangles with heat map values will display using the selected color palette 
              instead of their normal colors.
            </p>
          </div>

          {/* Current Palette Display */}
          {heatmapEnabled && currentPalette && (
            <div className="space-y-3 p-4 bg-blue-50/60 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900">Active Palette</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{currentPalette.name}</span>
                  {currentPalette.isCustom && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      Custom
                    </span>
                  )}
                </div>
                <PalettePreview palette={currentPalette} className="h-8 w-full" />
                <div className="flex text-[11px] text-gray-600 justify-between">
                  <span>0.0 (Low)</span>
                  <span>1.0 (High)</span>
                </div>
              </div>
            </div>
          )}

          {/* Palette Selection */}
          <div className="space-y-3">
            <h3 className="text-base font-medium">Choose Palette</h3>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {palettes.map((palette) => (
                <label
                  key={palette.id}
                  className={`
                    cursor-pointer p-3 rounded-lg border-2 transition-all
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
                    <PalettePreview palette={palette} className="h-6 w-full" />
                    <div className="flex text-[11px] text-gray-500 justify-between">
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
              <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Palette changed.</strong> Click "Apply Palette" below to update the heat map.
                </p>
              </div>
            )}
          </div>

          {/* Quick Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Undefined Value Color */}
            <div className="space-y-2">
              <h3 className="text-base font-medium">Undefined Value Color</h3>
              <p className="text-xs text-gray-600">Used for rectangles without a heat map value.</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <span className="text-sm font-medium">Color:</span>
                  <input
                    type="color"
                    value={undefinedValueColor}
                    onChange={(e) => setUndefinedValueColor(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                </label>
                <div
                  className="w-14 h-8 border border-gray-300 rounded"
                  style={{ backgroundColor: undefinedValueColor }}
                />
                <button
                  onClick={() => setUndefinedValueColor('#e5e7eb')}
                  className="text-xs text-gray-600 hover:text-gray-800 underline"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Legend Toggle */}
            <div className="space-y-2">
              <h3 className="text-base font-medium">Legend</h3>
              <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm">Show color scale legend on canvas</span>
              </label>
              <p className="text-xs text-gray-600">Displays a floating legend from 0.0 to 1.0.</p>
            </div>
          </div>

          {/* Management Actions */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <h3 className="text-base font-medium">Management</h3>
            <div className="flex flex-wrap gap-3 items-center">
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
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                title="Export current heat map values to CSV"
              >
                <Download size={16} />
                Export CSV
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-700 ml-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={exportIncludeMissingAsZero}
                  onChange={(e) => setExportIncludeMissingAsZero(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span>Include 0.0 for missing values</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 px-6 py-3 flex justify-between items-center">
          <button
            onClick={handleCloseSettings}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Close
          </button>
          
          <div className="flex gap-3">
            {selectedPaletteId !== currentPaletteId && (
              <button
                onClick={handleDeploy}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-sm"
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