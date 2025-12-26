import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

class ErrorBoundary extends React.Component<{children: React.ReactNode},{err?:string}>{
  constructor(p:any){ super(p); this.state={}; }
  static getDerivedStateFromError(e:unknown){ return { err: String(e) }; }
  componentDidCatch(e:any, info:any){ console.error("App error:", e, info); }
  render(){ return this.state.err ? (
    <div style={{padding:16,fontFamily:"system-ui",color:"#fff",background:"#111"}}>
      <div style={{color:"#fca5a5"}}>Runtime error</div>
      <pre style={{whiteSpace:"pre-wrap"}}>{this.state.err}</pre>
      <div>Check DevTools Console for details.</div>
    </div>
  ) : this.props.children as any; }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>
);
