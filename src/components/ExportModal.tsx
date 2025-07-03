import React, { useState } from 'react';
import { X, Download, FileImage, FileType, File } from 'lucide-react';
import { ExportOptions } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [format, setFormat] = useState<'png' | 'svg' | 'pdf' | 'json'>('png');
  const [quality, setQuality] = useState(1);
  const [scale, setScale] = useState(1);
  const [includeBackground, setIncludeBackground] = useState(true);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport({
      format,
      quality,
      scale,
      includeBackground
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
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
                onClick={() => setFormat('png')}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  format === 'png' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <FileImage size={16} />
                <span>PNG</span>
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
                onClick={() => setFormat('pdf')}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  format === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <File size={16} />
                <span>PDF</span>
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
            </div>
          </div>
          
          {format !== 'json' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scale: {scale}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {format === 'png' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality: {Math.round(quality * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              
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