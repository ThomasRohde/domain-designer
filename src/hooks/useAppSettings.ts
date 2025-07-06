import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Rectangle, AppSettingsHook, FixedDimensions } from '../types';
import { GRID_SIZE, DEFAULT_RECTANGLE_SIZE, DEFAULT_FONT_SETTINGS, DEFAULT_BORDER_SETTINGS } from '../utils/constants';

// Initial predefined color palette - prioritizing colors from the handdrawn model
const INITIAL_PREDEFINED_COLORS = [
  '#87CEEB', // Sky Blue (main headers)
  '#98D8C8', // Mint Green (subcategories)
  '#D8BFD8', // Light Purple (IT/Data Platform)
  '#F0E68C', // Light Yellow (Business Control)
  '#FFB6C1', // Light Pink (Risk Management)
  '#B0E0E6', // Powder Blue (variation)
  '#4ECDC4', // Teal (existing default)
  '#45B7D1', // Blue (existing default)
  '#96CEB4', // Green (existing default)
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
  '#F8C471', // Orange
  '#82E0AA', // Light Green
];
import { updateChildrenLayout } from '../utils/layoutUtils';

// Re-export from types for backward compatibility
export type { AppSettings, FixedDimensions } from '../types';

export interface UseAppSettingsReturn {
  // State
  gridSize: number;
  leafFixedWidth: boolean;
  leafFixedHeight: boolean;
  leafWidth: number;
  leafHeight: number;
  rootFontSize: number;
  dynamicFontSizing: boolean;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  predefinedColors: string[];
  
  // Functions
  getFixedDimensions: () => FixedDimensions;
  calculateFontSize: (rectangleId: string, rectangles: Rectangle[]) => number;
  handleLeafFixedWidthChange: (enabled: boolean) => void;
  handleLeafFixedHeightChange: (enabled: boolean) => void;
  handleLeafWidthChange: (width: number) => void;
  handleLeafHeightChange: (height: number) => void;
  handleRootFontSizeChange: (size: number) => void;
  handleDynamicFontSizingChange: (enabled: boolean) => void;
  handleBorderRadiusChange: (radius: number) => void;
  handleBorderColorChange: (color: string) => void;
  handleBorderWidthChange: (width: number) => void;
  addCustomColor: (color: string) => void;
  setGridSize: (size: number) => void;
  setRectanglesRef: (setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>) => void;
}

export const useAppSettings = (): AppSettingsHook => {
  const [gridSize, setGridSize] = useState(GRID_SIZE);
  const [leafFixedWidth, setLeafFixedWidth] = useState(false);
  const [leafFixedHeight, setLeafFixedHeight] = useState(false);
  const [leafWidth, setLeafWidth] = useState(DEFAULT_RECTANGLE_SIZE.leaf.w);
  const [leafHeight, setLeafHeight] = useState(DEFAULT_RECTANGLE_SIZE.leaf.h);
  const [rootFontSize, setRootFontSize] = useState(DEFAULT_FONT_SETTINGS.rootFontSize);
  const [dynamicFontSizing, setDynamicFontSizing] = useState(DEFAULT_FONT_SETTINGS.dynamicFontSizing);
  const [borderRadius, setBorderRadius] = useState(DEFAULT_BORDER_SETTINGS.borderRadius);
  const [borderColor, setBorderColor] = useState(DEFAULT_BORDER_SETTINGS.borderColor);
  const [borderWidth, setBorderWidth] = useState(DEFAULT_BORDER_SETTINGS.borderWidth);
  const [predefinedColors, setPredefinedColors] = useState(INITIAL_PREDEFINED_COLORS);
  
  // Store a reference to the setRectangles function from the rectangle manager
  const setRectanglesRef = useRef<React.Dispatch<React.SetStateAction<Rectangle[]>> | null>(null);
  
  // Track when layout update is needed
  const [needsLayoutUpdate, setNeedsLayoutUpdate] = useState(false);
  
  // Effect to handle layout updates when settings change
  useEffect(() => {
    if (needsLayoutUpdate && setRectanglesRef.current) {
      setRectanglesRef.current(prev => updateChildrenLayout(prev, {
        leafFixedWidth,
        leafFixedHeight,
        leafWidth,
        leafHeight
      }));
      setNeedsLayoutUpdate(false);
    }
  }, [needsLayoutUpdate, leafFixedWidth, leafFixedHeight, leafWidth, leafHeight]);

  // Helper function to get fixed dimensions settings
  const getFixedDimensions = useCallback((): FixedDimensions => ({
    leafFixedWidth,
    leafFixedHeight,
    leafWidth,
    leafHeight
  }), [leafFixedWidth, leafFixedHeight, leafWidth, leafHeight]);

  // Calculate font size based on hierarchy level
  const calculateFontSize = useCallback((_rectangleId: string): number => {
    if (!dynamicFontSizing) return rootFontSize;
    
    // This function needs to be called with rectangle data from the component
    // For now, return the root font size as a fallback
    return rootFontSize;
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
      setNeedsLayoutUpdate(true);
    }
  }, [leafWidth]);

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
      setNeedsLayoutUpdate(true);
    }
  }, [leafHeight]);

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
      setNeedsLayoutUpdate(true);
    }
  }, [leafFixedWidth]);

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
      setNeedsLayoutUpdate(true);
    }
  }, [leafFixedHeight]);

  // Font settings handlers
  const handleRootFontSizeChange = useCallback((size: number) => {
    setRootFontSize(size);
  }, []);

  const handleDynamicFontSizingChange = useCallback((enabled: boolean) => {
    setDynamicFontSizing(enabled);
  }, []);

  // Border settings handlers
  const handleBorderRadiusChange = useCallback((radius: number) => {
    setBorderRadius(radius);
  }, []);

  const handleBorderColorChange = useCallback((color: string) => {
    setBorderColor(color);
  }, []);

  const handleBorderWidthChange = useCallback((width: number) => {
    setBorderWidth(width);
  }, []);

  // Color palette handler
  const addCustomColor = useCallback((color: string) => {
    // If the new color is not already in the predefined colors, replace the last one
    if (!predefinedColors.includes(color)) {
      const updatedColors = [...predefinedColors];
      updatedColors[updatedColors.length - 1] = color;
      setPredefinedColors(updatedColors);
    }
  }, [predefinedColors]);

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
    borderRadius,
    borderColor,
    borderWidth,
    predefinedColors,
    
    // Functions
    getFixedDimensions,
    calculateFontSize,
    handleLeafFixedWidthChange,
    handleLeafFixedHeightChange,
    handleLeafWidthChange,
    handleLeafHeightChange,
    handleRootFontSizeChange,
    handleDynamicFontSizingChange,
    handleBorderRadiusChange,
    handleBorderColorChange,
    handleBorderWidthChange,
    addCustomColor,
    setGridSize,
    setRectanglesRef: setRectanglesRefHandler,
  };
};
