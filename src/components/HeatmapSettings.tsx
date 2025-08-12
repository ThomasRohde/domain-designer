import React, { useState } from 'react';
import { X, Palette, Upload, Download, Eye, EyeOff, RotateCcw, RefreshCw } from 'lucide-react';
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
 * Heatmap Settings Modal Component
 * 
 * Comprehensive heatmap configuration interface featuring:
 * - Global enable/disable toggle with immediate visual feedback
 * - Scalable dropdown palette selection (replaced grid for better UX with 11+ palettes)
 * - Real-time palette preview with color gradient visualization
 * - Undefined value color configuration for rectangles without data
 * - CSV import/export workflow with validation and error reporting
 * - Palette refresh mechanism to reload predefined scientific palettes
 * 
 * The component implements a deferred application pattern - palette changes
 * are previewed locally before applying to prevent accidental switches.
 */
const HeatmapSettings: React.FC<HeatmapSettingsProps> = ({ isOpen, onClose }) => {
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportIncludeMissingAsZero, setExportIncludeMissingAsZero] = useState<boolean>(false);
  
  // Store selectors - reactive state subscriptions
  const heatmapEnabled = useAppStore(state => state.heatmap.enabled);
  const rectangles = useAppStore(state => state.rectangles);
  const currentPaletteId = useAppStore(state => state.heatmap.selectedPaletteId);
  const palettes = useAppStore(state => state.heatmap.palettes);
  const undefinedValueColor = useAppStore(state => state.heatmap.undefinedValueColor);
  const showLegend = useAppStore(state => state.heatmap.showLegend);
  
  // Store actions - heatmap operations
  const setEnabled = useAppStore(state => state.heatmapActions.setEnabled);
  const setSelectedPalette = useAppStore(state => state.heatmapActions.setSelectedPalette);
  const setUndefinedValueColor = useAppStore(state => state.heatmapActions.setUndefinedValueColor);
  const setShowLegend = useAppStore(state => state.heatmapActions.setShowLegend);
  const clearAllHeatmapValues = useAppStore(state => state.heatmapActions.clearAllHeatmapValues);
  const refreshPalettes = useAppStore(state => state.heatmapActions.refreshPalettes);
  
  // Sync local palette selection with store state to enable preview-before-apply workflow
  React.useEffect(() => {
    setSelectedPaletteId(currentPaletteId);
  }, [currentPaletteId]);

  // Standard modal ESC key handling for accessibility
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Reset nested modal state when parent modal closes to prevent state leaks
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
    const csv = generateHeatmapCSV(rectangles, exportIncludeMissingAsZero);
    // Validate export has actual data (more than just headers)
    const hasData = csv.split('\n').length > 1;
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
   * Renders smooth color gradient preview from palette color stops.
   * 
   * Creates CSS linear gradient by sorting stops by value and positioning
   * each color at its percentage point along the gradient. This provides
   * accurate visual representation of how values will be colored.
   */
  const PalettePreview: React.FC<{ palette: HeatmapPalette; className?: string }> = ({ 
    palette, 
    className = "h-8 w-full" 
  }) => {
    // Sort stops by value and convert to CSS gradient stops with percentage positions
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
      onClick={() => {
        // If the nested Import modal is open, ignore backdrop clicks to avoid unmounting mid-file selection
        if (showImportModal) return;
        handleCloseSettings();
      }}
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
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">Choose Palette</h3>
              <button
                onClick={refreshPalettes}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-700 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                title="Reload predefined scientific palettes (resets to latest definitions)"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
            <div className="space-y-3">
              {/* Dropdown-based palette selection - scales better than grid for 11+ palettes */}
              <div className="relative">
                <select
                  value={selectedPaletteId}
                  onChange={(e) => handlePaletteChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none cursor-pointer"
                >
                  {palettes.map((palette) => (
                    <option key={palette.id} value={palette.id}>
                      {palette.name}{palette.isCustom ? ' (Custom)' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Real-time preview of currently selected palette with value labels */}
              {(() => {
                const selectedPalette = palettes.find(p => p.id === selectedPaletteId);
                return selectedPalette ? (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{selectedPalette.name}</span>
                      {selectedPalette.isCustom && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <PalettePreview palette={selectedPalette} className="h-6 w-full" />
                    <div className="flex text-[11px] text-gray-500 justify-between">
                      <span>0.0 (Low)</span>
                      <span>0.5 (Mid)</span>
                      <span>1.0 (High)</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            
            {/* Deferred application indicator - shows when local preview differs from applied state */}
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
              <div className="flex items-center gap-3">
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
                <button
                  onClick={() => setUndefinedValueColor('#e5e7eb')}
                  className="px-2 py-1 text-xs bg-gray-50 text-gray-700 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
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