import React from 'react';
import { TemplateNode } from '../types/template';
import CustomTreeView from './CustomTreeView';

interface TemplateTreeViewProps {
  /** Template nodes to display */
  templateNodes: TemplateNode[];
  /** Currently selected item IDs */
  selectedItems: string[];
  /** Callback when selection changes */
  onSelectionChange: (selectedItems: string[]) => void;
  /** Whether the tree is in loading state */
  isLoading?: boolean;
  /** Optional className for styling */
  className?: string;
}

/**
 * Template Tree View component using custom tree implementation
 * Displays hierarchical template data with selection capabilities
 */
const TemplateTreeView: React.FC<TemplateTreeViewProps> = ({
  templateNodes,
  selectedItems,
  onSelectionChange,
  isLoading = false,
  className = ''
}) => {
  return (
    <CustomTreeView
      templateNodes={templateNodes}
      selectedItems={selectedItems}
      onSelectionChange={onSelectionChange}
      isLoading={isLoading}
      className={className}
    />
  );
};

export default TemplateTreeView;