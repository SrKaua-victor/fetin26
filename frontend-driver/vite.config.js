import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// O app é servido em /motorista quando roda a partir do build no backend.
// Em dev, o proxy manda /api e /socket.io para o backend na 3001 — assim o app
// funciona igual no localhost, no celular pela rede local e em HTTPS.
//
//   npm run dev        → http://SEU-IP:5175
//   npm run dev:https  → https://SEU-IP:5175 (necessário para o GPS no celular)
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), ...(mode === "https" ? [basicSsl()] : [])],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
  preview: {
    proxy: {
      "/api": "http://localhost:3001",
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
}));
