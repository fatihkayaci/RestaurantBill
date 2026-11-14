import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import PrivateRoute from './components/PrivateRoute';
import { getTenantSlug } from './lib/tenant';

import LoginPage from './pages/LoginPage';
import LandingPage from './pages/landing/LandingPage';
import PhoneVerificationPage from './pages/PhoneVerificationPage';

import WaiterLayout from './pages/waiter/Layout';
import WaiterTablesPage from './pages/waiter/TablesPage';

import KitchenLayout from './pages/kitchen/Layout';
import KitchenDashboardPage from './pages/kitchen/DashboardPage';

import CashierLayout from './pages/cashier/Layout';
import CashierDashboardPage from './pages/cashier/DashboardPage';

import CourierLayout from './pages/courier/Layout';
import CourierDashboardPage from './pages/courier/DashboardPage';

import OwnerLayout from './pages/owner/Layout';
import OwnerDashboardPage from './pages/owner/DashboardPage';
import OwnerBrandingPage from './pages/owner/SettingsPage';
import OwnerBranchesPage from './pages/owner/BranchesPage';
import OwnerAdminsPage from './pages/owner/AdminsPage';
import OwnerAuditLogPage from './pages/owner/AuditLogPage';
import SlugSetupPage from './pages/owner/SlugSetupPage';

import AdminLayout from './pages/admin/Layout';
import StaffPage from './pages/admin/StaffPage';
import TablesPage from './pages/admin/TablesPage';
import MenuPage from './pages/admin/MenuPage';
import SetMenusPage from './pages/admin/SetMenusPage';
import CashRegistersPage from './pages/admin/CashRegistersPage';
import ShiftsPage from './pages/admin/ShiftsPage';
import ProfilePage from './pages/admin/ProfilePage';

import ReportsPage from './pages/reports/ReportsPage';
import OverViewPage from './pages/shared/OverViewPage';

import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import TermsOfServicePage from './pages/legal/TermsOfServicePage';
import DistanceSalesAgreementPage from './pages/legal/DistanceSalesAgreementPage';
import RefundPolicyPage from './pages/legal/RefundPolicyPage';
import ContactPage from './pages/legal/ContactPage';

import RestaurantSitePage from './pages/public/RestaurantSitePage';
import RestaurantMenuPage from './pages/public/RestaurantMenuPage';
import RestaurantAboutPage from './pages/public/RestaurantAboutPage';
import RestaurantVenuePage from './pages/public/RestaurantVenuePage';
import RestaurantContactPage from './pages/public/RestaurantContactPage';
import RestaurantReservationPage from './pages/public/RestaurantReservationPage';
import ReservationDetailPage from './pages/public/ReservationDetailPage';
import ReservationLookupPage from './pages/public/ReservationLookupPage';
import SiteSettingsPage from './pages/admin/SiteSettingsPage';
import TableOrderPage from './pages/public/TableOrderPage';
import ReservationsPage from './pages/admin/ReservationsPage';
import SettingsPage, { LegacySettingsRedirect } from './pages/admin/SettingsPage';
import OnlineOrdersPage from './pages/admin/OnlineOrdersPage';
import DeliveryOrderPage from './pages/public/DeliveryOrderPage';
import DeliveryTrackingPage from './pages/public/DeliveryTrackingPage';

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

                {/* Courier */}
                <Route element={<PrivateRoute allowedRoles={["Courier"]}><CourierLayout /></PrivateRoute>}>
                    <Route path="/courier" element={<CourierDashboardPage />} />
                </Route>

                {/* Owner */}
                <Route path="/setup-slug" element={<PrivateRoute allowedRoles={["Owner"]}><SlugSetupPage /></PrivateRoute>} />
                <Route path="/owner" element={<PrivateRoute allowedRoles={["Owner"]} scope="company"><OwnerLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/owner/overview" replace />} />
                    <Route path="overview" element={<OwnerDashboardPage />} />
                    <Route path="branches" element={<OwnerBranchesPage />} />
                    <Route path="admins" element={<OwnerAdminsPage />} />
                    <Route path="branding" element={<OwnerBrandingPage />} />
                    <Route path="reports" element={<ReportsPage role="owner" />} />
                    <Route path="audit-log" element={<OwnerAuditLogPage />} />
                </Route>

                {/* Admin — Owner bir şube seçtiğinde aynı paneli kullanır; şirket sayfaları ona ek olarak açılır */}
                <Route path="/admin" element={<PrivateRoute allowedRoles={["Admin", "Owner"]} scope="branch"><AdminLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/admin/overview" replace />} />
                    <Route path="branches" element={<PrivateRoute allowedRoles={["Owner"]}><OwnerBranchesPage /></PrivateRoute>} />
                    <Route path="admins" element={<PrivateRoute allowedRoles={["Owner"]}><OwnerAdminsPage /></PrivateRoute>} />
                    <Route path="branding" element={<PrivateRoute allowedRoles={["Owner"]}><OwnerBrandingPage /></PrivateRoute>} />
                    <Route path="audit-log" element={<PrivateRoute allowedRoles={["Owner"]}><OwnerAuditLogPage /></PrivateRoute>} />
                    <Route path="overview" element={<OverViewPage />} />
                    <Route path="menu" element={<MenuPage />} />
                    <Route path="set-menus" element={<SetMenusPage />} />
                    <Route path="staff" element={<StaffPage />} />
                    <Route path="tables" element={<TablesPage />} />
                    <Route path="cash-registers" element={<CashRegistersPage />} />
                    <Route path="reservations" element={<ReservationsPage />} />
                    <Route path="online-orders" element={<OnlineOrdersPage />} />
                    <Route path="online-ordering" element={<LegacySettingsRedirect sekme="online" />} />
                    <Route path="shifts" element={<ShiftsPage />} />
                    <Route path="day-end" element={<Navigate to="/admin/shifts" replace />} />
                    <Route path="reports" element={<ReportsPage role="admin" />} />
                    <Route path="restaurant" element={<LegacySettingsRedirect sekme="restoran" />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="site" element={<SiteSettingsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Auth */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<Navigate to="/login" replace />} />
                <Route path="/verify-phone" element={<PhoneVerificationPage />} />

                {/* Legal */}
                <Route path="/gizlilik-politikasi" element={<PrivacyPolicyPage />} />
                <Route path="/kullanim-kosullari" element={<TermsOfServicePage />} />
                <Route path="/mesafeli-satis-sozlesmesi" element={<DistanceSalesAgreementPage />} />
                <Route path="/iptal-ve-iade" element={<RefundPolicyPage />} />
                {/* Restoranın alan adında /iletisim restoranın iletişim sayfasıdır; ana alan adında Sophram'ın. */}
                <Route path="/iletisim" element={getTenantSlug() ? <RestaurantContactPage /> : <ContactPage />} />

                {/* Restoranın müşteriye açık sitesi: slug'lı alan adının kökü. /menu, slug'sız (yerel) ortamda denemek için. */}
                <Route path="/" element={getTenantSlug() ? <RestaurantSitePage /> : <LandingPage />} />
                <Route path="/menu" element={<RestaurantMenuPage />} />
                <Route path="/hakkimizda" element={<RestaurantAboutPage />} />
                <Route path="/mekan" element={<RestaurantVenuePage />} />
                <Route path="/rezervasyon" element={<RestaurantReservationPage />} />
                <Route path="/rezervasyon/:token" element={<ReservationDetailPage />} />
                <Route path="/rezervasyon-sorgula" element={<ReservationLookupPage />} />
                <Route path="/masa/:tableId" element={<TableOrderPage />} />
                <Route path="/siparis" element={<DeliveryOrderPage />} />
                <Route path="/siparis/takip/:token" element={<DeliveryTrackingPage />} />
            </Routes>
            <Toaster position="top-right" richColors />
        </>
    );
}

export default App;
