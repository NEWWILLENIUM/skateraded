// === Skateraded Studio: Preview.tsx ===
// WebGL shader-based real-time video preview with LUTs, effects, and export.

import React, { useRef, useState, useEffect } from "react";
import { parseCubeLUT } from "../utils/parseCubeLUT";

type ShaderParams = {
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
  grain: number;
  fisheye: number;
  zoom: number;
};

export default function Preview() {
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lutTitle, setLutTitle] = useState<string | null>(null);
  const [shaderParams, setShaderParams] = useState<ShaderParams>({
    brightness: 0,
    contrast: 1,
    saturation: 1,
    vignette: 0,
    grain: 0,
    fisheye: 0,
    zoom: 1,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const previewWorkerRef = useRef<Worker | null>(null);
  const exportWorkerRef = useRef<Worker | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // --- Initialize shader worker ---
  useEffect(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    previewWorkerRef.current = worker;

    const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
    offscreenCanvasRef.current = offscreen;

    worker.postMessage(
      { kind: "init", canvas: offscreen, width: 640, height: 360 },
      [offscreen]
    );

    ctxRef.current = canvas.getContext("2d");
    console.log("Shader worker initialized ✅");

    return () => worker.terminate();
  }, []);

  // --- Upload video ---
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoURL(URL.createObjectURL(file));
  };

  // --- Upload LUT ---
  const handleLUTUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lut = await parseCubeLUT(file);
    previewWorkerRef.current?.postMessage({
      kind: "lut",
      title: lut.title,
      size: lut.size,
      data: lut.data,
    });
    setLutTitle(lut.title);
  };

  // --- Play / Pause toggle ---
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.pause();
    else video.play();
    setPlaying(!playing);
  };

  // --- Mute toggle ---
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
  };

  // --- Frame render loop ---
  useEffect(() => {
    const video = videoRef.current;
    const worker = previewWorkerRef.current;
    const displayCanvas = displayCanvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    const ctx = ctxRef.current;
    if (!video || !worker || !offscreen || !ctx || !displayCanvas) return;

    let raf: number;
    const render = async (t: number) => {
      if (!playing) {
        raf = requestAnimationFrame(render);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        if (displayCanvas.width !== w || displayCanvas.height !== h) {
          displayCanvas.width = w;
          displayCanvas.height = h;
          offscreen.width = w;
          offscreen.height = h;
          worker.postMessage({ kind: "resize", width: w, height: h });
        }

        try {
          // Create frame bitmap and send to worker
          const bmp = await createImageBitmap(video, {
            imageOrientation: "flipY", // <-- ensures correct vertical alignment
          });
          worker.postMessage({ kind: "frame", bitmap: bmp, ts: t }, [bmp]);
        } catch (err) {
          console.warn("Frame capture failed", err);
        }

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(offscreen as any, 0, 0, w, h);
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // --- Shader parameter adjustment ---
  const handleParamChange = (key: keyof ShaderParams, value: number) => {
    const updated = { ...shaderParams, [key]: value };
    setShaderParams(updated);
    previewWorkerRef.current?.postMessage({ kind: "params", ...updated });
  };

  // --- Export video (MP4, ultrafast) ---
  const handleExport = async () => {
    if (!videoURL || exporting) return;
    setExporting(true);
    setProgress(0);

    const exportWorker = new Worker(
      new URL("./exportWorker.ts", import.meta.url),
      { type: "module" }
    );
    exportWorkerRef.current = exportWorker;

    exportWorker.onmessage = (ev) => {
      const msg = ev.data;
      if (msg.kind === "progress") setProgress(msg.value);
      else if (msg.kind === "done") {
        setExporting(false);
        const a = document.createElement("a");
        a.href = msg.url;
        a.download = "skateraded-export.mp4";
        a.click();
        URL.revokeObjectURL(msg.url);
      } else if (msg.kind === "error") {
        alert("Export failed: " + msg.message);
        setExporting(false);
      }
    };

    exportWorker.postMessage({
      kind: "export",
      src: videoURL,
      width: videoRef.current?.videoWidth ?? 1920,
      height: videoRef.current?.videoHeight ?? 1080,
    });
  };

  // --- Render UI ---
  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4">🛹 Skateraded Studio</h1>

      {/* Unified video + canvas wrapper (fixes scaling) */}
      <div
        className="relative"
        style={{
          width: "80vw",
          maxWidth: "1080px",
          aspectRatio: "16 / 9",
          background: "#111",
          overflow: "hidden",
          borderRadius: "12px",
        }}
      >
        <video
          ref={videoRef}
          src={videoURL ?? ""}
          muted={muted}
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />

        {/* Shader output */}
        <canvas
          ref={displayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center mt-4 mb-4">
        <input type="file" accept="video/*" onChange={handleVideoUpload} />
        <button
          onClick={togglePlay}
          className="bg-green-600 px-3 py-1 rounded hover:bg-green-700"
        >
          {playing ? "⏸ Pause" : "▶️ Play"}
        </button>
        <button
          onClick={toggleMute}
          className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
        >
          {muted ? "🔇 Unmute" : "🔊 Mute"}
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className={`${
            exporting ? "bg-gray-600" : "bg-pink-600 hover:bg-pink-700"
          } px-3 py-1 rounded`}
        >
          {exporting
            ? `⏳ Exporting... ${(progress * 100).toFixed(1)}%`
            : "💾 Export MP4"}
        </button>
        <input type="file" accept=".cube" onChange={handleLUTUpload} />
        {lutTitle && (
          <span className="text-sm opacity-70">🎨 LUT: {lutTitle}</span>
        )}
      </div>

      {/* Adjustment sliders */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Object.entries(shaderParams).map(([k, v]) => (
          <div key={k} className="flex flex-col items-center">
            <label className="capitalize text-xs mb-1">{k}</label>
            <input
              type="range"
              min={k === "contrast" || k === "saturation" ? 0 : -1}
              max={k === "contrast" || k === "saturation" ? 2 : 1}
              step={0.01}
              value={v}
              onChange={(e) =>
                handleParamChange(k as keyof ShaderParams, parseFloat(e.target.value))
              }
              className="w-40 accent-pink-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

