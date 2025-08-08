import React from 'react';
import { useAppStore } from '../stores/useAppStore';

interface HeatmapLegendProps {
  /** Whether the legend is visible */
  visible?: boolean;
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
const HeatmapLegend: React.FC<HeatmapLegendProps> = ({ visible = true }) => {
  const heatmapEnabled = useAppStore(state => state.heatmap.enabled);
  const showLegend = useAppStore(state => state.heatmap.showLegend);
  const selectedPaletteId = useAppStore(state => state.heatmap.selectedPaletteId);
  const palettes = useAppStore(state => state.heatmap.palettes);

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

  // Generate value labels (0.0, 0.25, 0.5, 0.75, 1.0)
  const valueLabels = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className="fixed bottom-4 right-4 z-40 pointer-events-none">
      <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 min-w-64">
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
          
          {/* Value markers */}
          <div className="absolute top-0 left-0 w-full h-full flex justify-between items-center px-1">
            {valueLabels.map((value) => (
              <div 
                key={value}
                className="relative"
                style={{ left: `${(value * 100)}%`, transform: 'translateX(-50%)' }}
              >
                {/* Tick mark */}
                <div className="absolute top-0 w-px h-4 bg-gray-600 opacity-30" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Value Labels */}
        <div className="flex justify-between text-xs text-gray-600 px-1">
          {valueLabels.map(value => (
            <span 
              key={value}
              className="transform -translate-x-1/2"
              style={{ 
                position: 'relative',
                left: `${(value * 100)}%`
              }}
            >
              {value.toFixed(1)}
            </span>
          ))}
        </div>
        
        {/* Description */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapLegend;