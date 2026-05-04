import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/MainLayout'; // Yeni layout'umuzu ekledik
import TablesPage from './pages/TablesPage';
import PosPage from './pages/PosPage';
import KitchenPage from './pages/KitchenPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import CashierPage from './pages/CashierPage';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<PrivateRoute><TablesPage/></PrivateRoute>} />
        <Route path="/table/:tableId" element={<PrivateRoute><PosPage /></PrivateRoute>} />
        <Route path="/kitchen" element={<PrivateRoute><KitchenPage /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        <Route path="/cashier" element={<PrivateRoute><CashierPage /></PrivateRoute>} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}

export default App;