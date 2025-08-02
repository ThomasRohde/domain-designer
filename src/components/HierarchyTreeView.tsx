import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Type } from 'lucide-react';
import { Rectangle } from '../types';

interface HierarchyNode {
  id: string;
  label: string;
  description?: string;
  parentId?: string;
  isTextLabel?: boolean;
  type: string;
}

interface HierarchyTreeViewProps {
  /** Rectangle data to display as hierarchy */
  rectangles: Rectangle[];
  /** Currently selected rectangle ID */
  selectedId: string | null;
  /** Callback when a rectangle is selected */
  onRectangleSelect: (rectangleId: string) => void;
  /** Optional search filter string */
  searchFilter?: string;
  /** Optional className for styling */
  className?: string;
}

interface TreeNodeProps {
  node: HierarchyNode;
  children: HierarchyNode[];
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  isHighlighted?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  children,
  level,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelect,
  isHighlighted = false
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

  // Choose appropriate icon based on node type
  const getIcon = () => {
    if (node.isTextLabel) {
      return <Type size={16} className={isSelected ? 'text-blue-600' : 'text-purple-500'} />;
    }
    if (hasChildren) {
      return <Folder size={16} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />;
    }
    return <FileText size={16} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />;
  };

  return (
    <div>
      {/* Node Row */}
      <div
        className={`flex items-center px-2 py-1 cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
            : isHighlighted
            ? 'bg-yellow-50 text-gray-800 border border-yellow-200'
            : 'text-gray-700 hover:bg-gray-100'
        } ${node.isTextLabel ? 'font-medium' : ''}`}
        style={{ paddingLeft: `${indentWidth + 8}px` }}
        onClick={handleSelect}
        title={node.description || node.label}
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
          {getIcon()}
        </div>

        {/* Node Content */}
        <div className="flex-1 min-w-0 ml-2">
          <div className="text-sm truncate">
            {node.label}
            {node.isTextLabel && (
              <span className="ml-1 text-xs text-purple-600">(text)</span>
            )}
          </div>
          {node.description && (
            <div className="text-xs text-gray-500 truncate mt-0.5">
              {node.description}
            </div>
          )}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
        )}
      </div>
    </div>
  );
};

/**
 * Hierarchy Tree View component for displaying rectangle hierarchy
 * Features text label prioritization and search filtering
 */
const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  rectangles,
  selectedId,
  onRectangleSelect,
  searchFilter = '',
  className = ''
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Convert rectangles to hierarchy nodes with search filtering
  const { hierarchyNodes, filteredNodeIds } = useMemo(() => {
    const nodes: HierarchyNode[] = rectangles.map(rect => ({
      id: rect.id,
      label: rect.label || `Rectangle ${rect.id}`,
      description: rect.description,
      parentId: rect.parentId,
      isTextLabel: rect.isTextLabel,
      type: rect.type
    }));

    // Apply search filter
    let filteredIds = new Set<string>();
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      rectangles.forEach(rect => {
        const matchesLabel = rect.label?.toLowerCase().includes(searchTerm);
        const matchesDescription = rect.description?.toLowerCase().includes(searchTerm);
        if (matchesLabel || matchesDescription) {
          filteredIds.add(rect.id);
          // Also include all ancestors to maintain hierarchy
          let currentParent = rect.parentId;
          while (currentParent) {
            filteredIds.add(currentParent);
            const parent = rectangles.find(r => r.id === currentParent);
            currentParent = parent?.parentId;
          }
          // Include all descendants
          const addDescendants = (parentId: string) => {
            rectangles
              .filter(r => r.parentId === parentId)
              .forEach(child => {
                filteredIds.add(child.id);
                addDescendants(child.id);
              });
          };
          addDescendants(rect.id);
        }
      });
    }

    return {
      hierarchyNodes: nodes,
      filteredNodeIds: searchFilter.trim() ? filteredIds : new Set()
    };
  }, [rectangles, searchFilter]);

  // Get root nodes (nodes with no parent) and sort with text labels first
  const rootNodes = useMemo(() => {
    const roots = hierarchyNodes.filter(node => 
      !node.parentId && 
      (filteredNodeIds.size === 0 || filteredNodeIds.has(node.id))
    );
    
    return roots.sort((a, b) => {
      // Text labels first
      if (a.isTextLabel && !b.isTextLabel) return -1;
      if (!a.isTextLabel && b.isTextLabel) return 1;
      // Then alphabetically
      return a.label.localeCompare(b.label);
    });
  }, [hierarchyNodes, filteredNodeIds]);

  // Helper to get children of a node, sorted with text labels first
  const getChildren = useCallback((nodeId: string): HierarchyNode[] => {
    const children = hierarchyNodes.filter(node => 
      node.parentId === nodeId && 
      (filteredNodeIds.size === 0 || filteredNodeIds.has(node.id))
    );
    
    return children.sort((a, b) => {
      // Text labels first
      if (a.isTextLabel && !b.isTextLabel) return -1;
      if (!a.isTextLabel && b.isTextLabel) return 1;
      // Then alphabetically
      return a.label.localeCompare(b.label);
    });
  }, [hierarchyNodes, filteredNodeIds]);

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

  // Handle node selection
  const handleSelect = useCallback((nodeId: string) => {
    onRectangleSelect(nodeId);
  }, [onRectangleSelect]);

  // Auto-expand nodes that have search matches
  React.useEffect(() => {
    if (searchFilter.trim() && filteredNodeIds.size > 0) {
      const newExpanded = new Set(expandedNodes);
      filteredNodeIds.forEach(nodeId => {
        // Expand all parents of matched nodes
        let currentParent = hierarchyNodes.find(n => n.id === nodeId)?.parentId;
        while (currentParent) {
          newExpanded.add(currentParent);
          currentParent = hierarchyNodes.find(n => n.id === currentParent)?.parentId;
        }
      });
      setExpandedNodes(newExpanded);
    }
  }, [searchFilter, filteredNodeIds, hierarchyNodes, expandedNodes]);

  // Recursive component to render a node and its children
  const renderNode = useCallback((node: HierarchyNode, level: number): React.ReactNode => {
    const children = getChildren(node.id);
    const isSelected = selectedId === node.id;
    const isExpanded = expandedNodes.has(node.id);
    const isHighlighted = !!searchFilter.trim() && 
      (node.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
       node.description?.toLowerCase().includes(searchFilter.toLowerCase()));

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
          isHighlighted={isHighlighted}
        />
        
        {/* Render children if expanded */}
        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [selectedId, expandedNodes, getChildren, handleToggleExpand, handleSelect, searchFilter]);

  // Empty state
  if (hierarchyNodes.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <Folder size={48} className="mx-auto mb-2 text-gray-300" />
          <p>No rectangles found</p>
          <p className="text-sm">Create some rectangles to see the hierarchy</p>
        </div>
      </div>
    );
  }

  // No search results
  if (searchFilter.trim() && filteredNodeIds.size === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-2 text-gray-300" />
          <p>No matches found</p>
          <p className="text-sm">Try a different search term</p>
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

export default HierarchyTreeView;