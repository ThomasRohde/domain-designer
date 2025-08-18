import React from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../stores/useAppStore';

interface HeatmapLegendProps {
  /** Whether the legend is visible */
  visible?: boolean;
  /** If true, shift left when sidebar is open (editor). Disable in viewer pages. */
  compensateForSidebar?: boolean;
}

/**
 * Heat Map Legend Component
 * 
 * Displays a floating legend showing the heat map color scale from 0.0 to 1.0.
 * Features:
 * - Bottom-right positioned floating legend
 * - Semi-transparent background for readability
 * - Color gradient visualization with value labels
 * - Shows current palette name and range
 * - Only displays when heat map is enabled and legend toggle is active
 */
const HeatmapLegend: React.FC<HeatmapLegendProps> = ({ visible = true, compensateForSidebar = true }) => {
  const heatmapEnabled = useAppStore(state => state.heatmap.enabled);
  const showLegend = useAppStore(state => state.heatmap.showLegend);
  const selectedPaletteId = useAppStore(state => state.heatmap.selectedPaletteId);
  const palettes = useAppStore(state => state.heatmap.palettes);
  // Detect if the right sidebar (PropertyPanel/GlobalSettings) is open to avoid overlap
  const sidebarOpen = useAppStore(state => state.ui.sidebarOpen);

  // Only show legend if heat map is enabled, legend is toggled on, and component is visible
  if (!visible || !heatmapEnabled || !showLegend) {
    return null;
  }

  const currentPalette = palettes.find(p => p.id === selectedPaletteId);
  if (!currentPalette) {
    return null;
  }

  // Create gradient CSS from palette stops
  const gradientStops = [...currentPalette.stops]
    .sort((a, b) => a.value - b.value)
    .map(stop => `${stop.color} ${stop.value * 100}%`)
    .join(', ');
  
  const gradientStyle = {
    background: `linear-gradient(to right, ${gradientStops})`
  };

  // Generate value labels in 0.2 steps for clean one-decimal formatting
  const valueLabels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  // When the sidebar is open (and compensation enabled), shift legend left by sidebar width (w-96 = 24rem) + 1rem gap
  const rightOffset = compensateForSidebar && sidebarOpen ? 'calc(24rem + 1rem)' : '1rem';

  const legendEl = (
    <div
      className="fixed bottom-4 z-30 pointer-events-none"
      style={{ right: rightOffset }}
    >
  <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 pb-6 min-w-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">Heat Map Scale</span>
          <span className="text-xs text-gray-500">{currentPalette.name}</span>
        </div>
        
        {/* Gradient Bar */}
        <div className="relative mb-2">
          <div 
            className="h-4 rounded border border-gray-300"
            style={gradientStyle}
          />
        </div>
        
        {/* Value Labels (absolute at matching positions) */}
        <div className="relative text-xs text-gray-600">
          {valueLabels.map((value) => {
            const transform = value === 0
              ? 'translateX(0%)'
              : value === 1
                ? 'translateX(-100%)'
                : 'translateX(-50%)';
            return (
              <span
                key={value}
                className="absolute select-none"
                style={{ left: `${value * 100}%`, transform }}
              >
                {value.toFixed(1)}
              </span>
            );
          })}
        </div>
        
  {/* Footer description removed (Low/High) */}
      </div>
    </div>
  );

  // Render via portal to avoid clipping by ancestor overflow/rounded containers
  return createPortal(legendEl, document.body);
};

export default HeatmapLegend;