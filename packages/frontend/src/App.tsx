import "./index.css";
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

function AppContent() {
  const { loading } = useAuth();
  useTransactionsRealtime();

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
