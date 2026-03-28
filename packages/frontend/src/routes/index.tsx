import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { SuspenseFallbackPage } from "../components/ui/SuspenseFallback";
import { DashboardLayout } from "../components/layout/DashboardLayout";

// Lazy-loaded pages — each page is a separate JS chunk
// Suspense here is only for the brief JS chunk download (happens once).
// Data-fetching Suspense boundaries live inside each page component.
const Home = lazy(() =>
  import("../pages/Home").then(m => ({ default: m.Home }))
);
const Login = lazy(() =>
  import("../pages/Login").then(m => ({ default: m.Login }))
);
const Register = lazy(() =>
  import("../pages/Register").then(m => ({ default: m.Register }))
);
const Settings = lazy(() =>
  import("../pages/Settings").then(m => ({ default: m.Settings }))
);
const Transactions = lazy(() =>
  import("../pages/Transactions").then(m => ({ default: m.Transactions }))
);
const Metrics = lazy(() =>
  import("../pages/Metrics").then(m => ({ default: m.Metrics }))
);
const Subscriptions = lazy(() =>
  import("../pages/Subscriptions").then(m => ({ default: m.Subscriptions }))
);
const NotFound = lazy(() =>
  import("../pages/NotFound").then(m => ({ default: m.NotFound }))
);
const AuthCallback = lazy(() =>
  import("../pages/AuthCallback").then(m => ({ default: m.AuthCallback }))
);
const ForgotPassword = lazy(() =>
  import("../pages/ForgotPassword").then(m => ({ default: m.ForgotPassword }))
);
const ResetPassword = lazy(() =>
  import("../pages/ResetPassword").then(m => ({ default: m.ResetPassword }))
);
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then(m => ({ default: m.LandingPage }))
);

const chunkFallback = <SuspenseFallbackPage />;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    // ErrorBoundary catches any unhandled query errors
    <ErrorBoundary>
      <Routes>
        {/* Public-only routes */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Suspense fallback={chunkFallback}>
                <Login />
              </Suspense>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Suspense fallback={chunkFallback}>
                <Register />
              </Suspense>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <Suspense fallback={chunkFallback}>
                <ForgotPassword />
              </Suspense>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Suspense fallback={chunkFallback}>
              <ResetPassword />
            </Suspense>
          }
        />
        <Route
          path="/auth/callback"
          element={
            <Suspense fallback={chunkFallback}>
              <AuthCallback />
            </Suspense>
          }
        />
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <Suspense fallback={chunkFallback}>
                <LandingPage />
              </Suspense>
            </PublicOnlyRoute>
          }
        />

        {/* Protected routes — DashboardLayout is imported statically so sidebar/header
            are always visible. Each page handles its own data Suspense boundaries. */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={chunkFallback}>
                <Home />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={chunkFallback}>
                <Settings />
              </Suspense>
            }
          />
          <Route
            path="/transactions"
            element={
              <Suspense fallback={chunkFallback}>
                <Transactions />
              </Suspense>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <Suspense fallback={chunkFallback}>
                <Subscriptions />
              </Suspense>
            }
          />
          <Route
            path="/emails"
            element={<Navigate to="/transactions" replace />}
          />
          <Route
            path="/metrics"
            element={
              <Suspense fallback={chunkFallback}>
                <Metrics />
              </Suspense>
            }
          />
        </Route>

        <Route
          path="*"
          element={
            <Suspense fallback={chunkFallback}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}
