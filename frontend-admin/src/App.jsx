import React, { useEffect, useState } from "react";
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

  if (!authenticated) return <AdminLogin onLogin={async (username, password) => {
    try { await adminLogin(username, password); setLoginError(""); setAuthenticated(true); }
    catch (error) { setLoginError(error.message); }
  }} error={loginError} />;

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

function AdminLogin({ onLogin, error }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  return <main style={{maxWidth:360,margin:"12vh auto",padding:24}}><h1>Administração</h1>
    <form onSubmit={(e) => { e.preventDefault(); onLogin(username, password); }}>
      <label>Usuário<input className="field" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" /></label>
      <label>Senha<input className="field" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></label>
      {error && <p style={{color:"#b42318"}}>{error}</p>}
      <button className="btn btn-primary" type="submit" style={{marginTop:16}}>Entrar</button>
    </form></main>;
}
