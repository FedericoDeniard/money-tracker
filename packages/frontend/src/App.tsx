import "./index.css";
import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AppRoutes } from "./routes";
import KBar from "./components/ui/KBar";
import { useAuth } from "./hooks/useAuth";
import { useTransactionsRealtime } from "./hooks/useTransactionsRealtime";
import { queryClient } from "./lib/query-client";
import "./i18n";
import { Toaster } from "sonner";
import { registerServiceWorker } from "./hooks/usePushNotifications";

function AppContent() {
  const { loading } = useAuth();
  useTransactionsRealtime();

  useEffect(() => {
    // Register the service worker (idempotent — safe to call repeatedly)
    registerServiceWorker();

    // Inject the PWA manifest link tag if not already present
    // Done here instead of index.html to avoid Bun's bundler trying to resolve it
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/manifest.webmanifest";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
      {!loading && <KBar />}
      <Toaster position="bottom-center" />
    </BrowserRouter>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

export default App;
