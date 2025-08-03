import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Rectangle, AppSettings } from '../types';
import { useViewerInteractions } from '../hooks/useViewerInteractions';
import { importDiagramFromJSON, ImportedDiagramData } from '../utils/exportUtils';
import { useAppStore } from '../stores/useAppStore';
import ViewerCanvas from './ViewerCanvas';
import ViewerRectangleRenderer from './ViewerRectangleRenderer';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

const URLViewerPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    error: null,
    success: false
  });
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract URL from query parameters
  const getUrlFromPath = () => {
    const searchParams = new URLSearchParams(location.search);
    
    // Get URL from query parameter
    const queryUrl = searchParams.get('url');
    if (queryUrl) {
      try {
        return decodeURIComponent(queryUrl);
      } catch (error) {
        console.warn('Failed to decode query URL parameter:', queryUrl, error);
        return queryUrl;
      }
    }
    
    
    return null;
  };
  
  const url = getUrlFromPath();
  
  
  // Store actions for importing data to editor
  const { rectangleActions, settingsActions, autoSaveActions } = useAppStore();

  // Initialize viewer interactions (pan and zoom only)
  const {
    panState,
    panOffset,
    zoomState,
    handleCanvasMouseDown,
  } = useViewerInteractions({ containerRef });

  // Load rectangles and app settings from URL
  useEffect(() => {
    const loadFromURL = async () => {
      // If no URL is provided, redirect to regular viewer
      if (!url || url.trim() === '') {
        navigate('/viewer', { replace: true });
        return;
      }

      try {
        setLoadingState({ isLoading: true, error: null, success: false });
        
        // The URL should already be decoded by getUrlFromPath()
        const decodedUrl = url;
        
        // Fetch the JSON from the URL
        const response = await fetch(decodedUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`);
        }
        
        const jsonText = await response.text();
        
        // Create a File-like object to use with existing importDiagramFromJSON
        const blob = new Blob([jsonText], { type: 'application/json' });
        const file = new File([blob], 'imported-model.json', { type: 'application/json' });
        
        // Use existing import logic
        const importedData: ImportedDiagramData = await importDiagramFromJSON(file);
        
        setRectangles(importedData.rectangles);
        setAppSettings(importedData.globalSettings || null);
        setLoadingState({
          isLoading: false,
          error: null,
          success: true
        });
        
      } catch (error) {
        console.error('Failed to load JSON from URL:', error);
        setLoadingState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          success: false
        });
      }
    };

    loadFromURL();
  }, [url, navigate]);

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
   * Import the current JSON model into the main editor and navigate there.
   */
  const handleEditInEditor = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Import rectangles into the store
      rectangleActions.setRectangles(rectangles);
      
      // Import settings if available, with error handling
      if (appSettings) {
        try {
          settingsActions.updateSettings(appSettings);
        } catch (settingsError) {
          console.warn('Failed to import settings, using defaults:', settingsError);
          // Continue without settings import - rectangles are more important
        }
      }
      
      // Trigger auto-save to persist the imported data to IndexedDB
      autoSaveActions.saveData();
      
      // Wait for the debounced save to complete (auto-save has 1000ms delay)
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Navigate to editor
      const getNavigationPath = () => {
        if (isPWA() && import.meta.env.PROD && import.meta.env.BASE_URL === '/domain-designer/') {
          return '/domain-designer/';
        }
        return '/';
      };
      
      const navigationPath = getNavigationPath();
      
      if (isPWA()) {
        window.location.href = navigationPath;
      } else {
        navigate(navigationPath, { replace: true });
      }
      
    } catch (error) {
      console.error('Failed to import to editor:', error);
      // Could add user notification here
    }
  };

  // Loading state
  if (loadingState.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading diagram from URL...</div>
      </div>
    );
  }

  // Error state
  if (loadingState.error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl text-red-600 mb-2">Failed to load diagram</div>
        <div className="text-sm text-gray-600 mb-4 max-w-md text-center">{loadingState.error}</div>
        <div className="text-sm text-gray-500">URL: {url || 'None provided'}</div>
      </div>
    );
  }

  // No rectangles state
  if (rectangles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl text-gray-600 mb-2">No diagram data found</div>
        <div className="text-sm text-gray-500">The JSON file appears to be empty or invalid</div>
      </div>
    );
  }

  // Successful load - show the diagram
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-gray-800">Diagram Viewer</h1>
            <div className="text-xs text-gray-500 truncate max-w-lg">
              Loaded from: {url ? decodeURIComponent(url) : 'No URL provided'}
            </div>
          </div>
          <button
            className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm font-medium border-none cursor-pointer"
            onClick={handleEditInEditor}
          >
            Editor
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

export default URLViewerPage;