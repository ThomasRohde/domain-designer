import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { TemplateNode } from '../types/template';

interface CustomTreeViewProps {
  /** Template nodes to display */
  templateNodes: TemplateNode[];
  /** Currently selected node IDs */
  selectedItems: string[];
  /** Callback when selection changes */
  onSelectionChange: (selectedItems: string[]) => void;
  /** Whether the tree is in loading state */
  isLoading?: boolean;
  /** Optional className for styling */
  className?: string;
}

interface TreeNodeProps {
  node: TemplateNode;
  children: TemplateNode[];
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  children,
  level,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelect
}) => {
  const hasChildren = children.length > 0;
  const indentWidth = level * 20;

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(node.id);
    }
  }, [hasChildren, node.id, onToggleExpand]);

  const handleSelect = useCallback(() => {
    onSelect(node.id);
  }, [node.id, onSelect]);

  return (
    <div>
      {/* Node Row */}
      <div
        className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 transition-colors ${
          isSelected ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'text-gray-700'
        }`}
        style={{ paddingLeft: `${indentWidth + 8}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        <div 
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center cursor-pointer"
          onClick={handleToggleExpand}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={16} className="text-gray-500" />
            ) : (
              <ChevronRight size={16} className="text-gray-500" />
            )
          ) : (
            <div className="w-4 h-4"></div>
          )}
        </div>

        {/* Icon */}
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center ml-1">
          {hasChildren ? (
            <Folder size={16} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
          ) : (
            <FileText size={16} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
          )}
        </div>

        {/* Node Content */}
        <div className="flex-1 min-w-0 ml-2">
          <div className="font-medium text-sm truncate">
            {node.name}
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
        )}
      </div>

      {/* Children - will be rendered by the main component */}
    </div>
  );
};


/**
 * Custom Tree View component for displaying hierarchical template data
 */
const CustomTreeView: React.FC<CustomTreeViewProps> = ({
  templateNodes,
  selectedItems,
  onSelectionChange,
  isLoading = false,
  className = ''
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Find root nodes (nodes with no parent)
  const rootNodes = templateNodes.filter(node => !node.parent);

  // Helper to get children of a node
  const getChildren = useCallback((nodeId: string): TemplateNode[] => {
    return templateNodes.filter(node => node.parent === nodeId);
  }, [templateNodes]);

  // Toggle expand/collapse for a node
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  }, []);

  // Handle node selection (single selection only)
  const handleSelect = useCallback((nodeId: string) => {
    // Single selection: either select this node or deselect if already selected
    if (selectedItems.includes(nodeId)) {
      onSelectionChange([]);
    } else {
      onSelectionChange([nodeId]);
    }
  }, [selectedItems, onSelectionChange]);

  // Recursive component to render a node and its children
  const renderNode = useCallback((node: TemplateNode, level: number): React.ReactNode => {
    const children = getChildren(node.id);
    const isSelected = selectedItems.includes(node.id);
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id}>
        <TreeNode
          node={node}
          children={children}
          level={level}
          isSelected={isSelected}
          isExpanded={isExpanded}
          onToggleExpand={handleToggleExpand}
          onSelect={handleSelect}
        />
        
        {/* Render children if expanded */}
        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [selectedItems, expandedNodes, getChildren, handleToggleExpand, handleSelect]);



  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>Loading template...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (templateNodes.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-2 text-gray-300" />
          <p>No template loaded</p>
          <p className="text-sm">Upload a JSON template file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="space-y-0">
        {rootNodes.map(rootNode => renderNode(rootNode, 0))}
      </div>
    </div>
  );
};

export default CustomTreeView;