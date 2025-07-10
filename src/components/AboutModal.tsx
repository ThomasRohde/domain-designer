import React from 'react';
import { X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">About</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4 text-gray-600">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Domain Modeling Tool</h3>
            <p className="text-sm">
              A hierarchical drawing application for domain modeling with constraint-based layout.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Features</h3>
            <ul className="text-sm space-y-1">
              <li>• Hierarchical rectangle modeling</li>
              <li>• Automatic layout and sizing</li>
              <li>• Export to HTML, SVG, JSON, and Mermaid</li>
              <li>• Responsive design</li>
              <li>• Keyboard shortcuts</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Technology</h3>
            <p className="text-sm">
              Built with React, TypeScript, and Tailwind CSS.
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;