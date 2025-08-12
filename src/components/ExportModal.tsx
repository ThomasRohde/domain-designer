import React, { useState } from 'react';
import { X, Download, Globe, FileType, File } from 'lucide-react';
import { ExportOptions } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

/**
 * Modal for configuring diagram export options across multiple formats.
 * 
 * Supported Export Formats:
 * - HTML: Interactive web document with zoom/pan and Confluence Server compatibility
 * - SVG: Scalable vector graphics for high-quality document embedding
 * - JSON: Complete diagram data with schema versioning for backup and sharing
 * - PowerPoint (PPTX): Native presentation format with hierarchical text styling
 * - Draw.io: XML format compatible with diagrams.net for further editing
 * - ArchiMate: Enterprise architecture modeling format (.archimate) with:
 *   • Strategy elements (Capabilities) representing each rectangle
 *   • Composition relationships for parent-child hierarchy
 *   • Visual diagram preserving layout, fonts, and colors
 *   • Compatible with ArchiMate Tool and similar enterprise modeling platforms
 * 
 * Features consistent across formats:
 * - Heat map color preservation when visualization is enabled
 * - Font family, sizing, and styling maintained
 * - Hierarchical relationships and positioning preserved
 */
const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [format, setFormat] = useState<'html' | 'svg' | 'json' | 'pptx' | 'drawio' | 'archimate'>('html');
  const [includeBackground, setIncludeBackground] = useState(true);
  /** Confluence Server HTML Macro requires specific formatting constraints (no document structure) */
  const [confluenceMode, setConfluenceMode] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport({
      format,
      includeBackground,
      confluenceMode
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" role="dialog">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Export Diagram</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('html')}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  format === 'html' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <Globe size={16} />
                <span>HTML</span>
              </button>
              <button
                onClick={() => setFormat('svg')}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  format === 'svg' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <FileType size={16} />
                <span>SVG</span>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  format === 'json' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <File size={16} />
                <span>JSON</span>
              </button>
              <button
                onClick={() => setFormat('pptx')}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  format === 'pptx' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <FileType size={16} />
                <span>PowerPoint</span>
              </button>
              <button
                onClick={() => setFormat('drawio')}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  format === 'drawio' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <FileType size={16} />
                <span>Draw.io</span>
              </button>
              <button
                onClick={() => setFormat('archimate')}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  format === 'archimate' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <FileType size={16} />
                <span>ArchiMate</span>
              </button>
            </div>
          </div>
          
          {/* Background option applies to visual formats; JSON exports complete data regardless */}
          {format !== 'json' && (
            <>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeBackground"
                  checked={includeBackground}
                  onChange={(e) => setIncludeBackground(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="includeBackground" className="text-sm text-gray-700">
                  Include background
                </label>
              </div>
              
              {/* Confluence mode removes document wrapper for embedding in Server HTML macros */}
              {format === 'html' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="confluenceMode"
                    checked={confluenceMode}
                    onChange={(e) => setConfluenceMode(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="confluenceMode" className="text-sm text-gray-700">
                    Confluence Server HTML Macro compatible
                  </label>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;