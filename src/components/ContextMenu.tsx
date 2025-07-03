import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  rectangleId: string;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  rectangleId,
  onAddChild,
  onRemove,
  onClose
}) => {
  const handleAddChild = () => {
    onAddChild(rectangleId);
    onClose();
  };

  const handleRemove = () => {
    onRemove(rectangleId);
    onClose();
  };

  return (
    <div
      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[9999] min-w-48 animate-in"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
        {rectangleId}
      </div>
      
      <div className="py-1">
        <button
          onClick={handleAddChild}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
        >
          <Plus size={14} />
          <span>Add Child</span>
        </button>
      </div>
      
      <div className="border-t border-gray-100 py-1">
        <button
          onClick={handleRemove}
          className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
        >
          <Trash2 size={14} />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
};

export default ContextMenu;