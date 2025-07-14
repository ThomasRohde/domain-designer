import { Routes, Route } from 'react-router-dom';
import HierarchicalDrawingApp from './components/HierarchicalDrawingApp';
import ViewerPage from './components/ViewerPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HierarchicalDrawingApp />} />
      <Route path="/viewer" element={<ViewerPage />} />
    </Routes>
  );
}

export default App;