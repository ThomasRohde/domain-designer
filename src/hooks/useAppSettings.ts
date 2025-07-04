import React, { useState, useCallback, useRef } from 'react';
import { Rectangle } from '../types';
import { GRID_SIZE, DEFAULT_RECTANGLE_SIZE, DEFAULT_FONT_SETTINGS } from '../utils/constants';
import { updateChildrenLayout } from '../utils/layoutUtils';

export interface AppSettings {
  gridSize: number;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
  rootFontSize: number;
  dynamicFontSizing: boolean;
}

export interface FixedDimensions {
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
}

export interface UseAppSettingsReturn {
  // State
  gridSize: number;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
  rootFontSize: number;
  dynamicFontSizing: boolean;
  
  // Functions
  getFixedDimensions: () => FixedDimensions;
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;
  handleLeafFixedWidthChange: (enabled: boolean) => void;
  handleLeafFixedHeightChange: (enabled: boolean) => void;
  handleLeafWidthChange: (width: number) => void;
  handleLeafHeightChange: (height: number) => void;
  handleRootFontSizeChange: (size: number) => void;
  handleDynamicFontSizingChange: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  setRectanglesRef: (setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>) => void;
}

export const useAppSettings = (): UseAppSettingsReturn => {
  const [gridSize, setGridSize] = useState(GRID_SIZE);
  const [leafFixedWidth, setLeafFixedWidth] = useState(false);
  const [leafFixedHeight, setLeafFixedHeight] = useState(false);
  const [leafWidth, setLeafWidth] = useState(DEFAULT_RECTANGLE_SIZE.leaf.w);
  const [leafHeight, setLeafHeight] = useState(DEFAULT_RECTANGLE_SIZE.leaf.h);
  const [rootFontSize, setRootFontSize] = useState(DEFAULT_FONT_SETTINGS.rootFontSize);
  const [dynamicFontSizing, setDynamicFontSizing] = useState(DEFAULT_FONT_SETTINGS.dynamicFontSizing);
  
  // Store a reference to the setRectangles function from the rectangle manager
  const setRectanglesRef = useRef<React.Dispatch<React.SetStateAction<Rectangle[]>> | null>(null);

  // Helper function to get fixed dimensions settings
  const getFixedDimensions = useCallback((): FixedDimensions => ({
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight
  }), [leafFixedWidth, leafFixedHeight, leafWidth, leafHeight]);

  // Calculate font size based on hierarchy level
  const calculateFontSize = useCallback((rectangleId: string, rectangles: Rectangle[]): number => {
    if (!dynamicFontSizing) return rootFontSize;
    
    // Find the rectangle and calculate its depth
    const rect = rectangles.find(r => r.id === rectangleId);
    if (!rect) return rootFontSize;
    
    let depth = 0;
    let currentRect: Rectangle | undefined = rect;
    
    while (currentRect?.parentId) {
      depth++;
      currentRect = rectangles.find(r => r.id === currentRect!.parentId);
      if (!currentRect) break;
    }
    
    // Apply scaling formula: root = 1.0, level 1 = 0.9, level 2 = 0.8, level 3+ = 0.7
    let scale = 1.0;
    if (depth === 1) scale = 0.9;
    else if (depth === 2) scale = 0.8;
    else if (depth >= 3) scale = 0.7;
    
    return Math.max(10, Math.round(rootFontSize * scale));
  }, [dynamicFontSizing, rootFontSize]);

  // Update leaf nodes when fixed width setting changes
  const handleLeafFixedWidthChange = useCallback((enabled: boolean) => {
    setLeafFixedWidth(enabled);
    if (enabled && setRectanglesRef.current) {
      // Apply fixed width to all existing leaf nodes
      setRectanglesRef.current(prev => 
        prev.map(rect => 
          rect.type === 'leaf' ? { ...rect, w: leafWidth } : rect
        )
      );
    }
    // Trigger layout update for all children
    if (setRectanglesRef.current) {
      setTimeout(() => {
        setRectanglesRef.current!(prev => updateChildrenLayout(prev, {
          leafFixedWidth: enabled,
          leafFixedHeight,
          leafWidth,
          leafHeight
        }));
      }, 10);
    }
  }, [leafWidth, leafFixedHeight, leafHeight]);

  // Update leaf nodes when fixed height setting changes
  const handleLeafFixedHeightChange = useCallback((enabled: boolean) => {
    setLeafFixedHeight(enabled);
    if (enabled && setRectanglesRef.current) {
      // Apply fixed height to all existing leaf nodes
      setRectanglesRef.current(prev => 
        prev.map(rect => 
          rect.type === 'leaf' ? { ...rect, h: leafHeight } : rect
        )
      );
    }
    // Trigger layout update for all children
    if (setRectanglesRef.current) {
      setTimeout(() => {
        setRectanglesRef.current!(prev => updateChildrenLayout(prev, {
          leafFixedWidth,
          leafFixedHeight: enabled,
          leafWidth,
          leafHeight
        }));
      }, 10);
    }
  }, [leafHeight, leafFixedWidth, leafWidth]);

  // Update leaf width and apply to existing leaf nodes if fixed width is enabled
  const handleLeafWidthChange = useCallback((width: number) => {
    setLeafWidth(width);
    if (leafFixedWidth && setRectanglesRef.current) {
      // Apply new width to all existing leaf nodes
      setRectanglesRef.current(prev => 
        prev.map(rect => 
          rect.type === 'leaf' ? { ...rect, w: width } : rect
        )
      );
      // Trigger layout update for all children
      setTimeout(() => {
        setRectanglesRef.current!(prev => updateChildrenLayout(prev, {
          leafFixedWidth,
          leafFixedHeight,
          leafWidth: width,
          leafHeight
        }));
      }, 10);
    }
  }, [leafFixedWidth, leafFixedHeight, leafHeight]);

  // Update leaf height and apply to existing leaf nodes if fixed height is enabled
  const handleLeafHeightChange = useCallback((height: number) => {
    setLeafHeight(height);
    if (leafFixedHeight && setRectanglesRef.current) {
      // Apply new height to all existing leaf nodes
      setRectanglesRef.current(prev => 
        prev.map(rect => 
          rect.type === 'leaf' ? { ...rect, h: height } : rect
        )
      );
      // Trigger layout update for all children
      setTimeout(() => {
        setRectanglesRef.current!(prev => updateChildrenLayout(prev, {
          leafFixedWidth,
          leafFixedHeight,
          leafWidth,
          leafHeight: height
        }));
      }, 10);
    }
  }, [leafFixedHeight, leafFixedWidth, leafWidth]);

  // Font settings handlers
  const handleRootFontSizeChange = useCallback((size: number) => {
    setRootFontSize(size);
  }, []);

  const handleDynamicFontSizingChange = useCallback((enabled: boolean) => {
    setDynamicFontSizing(enabled);
  }, []);

  // Function to set the rectangles setter reference
  const setRectanglesRefHandler = useCallback((setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>) => {
    setRectanglesRef.current = setRectangles;
  }, []);

  return {
    // State
    gridSize,
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight,
    rootFontSize,
    dynamicFontSizing,
    
    // Functions
    getFixedDimensions,
    calculateFontSize,
    handleLeafFixedWidthChange,
    handleLeafFixedHeightChange,
    handleLeafWidthChange,
    handleLeafHeightChange,
    handleRootFontSizeChange,
    handleDynamicFontSizingChange,
    setGridSize,
    setRectanglesRef: setRectanglesRefHandler,
  };
};
