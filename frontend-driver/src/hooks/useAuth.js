import { useCallback, useEffect, useState } from "react";
import * as api from "../lib/api";

const DRIVER_KEY = "bustrack.driver";

function readStoredDriver() {
  try {
    return JSON.parse(localStorage.getItem(DRIVER_KEY) || "null");
  } catch {
    return null;
  }
}

export function useAuth() {
  const [driver, setDriver] = useState(readStoredDriver);
  const [token, setTokenState] = useState(api.getToken);
  const [checking, setChecking] = useState(!!api.getToken());

  // Revalida a sessão guardada ao abrir o app
  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    api
      .me()
      .then((fresh) => {
        if (cancelled) return;
        setDriver(fresh);
        localStorage.setItem(DRIVER_KEY, JSON.stringify(fresh));
      })
      .catch((err) => {
        // 401/403 = sessão inválida. Erro de rede não desloga: o motorista
        // pode estar sem sinal e ainda assim precisa abrir o app.
        if (!cancelled && (err.status === 401 || err.status === 403)) {
          api.setToken(null);
          localStorage.removeItem(DRIVER_KEY);
          setTokenState(null);
          setDriver(null);
        }
      })
      .finally(() => !cancelled && setChecking(false));

    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback(async (registration, password) => {
    const { token: newToken, driver: newDriver } = await api.login(registration, password);
    api.setToken(newToken);
    localStorage.setItem(DRIVER_KEY, JSON.stringify(newDriver));
    setTokenState(newToken);
    setDriver(newDriver);
    return newDriver;
  }, []);

  const signOut = useCallback(() => {
    api.setToken(null);
    localStorage.removeItem(DRIVER_KEY);
    setTokenState(null);
    setDriver(null);
  }, []);

  return { driver, token, checking, signIn, signOut };
}
