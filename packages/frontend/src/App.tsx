import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import KBar from "./components/ui/KBar";
import { useAuth } from "./hooks/useAuth";
import "./i18n";

export function App() {
  const { loading } = useAuth();

  return (
    <BrowserRouter>
      <AppRoutes />
      {!loading && <KBar />}
    </BrowserRouter>
  );
}

export default App;
