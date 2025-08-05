import React from 'react';
import { Settings, Lock, Unlock, Loader2 } from 'lucide-react';
import type { LayoutAlgorithmType } from '../utils/layout';
import { useAppStore } from '../stores/useAppStore';

interface GlobalSettingsProps {
  gridSize: number;
  showGrid: boolean;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
  rootFontSize: number;
  dynamicFontSizing: boolean;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  margin: number;
  labelMargin: number;
  layoutAlgorithm: LayoutAlgorithmType;
  fontFamily: string;
  availableFonts: Array<{ value: string; label: string; category: string }>;
  fontsLoading: boolean;
}

/**
 * Global Settings panel providing comprehensive configuration for the diagram application.
 * Manages layout algorithms, visual styling, font settings, and spacing controls.
 * All settings are persisted and affect both canvas display and export output.
 */
const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  gridSize,
  showGrid,
  leafFixedWidth,
  leafFixedHeight,
  leafWidth,
  leafHeight,
  rootFontSize,
  dynamicFontSizing,
  borderRadius,
  borderColor,
  borderWidth,
  margin,
  labelMargin,
  layoutAlgorithm,
  fontFamily,
  availableFonts,
  fontsLoading
}) => {
  const settingsActions = useAppStore(state => state.settingsActions);
  return (
    <div className="bg-white rounded-lg shadow p-3 lg:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm lg:text-base">
          <Settings size={16} />
          <span className="hidden sm:inline">Global Settings</span>
          <span className="sm:hidden">Settings</span>
        </h3>
      </div>

      <div className="space-y-3">
        {/* Primary layout algorithm selection affects all container arrangements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Layout Algorithm
          </label>
          <select
            value={layoutAlgorithm}
            onChange={(e) => settingsActions.handleLayoutAlgorithmChange(e.target.value as LayoutAlgorithmType)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="grid">Grid Layout</option>
            <option value="flow">Flow Layout</option>
            <option value="mixed-flow">Mixed Flow Layout</option>
          </select>
          {/* Algorithm descriptions help users understand layout behavior differences */}
          <div className="text-xs text-gray-500 mt-1">
            {layoutAlgorithm === 'grid' ? 
              'Traditional grid-based layout with fixed positioning' : 
              layoutAlgorithm === 'flow' ?
              'Flow-based layout with alternating row/column orientation' :
              layoutAlgorithm === 'mixed-flow' ?
              'Adaptive layout combining rows and columns to minimize whitespace' :
              'Unknown layout algorithm'
            }
          </div>
        </div>

        {/* Grid Display Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Show Grid</label>
            <div className="text-xs text-gray-500 mt-0.5">
              Display grid overlay on canvas
            </div>
          </div>
          <button
            onClick={() => settingsActions.handleShowGridChange(!showGrid)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              showGrid 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showGrid ? <Lock size={12} /> : <Unlock size={12} />}
            {showGrid ? 'Visible' : 'Hidden'}
          </button>
        </div>

        {/* Grid Size Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grid Size: {gridSize}px
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={gridSize}
            onChange={(e) => settingsActions.handleGridSizeChange(parseInt(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5px (Fine)</span>
            <span>50px (Coarse)</span>
          </div>
        </div>


        {/* Leaf node constraints override auto-sizing for terminal rectangles */}
        <div className="border-t pt-2 mt-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Lock size={12} className="text-gray-600" />
            Leaf Node Settings
          </h4>
          
          {/* Fixed Width Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-700">Fixed Width</label>
              <button
                onClick={() => settingsActions.handleLeafFixedWidthChange(!leafFixedWidth)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  leafFixedWidth 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {leafFixedWidth ? <Lock size={10} /> : <Unlock size={10} />}
                {leafFixedWidth ? 'On' : 'Off'}
              </button>
            </div>
            
            {leafFixedWidth && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Width: {leafWidth} grid units
                </label>
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="1"
                  value={leafWidth}
                  onChange={(e) => settingsActions.handleLeafWidthChange(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                  <span>2</span>
                  <span>20</span>
                </div>
              </div>
            )}

            {/* Fixed Height Control */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-700">Fixed Height</label>
              <button
                onClick={() => settingsActions.handleLeafFixedHeightChange(!leafFixedHeight)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  leafFixedHeight 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {leafFixedHeight ? <Lock size={10} /> : <Unlock size={10} />}
                {leafFixedHeight ? 'On' : 'Off'}
              </button>
            </div>
            
            {leafFixedHeight && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Height: {leafHeight} grid units
                </label>
                <input
                  type="range"
                  min="2"
                  max="16"
                  step="1"
                  value={leafHeight}
                  onChange={(e) => settingsActions.handleLeafHeightChange(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                  <span>2</span>
                  <span>16</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Font Settings */}
        <div className="border-t pt-2 mt-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <span className="text-base">Aa</span>
            Font Settings
          </h4>
          
          {/* Root Font Size */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Root Font Size: {rootFontSize}px
              </label>
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={rootFontSize}
                onChange={(e) => settingsActions.handleRootFontSizeChange(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>10px</span>
                <span>24px</span>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Font Family
              </label>
              <div className="relative">
                <select
                  value={fontFamily}
                  onChange={(e) => settingsActions.handleFontFamilyChange(e.target.value)}
                  disabled={fontsLoading}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {availableFonts.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fontsLoading && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Loader2 size={12} className="animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {fontsLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={8} className="animate-spin" />
                    Detecting fonts...
                  </span>
                ) : (
                  <span>
                    App & export font ({availableFonts.length} available)
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic font sizing improves readability by reducing font size at deeper hierarchy levels */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs text-gray-700">Dynamic Font Sizing</label>
                <div className="text-xs text-gray-500 mt-0.5">
                  Auto-decrease for deeper levels
                </div>
              </div>
              <button
                onClick={() => settingsActions.handleDynamicFontSizingChange(!dynamicFontSizing)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  dynamicFontSizing 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dynamicFontSizing ? <Lock size={10} /> : <Unlock size={10} />}
                {dynamicFontSizing ? 'On' : 'Off'}
              </button>
            </div>

          </div>
        </div>

        {/* Margin Settings */}
        <div className="border-t pt-2 mt-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
              <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
              <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
            Margin Settings
          </h4>
          
          <div className="space-y-2">
            {/* Margin */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Margin: {margin} grid units
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={margin}
                onChange={(e) => settingsActions.handleMarginChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>0.1</span>
                <span>5.0</span>
              </div>
            </div>

            {/* Label Margin */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Label Margin: {labelMargin} grid units
              </label>
              <input
                type="range"
                min="0.1"
                max="8"
                step="0.1"
                value={labelMargin}
                onChange={(e) => settingsActions.handleLabelMarginChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>0.1</span>
                <span>8.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Border Settings */}
        <div className="border-t pt-2 mt-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
            Border Settings
          </h4>
          
          <div className="space-y-2">
            {/* Border Radius */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Border Radius: {borderRadius}px
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={borderRadius}
                onChange={(e) => settingsActions.handleBorderRadiusChange(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>0px</span>
                <span>20px</span>
              </div>
            </div>

            {/* Border Color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Border Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => settingsActions.handleBorderColorChange(e.target.value)}
                  className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={borderColor}
                  onChange={(e) => settingsActions.handleBorderColorChange(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
                  placeholder="#374151"
                />
              </div>
            </div>

            {/* Border Width */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Border Width: {borderWidth}px
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={borderWidth}
                onChange={(e) => settingsActions.handleBorderWidthChange(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>1px</span>
                <span>8px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettings;
