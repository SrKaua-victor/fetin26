import React, { useMemo, useState } from "react";
import BusMap from "./components/BusMap";
import Sidebar from "./components/Sidebar";
import BusDetail from "./components/BusDetail";
import { useSocket } from "./hooks/useSocket";
import { useTheme } from "./hooks/useTheme";
import { useFavorites } from "./hooks/useFavorites";

export default function App() {
  const { connected, routes, buses } = useSocket();
  const { theme, toggle: toggleTheme } = useTheme();
  const { favorites, toggle: toggleFavorite } = useFavorites();

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedBusId, setSelectedBusId] = useState(null);

  const onlineBuses = useMemo(() => buses.filter((b) => b.online && b.lat), [buses]);

  // Bus em destaque (selecionado manualmente ou inferido)
  const focusedBus = useMemo(() => {
    if (selectedBusId) return buses.find((b) => b.id === selectedBusId) || null;
    return (
      onlineBuses.find((b) => (selectedRoute ? b.routeId === selectedRoute : true)) || null
    );
  }, [selectedBusId, selectedRoute, buses, onlineBuses]);

  const focusedRoute = useMemo(() => {
    if (!focusedBus) return null;
    return routes.find((r) => r.id === focusedBus.routeId) || null;
  }, [focusedBus, routes]);

  // Painel de detalhe só abre se há ônibus selecionado OU rota filtrada com ônibus online
  const showDetail = !!(focusedBus && focusedRoute && (selectedBusId || selectedRoute));

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Sidebar
        connected={connected}
        routes={routes}
        buses={buses}
        selectedRoute={selectedRoute}
        onSelectRoute={(id) => {
          setSelectedRoute(id);
          setSelectedBusId(null);
        }}
        selectedBusId={selectedBusId}
        onSelectBus={(id) => {
          setSelectedBusId(id);
          if (id) {
            const b = buses.find((x) => x.id === id);
            if (b) setSelectedRoute(b.routeId);
          }
        }}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div
        className="map-area"
        style={{
          position: "absolute",
          top: 0,
          left: "var(--panel-w)",
          right: 0,
          bottom: 0,
        }}
      >
        <BusMap
          routes={routes}
          buses={buses}
          selectedRoute={selectedRoute}
          selectedBus={selectedBusId ? focusedBus : null}
          theme={theme}
        />

        {showDetail && (
          <BusDetail
            bus={focusedBus}
            route={focusedRoute}
            onClose={() => {
              setSelectedBusId(null);
              setSelectedRoute(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
