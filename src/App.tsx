import { useState } from "react";
import Preview from "./preview/Preview";

export default function App() {
  const [theme] = useState({
    bg: "#0f0f0f",
    fg: "#ffffff",
    accent: "#7dd3fc",
  });

  return (
    <div
      style={{
        background: theme.bg,
        color: theme.fg,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "2rem",
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <header>
        <h1 style={{ fontWeight: 700, fontSize: "1.75rem" }}>
          🛹 Skateraded — Main UI
        </h1>
        <p style={{ opacity: 0.7 }}>
          WebGL shader-based video previewer built with Vite + React
        </p>
      </header>

      {/* 🔥 The live shader preview area */}
      <Preview />

      <footer style={{ marginTop: "2rem", fontSize: "0.85rem", opacity: 0.5 }}>
        <p>
          Built with <span style={{ color: theme.accent }}>Vite + WebGL2</span> ·{" "}
          <a
            href="https://vercel.com"
            style={{ color: theme.accent, textDecoration: "none" }}
          >
            Deployed on Vercel
          </a>
        </p>
      </footer>
    </div>
  );
}
