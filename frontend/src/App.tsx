import { Routes, Route } from 'react-router-dom';
import TablesPage from './pages/TablesPage';
import PosPage from './pages/PosPage';
import KitchenPage from './pages/KitchenPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<TablesPage />} />
        <Route path="/table/:tableId" element={<PosPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
      </Routes>
    </div>
  );
}

export default App;