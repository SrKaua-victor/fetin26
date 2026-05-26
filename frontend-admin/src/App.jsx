import React, { useEffect, useState } from "react";
import Topbar from "./components/Topbar";
import RoutesPage from "./pages/RoutesPage";
import BusesPage from "./pages/BusesPage";
import LiveMapPage from "./pages/LiveMapPage";
import StopsPage from "./pages/StopsPage";
import ReportsPage from "./pages/ReportsPage";
import { useAdminSocket } from "./hooks/useAdminSocket";
import { useTheme } from "./hooks/useTheme";
import { getRoutes } from "./hooks/api";

export default function App() {
  const [page, setPage] = useState("routes");
  const { connected, buses } = useAdminSocket();
  const { theme, toggle: toggleTheme } = useTheme();
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    getRoutes().then(setRoutes);
    const id = setInterval(() => getRoutes().then(setRoutes), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Topbar
        connected={connected}
        activePage={page}
        onNavigate={setPage}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {page === "routes"  && <RoutesPage  buses={buses} theme={theme} />}
      {page === "buses"   && <BusesPage   buses={buses} routes={routes} />}
      {page === "stops"   && <StopsPage   routes={routes} />}
      {page === "map"     && <LiveMapPage buses={buses} routes={routes} theme={theme} />}
      {page === "reports" && <ReportsPage routes={routes} buses={buses} />}
    </>
  );
}
