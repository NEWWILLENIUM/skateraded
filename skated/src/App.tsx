import { useEffect, useRef } from "react";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const gl = canvasRef.current?.getContext("webgl2");
    if (gl) {
      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1>🛹 Skateraded Shader Preview</h1>
      <canvas ref={canvasRef} width={400} height={300} />
    </div>
  );
}
