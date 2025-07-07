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
import { DEFAULT_RECTANGLE_SIZE } from '../utils/constants';

interface TemplatePageProps {
  /** Whether the template page is open */
  isOpen: boolean;
  /** Function to close the template page */
  onClose: () => void;
  /** Current rectangles on the canvas */
  rectangles: Rectangle[];
  /** Function to update rectangles */
  setRectangles: React.Dispatch<React.SetStateAction<Rectangle[]>>;
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
  
  // Direct template insertion implementation
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
    
    // Sort by hierarchy
    const sortedNodes = sortNodesByHierarchy(nodesToInsert);
    
    // Calculate starting position
    const startPosition = calculateInsertionPosition(rectangles, globalSettings);
    
    // Create rectangles
    const newRectangles: Rectangle[] = [];
    const rectangleIdMap = new Map<string, string>();
    
    // Generate all IDs first to avoid duplicates
    let idCounter = 1;
    const generateUniqueId = () => {
      const id = `template-rect-${Date.now()}-${idCounter}`;
      idCounter++;
      return id;
    };
    
    sortedNodes.forEach((node, index) => {
      const parentTemplateId = node.parent;
      const parentRectangleId = parentTemplateId ? rectangleIdMap.get(parentTemplateId) : undefined;
      
      // Determine type and size
      const hasChildren = nodesToInsert.some(n => n.parent === node.id);
      const type = !node.parent ? 'root' : hasChildren ? 'parent' : 'leaf';
      
      // Use proper default sizes in grid units
      let size = DEFAULT_RECTANGLE_SIZE[type];
      
      // For leaf nodes, respect global settings if fixed dimensions are enabled
      if (type === 'leaf') {
        size = {
          w: globalSettings.leafFixedWidth ? globalSettings.leafWidth : DEFAULT_RECTANGLE_SIZE.leaf.w,
          h: globalSettings.leafFixedHeight ? globalSettings.leafHeight : DEFAULT_RECTANGLE_SIZE.leaf.h
        };
      }
      
      // Calculate position
      let position = startPosition;
      if (!node.parent && index > 0) {
        position = {
          x: startPosition.x + (index * (size.w + globalSettings.gridSize * 2)),
          y: startPosition.y
        };
      }
      
      const rectangle: Rectangle = {
        id: generateUniqueId(),
        parentId: parentRectangleId,
        x: position.x,
        y: position.y,
        w: size.w,
        h: size.h,
        label: node.name,
        color: options.color || '#3b82f6',
        type,
        metadata: {
          description: node.description,
          tags: ['template'],
          templateId: node.id
        }
      };
      
      newRectangles.push(rectangle);
      rectangleIdMap.set(node.id, rectangle.id);
    });
    
    // Update rectangles
    setRectangles(prev => [...prev, ...newRectangles]);
    
    return {
      success: true,
      insertedRectangleIds: newRectangles.map(r => r.id),
      rootRectangleId: rectangleIdMap.get(selectedNode.id) || null
    };
  }, [rectangles, setRectangles, globalSettings]);
  
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
  
  // Helper functions
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
        sorted.push(...remaining);
        break;
      }
    }
    
    return sorted;
  };
  
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
                Select any node to insert it and all its children onto the canvas
              </p>
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