import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import KBarAuth from "./components/ui/KBarAuth";
import KBarGuest from "./components/ui/KBarGuest";
import { useAuth } from "./hooks/useAuth";

export function App() {
  const { user, loading } = useAuth();

  return (
    <BrowserRouter>
      <AppRoutes />
      {!loading && (user ? <KBarAuth /> : <KBarGuest />)}
    </BrowserRouter>
  );
}

export default App;
