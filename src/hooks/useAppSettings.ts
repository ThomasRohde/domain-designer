import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Rectangle, AppSettingsHook, FixedDimensions } from '../types';
import { GRID_SIZE, DEFAULT_RECTANGLE_SIZE, DEFAULT_FONT_SETTINGS, DEFAULT_BORDER_SETTINGS, DEFAULT_MARGIN_SETTINGS, DEFAULT_FONT_FAMILY } from '../utils/constants';

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
import { getChildren } from '../utils/layoutUtils';
import { layoutManager } from '../utils/layout';

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
  margin: number;
  labelMargin: number;
  
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
  handleMarginChange: (margin: number) => void;
  handleLabelMarginChange: (labelMargin: number) => void;
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
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_FAMILY);
  const [borderRadius, setBorderRadius] = useState(DEFAULT_BORDER_SETTINGS.borderRadius);
  const [borderColor, setBorderColor] = useState(DEFAULT_BORDER_SETTINGS.borderColor);
  const [borderWidth, setBorderWidth] = useState(DEFAULT_BORDER_SETTINGS.borderWidth);
  const [margin, setMargin] = useState(DEFAULT_MARGIN_SETTINGS.margin);
  const [labelMargin, setLabelMargin] = useState(DEFAULT_MARGIN_SETTINGS.labelMargin);
  const [predefinedColors, setPredefinedColors] = useState(INITIAL_PREDEFINED_COLORS);
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<'grid' | 'flow'>('grid');
  
  // Initialize and update layout manager with the current algorithm
  useEffect(() => {
    layoutManager.setAlgorithm(layoutAlgorithm);
  }, [layoutAlgorithm]);
  
  // Store a reference to the setRectangles function from the rectangle manager
  const setRectanglesRef = useRef<React.Dispatch<React.SetStateAction<Rectangle[]>> | null>(null);
  
  // Store a reference to the fitToChildren function from the rectangle manager
  const fitToChildrenRef = useRef<((id: string) => void) | null>(null);
  
  // Track when layout update is needed
  const [needsLayoutUpdate, setNeedsLayoutUpdate] = useState(false);
  const [parentsToFit, setParentsToFit] = useState<Rectangle[]>([]);
  
  // Effect to handle layout updates when settings change
  useEffect(() => {
    if (needsLayoutUpdate && setRectanglesRef.current) {
      // First, update leaf dimensions and identify parents that need fitting
      setRectanglesRef.current(prev => {
        const updatedRectangles = prev.map(rect => {
          if (rect.type === 'leaf') {
            const newRect = { ...rect };
            if (leafFixedWidth) {
              newRect.w = leafWidth;
            }
            if (leafFixedHeight) {
              newRect.h = leafHeight;
            }
            return newRect;
          }
          return rect;
        });
        
        // Identify parents that need layout updates
        const parentsToUpdate = updatedRectangles.filter(rect => 
          (rect.type === 'parent' || rect.type === 'root') && 
          !rect.isManualPositioningEnabled &&
          getChildren(rect.id, updatedRectangles).length > 0
        );
        
        // Sort parents by depth (deepest first)
        const sortedParents = parentsToUpdate.sort((a, b) => {
          const getDepth = (rect: Rectangle): number => {
            let depth = 0;
            let current = rect;
            while (current.parentId) {
              depth++;
              current = updatedRectangles.find(r => r.id === current.parentId) || current;
              if (depth > 10) break; // Prevent infinite loops
            }
            return depth;
          };
          return getDepth(b) - getDepth(a); // Deepest first
        });
        
        setParentsToFit(sortedParents);
        
        return updatedRectangles;
      });
      
      setNeedsLayoutUpdate(false);
    }
  }, [needsLayoutUpdate, leafFixedWidth, leafFixedHeight, leafWidth, leafHeight, margin, labelMargin, layoutAlgorithm]);
  
  // Effect to call fitToChildren for each parent after leaf dimensions are updated
  useEffect(() => {
    if (parentsToFit.length > 0 && fitToChildrenRef.current) {
      // Call fitToChildren for each parent (exactly like template insertion)
      parentsToFit.forEach(parent => {
        fitToChildrenRef.current!(parent.id);
      });
      
      setParentsToFit([]);
    }
  }, [parentsToFit]);

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
    
    // Helper function to calculate hierarchy depth
    const getDepth = (rectId: string): number => {
      const rect = rectangles.find(r => r.id === rectId);
      if (!rect || !rect.parentId) return 0;
      
      let depth = 0;
      let current = rect;
      
      while (current && current.parentId) {
        depth++;
        const parent = rectangles.find(r => r.id === current!.parentId);
        if (!parent || depth > 10) break; // Prevent infinite loops
        current = parent;
      }
      
      return depth;
    };
    
    const depth = getDepth(rectangleId);
    // Scale down font size by 10% for each level of depth, minimum 60% of root size
    return Math.max(rootFontSize * Math.pow(0.9, depth), rootFontSize * 0.6);
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

  const handleFontFamilyChange = useCallback((family: string) => {
    setFontFamily(family);
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

  // Margin settings handlers
  const handleMarginChange = useCallback((margin: number) => {
    setMargin(margin);
    // Trigger layout update for all rectangles
    if (setRectanglesRef.current) {
      setNeedsLayoutUpdate(true);
    }
  }, []);

  const handleLabelMarginChange = useCallback((labelMargin: number) => {
    setLabelMargin(labelMargin);
    // Trigger layout update for all rectangles
    if (setRectanglesRef.current) {
      setNeedsLayoutUpdate(true);
    }
  }, []);

  // Layout algorithm handler
  const handleLayoutAlgorithmChange = useCallback((algorithm: 'grid' | 'flow') => {
    setLayoutAlgorithm(algorithm);
    // Update the layout manager to use the new algorithm
    layoutManager.setAlgorithm(algorithm);
    // Trigger layout update since changing algorithm affects layout
    if (setRectanglesRef.current) {
      setNeedsLayoutUpdate(true);
    }
  }, []);

  // Track custom colors separately to manage replacement from bottom-right
  const [customColors, setCustomColors] = useState<string[]>([]);

  // Color palette handlers
  const addCustomColor = useCallback((color: string) => {
    // If the new color is not already in the predefined colors, add it
    if (!predefinedColors.includes(color)) {
      // Add to custom colors list
      const newCustomColors = [...customColors];
      if (!newCustomColors.includes(color)) {
        newCustomColors.push(color);
      }
      setCustomColors(newCustomColors);
      
      // Create updated palette by replacing from bottom-right
      const updatedColors = [...INITIAL_PREDEFINED_COLORS];
      const numCustomColors = newCustomColors.length;
      
      // Replace colors from the end (bottom-right of grid)
      for (let i = 0; i < numCustomColors && i < updatedColors.length; i++) {
        updatedColors[updatedColors.length - 1 - i] = newCustomColors[newCustomColors.length - 1 - i];
      }
      
      setPredefinedColors(updatedColors);
    }
  }, [predefinedColors, customColors]);

  const handlePredefinedColorsChange = useCallback((colors: string[]) => {
    setPredefinedColors(colors);
    
    // Extract custom colors from the imported palette
    const importedCustomColors: string[] = [];
    for (let i = colors.length - 1; i >= 0; i--) {
      if (!INITIAL_PREDEFINED_COLORS.includes(colors[i])) {
        importedCustomColors.unshift(colors[i]);
      } else {
        break; // Stop when we reach initial colors
      }
    }
    
    setCustomColors(importedCustomColors);
  }, []);

  // Function to set the rectangles setter reference
  const setRectanglesRefHandler = useCallback((setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>) => {
    setRectanglesRef.current = setRectangles;
  }, []);
  
  // Function to set the fitToChildren function reference
  const setFitToChildrenRefHandler = useCallback((fitToChildren: (id: string) => void) => {
    fitToChildrenRef.current = fitToChildren;
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
    fontFamily,
    borderRadius,
    borderColor,
    borderWidth,
    predefinedColors,
    margin,
    labelMargin,
    layoutAlgorithm,
    
    // Functions
    getFixedDimensions,
    calculateFontSize,
    handleLeafFixedWidthChange,
    handleLeafFixedHeightChange,
    handleLeafWidthChange,
    handleLeafHeightChange,
    handleRootFontSizeChange,
    handleDynamicFontSizingChange,
    handleFontFamilyChange,
    handleBorderRadiusChange,
    handleBorderColorChange,
    handleBorderWidthChange,
    handleMarginChange,
    handleLabelMarginChange,
    handleLayoutAlgorithmChange,
    addCustomColor,
    handlePredefinedColorsChange,
    setGridSize,
    setRectanglesRef: setRectanglesRefHandler,
    setFitToChildrenRef: setFitToChildrenRefHandler,
  };
};
