import { Rectangle, GlobalSettings } from '../types';

interface HtmlExportOptions {
  includeBackground: boolean;
  scale: number;
}

export const exportToHTML = (
  rectangles: Rectangle[],
  filename: string,
  options: HtmlExportOptions,
  globalSettings?: GlobalSettings
): void => {
  const html = generateInteractiveHTML(rectangles, options, globalSettings);
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `${filename}.html`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
};

const generateInteractiveHTML = (
  rectangles: Rectangle[],
  options: HtmlExportOptions,
  globalSettings?: GlobalSettings
): string => {
  if (rectangles.length === 0) return '';

  const gridSize = globalSettings?.gridSize || 20;
  const borderRadius = globalSettings?.borderRadius || 8;
  const borderColor = globalSettings?.borderColor || '#374151';
  const borderWidth = globalSettings?.borderWidth || 2;
  const backgroundColor = options.includeBackground ? '#f9fafb' : 'transparent';

  // Calculate bounding box
  const minX = Math.min(...rectangles.map(r => r.x));
  const minY = Math.min(...rectangles.map(r => r.y));
  const maxX = Math.max(...rectangles.map(r => r.x + r.w));
  const maxY = Math.max(...rectangles.map(r => r.y + r.h));
  
  const width = (maxX - minX) * gridSize;
  const height = (maxY - minY) * gridSize;

  // Check which rectangles have children
  const hasChildren = new Set<string>();
  rectangles.forEach(rect => {
    if (rect.parentId) {
      hasChildren.add(rect.parentId);
    }
  });

  // Sort rectangles by hierarchy (parents first)
  const sortedRectangles = [...rectangles].sort((a, b) => {
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    return 0;
  });

  const rectangleElements = sortedRectangles.map(rect => {
    const x = (rect.x - minX) * gridSize;
    const y = (rect.y - minY) * gridSize;
    const w = rect.w * gridSize;
    const h = rect.h * gridSize;
    
    const isParent = hasChildren.has(rect.id);
    const textAlign = isParent ? 'top' : 'center';
    const padding = 10;
    
    return `
      <div class="rectangle" 
           style="
             position: absolute;
             left: ${x}px;
             top: ${y}px;
             width: ${w}px;
             height: ${h}px;
             background-color: ${rect.color};
             border: ${borderWidth}px solid ${borderColor};
             border-radius: ${borderRadius}px;
             display: flex;
             align-items: ${textAlign === 'center' ? 'center' : 'flex-start'};
             justify-content: center;
             padding: ${padding}px;
             box-sizing: border-box;
             cursor: default;
           "
           data-id="${rect.id}"
           data-type="${rect.type}"
           ${rect.description ? `title="${escapeHtml(rect.description)}"` : ''}>
        <div class="label" style="
          font-family: Arial, sans-serif;
          font-size: 14px;
          font-weight: bold;
          color: #374151;
          text-align: center;
          word-wrap: break-word;
          ${textAlign === 'top' ? 'margin-top: 0;' : ''}
        ">
          ${escapeHtml(rect.label)}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Domain Model Export</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      background-color: #f3f4f6;
      overflow: hidden;
      user-select: none;
    }
    
    .container {
      position: relative;
      width: 100vw;
      height: 100vh;
      cursor: grab;
    }
    
    .container:active {
      cursor: grabbing;
    }
    
    .canvas {
      position: absolute;
      background-color: ${backgroundColor};
      transform-origin: 0 0;
      transition: transform 0.1s ease-out;
    }
    
    .rectangle {
      user-select: none;
      transition: box-shadow 0.2s ease;
    }
    
    .rectangle:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .controls {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      gap: 10px;
      background: white;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .control-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .control-btn:hover {
      background: #2563eb;
    }
    
    .zoom-display {
      background: #f3f4f6;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #374151;
    }
    
    .tooltip {
      position: fixed;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1001;
      pointer-events: none;
      max-width: 300px;
      word-wrap: break-word;
    }
    
    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 4px solid transparent;
      border-top-color: #1f2937;
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="canvas" id="canvas" style="width: ${width}px; height: ${height}px;">
      ${rectangleElements}
    </div>
  </div>
  
  <div class="controls">
    <button class="control-btn" onclick="zoomIn()">Zoom In</button>
    <button class="control-btn" onclick="zoomOut()">Zoom Out</button>
    <button class="control-btn" onclick="resetView()">Reset</button>
    <div class="zoom-display" id="zoomDisplay">100%</div>
  </div>
  
  <div class="tooltip" id="tooltip" style="display: none;"></div>
  
  <script>
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    const container = document.getElementById('container');
    const canvas = document.getElementById('canvas');
    const zoomDisplay = document.getElementById('zoomDisplay');
    const tooltip = document.getElementById('tooltip');
    
    // Initial centering
    centerCanvas();
    
    function updateTransform() {
      canvas.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${scale})\`;
      zoomDisplay.textContent = Math.round(scale * 100) + '%';
    }
    
    function centerCanvas() {
      const containerRect = container.getBoundingClientRect();
      const canvasWidth = ${width};
      const canvasHeight = ${height};
      
      translateX = (containerRect.width - canvasWidth) / 2;
      translateY = (containerRect.height - canvasHeight) / 2;
      
      updateTransform();
    }
    
    function zoomIn() {
      scale = Math.min(scale * 1.2, 3);
      updateTransform();
    }
    
    function zoomOut() {
      scale = Math.max(scale / 1.2, 0.1);
      updateTransform();
    }
    
    function resetView() {
      scale = 1;
      centerCanvas();
    }
    
    // Pan functionality
    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      container.style.cursor = 'grabbing';
    });
    
    container.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        
        translateX += deltaX;
        translateY += deltaY;
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        updateTransform();
      }
      
      // Handle tooltips
      const rect = e.target.closest('.rectangle');
      if (rect && rect.hasAttribute('title')) {
        const description = rect.getAttribute('title');
        if (description) {
          tooltip.textContent = description;
          tooltip.style.display = 'block';
          tooltip.style.left = e.clientX + 10 + 'px';
          tooltip.style.top = e.clientY - 30 + 'px';
        }
      } else {
        tooltip.style.display = 'none';
      }
    });
    
    container.addEventListener('mouseup', () => {
      isDragging = false;
      container.style.cursor = 'grab';
    });
    
    container.addEventListener('mouseleave', () => {
      isDragging = false;
      container.style.cursor = 'grab';
      tooltip.style.display = 'none';
    });
    
    // Zoom with mouse wheel
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const canvasX = (mouseX - translateX) / scale;
      const canvasY = (mouseY - translateY) / scale;
      
      const oldScale = scale;
      scale = e.deltaY > 0 ? Math.max(scale / 1.1, 0.1) : Math.min(scale * 1.1, 3);
      
      translateX = mouseX - canvasX * scale;
      translateY = mouseY - canvasY * scale;
      
      updateTransform();
    });
    
    // Prevent context menu
    container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '=' || e.key === '+') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetView();
      }
    });
  </script>
</body>
</html>`;
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};