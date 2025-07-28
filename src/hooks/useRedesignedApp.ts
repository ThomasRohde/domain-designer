import React, { useCallback, useMemo } from 'react';
import { Rectangle, AppSettings } from '../types';
import { ImportedDiagramData } from '../utils/exportUtils';
import { useAppStateMachine } from './useAppStateMachine';
import { useRobustAutoSave } from './useRobustAutoSave';
import { useLayoutEngine } from './useLayoutEngine';
import { useDimensionEngine } from './useDimensionEngine';
import { useAppSettings } from './useAppSettings';
import { createImportedSnapshot, createRestoreSnapshot } from '../types/layoutSnapshot';
import { importDiagramFromJSON, processImportedDiagram } from '../utils/exportUtils';

export interface UseRedesignedAppProps {
  rectangles: Rectangle[];
  setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  setRectanglesWithHistory: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  initializeHistory: (initialState: Rectangle[]) => void;
  updateNextId: (newNextId: number) => void;
  nextId: number;
  setSelectedId: (id: string | null) => void;
  getFixedDimensions: () => { leafFixedWidth: boolean; leafFixedHeight: boolean; leafWidth: number; leafHeight: number };
  getMargins: () => { margin: number; labelMargin: number };
  appSettings: ReturnType<typeof useAppSettings>;
}

export interface UseRedesignedAppReturn {
  // State machine
  stateMachine: ReturnType<typeof useAppStateMachine>;
  
  // Auto-save
  autoSave: ReturnType<typeof useRobustAutoSave>;
  
  // Layout engines
  layoutEngine: ReturnType<typeof useLayoutEngine>;
  dimensionEngine: ReturnType<typeof useDimensionEngine>;
  
  // Import/export functions
  handleImport: () => void;
  handleRestore: () => Promise<void>;
  handleSettingsChange: (settings: Partial<AppSettings>) => void;
  
  // Settings
  appSettings: ReturnType<typeof useAppSettings>;
}

export const useRedesignedApp = ({
  rectangles,
  setRectangles,
  setRectanglesWithHistory,
  initializeHistory,
  updateNextId,
  nextId,
  setSelectedId,
  getFixedDimensions,
  getMargins,
  appSettings
}: UseRedesignedAppProps): UseRedesignedAppReturn => {
  
  // Initialize the state machine
  const stateMachine = useAppStateMachine();
  
  // App settings are passed from the parent component
  
  // Initialize layout and dimension engines
  const layoutEngine = useLayoutEngine({
    getFixedDimensions,
    getMargins
  });
  
  const dimensionEngine = useDimensionEngine({
    getFixedDimensions
  });
  
  // Create app settings object for auto-save
  const appSettingsObject = useMemo(() => ({
    gridSize: appSettings.gridSize,
    leafFixedWidth: appSettings.leafFixedWidth,
    leafFixedHeight: appSettings.leafFixedHeight,
    leafWidth: appSettings.leafWidth,
    leafHeight: appSettings.leafHeight,
    rootFontSize: appSettings.rootFontSize,
    dynamicFontSizing: appSettings.dynamicFontSizing,
    fontFamily: appSettings.fontFamily,
    availableFonts: appSettings.availableFonts,
    fontsLoading: appSettings.fontsLoading,
    borderRadius: appSettings.borderRadius,
    borderColor: appSettings.borderColor,
    borderWidth: appSettings.borderWidth,
    predefinedColors: appSettings.predefinedColors,
    margin: appSettings.margin,
    labelMargin: appSettings.labelMargin,
    layoutAlgorithm: appSettings.layoutAlgorithm,
  }), [appSettings]);

  // Handle settings changes with layout preservation awareness
  const handleSettingsChange = useCallback((
    settings: Partial<AppSettings>
  ) => {
    // Update individual settings
    if (settings.gridSize !== undefined) appSettings.setGridSize(settings.gridSize);
    if (settings.leafFixedWidth !== undefined) appSettings.handleLeafFixedWidthChange(settings.leafFixedWidth);
    if (settings.leafFixedHeight !== undefined) appSettings.handleLeafFixedHeightChange(settings.leafFixedHeight);
    if (settings.leafWidth !== undefined) appSettings.handleLeafWidthChange(settings.leafWidth);
    if (settings.leafHeight !== undefined) appSettings.handleLeafHeightChange(settings.leafHeight);
    if (settings.rootFontSize !== undefined) appSettings.handleRootFontSizeChange(settings.rootFontSize);
    if (settings.dynamicFontSizing !== undefined) appSettings.handleDynamicFontSizingChange(settings.dynamicFontSizing);
    if (settings.fontFamily !== undefined) appSettings.handleFontFamilyChange(settings.fontFamily);
    if (settings.borderRadius !== undefined) appSettings.handleBorderRadiusChange(settings.borderRadius);
    if (settings.borderColor !== undefined) appSettings.handleBorderColorChange(settings.borderColor);
    if (settings.borderWidth !== undefined) appSettings.handleBorderWidthChange(settings.borderWidth);
    if (settings.predefinedColors !== undefined) appSettings.handlePredefinedColorsChange(settings.predefinedColors);
    if (settings.margin !== undefined) appSettings.handleMarginChange(settings.margin);
    if (settings.labelMargin !== undefined) appSettings.handleLabelMarginChange(settings.labelMargin);
    if (settings.layoutAlgorithm !== undefined) {
      appSettings.handleLayoutAlgorithmChange(settings.layoutAlgorithm);
      layoutEngine.setLayoutAlgorithm(settings.layoutAlgorithm);
    }
  }, [appSettings, layoutEngine]);

  // Handle restore with the new architecture - now defined after handleSettingsChange
  const handleRestoreInternal = useCallback(async (
    restoredRectangles: Rectangle[], 
    restoredSettings: AppSettings, 
    layoutMetadata?: { algorithm: string; isUserArranged: boolean; preservePositions: boolean; boundingBox: { w: number; h: number } }
  ) => {
    console.log('🔄 Restoring with new architecture:', restoredRectangles.length, 'rectangles');
    
    // Clear selection first to avoid issues
    setSelectedId(null);
    
    // Create a restore snapshot for layout preservation
    const restoreSnapshot = createRestoreSnapshot(restoredRectangles, layoutMetadata);
    
    // Apply dimension updates if allowed
    const processedRectangles = dimensionEngine.canUpdateDimensions(restoreSnapshot.metadata) 
      ? dimensionEngine.applyFixedDimensions(restoredRectangles, restoreSnapshot.metadata)
      : restoredRectangles;
    
    // Set rectangles directly to avoid triggering history during restoration
    setRectangles(processedRectangles);
    
    // Initialize history properly with the restored state as the baseline
    initializeHistory(processedRectangles);
    
    // Apply settings changes
    handleSettingsChange(restoredSettings);
    
    console.log('✅ Restore complete');
  }, [setSelectedId, setRectangles, initializeHistory, dimensionEngine, handleSettingsChange]);

  // Initialize robust auto-save - now defined after handleRestoreInternal
  const autoSave = useRobustAutoSave({
    rectangles,
    appSettings: appSettingsObject,
    stateMachine,
    onRestore: handleRestoreInternal
  });

  // Public restore function for manual restore
  const handleRestore = useCallback(async () => {
    await autoSave.restore();
  }, [autoSave]);

  // Handle import with state machine and validation
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        // Start import process
        stateMachine.transition({ type: 'START_IMPORT' });
        
        // Disable auto-save during import
        autoSave.setAutoSaveEnabled(false);
        
        stateMachine.transition({ type: 'IMPORT_PROCESSING' });
        
        // Import and validate the data
        const importedData: ImportedDiagramData = await importDiagramFromJSON(file);
        
        // Process imported data with comprehensive validation and fixing
        const { rectangles: processedRectangles, nextId: newNextId } = processImportedDiagram(
          importedData, 
          nextId
        );
        
        stateMachine.transition({ type: 'IMPORT_APPLYING' });
        
        // Create an imported snapshot for layout preservation
        const importSnapshot = createImportedSnapshot(processedRectangles, importedData.layoutMetadata);
        
        // Apply dimension updates if allowed (typically no for imports to preserve exact layout)
        const finalRectangles = dimensionEngine.canUpdateDimensions(importSnapshot.metadata) 
          ? dimensionEngine.applyFixedDimensions(processedRectangles, importSnapshot.metadata)
          : processedRectangles;
        
        // Update rectangles with processed data - use setRectanglesWithHistory for proper history tracking
        setRectanglesWithHistory(finalRectangles);
        
        // Update the nextId counter to prevent ID conflicts
        updateNextId(newNextId);
        
        // Update global settings if available
        if (importedData.globalSettings) {
          handleSettingsChange(importedData.globalSettings);
        }
        
        // Clear selection
        setSelectedId(null);
        
        // Complete the import process
        stateMachine.transition({ type: 'COMPLETE' });
        
        // Re-enable auto-save after a delay
        setTimeout(() => {
          autoSave.setAutoSaveEnabled(true);
          // Reset auto-restore flag so fresh imports can be properly auto-restored
          autoSave.resetAutoRestoreFlag();
        }, 1000);
        
        console.log('✅ Successfully imported diagram with preservation');
        
      } catch (error) {
        console.error('❌ Failed to import diagram:', error);
        stateMachine.transition({ type: 'ERROR' });
        
        // Re-enable auto-save on error
        autoSave.setAutoSaveEnabled(true);
        
        alert(`Failed to import diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  }, [
    stateMachine, 
    autoSave, 
    nextId, 
    setRectanglesWithHistory, 
    updateNextId, 
    setSelectedId, 
    handleSettingsChange,
    dimensionEngine
  ]);

  return {
    stateMachine,
    autoSave,
    layoutEngine,
    dimensionEngine,
    handleImport,
    handleRestore,
    handleSettingsChange,
    appSettings
  };
};