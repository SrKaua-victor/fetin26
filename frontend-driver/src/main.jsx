import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { isNative } from "./lib/api";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker só no build web — em dev atrapalha o hot reload e no app
// nativo não faz sentido, já que os arquivos vêm empacotados no APK
if (import.meta.env.PROD && !isNative && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .catch((err) => console.warn("[sw] falhou:", err));
  });
}
