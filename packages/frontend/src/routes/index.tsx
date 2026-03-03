import { Routes, Route, Navigate } from "react-router-dom";
import { Home } from "../pages/Home";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { Settings } from "../pages/Settings";
import { Transactions } from "../pages/Transactions";
import { Metrics } from "../pages/Metrics";
import { Subscriptions } from "../pages/Subscriptions";
import { NotFound } from "../pages/NotFound";
import { AuthCallback } from "../pages/AuthCallback";
import { ForgotPassword } from "../pages/ForgotPassword";
import { ResetPassword } from "../pages/ResetPassword";
import { useAuth } from "../hooks/useAuth";
import { DashboardLayout } from "../components/layout/DashboardLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <Register />}
      />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/" replace /> : <ForgotPassword />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="settings" element={<Settings />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="emails" element={<Navigate to="/transactions" replace />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Fallback for non-auth routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
