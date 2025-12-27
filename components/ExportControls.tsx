import React, { useState } from "react";

type ExportJob = {
  id: string;
  file: File;
  params: Record<string, number>;
  lutData?: Float32Array | null;
  look?: string | null;
  progress: number;
  status: "pending" | "processing" | "done" | "error";
};

type ExportControlsProps = {
  onStartJob: (job: ExportJob) => void;
  defaultParams: Record<string, number>;
  lutData?: Float32Array | null;
  look?: string | null;
};

/**
 * ExportControls — Queued Export Manager
 * Supports multiple jobs, live progress tracking, and download links.
 */
export function ExportControls({ onStartJob, defaultParams, lutData, look }: ExportControlsProps) {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleAddToQueue = (file: File) => {
    const id = `${file.name}-${Date.now()}`;
    const job: ExportJob = {
      id,
      file,
      params: defaultParams,
      lutData,
      look,
      progress: 0,
      status: "pending",
    };
    setJobs((j) => [...j, job]);
  };

  const handleProcessQueue = async () => {
    if (processing || jobs.length === 0) return;
    setProcessing(true);

    for (const job of jobs) {
      if (job.status !== "pending") continue;

      const worker = new Worker(new URL("../preview/exportWorker.ts", import.meta.url), { type: "module" });
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "processing", progress: 0 } : j))
      );

      worker.onmessage = (ev) => {
        if (ev.data.kind === "progress") {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id ? { ...j, progress: ev.data.percent } : j
            )
          );
        } else if (ev.data.kind === "done") {
          const url = URL.createObjectURL(ev.data.blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = job.file.name.replace(/\.[^.]+$/, "") + "_skateraded.mp4";
          a.click();
          worker.terminate();
          setJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: "done", progress: 100 } : j))
          );
        } else if (ev.data.kind === "error") {
          worker.terminate();
          setJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: "error" } : j))
          );
        }
      };

      worker.postMessage({
        kind: "export",
        file: job.file,
        params: job.params,
        lutData: job.lutData,
        look: job.look,
      });

      // Wait for job completion
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          const current = jobs.find((j) => j.id === job.id);
          if (current?.status === "done" || current?.status === "error") {
            clearInterval(check);
            resolve();
          }
        }, 1000);
      });
    }

    setProcessing(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full bg-neutral-900/80 rounded-2xl border border-neutral-700 p-4 shadow-lg">
      <h2 className="text-lg font-bold text-center">💾 Export Queue</h2>

      <label className="text-sm font-semibold text-neutral-300">Add Videos</label>
      <input
        type="file"
        accept="video/*"
        multiple
        onChange={(e) => {
          const files = e.target.files;
          if (!files) return;
          Array.from(files).forEach(handleAddToQueue);
        }}
        className="w-full bg-neutral-800 text-white rounded-lg p-2"
      />

      <button
        onClick={handleProcessQueue}
        disabled={processing || jobs.length === 0}
        className={`w-full py-2 font-semibold rounded-lg transition-colors ${
          processing
            ? "bg-neutral-600 cursor-not-allowed"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {processing ? "⏳ Processing Queue..." : "🚀 Start Batch Export"}
      </button>

      {jobs.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-1 bg-neutral-800 rounded-lg p-2 border border-neutral-700"
            >
              <div className="flex justify-between text-sm">
                <span className="truncate">{job.file.name}</span>
                <span
                  className={
                    job.status === "done"
                      ? "text-green-400"
                      : job.status === "error"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }
                >
                  {job.status === "pending"
                    ? "Queued"
                    : job.status === "processing"
                    ? `${job.progress.toFixed(0)}%`
                    : job.status === "done"
                    ? "✅ Done"
                    : "❌ Error"}
                </span>
              </div>
              <div className="h-2 bg-neutral-700 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    job.status === "error"
                      ? "bg-red-500"
                      : job.status === "done"
                      ? "bg-green-500"
                      : "bg-yellow-400"
                  }`}
                  style={{ width: `${job.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
