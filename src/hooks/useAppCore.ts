import React, { useCallback, useMemo } from 'react';
import { Rectangle, AppSettings } from '../types';
import { ImportedDiagramData } from '../utils/exportUtils';
import { useAppStateMachine } from './useAppStateMachine';
import { useAutoSaveManager } from './useAutoSaveManager';
import { useLayoutEngine } from './useLayoutEngine';
import { useDimensionEngine } from './useDimensionEngine';
import { useAppSettings } from './useAppSettings';
import { createImportedSnapshot, createRestoreSnapshot } from '../types/layoutSnapshot';
import { importDiagramFromJSON, processImportedDiagram } from '../utils/exportUtils';

export interface UseAppCoreProps {
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

export interface UseAppCoreReturn {
  // State machine
  stateMachine: ReturnType<typeof useAppStateMachine>;
  
  // Auto-save
  autoSave: ReturnType<typeof useAutoSaveManager>;
  
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

export const useAppCore = ({
  rectangles,
  setRectangles,
  setRectanglesWithHistory: _setRectanglesWithHistory,
  initializeHistory,
  updateNextId,
  nextId,
  setSelectedId,
  getFixedDimensions,
  getMargins,
  appSettings
}: UseAppCoreProps): UseAppCoreReturn => {
  
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
    showGrid: appSettings.showGrid,
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

  // Handle settings changes
  const handleSettingsChange = useCallback((
    settings: Partial<AppSettings>,
    skipLayoutUpdates = false
  ) => {
    // Update individual settings - only pass skipLayoutUpdates to handlers that support it
    if (settings.gridSize !== undefined) appSettings.setGridSize(settings.gridSize);
    if (settings.showGrid !== undefined) appSettings.handleShowGridChange(settings.showGrid);
    if (settings.leafFixedWidth !== undefined) appSettings.handleLeafFixedWidthChange(settings.leafFixedWidth, skipLayoutUpdates);
    if (settings.leafFixedHeight !== undefined) appSettings.handleLeafFixedHeightChange(settings.leafFixedHeight, skipLayoutUpdates);
    if (settings.leafWidth !== undefined) appSettings.handleLeafWidthChange(settings.leafWidth, skipLayoutUpdates);
    if (settings.leafHeight !== undefined) appSettings.handleLeafHeightChange(settings.leafHeight, skipLayoutUpdates);
    if (settings.rootFontSize !== undefined) appSettings.handleRootFontSizeChange(settings.rootFontSize);
    if (settings.dynamicFontSizing !== undefined) appSettings.handleDynamicFontSizingChange(settings.dynamicFontSizing);
    if (settings.fontFamily !== undefined) appSettings.handleFontFamilyChange(settings.fontFamily);
    if (settings.borderRadius !== undefined) appSettings.handleBorderRadiusChange(settings.borderRadius);
    if (settings.borderColor !== undefined) appSettings.handleBorderColorChange(settings.borderColor);
    if (settings.borderWidth !== undefined) appSettings.handleBorderWidthChange(settings.borderWidth);
    if (settings.predefinedColors !== undefined) appSettings.handlePredefinedColorsChange(settings.predefinedColors);
    if (settings.margin !== undefined) appSettings.handleMarginChange(settings.margin, skipLayoutUpdates);
    if (settings.labelMargin !== undefined) appSettings.handleLabelMarginChange(settings.labelMargin, skipLayoutUpdates);
    if (settings.layoutAlgorithm !== undefined) {
      appSettings.handleLayoutAlgorithmChange(settings.layoutAlgorithm, skipLayoutUpdates);
      layoutEngine.setLayoutAlgorithm(settings.layoutAlgorithm);
    }
  }, [appSettings, layoutEngine]);

  // Handle restore - memoized to prevent infinite loops
  const handleRestoreInternal = useCallback(async (
    restoredRectangles: Rectangle[], 
    restoredSettings: AppSettings, 
    layoutMetadata?: { algorithm: string; isUserArranged: boolean; preservePositions: boolean; boundingBox: { w: number; h: number } }
  ) => {
    console.log('🔄 Restoring:', restoredRectangles.length, 'rectangles');
    
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
    
    // Set restoration flag to ensure settings are applied to rectangles
    appSettings.setIsRestoring(true);
    
    // Apply settings changes with layout updates disabled
    handleSettingsChange(restoredSettings, true);
    
    // Clear restoration flag after settings are applied
    appSettings.setIsRestoring(false);
    
    console.log('✅ Restore complete');
  }, [setSelectedId, setRectangles, initializeHistory, dimensionEngine, handleSettingsChange, appSettings]);

  // Initialize auto-save manager
  const autoSave = useAutoSaveManager({
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
        
        // Update rectangles with processed data - use setRectangles directly to avoid adding to existing history
        setRectangles(finalRectangles);
        console.log('📦 Set rectangles after import:', finalRectangles.length, 'rectangles');
        
        // Initialize history properly with the imported state as the baseline
        initializeHistory(finalRectangles);
        
        // Update the nextId counter to prevent ID conflicts
        updateNextId(newNextId);
        
        // Update global settings if available with layout updates disabled
        if (importedData.globalSettings) {
          handleSettingsChange(importedData.globalSettings, true);
          
          // After settings are applied, we need to apply fixed dimensions to existing rectangles
          // This is separate from layout updates and should happen even when skipLayoutUpdates = true
          if (importedData.globalSettings.leafFixedWidth || importedData.globalSettings.leafFixedHeight) {
            const updatedRectangles = finalRectangles.map(rect => {
              if (rect.type === 'leaf') {
                const updatedRect = { ...rect };
                if (importedData.globalSettings!.leafFixedWidth) {
                  updatedRect.w = importedData.globalSettings!.leafWidth;
                }
                if (importedData.globalSettings!.leafFixedHeight) {
                  updatedRect.h = importedData.globalSettings!.leafHeight;
                }
                return updatedRect;
              }
              return rect;
            });
            
            // Update rectangles directly and reinitialize history with the final state
            setRectangles(updatedRectangles);
            initializeHistory(updatedRectangles);
          }
        }
        
        // Clear selection
        setSelectedId(null);
        
        // Re-enable auto-save immediately and save the imported state BEFORE completing
        console.log('🔄 Re-enabling auto-save and saving imported state immediately...');
        
        // Determine final rectangles state after all processing
        let rectanglesToSave = finalRectangles;
        if (importedData.globalSettings?.leafFixedWidth || importedData.globalSettings?.leafFixedHeight) {
          rectanglesToSave = finalRectangles.map(rect => {
            if (rect.type === 'leaf') {
              const updatedRect = { ...rect };
              if (importedData.globalSettings!.leafFixedWidth) {
                updatedRect.w = importedData.globalSettings!.leafWidth;
              }
              if (importedData.globalSettings!.leafFixedHeight) {
                updatedRect.h = importedData.globalSettings!.leafHeight;
              }
              return updatedRect;
            }
            return rect;
          });
        }
        
        console.log('📊 Rectangles state at immediate save time:', rectanglesToSave.length, 'rectangles');
        autoSave.setAutoSaveEnabled(true);
        // Reset auto-restore flag so fresh imports can be properly auto-restored
        autoSave.resetAutoRestoreFlag();
        // Immediately save the imported state to ensure it persists
        await autoSave.save(rectanglesToSave);
        console.log('💾 Imported state saved to localStorage');
        
        // Complete the import process AFTER saving
        stateMachine.transition({ type: 'COMPLETE' });
        
        console.log('✅ Successfully imported diagram');
        
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
    setRectangles,
    initializeHistory,
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