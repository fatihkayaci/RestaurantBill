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
import SlugSetupPage from './pages/owner/SlugSetupPage';

import AdminLayout from './pages/admin/Layout';
import CategoriesPage from './pages/admin/CategoriesPage';
import AdminRestaurantPage from './pages/admin/RestaurantPage';

import OverViewPage from './pages/shared/OverViewPage';
import StaffPage from './pages/shared/StaffPage';
import TablesPage from './pages/shared/TablesPage';
import MenuPage from './pages/shared/MenuPage';
import CashRegistersPage from './pages/shared/CashRegistersPage';
import ProfilePage from './pages/shared/ProfilePage';

function App() {
    return (
        <>
            <Routes>
                {/* Waiter */}
                <Route element={<PrivateRoute allowedRoles={["Waiter"]}><WaiterLayout /></PrivateRoute>}>
                    <Route path="/waiter" element={<WaiterTablesPage />} />
                </Route>

                {/* Kitchen */}
                <Route element={<PrivateRoute allowedRoles={["Kitchen"]}><KitchenLayout /></PrivateRoute>}>
                    <Route path="/kitchen" element={<KitchenDashboardPage />} />
                </Route>

                {/* Cashier */}
                <Route element={<PrivateRoute allowedRoles={["Cashier"]}><CashierLayout /></PrivateRoute>}>
                    <Route path="/cashier" element={<CashierDashboardPage />} />
                </Route>

                {/* Owner */}
                <Route path="/setup-slug" element={<PrivateRoute allowedRoles={["Owner"]}><SlugSetupPage /></PrivateRoute>} />
                <Route path="/owner" element={<PrivateRoute allowedRoles={["Owner"]}><OwnerLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/owner/overview" replace />} />
                    <Route path="overview" element={<OverViewPage />} />
                    <Route path="staff" element={<StaffPage />} />
                    <Route path="tables" element={<TablesPage />} />
                    <Route path="menu" element={<MenuPage />} />
                    <Route path="cash-registers" element={<CashRegistersPage />} />
                    <Route path="settings" element={<OwnerSettingsPage />} />
                    <Route path="membership" element={<OwnerMembershipPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Admin */}
                <Route path="/admin" element={<PrivateRoute allowedRoles={["Admin"]}><AdminLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/admin/overview" replace />} />
                    <Route path="overview" element={<OverViewPage />} />
                    <Route path="menu" element={<MenuPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="staff" element={<StaffPage />} />
                    <Route path="tables" element={<TablesPage />} />
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
