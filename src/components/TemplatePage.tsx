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
 * Template Page component for loading and inserting hierarchical templates
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
  // Template loading state
  const [loadingState, setLoadingState] = useState<TemplateLoadingState>({
    isLoading: false,
    error: null,
    templateData: null,
    treeData: null,
    rootItems: []
  });
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isInserting, setIsInserting] = useState(false);
  const [insertionResult, setInsertionResult] = useState<TemplateInsertionResult | null>(null);
  
  // Color settings for hierarchy levels
  const [hierarchyColors, setHierarchyColors] = useState({
    root: predefinedColors[0] || '#3b82f6',
    parent: predefinedColors[1] || '#10b981', 
    leaf: predefinedColors[2] || '#f59e0b'
  });
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  
  // Load template file
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));
    setSelectedItems([]);
    setInsertionResult(null);
    
    try {
      const templateData = await loadTemplateFromFile(file);
      
      setLoadingState({
        isLoading: false,
        error: null,
        templateData,
        treeData: null, // Not needed anymore
        rootItems: [] // Not needed anymore
      });
    } catch (error) {
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load template'
      }));
    }
    
    // Clear the file input
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
  
  // Sort template nodes by hierarchy level (parents before children)
  const sortNodesByHierarchy = (nodes: TemplateNode[]): TemplateNode[] => {
    const sorted: TemplateNode[] = [];
    const remaining = [...nodes];
    const processed = new Set<string>();
    
    while (remaining.length > 0) {
      const beforeLength = remaining.length;
      
      for (let i = remaining.length - 1; i >= 0; i--) {
        const node = remaining[i];
        
        if (!node.parent || processed.has(node.parent)) {
          sorted.push(node);
          processed.add(node.id);
          remaining.splice(i, 1);
        }
      }
      
      if (remaining.length === beforeLength) {
        // Prevent infinite loop
        sorted.push(...remaining);
        break;
      }
    }
    
    return sorted;
  };
  
  // Direct template insertion using basic rectangles and fit-to-children
  const insertTemplateDirectly = useCallback(async (
    selectedNode: TemplateNode,
    templateData: TemplateNode[],
    options: TemplateInsertionOptions
  ): Promise<TemplateInsertionResult> => {
    // Get all descendants
    const getDescendants = (nodeId: string): TemplateNode[] => {
      const descendants: TemplateNode[] = [];
      const directChildren = templateData.filter(node => node.parent === nodeId);
      
      directChildren.forEach(child => {
        descendants.push(child);
        descendants.push(...getDescendants(child.id));
      });
      
      return descendants;
    };
    
    // Get nodes to insert
    const nodesToInsert = options.includeChildren
      ? [selectedNode, ...getDescendants(selectedNode.id)]
      : [selectedNode];
    
    // Calculate starting position
    const startPosition = calculateInsertionPosition(rectangles, globalSettings);
    
    // Generate unique ID function
    let idCounter = 1;
    const generateUniqueId = () => {
      const id = `template-rect-${Date.now()}-${idCounter}`;
      idCounter++;
      return id;
    };
    
    // Sort nodes by hierarchy (parents before children)
    const sortedNodes = sortNodesByHierarchy(nodesToInsert);
    
    // Create basic rectangles with default sizes
    const newRectangles: Rectangle[] = [];
    const rectangleIdMap = new Map<string, string>();
    
    sortedNodes.forEach(node => {
      const rectangleId = generateUniqueId();
      rectangleIdMap.set(node.id, rectangleId);
      
      const parentTemplateId = node.parent;
      const parentRectangleId = parentTemplateId ? rectangleIdMap.get(parentTemplateId) : undefined;
      
      // Determine node type
      let type: 'root' | 'parent' | 'leaf';
      if (!node.parent) {
        type = 'root';
      } else {
        const hasChildren = nodesToInsert.some(n => n.parent === node.id);
        type = hasChildren ? 'parent' : 'leaf';
      }
      
      // Use basic default sizes
      const defaultSizes = {
        root: { w: 16, h: 10 },
        parent: { w: 12, h: 8 },
        leaf: { w: 8, h: 6 }
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
        color: hierarchyColors[type],
        type,
        metadata: {
          description: node.description,
          tags: ['template'],
          templateId: node.id
        }
      };
      
      newRectangles.push(rectangle);
    });
    
    // Add rectangles to the canvas
    setRectangles(prev => [...prev, ...newRectangles]);
    
    // Apply fit-to-children to all parent rectangles (bottom-up)
    const parentRectangles = newRectangles.filter(r => r.type === 'parent' || r.type === 'root');
    
    // Sort by hierarchy depth (deepest first) to ensure proper bottom-up fitting
    const sortedParents = parentRectangles.sort((a, b) => {
      const getDepth = (rect: Rectangle): number => {
        let depth = 0;
        let current = rect;
        while (current.parentId) {
          depth++;
          current = newRectangles.find(r => r.id === current.parentId!)!;
          if (!current) break;
        }
        return depth;
      };
      return getDepth(b) - getDepth(a); // Deepest first
    });
    
    // Apply fit-to-children to each parent
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
        includeChildren: true, // Always include children for hierarchical templates
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
  }, [loadingState, selectedItems, onClose, insertTemplateDirectly]);
  
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
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Load hierarchical templates from JSON files and insert them onto the canvas
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
                        ? `Insert Selected (${selectedItems.length})` 
                        : 'Select Template Node'
                    }
                  </span>
                </button>
                
                {selectedItems.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This will insert the selected node and all its children
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
                Select any node to insert it and all its children onto the canvas. 
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