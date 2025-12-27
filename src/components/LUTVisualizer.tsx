import React, { useRef, useEffect } from "react";

type LUTVisualizerProps = {
  lutData: Float32Array | null;
  size?: number;
};

/**
 * LUTVisualizer
 * Displays a 3D RGB cube preview of the imported LUT.
 * Works with parsed .CUBE LUT Float32Array data.
 */
export function LUTVisualizer({ lutData, size = 64 }: LUTVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!lutData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lutSize = Math.cbrt(lutData.length / 3);
    const cell = canvas.width / lutSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let z = 0; z < lutSize; z++) {
      for (let y = 0; y < lutSize; y++) {
        for (let x = 0; x < lutSize; x++) {
          const i = (z * lutSize * lutSize + y * lutSize + x) * 3;
          const r = lutData[i];
          const g = lutData[i + 1];
          const b = lutData[i + 2];
          ctx.fillStyle = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }

    // add depth overlay gridlines for readability
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    for (let i = 0; i <= lutSize; i++) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvas.width, pos);
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvas.height);
      ctx.stroke();
    }
  }, [lutData]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border border-neutral-700 rounded-lg shadow-md"
      />
      <p className="text-xs text-neutral-400">LUT Preview Cube</p>
    </div>
  );
}
