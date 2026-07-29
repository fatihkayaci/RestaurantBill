import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import PrivateRoute from './components/PrivateRoute';

import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';

import WaiterLayout from './pages/waiter/Layout';
import WaiterTablesPage from './pages/waiter/TablesPage';

import KitchenLayout from './pages/kitchen/Layout';
import KitchenDashboardPage from './pages/kitchen/DashboardPage';

import CashierLayout from './pages/cashier/Layout';
import CashierDashboardPage from './pages/cashier/DashboardPage';

import OwnerLayout from './pages/owner/Layout';
import OwnerSettingsPage from './pages/owner/SettingsPage';
import OwnerMembershipPage from './pages/owner/MembershipPage';
import OwnerStaffPage from './pages/owner/StaffPage';
import SlugSetupPage from './pages/owner/SlugSetupPage';

import AdminLayout from './pages/admin/Layout';
import OverViewPage from './pages/admin/OverViewPage';
import MenuPage from './pages/admin/MenuPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import StaffPage from './pages/admin/StaffPage';
import AdminTablesPage from './pages/admin/TablesPage';
import CashRegistersPage from './pages/admin/CashRegistersPage';
import ProfilePage from './pages/admin/ProfilePage';
import AdminRestaurantPage from './pages/admin/RestaurantPage';

function App() {
    return (
        <>
            <Routes>
                {/* Waiter */}
                <Route element={<PrivateRoute><WaiterLayout /></PrivateRoute>}>
                    <Route path="/waiter" element={<WaiterTablesPage />} />
                </Route>

                {/* Kitchen */}
                <Route element={<PrivateRoute><KitchenLayout /></PrivateRoute>}>
                    <Route path="/kitchen" element={<KitchenDashboardPage />} />
                </Route>

                {/* Cashier */}
                <Route element={<PrivateRoute><CashierLayout /></PrivateRoute>}>
                    <Route path="/cashier" element={<CashierDashboardPage />} />
                </Route>

                {/* Owner */}
                <Route path="/setup-slug" element={<PrivateRoute><SlugSetupPage /></PrivateRoute>} />
                <Route path="/owner" element={<PrivateRoute><OwnerLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/owner/settings" replace />} />
                    <Route path="staff" element={<OwnerStaffPage />} />
                    <Route path="settings" element={<OwnerSettingsPage />} />
                    <Route path="membership" element={<OwnerMembershipPage />} />
                </Route>

                {/* Admin */}
                <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/admin/overview" replace />} />
                    <Route path="overview" element={<OverViewPage />} />
                    <Route path="menu" element={<MenuPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="staff" element={<StaffPage />} />
                    <Route path="tables" element={<AdminTablesPage />} />
                    <Route path="cash-registers" element={<CashRegistersPage />} />
                    <Route path="restaurant" element={<AdminRestaurantPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Auth */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<Navigate to="/login" replace />} />

                {/* Landing */}
                <Route path="/" element={<LandingPage />} />
            </Routes>
            <Toaster position="top-right" richColors />
        </>
    );
}

export default App;
