import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Download, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { parseHeatmapCSV, validateCSVFile, generateSampleCSV } from '../utils/heatmapImport';
import { useAppStore } from '../stores/useAppStore';
import type { HeatmapImportResult } from '../stores/types';

interface HeatmapImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HeatmapImportModal({ isOpen, onClose }: HeatmapImportModalProps) {
  const rectangles = useAppStore(state => state.rectangles);
  const bulkSetHeatmapValues = useAppStore(state => state.heatmapActions.bulkSetHeatmapValues);

  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<HeatmapImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = useCallback(() => {
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const processFile = useCallback(async (selectedFile: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Validate file
      const validation = await validateCSVFile(selectedFile);
      if (!validation.isValid) {
        setError(validation.error || 'File validation failed');
        setIsProcessing(false);
        return;
      }

      // Parse CSV content
      const result = parseHeatmapCSV(validation.content!, rectangles);
      setImportResult(result);
    } catch (err) {
      setError('Failed to process file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  }, [rectangles]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    processFile(selectedFile);
  }, [processFile]);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragIn = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0];
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleApplyImport = useCallback(() => {
    if (!importResult || importResult.successful.length === 0) {
      return;
    }

    // Apply the successful imports
    bulkSetHeatmapValues(importResult.successful.map(entry => ({
      rectangleId: entry.rectangleId,
      value: entry.value
    })));

    // Close modal
    handleClose();
  }, [importResult, bulkSetHeatmapValues, handleClose]);

  const handleDownloadSample = useCallback(() => {
    const sampleCSV = generateSampleCSV(rectangles);
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'heatmap-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rectangles]);

  if (!isOpen) return null;

  const hasResults = importResult !== null;
  const canApply = hasResults && importResult.successful.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Import Heat Map Values</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!hasResults ? (
            /* Upload Section */
            <div className="p-6 space-y-6">
              <div className="text-sm text-gray-600 space-y-2">
                <p>Upload a CSV file with rectangle names and heat map values.</p>
                <p><strong>Format:</strong> rectangleName,value (where value is between 0 and 1)</p>
                <p><strong>Note:</strong> Rectangle names are matched case-insensitively.</p>
              </div>

              {/* Sample Download */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <FileText size={16} className="text-blue-600" />
                  <span className="text-sm text-blue-800">Need a template?</span>
                </div>
                <button
                  onClick={handleDownloadSample}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  <Download size={14} />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <span className="text-sm text-red-800">{error}</span>
                  </div>
                </div>
              )}

              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-2">
                  {isProcessing ? 'Processing file...' : 'Drop CSV file here'}
                </p>
                <p className="text-sm text-gray-500 mb-4">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            /* Results Section */
            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={20} className="text-green-600" />
                    <div>
                      <p className="text-sm text-green-800 font-medium">Successful</p>
                      <p className="text-2xl font-bold text-green-900">{importResult.successful.length}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2">
                    <AlertCircle size={20} className="text-red-600" />
                    <div>
                      <p className="text-sm text-red-800 font-medium">Failed</p>
                      <p className="text-2xl font-bold text-red-900">{importResult.failed.length}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <AlertCircle size={20} className="text-yellow-600" />
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">Unmatched</p>
                      <p className="text-2xl font-bold text-yellow-900">{importResult.unmatched.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Successful Imports */}
              {importResult.successful.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-3">✅ Successful Imports</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="text-left p-2 text-green-800">Rectangle</th>
                          <th className="text-left p-2 text-green-800">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.successful.map((entry, index) => (
                          <tr key={index} className="border-t border-green-200">
                            <td className="p-2 text-green-900">{entry.label}</td>
                            <td className="p-2 text-green-900 font-mono">{entry.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Failed Imports */}
              {importResult.failed.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-3">❌ Failed Imports</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-100">
                        <tr>
                          <th className="text-left p-2 text-red-800">Name</th>
                          <th className="text-left p-2 text-red-800">Value</th>
                          <th className="text-left p-2 text-red-800">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.failed.map((entry, index) => (
                          <tr key={index} className="border-t border-red-200">
                            <td className="p-2 text-red-900">{entry.label}</td>
                            <td className="p-2 text-red-900 font-mono">{entry.value}</td>
                            <td className="p-2 text-red-900">{entry.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmatched Imports */}
              {importResult.unmatched.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 mb-3">⚠️ Unmatched Names</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-100">
                        <tr>
                          <th className="text-left p-2 text-yellow-800">Name</th>
                          <th className="text-left p-2 text-yellow-800">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.unmatched.map((entry, index) => (
                          <tr key={index} className="border-t border-yellow-200">
                            <td className="p-2 text-yellow-900">{entry.label}</td>
                            <td className="p-2 text-yellow-900 font-mono">{entry.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex space-x-3">
            {hasResults && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Choose Different File
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {hasResults && (
              <button
                onClick={handleApplyImport}
                disabled={!canApply}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Import ({importResult.successful.length} values)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}