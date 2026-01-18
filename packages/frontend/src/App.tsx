import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import KBar from "./components/ui/KBar";
import { useAuth } from "./hooks/useAuth";
import { useTransactionsRealtime } from "./hooks/useTransactionsRealtime";
import "./i18n";
import { Toaster } from "sonner";

export function App() {
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

export default App;
