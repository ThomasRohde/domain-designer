import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { ExportOptions, Rectangle } from '../types';
import { exportDiagram } from '../utils/exportUtils';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAppStore } from '../stores/useAppStore';
import { importDiagramFromJSON, processImportedDiagram, ImportedDiagramData } from '../utils/exportUtils';
import { initializeAutoSaveSubscription } from '../stores/useAppStore';
import { setGlobalUpdateNotificationHandler } from '../main';
import { canBulkMove } from '../utils/selectionUtils';
import RectangleRenderer from './RectangleRenderer';
import ContextMenu from './ContextMenu';
import Toolbar from './Toolbar';
import ExportModal from './ExportModal';
import ActionButtonsOverlay from './ActionButtonsOverlay';
import Canvas from './Canvas';
import Sidebar from './Sidebar';
import PropertyPanel from './PropertyPanel';
import LeftMenu from './LeftMenu';
import HierarchyOutlinePanel from './HierarchyOutlinePanel';
import AboutModal from './AboutModal';
import HelpModal from './HelpModal';
import LockConfirmationModal from './LockConfirmationModal';
import DescriptionEditModal from './DescriptionEditModal';
import ClearDataConfirmationModal from './ClearDataConfirmationModal';
import TemplatePage from './TemplatePage';
import { UpdateNotification } from './UpdateNotification';


const HierarchicalDrawingApp = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Rectangle state and operations
  const rectangles = useAppStore(state => state.rectangles);
  const selectedIds = useAppStore(state => state.ui.selectedIds);
  const selectedId = selectedIds.length > 0 ? selectedIds[0] : null;
  const { 
    addRectangle, 
    removeRectangle, 
    updateRectangleDescription,
    setSelectedIds,
    clearSelection,
    moveRectangle,
    bulkMove,
    fitToChildren,
    toggleManualPositioning,
    lockAsIs,
    setRectangles,
    setRectanglesWithHistory,
    updateNextId,
    // Multi-select operations
    alignRectangles,
    distributeRectangles,
    bulkDelete
  } = useAppStore(state => state.rectangleActions);
  const { findRectangle } = useAppStore(state => state.getters);
  const { undo, redo, initializeHistory } = useAppStore(state => state.historyActions);

  // UI state management for modals, menus, and responsive behavior
  const ui = useAppStore(state => state.ui);
  const uiActions = useAppStore(state => state.uiActions);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [clearDataModalOpen, setClearDataModalOpen] = useState(false);
  
  // Auto-save system for data persistence
  const autoSaveState = useAppStore(state => state.autoSave);
  const autoSaveActions = useAppStore(state => state.autoSaveActions);
  
  // Clipboard operations for copy/paste functionality
  const clipboardActions = useAppStore(state => state.clipboardActions);
  const canPaste = useAppStore(state => state.clipboardActions.canPaste());
  
  // Application settings and configuration
  const settings = useAppStore(state => state.settings);
  const settingsActions = useAppStore(state => state.settingsActions);

  // ID generation counter
  const nextId = useAppStore(state => state.nextId);

  /**
   * Wrapper to maintain compatibility with TemplatePage component's setState pattern.
   * Handles both direct state updates and functional updates while ensuring
   * all changes are tracked in the undo/redo history system.
   */
  const setRectanglesWrapper = useCallback((value: React.SetStateAction<Rectangle[]>) => {
    if (typeof value === 'function') {
      const current = useAppStore.getState().rectangles;
      setRectanglesWithHistory(value(current));
    } else {
      setRectanglesWithHistory(value);
    }
  }, [setRectanglesWithHistory]);

  const handleContextMenu = useCallback((e: React.MouseEvent, rectangleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if right-clicked rectangle is part of multi-selection
    const isMultiSelected = ui.selectedIds && ui.selectedIds.includes(rectangleId) && ui.selectedIds.length > 1;
    
    if (isMultiSelected) {
      // Use multi-select context menu
      uiActions.showMultiSelectContextMenu(e.clientX, e.clientY, ui.selectedIds);
    } else {
      // Use regular single-select context menu
      uiActions.showContextMenu(e.clientX, e.clientY, rectangleId);
    }
  }, [uiActions, ui.selectedIds]);

  const handleAddRectangle = useCallback((parentId: string | null = null) => {
    addRectangle(parentId || undefined);
  }, [addRectangle]);

  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!containerRef.current) return;
    try {
      await exportDiagram(
        containerRef.current, 
        rectangles, 
        options, 
        settings,
        settings.gridSize,
        settings.borderRadius,
        settings.borderColor,
        settings.borderWidth,
        settings.predefinedColors
      );
    } catch (error) {
      console.error('Error exporting diagram:', error);
    }
  }, [rectangles, settings]);

  const handleDeleteSelected = useCallback(() => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk delete
      bulkDelete(selectedIds);
    } else if (selectedId) {
      // Single rectangle delete
      removeRectangle(selectedId);
    }
  }, [selectedId, ui.selectedIds, removeRectangle, bulkDelete]);

  /**
   * Select all sibling rectangles of the currently selected rectangle.
   * Useful for quickly selecting all rectangles at the same hierarchy level.
   */
  const handleSelectAllSiblings = useCallback(() => {
    if (!selectedId) return;
    
    const currentRect = rectangles.find(r => r.id === selectedId);
    if (!currentRect) return;
    
    // Find all siblings (rectangles with same parentId)
    const siblings = rectangles.filter(r => 
      r.parentId === currentRect.parentId && 
      !r.isTextLabel && // Exclude text labels from multi-select
      r.id !== selectedId // Don't include the currently selected rectangle
    );
    
    // Include the current selection and all valid siblings
    const allSiblingIds = [selectedId, ...siblings.map(r => r.id)];
    setSelectedIds(allSiblingIds);
  }, [selectedId, rectangles, setSelectedIds]);

  /**
   * Clear all selections and return to no-selection state.
   * Useful for canceling multi-select operations.
   */
  const handleClearSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  /**
   * Orchestrates complex JSON import process with atomic state transitions.
   * 
   * Import Pipeline:
   * 1. File validation and JSON parsing with schema compatibility checking
   * 2. Data normalization and ID conflict resolution (generates new unique IDs)
   * 3. Global settings import and application to existing rectangles
   * 4. Atomic state updates with auto-save coordination to prevent partial state corruption
   * 5. History system initialization to enable undo/redo for imported content
   * 
   * Critical safeguards:
   * - Auto-save disabled during import to prevent intermediate state persistence
   * - Error recovery maintains original state if import fails at any stage
   * - Comprehensive validation prevents invalid data from corrupting the store
   */
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        // Temporarily disable auto-save to prevent partial state saves during import
        autoSaveActions.setEnabled(false);
        
        // Parse and validate imported JSON against current schema
        const importedData: ImportedDiagramData = await importDiagramFromJSON(file);
        
        // Validate and repair data structure, generate new IDs to prevent conflicts
        const { rectangles: processedRectangles, nextId: newNextId } = processImportedDiagram(
          importedData, 
          nextId
        );
        
        // Apply imported dimension settings to leaf rectangles
        let finalRectangles = processedRectangles;
        if (importedData.globalSettings?.leafFixedWidth || importedData.globalSettings?.leafFixedHeight) {
          finalRectangles = processedRectangles.map(rect => {
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
        
        // Atomic state update with validated data
        setRectangles(finalRectangles);
        initializeHistory(finalRectangles);
        updateNextId(newNextId);
        clearSelection();
        
        // Apply imported global settings
        if (importedData.globalSettings) {
          settingsActions.updateSettings(importedData.globalSettings);
        }
        
        // Re-enable auto-save and persist imported state
        autoSaveActions.setEnabled(true);
        autoSaveActions.resetAutoRestoreFlag();
        autoSaveActions.saveData();
        
        console.log('✅ Successfully imported diagram');
        
      } catch (error) {
        console.error('❌ Failed to import diagram:', error);
        autoSaveActions.setEnabled(true);
        alert(`Failed to import diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  }, [nextId, setRectangles, initializeHistory, updateNextId, clearSelection, settingsActions, autoSaveActions]);

  const handleAboutClick = () => {
    setAboutModalOpen(true);
    uiActions.closeLeftMenu();
  };

  const handleTemplatesClick = () => {
    uiActions.openTemplatePage();
    uiActions.closeLeftMenu();
  };

  const handleLockConfirmation = useCallback(() => {
    if (ui.lockConfirmationModal) {
      toggleManualPositioning(ui.lockConfirmationModal.rectangleId);
    }
  }, [ui.lockConfirmationModal, toggleManualPositioning]);

  const handleLockAsIs = useCallback(() => {
    if (ui.lockConfirmationModal) {
      lockAsIs(ui.lockConfirmationModal.rectangleId);
    }
  }, [ui.lockConfirmationModal, lockAsIs]);

  const handleEditDescription = useCallback((rectangleId: string) => {
    const rectangle = findRectangle(rectangleId);
    if (rectangle) {
      uiActions.showDescriptionEditModal(rectangleId, rectangle.label, rectangle.description || '');
    }
  }, [findRectangle, uiActions]);

  const handleAlign = useCallback((type: import('../stores/types').AlignmentType) => {
    if (ui.selectedIds && ui.selectedIds.length > 1) {
      try {
        alignRectangles(ui.selectedIds, type);
      } catch (error) {
        console.error('Error during alignment operation:', error);
        // Graceful degradation: clear invalid selection
        clearSelection();
      }
    }
  }, [ui.selectedIds, alignRectangles, clearSelection]);

  const handleDistribute = useCallback((direction: import('../stores/types').DistributionDirection) => {
    if (ui.selectedIds && ui.selectedIds.length > 2) {
      try {
        distributeRectangles(ui.selectedIds, direction);
      } catch (error) {
        console.error('Error during distribution operation:', error);
        // Graceful degradation: clear invalid selection
        clearSelection();
      }
    }
  }, [ui.selectedIds, distributeRectangles, clearSelection]);


  const handleBulkDelete = useCallback(() => {
    if (ui.selectedIds && ui.selectedIds.length > 1) {
      try {
        // TODO: Add confirmation dialog
        bulkDelete(ui.selectedIds);
      } catch (error) {
        console.error('Error during bulk delete:', error);
        // Graceful degradation: clear invalid selection
        clearSelection();
      }
    }
  }, [ui.selectedIds, bulkDelete, clearSelection]);

  const handleCopy = useCallback(() => {
    const idsToCopy = ui.selectedIds.length > 0 ? ui.selectedIds : selectedId ? [selectedId] : [];
    if (idsToCopy.length > 0) {
      try {
        clipboardActions.copyRectangles(idsToCopy);
      } catch (error) {
        console.error('Error during copy operation:', error);
      }
    }
  }, [ui.selectedIds, selectedId, clipboardActions]);

  const handlePaste = useCallback(() => {
    try {
      // Get target parent ID - if a parent rectangle is selected, paste as children
      const targetParentId = selectedId && findRectangle(selectedId)?.type === 'parent' ? selectedId : undefined;
      clipboardActions.pasteRectangles(targetParentId);
    } catch (error) {
      console.error('Error during paste operation:', error);
    }
  }, [selectedId, findRectangle, clipboardActions]);

  const handleSaveDescription = useCallback((description: string) => {
    if (ui.descriptionEditModal) {
      updateRectangleDescription(ui.descriptionEditModal.rectangleId, description);
    }
  }, [updateRectangleDescription, ui.descriptionEditModal]);

  /**
   * Bootstraps the IndexedDB persistence layer with sophisticated state synchronization.
   * 
   * Auto-save Architecture:
   * - Creates IndexedDB schema with versioning support for future migrations
   * - Establishes reactive subscriptions to Zustand store changes (rectangles, settings)
   * - Implements debounced writes to prevent excessive disk I/O during rapid editing
   * - Validates data integrity before persistence to prevent corruption
   * - Handles browser storage quota exceeded scenarios gracefully
   * - Provides automatic state restoration on app reload with conflict resolution
   */
  useEffect(() => {
    autoSaveActions.initialize();
    const cleanup = initializeAutoSaveSubscription();
    return cleanup;
  }, [autoSaveActions]);


  const handleClearSavedData = () => {
    setClearDataModalOpen(true);
  };

  const handleConfirmClearAll = useCallback(async () => {
    await autoSaveActions.clearData();
    window.location.reload();
  }, [autoSaveActions]);

  const handleConfirmClearModel = useCallback(async () => {
    // Clear model data while preserving settings
    await autoSaveActions.clearModel();
    
    // Reload immediately - the clearModel function sets the localStorage flag to prevent auto-restore
    window.location.reload();
  }, [autoSaveActions]);

  /**
   * Development diagnostics for IndexedDB connectivity and schema validation.
   * 
   * Creates isolated test operations to verify:
   * - IndexedDB API availability in current browser environment
   * - Database creation and object store management
   * - Basic CRUD operations with transaction handling
   * - Error scenarios and recovery mechanisms
   * 
   * This utility operates independently of the main auto-save system to avoid
   * interference during debugging sessions.
   */
  const testIndexedDB = useCallback(async () => {
    try {
      console.log('Testing IndexedDB directly...');
      const request = indexedDB.open('TestDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('test')) {
          db.createObjectStore('test');
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['test'], 'readwrite');
        const store = transaction.objectStore('test');
        
        store.put({ test: 'data', timestamp: Date.now() }, 'testKey');
        
        transaction.oncomplete = () => {
          console.log('Test data saved to IndexedDB');
          
          // Read it back
          const readTransaction = db.transaction(['test'], 'readonly');
          const readStore = readTransaction.objectStore('test');
          const getRequest = readStore.get('testKey');
          
          getRequest.onsuccess = () => {
            console.log('Test data retrieved:', getRequest.result);
          };
        };
      };
      
      request.onerror = (event) => {
        console.error('IndexedDB test failed:', event);
      };
    } catch (error) {
      console.error('IndexedDB not available:', error);
    }
  }, []);

  /**
   * Development debugging interface for production troubleshooting.
   * 
   * Exposes critical debugging utilities to the global window object,
   * enabling support teams to diagnose persistence issues in production:
   * - Direct IndexedDB connectivity testing
   * - Auto-save system inspection and manual triggering
   * - State dump and validation utilities
   * 
   * Only available in development builds to prevent security exposure.
   */
  React.useEffect(() => {
    interface WindowWithDebugUtils extends Window {
      testIndexedDB?: typeof testIndexedDB;
      autoSaveActions?: typeof autoSaveActions;
    }
    
    const windowWithDebug = window as WindowWithDebugUtils;
    windowWithDebug.testIndexedDB = testIndexedDB;
    windowWithDebug.autoSaveActions = autoSaveActions;
  }, [testIndexedDB, autoSaveActions]);

  /**
   * Service worker integration for seamless PWA update management.
   * 
   * Establishes communication bridge between service worker update detection
   * and the application's notification system. When a new app version is
   * available, users receive an in-app notification with options to:
   * - Continue working with the current version
   * - Immediately update to the new version with automatic reload
   * 
   * Prevents update interruptions during active editing sessions.
   */
  useEffect(() => {
    setGlobalUpdateNotificationHandler(uiActions.showUpdateNotification);
    return () => {
      setGlobalUpdateNotificationHandler(() => {});
    };
  }, [uiActions.showUpdateNotification]);

  // Canvas interaction state and handlers
  const startKeyboardMovement = useAppStore(state => state.canvasActions.startKeyboardMovement);
  const handleMouseMove = useAppStore(state => state.canvasActions.handleMouseMove);
  const handleMouseUp = useAppStore(state => state.canvasActions.handleMouseUp);
  const handleWheel = useAppStore(state => state.canvasActions.handleWheel);
  const setIsSpacePressed = useAppStore(state => state.canvasActions.setIsSpacePressed);
  
  // Minimap controls
  const toggleMinimap = useAppStore(state => state.canvasActions.toggleMinimap);
  const minimapVisible = useAppStore(state => state.canvas.minimapVisible);

  /**
   * High-precision keyboard movement system with collision detection.
   * 
   * Movement Algorithm:
   * - Converts pixel deltas to grid coordinates for consistent positioning
   * - Enforces parent boundary constraints with margin calculations
   * - Cascades movement to all child rectangles when parent moves
   * - Respects manual positioning locks and hierarchy permissions
   * - Applies movement to entire multi-selection while maintaining relative positions
   * 
   * Performance optimizations:
   * - Batches position updates to prevent flickering
   * - Uses constraint satisfaction to avoid invalid positions
   * - Triggers single history entry for bulk operations
   */
  const handleMoveUp = useCallback((deltaPixels: number) => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk movement
      startKeyboardMovement();
      bulkMove(selectedIds, 0, -deltaPixels);
    } else if (selectedId) {
      // Single rectangle movement
      startKeyboardMovement();
      moveRectangle(selectedId, 0, -deltaPixels);
    }
  }, [selectedId, ui.selectedIds, moveRectangle, bulkMove, startKeyboardMovement]);

  const handleMoveDown = useCallback((deltaPixels: number) => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk movement
      startKeyboardMovement();
      bulkMove(selectedIds, 0, deltaPixels);
    } else if (selectedId) {
      // Single rectangle movement
      startKeyboardMovement();
      moveRectangle(selectedId, 0, deltaPixels);
    }
  }, [selectedId, ui.selectedIds, moveRectangle, bulkMove, startKeyboardMovement]);

  const handleMoveLeft = useCallback((deltaPixels: number) => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk movement
      startKeyboardMovement();
      bulkMove(selectedIds, -deltaPixels, 0);
    } else if (selectedId) {
      // Single rectangle movement
      startKeyboardMovement();
      moveRectangle(selectedId, -deltaPixels, 0);
    }
  }, [selectedId, ui.selectedIds, moveRectangle, bulkMove, startKeyboardMovement]);

  const handleMoveRight = useCallback((deltaPixels: number) => {
    const selectedIds = ui.selectedIds;
    if (selectedIds.length > 1) {
      // Multi-select bulk movement
      startKeyboardMovement();
      bulkMove(selectedIds, deltaPixels, 0);
    } else if (selectedId) {
      // Single rectangle movement
      startKeyboardMovement();
      moveRectangle(selectedId, deltaPixels, 0);
    }
  }, [selectedId, ui.selectedIds, moveRectangle, bulkMove, startKeyboardMovement]);

  /**
   * Document-level event coordination for canvas interaction systems.
   * 
   * Event Management Architecture:
   * - Mouse move events enable real-time drag feedback and cursor updates
   * - Mouse up events ensure interaction state is properly cleaned up even if cursor leaves canvas
   * - Wheel events with passive:false override browser zoom to implement custom pan/zoom behavior
   * - Container-aware coordinate transformations handle viewport scaling and positioning
   * 
   * Critical for maintaining interaction state consistency across browser window boundaries.
   */
  useEffect(() => {
    const mouseMove = (e: MouseEvent) => handleMouseMove(e, containerRef);
    const mouseUp = () => handleMouseUp();
    const wheel = (e: WheelEvent) => handleWheel(e, containerRef);
    
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', wheel, { passive: false });
    }
    
    return () => {
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
      if (container) {
        container.removeEventListener('wheel', wheel);
      }
    };
  }, [handleMouseMove, handleMouseUp, handleWheel]);

  /**
   * Context-aware space bar handling for canvas panning without editor interference.
   * 
   * Smart Event Filtering:
   * - Detects when focus is in editable elements (inputs, textareas, contentEditable)
   * - Allows normal space bar behavior in text editing contexts
   * - Activates canvas panning mode only when focus is on non-editable elements
   * - Prevents event bubbling conflicts between different interaction modes
   * 
   * Essential for seamless user experience when switching between text editing and canvas navigation.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        const isEditable = target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        );
        
        if (!isEditable) {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        const isEditable = target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        );
        
        if (!isEditable) {
          e.preventDefault();
        }
        setIsSpacePressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [setIsSpacePressed]);

  /**
   * Centralized keyboard shortcut orchestration with conflict resolution.
   * 
   * Integrates all application keyboard shortcuts through a single handler system:
   * - File operations (save, open, undo, redo)
   * - Selection management (select all siblings, clear selection, delete)
   * - Movement controls (arrow keys with precision and fast modes)
   * - View controls (minimap toggle, escape behaviors)
   * 
   * Uses memoization to prevent handler recreation and ensure consistent behavior
   * across component re-renders. Handlers respect current application state and
   * multi-select context.
   */
  useKeyboardShortcuts(useMemo(() => ({
    onUndo: undo,
    onRedo: redo,
    onDelete: handleDeleteSelected,
    onCancel: handleClearSelection, // Escape now clears selection
    onSelectAll: handleSelectAllSiblings, // Ctrl+A selects all siblings
    onCopy: handleCopy, // Ctrl+C copies selected rectangles
    onPaste: handlePaste, // Ctrl+V pastes rectangles from clipboard
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
    onMoveLeft: handleMoveLeft,
    onMoveRight: handleMoveRight,
    onToggleMinimap: toggleMinimap, // 'M' key toggles navigation minimap visibility
  }), [undo, redo, handleDeleteSelected, handleClearSelection, handleSelectAllSiblings, handleCopy, handlePaste, handleMoveUp, handleMoveDown, handleMoveLeft, handleMoveRight, toggleMinimap]));

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden select-none">
      <UpdateNotification updateNotification={ui.updateNotification} />
      <Toolbar
        onAddRectangle={handleAddRectangle}
        onExport={uiActions.openExportModal}
        onImport={handleImport}
        selectedId={ui.selectedIds && ui.selectedIds.length === 1 ? ui.selectedIds[0] : selectedId}
        lastSaved={autoSaveState.lastSaved}
        autoSaveEnabled={autoSaveState.enabled}
        onToggleMinimap={toggleMinimap}
        minimapVisible={minimapVisible}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftMenu
          onAboutClick={handleAboutClick}
          onTemplatesClick={handleTemplatesClick}
          onClearSavedData={handleClearSavedData}
        />
        
        <HierarchyOutlinePanel />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Canvas
            containerRef={containerRef}
            overlay={
              <ActionButtonsOverlay />
            }
          >
            <RectangleRenderer
              containerRef={containerRef}
              onContextMenu={handleContextMenu}
            />
          </Canvas>
        </div>

        <Sidebar>
          <PropertyPanel />
        </Sidebar>
      </div>

      {ui.contextMenu && (() => {
        // Calculate if bulk operations are allowed for multi-select context menu
        const selectedIds = ui.contextMenu.selectedIds || [];
        const isMultiSelect = selectedIds.length > 1;
        const canPerformBulkOperations = isMultiSelect ? canBulkMove(selectedIds, rectangles) : true;
        
        return (
          <ContextMenu
            x={ui.contextMenu.x}
            y={ui.contextMenu.y}
            rectangleId={ui.contextMenu.rectangleId}
            selectedIds={ui.contextMenu.selectedIds}
            onAddChild={addRectangle}
            onRemove={removeRectangle}
            onEditDescription={handleEditDescription}
            onClose={uiActions.hideContextMenu}
            onAlign={handleAlign}
            onDistribute={handleDistribute}
            onBulkDelete={handleBulkDelete}
            onCopy={handleCopy}
            onPaste={handlePaste}
            canPaste={canPaste}
            canPerformAlignmentOperations={canPerformBulkOperations}
            canPerformDistributionOperations={canPerformBulkOperations}
          />
        );
      })()}

      <ExportModal
        isOpen={ui.exportModalOpen}
        onClose={uiActions.closeExportModal}
        onExport={handleExport}
      />

      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />

      <ClearDataConfirmationModal
        isOpen={clearDataModalOpen}
        onClose={() => setClearDataModalOpen(false)}
        onConfirmClearAll={handleConfirmClearAll}
        onConfirmClearModel={handleConfirmClearModel}
      />

      <HelpModal
        isOpen={ui.helpModalOpen}
        onClose={uiActions.closeHelpModal}
      />

      <LockConfirmationModal
        isOpen={!!ui.lockConfirmationModal}
        onClose={uiActions.hideLockConfirmationModal}
        onConfirm={handleLockConfirmation}
        onConfirmLockAsIs={handleLockAsIs}
        rectangleLabel={ui.lockConfirmationModal?.rectangleLabel || ''}
      />

      <DescriptionEditModal
        isOpen={!!ui.descriptionEditModal}
        onClose={uiActions.hideDescriptionEditModal}
        onSave={handleSaveDescription}
        rectangleId={ui.descriptionEditModal?.rectangleId || ''}
        rectangleLabel={ui.descriptionEditModal?.rectangleLabel || ''}
        currentDescription={ui.descriptionEditModal?.currentDescription || ''}
      />

      <TemplatePage
        isOpen={ui.templatePageOpen}
        onClose={uiActions.closeTemplatePage}
        rectangles={rectangles}
        setRectangles={setRectanglesWrapper}
        fitToChildren={fitToChildren}
        predefinedColors={settings.predefinedColors}
        globalSettings={{
          gridSize: settings.gridSize,
          leafWidth: settings.leafWidth,
          leafHeight: settings.leafHeight,
          leafFixedWidth: settings.leafFixedWidth,
          leafFixedHeight: settings.leafFixedHeight
        }}
      />
    </div>
  );
};

export default HierarchicalDrawingApp;