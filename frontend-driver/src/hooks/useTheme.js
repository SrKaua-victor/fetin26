import { useCallback, useEffect, useState } from "react";

const KEY = "bustrack.driver.theme";

/**
 * Tema do app: segue o sistema até o motorista escolher.
 *
 * A escolha fica guardada porque a cabine muda de luz ao longo do turno — quem
 * dirige à noite quer escuro mesmo que o celular esteja em claro, e não deve
 * precisar reescolher a cada abertura do app.
 */
function initialTheme() {
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
