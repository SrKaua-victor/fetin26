import React, { useCallback, useState } from "react";
import LoginScreen from "./screens/LoginScreen";
import SetupScreen from "./screens/SetupScreen";
import TrackingScreen from "./screens/TrackingScreen";
import { useAuth } from "./hooks/useAuth";
import { useDriverSocket } from "./hooks/useDriverSocket";
import { useGeolocation } from "./hooks/useGeolocation";
import { useWakeLock } from "./hooks/useWakeLock";
import { getServerUrl, setServerUrl, isNative } from "./lib/api";
import { Bus, Loader } from "./components/Icons";

export default function App() {
  const [serverUrl, setServer] = useState(getServerUrl);
  const { driver, token, checking, signIn, signOut } = useAuth();
  const {
    connected,
    registered,
    sessionError,
    routes,
    trip,
    pending,
    sent,
    lastSentAt,
    distance,
    startTrip,
    sendLocation,
    stopTrip,
    status,
    reportStatus,
  } = useDriverSocket({ token, serverUrl });

  // O GPS só roda com viagem ativa; cada leitura vai direto para a central.
  // No app Android isso continua em segundo plano, via foreground service.
  const { position, error: gpsError, requestPermission } = useGeolocation({
    active: !!trip,
    onPosition: sendLocation,
    plate: trip?.plate,
  });

  // Na web é o Wake Lock que segura a tela; no app nativo não é preciso
  const screenAwake = useWakeLock(!!trip && !isNative);

  const handleServerChange = useCallback((value) => {
    setServer(setServerUrl(value));
  }, []);

  const handleStart = useCallback(
    async ({ vehicle, route }) => {
      // Pede a permissão antes de abrir a viagem, para não registrar viagem sem GPS
      await requestPermission();
      await startTrip({
        vehicleId: vehicle?.id,
        routeId: route?.id,
        plate: vehicle?.plate,
        routeName: route?.name,
      });
    },
    [requestPermission, startTrip]
  );

  if (checking) {
    return (
      <div className="app" style={splashScreen}>
        <div style={splashMark}>
          <Bus size={30} />
        </div>
        <div style={splashName}>BusTrack</div>
        <Loader size={20} className="spin" style={{ color: "var(--on-hero-soft)" }} />
      </div>
    );
  }

  if (!driver) {
    return (
      <LoginScreen onSignIn={signIn} serverUrl={serverUrl} onServerChange={handleServerChange} />
    );
  }

  if (!trip) {
    return (
      <SetupScreen
        driver={driver}
        routes={routes}
        connected={connected}
        onStart={handleStart}
        onSignOut={signOut}
      />
    );
  }

  return (
    <TrackingScreen
      trip={trip}
      position={position}
      gpsError={gpsError}
      connected={connected && registered}
      sessionError={sessionError}
      pending={pending}
      sent={sent}
      lastSentAt={lastSentAt}
      distance={distance}
      screenAwake={screenAwake}
      backgroundTracking={isNative}
      status={status}
      onReportStatus={reportStatus}
      onStop={stopTrip}
    />
  );
}

const splashScreen = {
  background: "var(--hero)",
  justifyContent: "center",
  alignItems: "center",
  gap: 18,
};

const splashMark = {
  width: 72,
  height: 72,
  borderRadius: 22,
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const splashName = {
  fontFamily: "var(--font-display)",
  fontSize: 24,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "#fff",
};
