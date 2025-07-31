import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Rectangle, AppSettings } from '../types';
import { useViewerInteractions } from '../hooks/useViewerInteractions';
import { useAutoSave } from '../hooks/useAutoSave';
import ViewerCanvas from './ViewerCanvas';
import ViewerRectangleRenderer from './ViewerRectangleRenderer';
import URLViewerPage from './URLViewerPage';

const ViewerPage: React.FC = () => {
  const location = useLocation();
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

  // Check if there's a URL query parameter - if so, render URLViewerPage instead
  const urlParam = new URLSearchParams(location.search).get('url');
  
  if (urlParam) {
    return <URLViewerPage />;
  }

  /**
   * Dynamic font size calculation based on hierarchy depth.
   * Provides visual hierarchy through progressive font scaling while maintaining readability.
   */
  const calculateFontSize = (rectangleId: string, rectangles: Rectangle[]) => {
    if (!appSettings) return 16; // Safe fallback when settings not loaded
    
    if (!appSettings.dynamicFontSizing) {
      return appSettings.rootFontSize;
    }
    
    const rectangle = rectangles.find(r => r.id === rectangleId);
    if (!rectangle) return appSettings.rootFontSize;
    
    // Calculate hierarchy depth by traversing parent chain
    let depth = 0;
    let currentRect = rectangle;
    while (currentRect.parentId) {
      depth++;
      currentRect = rectangles.find(r => r.id === currentRect.parentId) || currentRect;
      if (depth > 10) break; // Prevent infinite loops in malformed data
    }
    
    // Apply 10% size reduction per level with minimum size constraint
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

  /**
   * PWA detection utility - checks if app is running in standalone mode.
   * Important for proper navigation behavior in installed PWA vs browser.
   */
  const isPWA = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           'standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true;
  };

  /**
   * Context-aware navigation handler that adapts to PWA vs browser environment.
   * Ensures proper navigation within PWA scope constraints.
   */
  const handleBackToEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const getNavigationPath = () => {
      // PWA in production (GitHub Pages) requires scope-aware navigation
      if (isPWA() && import.meta.env.PROD && import.meta.env.BASE_URL === '/domain-designer/') {
        return '/domain-designer/';
      }
      return '/';
    };
    
    const navigationPath = getNavigationPath();
    
    // Different navigation methods for PWA vs browser to maintain proper context
    if (isPWA()) {
      window.location.href = navigationPath; // Ensures PWA scope compliance
    } else {
      navigate(navigationPath, { replace: true }); // Standard React Router navigation
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