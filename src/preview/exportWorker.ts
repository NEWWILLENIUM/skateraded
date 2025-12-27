// === Skateraded Studio: exportWorker.ts ===
// Encodes processed video frames to MP4 using FFmpeg WASM.
// Supports full-resolution export and progress reporting.

type ExportMsg = {
  kind: "export";
  src: string;
  width: number;
  height: number;
};

type ProgressMsg = { kind: "progress"; value: number };
type DoneMsg = { kind: "done"; url: string };
type ErrorMsg = { kind: "error"; message: string };

self.onmessage = async (e: MessageEvent<ExportMsg>) => {
  const m = e.data;
  if (m.kind !== "export") return;

  try {
    console.log("🎬 Initializing FFmpeg...");

    // Dynamic import avoids Rollup/Vite ESM issues
    const { createFFmpeg, fetchFile } = await import("@ffmpeg/ffmpeg");

    const ffmpeg = createFFmpeg({
      log: true,
      progress: ({ ratio }) => {
        self.postMessage({ kind: "progress", value: ratio } satisfies ProgressMsg);
      },
      corePath: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js",
    });

    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
      console.log("✅ FFmpeg loaded");
    }

    // Fetch the original (processed) source
    console.log("📥 Fetching input video...");
    const response = await fetch(m.src);
    const data = new Uint8Array(await response.arrayBuffer());
    ffmpeg.FS("writeFile", "input.mp4", data);

    console.log("⚙️ Running FFmpeg encoding...");
    await ffmpeg.run(
      "-i", "input.mp4",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "18",
      "-vf", `scale=${m.width}:${m.height}:flags=lanczos`,
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "output.mp4"
    );

    console.log("📦 Reading output file...");
    const out = ffmpeg.FS("readFile", "output.mp4");

    // Create downloadable blob
    const blob = new Blob([out.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    self.postMessage({ kind: "done", url } satisfies DoneMsg);

    // Cleanup
    ffmpeg.FS("unlink", "input.mp4");
    ffmpeg.FS("unlink", "output.mp4");
    ffmpeg.exit();

    console.log("🎉 Export complete!");
  } catch (err: any) {
    console.error("❌ Export failed:", err);
    self.postMessage({
      kind: "error",
      message: err?.message ?? "Unknown FFmpeg error",
    } satisfies ErrorMsg);
  }
};

