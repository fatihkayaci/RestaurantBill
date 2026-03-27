import PrivateRoute from './components/PrivateRoute';
import { Routes, Route } from 'react-router-dom';
import TablesPage from './pages/TablesPage';
import PosPage from './pages/PosPage';
import KitchenPage from './pages/KitchenPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        {/* / => /waiter will change */}
        <Route path="/" element={<PrivateRoute><TablesPage/></PrivateRoute>} />
        <Route path="/table/:tableId" element={<PrivateRoute><PosPage /></PrivateRoute>} />
        <Route path="/kitchen" element={<PrivateRoute><KitchenPage /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </div>
  );
}

export default App;