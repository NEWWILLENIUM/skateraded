import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/skateraded/" : "/",
  plugins: [react()],
  worker: { format: "es" },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target:
          process.env.VX_API_BASE ||
          "https://vx-skate-processor-675304308102.us-central1.run.app",
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/api/, ""),
      },
    },
  },
}));
