import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "@/components/layout";
import { Spinner } from "@/components/ui";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import CustomersPage from "@/pages/customers";
import DashboardPage from "@/pages/dashboard";
import FloorPlanPage from "@/pages/floor-plan";
import KdsPage from "@/pages/kds";
import LoginPage from "@/pages/login";
import MenuPage from "@/pages/menu";
import OmakasePage from "@/pages/omakase";
import OrdersPage from "@/pages/orders";
import PaymentsPage from "@/pages/payments";
import ReportsPage from "@/pages/reports";
import ReservationsPage from "@/pages/reservations";
import RewardsPage from "@/pages/rewards";
import SettingsPage from "@/pages/settings";

function Gate() {
  const { session, staff, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner size={26} />
      </div>
    );
  }

  // Phải vừa đăng nhập được, vừa có trong bảng staff.
  if (!session || !staff) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="floor-plan" element={<FloorPlanPage />} />
        <Route path="kds" element={<KdsPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="rewards" element={<RewardsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="omakase" element={<OmakasePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  );
}
