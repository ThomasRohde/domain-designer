import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rectangle, AppSettings } from '../types';
import { useViewerInteractions } from '../hooks/useViewerInteractions';
import { useAutoSave } from '../hooks/useAutoSave';
import ViewerCanvas from './ViewerCanvas';
import ViewerRectangleRenderer from './ViewerRectangleRenderer';

const ViewerPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize viewer interactions (pan and zoom only)
  const {
    panState,
    panOffset,
    zoomState,
    handleCanvasMouseDown,
  } = useViewerInteractions({ containerRef });

  // Initialize auto-save hook to load data
  const { loadData } = useAutoSave();

  // Load rectangles and app settings from storage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const saved = await loadData();
        if (saved?.rectangles) {
          setRectangles(saved.rectangles);
        }
        if (saved?.appSettings) {
          setAppSettings(saved.appSettings);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSavedData();
  }, [loadData]);

  // Calculate font size for rectangles using app settings
  const calculateFontSize = (rectangleId: string, rectangles: Rectangle[]) => {
    if (!appSettings) return 16; // Default fallback
    
    if (!appSettings.dynamicFontSizing) {
      return appSettings.rootFontSize;
    }
    
    // Calculate depth for dynamic sizing
    const rectangle = rectangles.find(r => r.id === rectangleId);
    if (!rectangle) return appSettings.rootFontSize;
    
    let depth = 0;
    let currentRect = rectangle;
    while (currentRect.parentId) {
      depth++;
      currentRect = rectangles.find(r => r.id === currentRect.parentId) || currentRect;
      if (depth > 10) break; // Safety check
    }
    
    // Reduce font size by 10% per depth level, minimum 8px
    const scaleFactor = Math.pow(0.9, depth);
    return Math.max(8, Math.round(appSettings.rootFontSize * scaleFactor));
  };

  // Default settings fallback
  const defaultSettings = {
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: 8,
    borderColor: '#d1d5db',
    borderWidth: 1
  };

  // Detect if running in PWA mode
  const isPWA = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           'standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true;
  };

  // Handle back to editor navigation for PWA compatibility
  const handleBackToEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // For PWA, use relative navigation to stay within scope
    if (isPWA()) {
      // Use relative path navigation to avoid scope issues
      // Navigate to '../' to go from /viewer to /
      navigate('../', { replace: true });
    } else {
      // Use absolute path for regular browser navigation
      navigate('/', { replace: true });
    }
  };

  // No longer need handlers since ViewerRectangleRenderer handles them

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading diagram...</div>
      </div>
    );
  }

  if (rectangles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl text-gray-600 mb-2">No diagram to display</div>
        <div className="text-sm text-gray-500">Create a diagram in the main application first</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Diagram Viewer</h1>
          <button
            className="text-blue-600 hover:text-blue-800 text-sm font-medium bg-transparent border-none cursor-pointer"
            onClick={handleBackToEditor}
          >
            ← Back to Editor
          </button>
        </div>
      </div>

      {/* Viewer Canvas */}
      <ViewerCanvas
        containerRef={containerRef}
        panOffset={panOffset}
        panState={panState}
        zoomState={zoomState}
        onMouseDown={handleCanvasMouseDown}
      >
        <ViewerRectangleRenderer
          rectangles={rectangles}
          gridSize={appSettings?.gridSize || 20}
          calculateFontSize={calculateFontSize}
          fontFamily={appSettings?.fontFamily || defaultSettings.fontFamily}
          borderRadius={appSettings?.borderRadius || defaultSettings.borderRadius}
          borderColor={appSettings?.borderColor || defaultSettings.borderColor}
          borderWidth={appSettings?.borderWidth || defaultSettings.borderWidth}
        />
      </ViewerCanvas>
    </div>
  );
};

export default ViewerPage;