import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Smart base path logic:
// - "/" for Vercel, Netlify, local dev
// - "/skateraded/" for GitHub Pages
const isGithubPages = process.env.GITHUB_PAGES === "true" || process.env.VERCEL === undefined;

export default defineConfig(({ command }) => ({
  base: command === "build" && isGithubPages ? "/skateraded/" : "./",
  plugins: [react()],
  worker: {
    format: "es",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
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
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
}));
