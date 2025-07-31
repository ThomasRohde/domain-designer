import { Routes, Route } from 'react-router-dom';
import HierarchicalDrawingApp from './components/HierarchicalDrawingApp';
import ViewerPage from './components/ViewerPage';

/**
 * Root application component with routing configuration
 * 
 * Provides two main routes:
 * - "/" - Full editor interface with all editing capabilities
 * - "/viewer" - Read-only viewer for displaying saved diagrams
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HierarchicalDrawingApp />} />
      <Route path="/viewer" element={<ViewerPage />} />
    </Routes>
  );
}

export default App;