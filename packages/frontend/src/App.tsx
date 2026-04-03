import "./index.css";
import "driver.js/dist/driver.css";
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
import { Toaster, toast } from "sonner";
import { useAppUpdate } from "./hooks/useAppUpdate";
import { useTranslation } from "react-i18next";

function AppContent() {
  const { loading } = useAuth();
  const { t } = useTranslation();
  useTransactionsRealtime();
  const { updateAvailable, applyUpdate } = useAppUpdate();

  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/manifest.webmanifest";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!updateAvailable) return;
    toast(t("update.available"), {
      description: t("update.description"),
      duration: Infinity,
      action: {
        label: t("update.action"),
        onClick: applyUpdate,
      },
    });
  }, [updateAvailable, applyUpdate, t]);

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
