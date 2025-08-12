import React, { useState, useCallback, useRef } from 'react';
import { X, Upload, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { Rectangle } from '../types';
import { 
  TemplateNode, 
  TemplateLoadingState, 
  TemplateInsertionOptions,
  TemplateInsertionResult 
} from '../types/template';
import { loadTemplateFromFile } from '../utils/templateUtils';
import TemplateTreeView from './TemplateTreeView';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface TemplatePageProps {
  /** Whether the template page is open */
  isOpen: boolean;
  /** Function to close the template page */
  onClose: () => void;
  /** Current rectangles on the canvas */
  rectangles: Rectangle[];
  /** Function to update rectangles */
  setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>;
  /** Function to fit parent rectangles to their children */
  fitToChildren: (id: string) => void;
  /** Available predefined colors */
  predefinedColors: string[];
  /** Global settings for layout calculations */
  globalSettings: {
    gridSize: number;
    leafWidth: number;
    leafHeight: number;
    leafFixedWidth: boolean;
    leafFixedHeight: boolean;
  };
}

/**
 * Advanced template management interface for hierarchical diagram creation:
 * 
 * Key Features:
 * - JSON template file loading with validation and error handling
 * - Interactive tree visualization of template hierarchies
 * - Configurable insertion depth control (0 = root only, 1+ = include children)
 * - Smart hierarchy-based color assignment system
 * - Automatic layout calculation and parent fitting
 * - Real-time insertion preview and feedback
 * 
 * Template Insertion Process:
 * 1. Load and parse JSON template files containing hierarchical node data
 * 2. Display interactive tree view for node selection
 * 3. Configure insertion parameters (depth levels, colors)
 * 4. Generate rectangles with calculated positioning and sizing
 * 5. Apply fit-to-children layout optimization for proper hierarchy display
 */
const TemplatePage: React.FC<TemplatePageProps> = ({
  isOpen,
  onClose,
  rectangles,
  setRectangles,
  fitToChildren,
  predefinedColors,
  globalSettings
}) => {
  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);
  
  // Template loading and processing state management
  const [loadingState, setLoadingState] = useState<TemplateLoadingState>({
    isLoading: false,
    error: null,
    templateData: null
  });
  
  // User interaction state for template selection and insertion
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isInserting, setIsInserting] = useState(false);
  const [insertionResult, setInsertionResult] = useState<TemplateInsertionResult | null>(null);
  const [insertionLevels, setInsertionLevels] = useState(1);
  
  // Hierarchy-based color scheme configuration
  const [hierarchyColors, setHierarchyColors] = useState({
    root: predefinedColors[0] || '#3b82f6',
    parent: predefinedColors[1] || '#10b981', 
    leaf: predefinedColors[2] || '#f59e0b'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  
  /**
   * Template file upload handler with comprehensive error handling and state management.
   * Supports JSON files containing hierarchical template node structures.
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset UI state for new template loading
    setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));
    setSelectedItems([]);
    setInsertionResult(null);
    
    try {
      const templateData = await loadTemplateFromFile(file);
      
      setLoadingState({
        isLoading: false,
        error: null,
        templateData
      });
    } catch (error) {
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load template'
      }));
    }
    
    // Clear file input to allow re-upload of same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  // Trigger file upload
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  // Handle selection change
  const handleSelectionChange = useCallback((items: string[]) => {
    setSelectedItems(items);
    setInsertionResult(null); // Clear previous insertion result
  }, []);
  
  /**
   * Topological sort for template nodes ensuring parents are processed before children.
   * Critical for proper rectangle creation order when building hierarchical structures.
   * 
   * Algorithm prevents circular dependencies and handles orphaned nodes gracefully.
   */
  const sortNodesByHierarchy = (nodes: TemplateNode[]): TemplateNode[] => {
    const sorted: TemplateNode[] = [];
    const remaining = [...nodes];
    const processed = new Set<string>();
    
    while (remaining.length > 0) {
      const beforeLength = remaining.length;
      
      // Process nodes whose parents have already been processed (or have no parent)
      for (let i = remaining.length - 1; i >= 0; i--) {
        const node = remaining[i];
        
        if (!node.parent || processed.has(node.parent)) {
          sorted.push(node);
          processed.add(node.id);
          remaining.splice(i, 1);
        }
      }
      
      // Safety check: if no progress made, add remaining nodes to prevent infinite loop
      if (remaining.length === beforeLength) {
        sorted.push(...remaining);
        break;
      }
    }
    
    return sorted;
  };
  
  /**
   * Core template insertion algorithm that transforms template nodes into canvas rectangles.
   * Handles depth-limited insertion, hierarchy-based sizing, and automatic layout optimization.
   * 
   * Process Flow:
   * 1. Filter nodes by insertion depth level
   * 2. Calculate optimal insertion position on canvas
   * 3. Generate rectangles with hierarchy-appropriate sizing
   * 4. Apply fit-to-children layout algorithm for proper nesting
   */
  const insertTemplateDirectly = useCallback(async (
    selectedNode: TemplateNode,
    templateData: TemplateNode[],
    options: TemplateInsertionOptions
  ): Promise<TemplateInsertionResult> => {
    
    /**
     * Recursive node collection with depth limiting.
     * Ensures controlled template insertion size based on user preferences.
     */
    const getNodesUpToLevel = (rootNode: TemplateNode, maxLevels: number): TemplateNode[] => {
      const result: TemplateNode[] = [rootNode];
      
      if (maxLevels === 0) {
        return result;
      }
      
      const addChildrenAtLevel = (parentId: string, currentLevel: number) => {
        if (currentLevel >= maxLevels) return;
        
        const children = templateData.filter(node => node.parent === parentId);
        children.forEach(child => {
          result.push(child);
          addChildrenAtLevel(child.id, currentLevel + 1);
        });
      };
      
      addChildrenAtLevel(rootNode.id, 0);
      return result;
    };
    
    const nodesToInsert = getNodesUpToLevel(selectedNode, options.insertionLevels);
    
    // Calculate optimal insertion position to avoid overlapping existing rectangles
    const startPosition = calculateInsertionPosition(rectangles, globalSettings);
    
    // Unique ID generation with timestamp and counter for collision avoidance
    let idCounter = 1;
    const generateUniqueId = () => {
      const id = `template-rect-${Date.now()}-${idCounter}`;
      idCounter++;
      return id;
    };
    
    // Ensure proper creation order for parent-child relationships
    const sortedNodes = sortNodesByHierarchy(nodesToInsert);
    
    // Rectangle creation with hierarchy-aware configuration
    const newRectangles: Rectangle[] = [];
    const rectangleIdMap = new Map<string, string>(); // Maps template node IDs to rectangle IDs
    
    // Generate rectangles for each template node with appropriate hierarchy configuration
    sortedNodes.forEach(node => {
      const rectangleId = generateUniqueId();
      rectangleIdMap.set(node.id, rectangleId);
      
      const parentTemplateId = node.parent;
      const parentRectangleId = parentTemplateId ? rectangleIdMap.get(parentTemplateId) : undefined;
      
      /**
       * Intelligent type classification based on insertion context:
       * - Selected node becomes root regardless of original template hierarchy
       * - Nodes with children in insertion set become parents
       * - Nodes without children become leaves
       */
      let type: 'root' | 'parent' | 'leaf';
      if (node.id === selectedNode.id) {
        type = 'root';
      } else {
        const hasChildren = nodesToInsert.some(n => n.parent === node.id);
        type = hasChildren ? 'parent' : 'leaf';
      }
      
      // Hierarchy-appropriate default sizing for optimal visual balance
      const defaultSizes = {
        root: { w: 16, h: 10 },   // Largest for main container
        parent: { w: 12, h: 8 },   // Medium for sub-containers
        leaf: { w: 8, h: 6 }       // Smallest for end nodes
      };
      
      const { w, h } = defaultSizes[type];
      
      const rectangle: Rectangle = {
        id: rectangleId,
        parentId: parentRectangleId,
        x: startPosition.x,
        y: startPosition.y,
        w,
        h,
        label: node.name,
        color: hierarchyColors[type] || hierarchyColors.root,
        type,
        description: node.description,
        metadata: {
          tags: ['template'],
          templateId: node.id
        }
      };
      
      newRectangles.push(rectangle);
    });
    
    // Add all generated rectangles to the canvas in a single operation
    setRectangles(prev => [...prev, ...newRectangles]);
    
    /**
     * Automatic layout optimization using fit-to-children algorithm.
     * Applied in bottom-up order to ensure proper parent sizing.
     */
    const parentRectangles = newRectangles.filter(r => r.type === 'parent' || r.type === 'root');
    
    // Calculate hierarchy depth for proper layout ordering
    const sortedParents = parentRectangles.sort((a, b) => {
      const getDepth = (rect: Rectangle): number => {
        let depth = 0;
        let current = rect;
        while (current.parentId) {
          depth++;
          current = newRectangles.find(r => r.id === current.parentId!)!;
          if (!current) break; // Safety check for orphaned rectangles
        }
        return depth;
      };
      return getDepth(b) - getDepth(a); // Process deepest parents first
    });
    
    // Delayed layout application to ensure DOM updates have completed
    setTimeout(() => {
      sortedParents.forEach(parent => {
        fitToChildren(parent.id);
      });
    }, 100);
    
    return {
      success: true,
      insertedRectangleIds: newRectangles.map(r => r.id),
      rootRectangleId: rectangleIdMap.get(selectedNode.id) || null
    };
  }, [rectangles, setRectangles, globalSettings, fitToChildren, hierarchyColors]);
  
  // Insert selected template
  const handleInsertTemplate = useCallback(async () => {
    if (!loadingState.templateData || selectedItems.length === 0) {
      return;
    }
    
    setIsInserting(true);
    setInsertionResult(null);
    
    try {
      // Get the first selected item
      const selectedId = selectedItems[0] as string;
      const selectedNode = loadingState.templateData.find(node => node.id === selectedId);
      
      if (!selectedNode) {
        throw new Error('Selected template node not found');
      }
      
      // Prepare insertion options
      const options: TemplateInsertionOptions = {
        templateNodeId: selectedId,
        includeChildren: insertionLevels > 0,
        insertionLevels: insertionLevels,
        color: '#3b82f6' // Default blue color
      };
      
      // Use the direct insertion function
      const result = await insertTemplateDirectly(
        selectedNode,
        loadingState.templateData,
        options
      );
      
      setInsertionResult(result);
      
      if (result.success) {
        // Close the template page after successful insertion
        setTimeout(() => {
          onClose();
        }, 1500);
      }
      
    } catch (error) {
      setInsertionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to insert template',
        insertedRectangleIds: [],
        rootRectangleId: null
      });
    } finally {
      setIsInserting(false);
    }
  }, [loadingState, selectedItems, onClose, insertTemplateDirectly, insertionLevels]);
  
  // Helper function to calculate insertion position
  const calculateInsertionPosition = (
    existingRects: Rectangle[],
    settings: { gridSize: number; leafWidth: number; leafHeight: number }
  ): { x: number; y: number } => {
    if (existingRects.length === 0) {
      return { x: 0, y: 0 };
    }
    
    const rightmost = Math.max(...existingRects.map(r => r.x + r.w));
    const spacing = settings.gridSize * 2;
    const x = Math.ceil((rightmost + spacing) / settings.gridSize) * settings.gridSize;
    
    return { x, y: 0 };
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Load hierarchical templates from JSON files and insert a single node onto the canvas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - File Upload and Controls */}
          <div className="w-80 border-r border-gray-200 p-6 flex flex-col">
            {/* File Upload */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Template
                </label>
                <button
                  onClick={handleUploadClick}
                  disabled={loadingState.isLoading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {loadingState.isLoading ? 'Loading...' : 'Choose JSON file'}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              
              {/* Error Display */}
              {loadingState.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle size={16} className="text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-600 mt-1">{loadingState.error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Success Display */}
              {insertionResult?.success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <CheckCircle size={16} className="text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Success</p>
                      <p className="text-sm text-green-600 mt-1">
                        Template inserted successfully! 
                        ({insertionResult.insertedRectangleIds.length} rectangles added)
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Insertion Error */}
              {insertionResult && !insertionResult.success && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle size={16} className="text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Insertion Failed</p>
                      <p className="text-sm text-red-600 mt-1">{insertionResult.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Color Settings */}
            {loadingState.templateData && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Hierarchy Colors</h4>
                
                {/* Color Preview */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-2">Preview:</div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-6 rounded border border-gray-300 flex items-center justify-center text-xs font-medium text-white shadow-sm"
                      style={{ backgroundColor: hierarchyColors.root }}
                      title="Root Level"
                    >
                      R
                    </div>
                    <div 
                      className="w-8 h-6 rounded border border-gray-300 flex items-center justify-center text-xs font-medium text-white shadow-sm"
                      style={{ backgroundColor: hierarchyColors.parent }}
                      title="Parent Level"
                    >
                      P
                    </div>
                    <div 
                      className="w-8 h-6 rounded border border-gray-300 flex items-center justify-center text-xs font-medium text-white shadow-sm"
                      style={{ backgroundColor: hierarchyColors.leaf }}
                      title="Leaf Level"
                    >
                      L
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Root Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-medium">Root</span>
                    <div className="flex gap-1">
                      {predefinedColors.slice(0, 6).map((color) => (
                        <button
                          key={`root-${color}`}
                          onClick={() => setHierarchyColors(prev => ({ ...prev, root: color }))}
                          className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 ${
                            hierarchyColors.root === color
                              ? 'border-gray-800 ring-2 ring-gray-300'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Root: ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Parent Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-medium">Parent</span>
                    <div className="flex gap-1">
                      {predefinedColors.slice(0, 6).map((color) => (
                        <button
                          key={`parent-${color}`}
                          onClick={() => setHierarchyColors(prev => ({ ...prev, parent: color }))}
                          className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 ${
                            hierarchyColors.parent === color
                              ? 'border-gray-800 ring-2 ring-gray-300'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Parent: ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Leaf Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-medium">Leaf</span>
                    <div className="flex gap-1">
                      {predefinedColors.slice(0, 6).map((color) => (
                        <button
                          key={`leaf-${color}`}
                          onClick={() => setHierarchyColors(prev => ({ ...prev, leaf: color }))}
                          className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 ${
                            hierarchyColors.leaf === color
                              ? 'border-gray-800 ring-2 ring-gray-300'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Leaf: ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Insert Button */}
            {loadingState.templateData && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                {/* Insertion Levels */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insertion Levels
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={insertionLevels}
                      onChange={(e) => setInsertionLevels(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-600">
                      {insertionLevels === 0 ? 'Root only' : 
                       insertionLevels === 1 ? 'Root + direct children' :
                       `Root + ${insertionLevels} levels deep`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    0 = Insert only the selected node, 1 = Include direct children, 2+ = Include deeper levels
                  </p>
                </div>

                <button
                  onClick={handleInsertTemplate}
                  disabled={selectedItems.length === 0 || isInserting}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                  <span>
                    {isInserting 
                      ? 'Inserting...' 
                      : selectedItems.length > 0 
                        ? `Insert Selected` 
                        : 'Select Template Node'
                    }
                  </span>
                </button>
                
                {selectedItems.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This will insert the selected node{insertionLevels === 0 ? ' only' : 
                    insertionLevels === 1 ? ' and its direct children' :
                    ` and ${insertionLevels} levels of children`}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Right Panel - Tree View */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Template Hierarchy</h3>
              <p className="text-sm text-gray-600 mt-1">
                Select a single node to insert it onto the canvas. 
                Colors will be applied based on hierarchy level:
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded border"
                    style={{ backgroundColor: hierarchyColors.root }}
                  ></div>
                  <span className="text-gray-600">Root</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded border"
                    style={{ backgroundColor: hierarchyColors.parent }}
                  ></div>
                  <span className="text-gray-600">Parent</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded border"
                    style={{ backgroundColor: hierarchyColors.leaf }}
                  ></div>
                  <span className="text-gray-600">Leaf</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {loadingState.templateData && (
                <TemplateTreeView
                  templateNodes={loadingState.templateData}
                  selectedItems={selectedItems}
                  onSelectionChange={handleSelectionChange}
                  isLoading={loadingState.isLoading}
                  className="h-full"
                />
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default TemplatePage;