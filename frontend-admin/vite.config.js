import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O painel é servido em /admin quando roda a partir do build no backend,
// então os assets precisam ser resolvidos a partir desse prefixo.
export default defineConfig({
  base: "/admin/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/socket.io": { target: "http://localhost:3001", ws: true },
    },
  },
});
