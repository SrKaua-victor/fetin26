import React, { useEffect, useState } from "react";
import AdminLogin from "./components/AdminLogin";
import Topbar from "./components/Topbar";
import RoutesPage from "./pages/RoutesPage";
import BusesPage from "./pages/BusesPage";
import FleetPage from "./pages/FleetPage";
import LiveMapPage from "./pages/LiveMapPage";
import StopsPage from "./pages/StopsPage";
import ReportsPage from "./pages/ReportsPage";
import { useAdminSocket } from "./hooks/useAdminSocket";
import { useTheme } from "./hooks/useTheme";
import { getRoutes, adminLogin, getAdminToken, clearAdminToken } from "./hooks/api";

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => !!getAdminToken());
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState("routes");
  const { connected, buses } = useAdminSocket();
  const { theme, toggle: toggleTheme } = useTheme();
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    if (!authenticated) return;
    getRoutes().then(setRoutes);
    const id = setInterval(() => getRoutes().then(setRoutes), 5000);
    return () => clearInterval(id);
  }, [authenticated]);

  if (!authenticated) {
    return (
      <AdminLogin
        error={loginError}
        onLogin={async (username, password) => {
          try {
            await adminLogin(username, password);
            setLoginError("");
            setAuthenticated(true);
          } catch (error) {
            setLoginError(error.message);
            // Repassa: o formulário precisa saber que falhou para limpar a senha
            throw error;
          }
        }}
      />
    );
  }

  return (
    <>
      <Topbar
        connected={connected}
        activePage={page}
        onNavigate={setPage}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={() => { clearAdminToken(); setAuthenticated(false); }}
      />
      {page === "routes"  && <RoutesPage  buses={buses} theme={theme} />}
      {page === "buses"   && <BusesPage   buses={buses} routes={routes} />}
      {page === "fleet"   && <FleetPage   buses={buses} />}
      {page === "stops"   && <StopsPage   routes={routes} />}
      {page === "map"     && <LiveMapPage buses={buses} routes={routes} theme={theme} />}
      {page === "reports" && <ReportsPage routes={routes} buses={buses} />}
    </>
  );
}

