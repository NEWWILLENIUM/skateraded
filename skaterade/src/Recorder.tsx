import React from "react";

export default function Recorder({ canvas }: { canvas: HTMLCanvasElement | null }) {
  const [busy, setBusy] = React.useState(false);
  const [url, setUrl] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string>("");

  async function record5s() {
    setErr(""); setUrl(null);
    if (!canvas) { setErr("Preview not ready"); return; }
    try {
      const stream = (canvas as any).captureStream?.(60) as MediaStream;
      if (!stream) throw new Error("captureStream not supported");
      const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data && chunks.push(e.data);
      setBusy(true);
      rec.start();
      await new Promise(r => setTimeout(r, 5000));
      rec.stop();
      await new Promise<void>((resolve) => { rec.onstop = () => resolve(); });
      const blob = new Blob(chunks, { type: "video/webm" });

      const resp = await fetch("http://localhost:4545/record", {
        method: "POST",
        headers: { "Content-Type": "video/webm" },
        body: blob
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setUrl(data.url);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      <button onClick={record5s} disabled={busy} style={{ padding:'6px 10px', borderRadius:8, background:'#22c55e', color:'#0b0d10', border:'none' }}>
        {busy ? "Recording…" : "Record Preview (5s)"}
      </button>
      {url && <a href={url} target="_blank" rel="noreferrer">Download MP4</a>}
      {err && <span style={{ color:'#fca5a5', fontSize:12 }}>Error: {err}</span>}
      <span style={{ fontSize:12, opacity:.75 }}>(Requires `npm run rec` running locally)</span>
    </div>
  );
}
