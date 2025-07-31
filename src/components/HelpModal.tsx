import React, { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Comprehensive help documentation modal with tabbed navigation.
 * Provides detailed guidance for all application features, keyboard shortcuts, and best practices.
 */
const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  if (!isOpen) return null;

  // Structured help content organized by functional areas
  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Creating Your First Diagram</h4>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>Click <strong>"Add Root"</strong> to create a top-level rectangle</li>
              <li>Select the rectangle and click <strong>"Add Child"</strong> to create nested rectangles</li>
              <li>Double-click any rectangle to edit its label</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Basic Navigation</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Click</strong> to select rectangles</li>
              <li>• <strong>Double-click</strong> to edit labels</li>
              <li>• <strong>Right-click</strong> for context menu options</li>
              <li>• <strong>Space + drag</strong> to pan the canvas</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'layout-algorithms',
      title: 'Layout Algorithms',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose between three layout algorithms in Global Settings to optimize your diagrams:
          </p>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Grid Layout</h4>
              <p className="text-sm text-gray-600">
                Traditional grid-based positioning with consistent spacing. Best for structured diagrams with regular spacing requirements.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Flow Layout</h4>
              <p className="text-sm text-gray-600">
                Hierarchical flow layout with depth-based alternating orientations. Perfect for organizational charts and process flows.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Mixed Flow Layout ⭐</h4>
              <p className="text-sm text-gray-600">
                Advanced algorithm that provides 20-45% better space efficiency by intelligently choosing between row and column arrangements.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'editing-tools',
      title: 'Editing Tools',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Rectangle Operations</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Drag</strong> root rectangles to reposition them</li>
              <li>• <strong>Resize</strong> parent rectangles using the bottom-right handle</li>
              <li>• <strong>Arrow keys</strong> for pixel-perfect movement (1px precision)</li>
              <li>• <strong>Shift + Arrow keys</strong> for fast movement (10px steps)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Manual Positioning</h4>
            <p className="text-sm text-gray-600 mb-2">
              To enable arrow key movement for child rectangles:
            </p>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Select a parent rectangle</li>
              <li>Click the unlock icon (padlock) to enable manual positioning</li>
              <li>Child rectangles can now be moved with arrow keys</li>
              <li>Click the lock icon to return to automatic layout</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Context Menu</h4>
            <p className="text-sm text-gray-600">
              Right-click any rectangle to access quick actions like adding children, editing descriptions, or removing rectangles.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'multi-select',
      title: 'Multi-Select Operations',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Selection Methods</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Ctrl + Click</strong> - Toggle individual rectangles in/out of selection</li>
              <li>• <strong>Drag Selection Box</strong> - Draw selection box on empty canvas area</li>
              <li>• <strong>Ctrl + A</strong> - Select all sibling rectangles at same level</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">PowerPoint-Style Context Menu</h4>
            <p className="text-sm text-gray-600 mb-2">
              Right-click on any selected rectangle to access the multi-select context menu:
            </p>
            <ul className="text-sm space-y-1">
              <li>• <strong>Alignment</strong> - Left, Center, Right, Top, Middle, Bottom (3×2 grid layout)</li>
              <li>• <strong>Distribution</strong> - Horizontal/Vertical equal spacing (minimum 3 rectangles)</li>
              <li>• <strong>Bulk Operations</strong> - Change color, delete selected with confirmation</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Selection Rules & Constraints</h4>
            <ul className="text-sm space-y-1">
              <li>• ✅ <strong>Same-level only</strong> - Only rectangles with same parent can be selected together</li>
              <li>• ✅ <strong>Root grouping</strong> - Root rectangles can only be selected with other roots</li>
              <li>• ❌ <strong>Text labels excluded</strong> - Text labels cannot be multi-selected</li>
              <li>• ⚠️ <strong>Manual positioning required</strong> - Bulk movement only when parent is unlocked</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Alignment & Distribution Features</h4>
            <div className="space-y-2">
              <div>
                <strong className="text-sm">Alignment Behavior:</strong>
                <ul className="text-xs text-gray-600 ml-4 mt-1">
                  <li>• Left/Right/Top/Bottom align to selection bounds</li>
                  <li>• Center/Middle align to mathematical center</li>
                  <li>• All positions snap to application grid system</li>
                </ul>
              </div>
              <div>
                <strong className="text-sm">Distribution Logic:</strong>
                <ul className="text-xs text-gray-600 ml-4 mt-1">
                  <li>• Perfect equal spacing between rectangle centers</li>
                  <li>• Boundary rectangles may adjust for symmetry</li>
                  <li>• Grid-aligned spacing values for precision</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Property Panel Integration</h4>
            <p className="text-sm text-gray-600">
              When multiple rectangles are selected, the property panel shows:
            </p>
            <ul className="text-sm space-y-1">
              <li>• <strong>Selection count</strong> - "Multiple Selected (X rectangles)" header</li>
              <li>• <strong>Bulk color picker</strong> - Apply color to all selected rectangles</li>
              <li>• <strong>Mixed value indicators</strong> - Shows when properties differ across selection</li>
              <li>• <strong>Bulk editing options</strong> - Append or replace labels and descriptions</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">File Operations</h4>
            <ul className="text-sm space-y-1 font-mono">
              <li>• <strong>Ctrl+S</strong> - Save diagram</li>
              <li>• <strong>Ctrl+O</strong> - Load diagram</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Edit Operations</h4>
            <ul className="text-sm space-y-1 font-mono">
              <li>• <strong>Ctrl+Z</strong> - Undo</li>
              <li>• <strong>Ctrl+Y</strong> or <strong>Ctrl+Shift+Z</strong> - Redo</li>
              <li>• <strong>Delete</strong> - Remove selected rectangle(s)</li>
              <li>• <strong>Escape</strong> - Cancel operation / Clear selection</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Multi-Select Operations ✨</h4>
            <ul className="text-sm space-y-1 font-mono">
              <li>• <strong>Ctrl+A</strong> - Select all sibling rectangles</li>
              <li>• <strong>Ctrl+Click</strong> - Toggle rectangle in/out of selection</li>
              <li>• <strong>Delete</strong> - Bulk delete with confirmation dialog</li>
              <li>• <strong>Arrow Keys</strong> - Bulk movement (when parent allows)</li>
              <li>• <strong>Shift+Arrow Keys</strong> - Fast bulk movement (10px)</li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Note:</strong> Bulk movement maintains relative positions and includes collision detection.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Movement</h4>
            <ul className="text-sm space-y-1 font-mono">
              <li>• <strong>Arrow Keys</strong> - Move selected rectangle by 1 pixel</li>
              <li>• <strong>Shift+Arrow Keys</strong> - Move selected rectangle by 10 pixels</li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Note:</strong> Arrow key movement only works for root rectangles or children of unlocked parents.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'templates',
      title: 'Templates',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Template System</h4>
            <p className="text-sm text-gray-600 mb-2">
              Load hierarchical templates from JSON files and insert nodes onto the canvas:
            </p>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Click <strong>"Templates"</strong> in the hamburger menu</li>
              <li>Upload a JSON file containing template nodes</li>
              <li>Browse the template hierarchy in the tree view</li>
              <li>Select any node to insert it (with its children) onto the canvas</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Template File Format</h4>
            <p className="text-sm text-gray-600 mb-2">
              Templates should be JSON arrays with the following structure:
            </p>
            <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-x-auto">
{`[
  {
    "id": "root-1",
    "name": "Business Architecture",
    "description": "Top-level domain",
    "parent": null
  },
  {
    "id": "child-1",
    "name": "Business Processes",
    "description": "Core processes",
    "parent": "root-1"
  }
]`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Template Features</h4>
            <ul className="text-sm space-y-1">
              <li>• Interactive tree view for browsing template structure</li>
              <li>• Color coding based on hierarchy level (root, parent, leaf)</li>
              <li>• Insert single nodes or entire subtrees</li>
              <li>• Automatic positioning of inserted template nodes</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'export-options',
      title: 'Export Options',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Export your diagrams in multiple formats:
          </p>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">HTML</h4>
              <p className="text-sm text-gray-600">
                Interactive web document with zoom, pan, and tooltip capabilities. Perfect for sharing and presentations.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">SVG</h4>
              <p className="text-sm text-gray-600">
                Scalable vector graphics that maintain quality at any size. Great for embedding in documents.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">JSON</h4>
              <p className="text-sm text-gray-600">
                Raw diagram data for backup, sharing, or importing into other tools. Preserves all diagram information and enables URL-based sharing.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Mermaid</h4>
              <p className="text-sm text-gray-600">
                Diagram notation format for documentation and version control. Compatible with GitHub, GitLab, and other platforms.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'url-sharing',
      title: 'URL Sharing',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Share Diagrams via URL</h4>
            <p className="text-sm text-gray-600 mb-2">
              After exporting a diagram as JSON, you can share it directly using the URL viewer:
            </p>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Export your diagram as JSON</li>
              <li>Upload the JSON file to any web-accessible location (GitHub, Gist, etc.)</li>
              <li>Share the URL in this format: <code className="bg-gray-100 px-1 rounded">/viewer?url=[JSON_URL]</code></li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">URL Format</h4>
            <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-x-auto">
{`https://yourdomain.com/viewer?url=https://example.com/diagram.json
https://yourdomain.com/viewer?url=https://gist.githubusercontent.com/user/id/raw/diagram.json
https://yourdomain.com/viewer?url=https://raw.githubusercontent.com/user/repo/main/diagram.json`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">URL Viewer Features</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Read-only viewing</strong> - Safe to share publicly</li>
              <li>• <strong>No data storage</strong> - Diagrams load directly from your URL</li>
              <li>• <strong>Editor button</strong> - Recipients can import diagrams to edit</li>
              <li>• <strong>Full functionality</strong> - Pan, zoom, and view all diagram details</li>
              <li>• <strong>Universal access</strong> - Works with any publicly accessible JSON file</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Best Practices</h4>
            <ul className="text-sm space-y-1">
              <li>• Use stable URLs that won't change over time</li>
              <li>• Ensure your JSON files are publicly accessible (no authentication required)</li>
              <li>• Consider using GitHub repositories or Gists for reliable hosting</li>
              <li>• Test your shared URLs before distributing them</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Example Workflow</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Create your diagram in Domain Designer</li>
              <li>Export as JSON using the export dialog</li>
              <li>Upload to GitHub Gist or repository</li>
              <li>Copy the raw file URL</li>
              <li>Share: <code className="bg-gray-100 px-1 rounded">/viewer?url=[your-raw-url]</code></li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'Settings & Customization',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Global Settings</h4>
            <p className="text-sm text-gray-600 mb-2">
              Click the settings icon in the toolbar to access:
            </p>
            <ul className="text-sm space-y-1">
              <li>• Layout algorithm selection</li>
              <li>• Margin and spacing adjustments</li>
              <li>• Font size and family customization</li>
              <li>• Fixed dimensions for leaf nodes</li>
              <li>• Border styles and colors</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Color Customization</h4>
            <p className="text-sm text-gray-600">
              You can add custom colors through the color palette in the property panel to personalize your rectangles.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Font Detection</h4>
            <p className="text-sm text-gray-600">
              The application automatically detects available system fonts and provides loading feedback for optimal typography.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'pwa-features',
      title: 'Progressive Web App',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Installation</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Open the app in Chrome, Edge, or similar browser</li>
              <li>Look for the "Install" button in the address bar</li>
              <li>Click "Install Domain Designer" to add it to your system</li>
              <li>Launch from your desktop or start menu like any native app</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Offline Features</h4>
            <ul className="text-sm space-y-1">
              <li>• Continue working without internet connection</li>
              <li>• Auto-save to IndexedDB as you edit</li>
              <li>• Instant loading after first visit</li>
              <li>• Data persistence and restoration on app restart</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Status Indicators</h4>
            <p className="text-sm text-gray-600">
              The toolbar displays your connection status and auto-save information:
            </p>
            <ul className="text-sm space-y-1">
              <li>• Online/Offline indicator</li>
              <li>• Last saved timestamp</li>
              <li>• Save confirmation messages</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'tips-tricks',
      title: 'Tips & Tricks',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Efficiency Tips</h4>
            <ul className="text-sm space-y-1">
              <li>• Use the Mixed Flow Layout for complex diagrams with varied content</li>
              <li>• Enable manual positioning for fine-tuned control of child rectangles</li>
              <li>• Use keyboard shortcuts for faster editing</li>
              <li>• Take advantage of the undo/redo system to experiment freely</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Organization Best Practices</h4>
            <ul className="text-sm space-y-1">
              <li>• Group related concepts using parent rectangles</li>
              <li>• Use consistent colors for similar types of elements</li>
              <li>• Keep labels concise and descriptive</li>
              <li>• Use the hierarchy to show relationships and dependencies</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Performance</h4>
            <ul className="text-sm space-y-1">
              <li>• The app handles up to 500+ rectangles efficiently</li>
              <li>• Auto-save prevents data loss during long editing sessions</li>
              <li>• Export early and often to preserve your work</li>
              <li>• Use templates for common diagram patterns</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const activeContent = sections.find(section => section.id === activeSection);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 h-[80vh] flex flex-col" role="dialog">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Help & Documentation</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation sidebar with section selection */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{section.title}</span>
                    <ChevronRight size={16} className={`${
                      activeSection === section.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {activeContent?.title}
              </h3>
              <div className="text-gray-600">
                {activeContent?.content}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t flex justify-end">
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

export default HelpModal;
