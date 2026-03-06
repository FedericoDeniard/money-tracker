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
import { LandingPage } from "../pages/LandingPage";
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

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<PublicOnlyRoute><Login /></PublicOnlyRoute>}
      />
      <Route
        path="/register"
        element={<PublicOnlyRoute><Register /></PublicOnlyRoute>}
      />
      <Route
        path="/forgot-password"
        element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Landing page at root */}
      <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />

      {/* Protected routes with dashboard layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/emails" element={<Navigate to="/transactions" replace />} />
        <Route path="/metrics" element={<Metrics />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
