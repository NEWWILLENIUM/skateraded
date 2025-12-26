import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 4545;
const OUTDIR = path.resolve(process.cwd(), "recordings");
fs.mkdirSync(OUTDIR, { recursive: true });

app.use(cors());
app.post("/record", express.raw({ type: "*/*", limit: "200mb" }), async (req, res) => {
  try {
    if (!req.body || !req.body.length) return res.status(400).json({ error: "empty body" });
    const base = randomUUID();
    const inWebm = path.join(OUTDIR, `${base}.webm`);
    const outMp4 = path.join(OUTDIR, `${base}.mp4`);
    fs.writeFileSync(inWebm, req.body);

    const args = [
      "-y",
      "-i", inWebm,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "128k",
      outMp4
    ];
    const ff = spawn("ffmpeg", args, { windowsHide: true });

    let stderr = "";
    ff.stderr.on("data", (d) => (stderr += d.toString()));
    ff.on("close", (code) => {
      fs.rm(inWebm, { force: true }, () => {});
      if (code !== 0 || !fs.existsSync(outMp4)) {
        return res.status(500).json({ error: "ffmpeg_failed", detail: stderr.slice(-400) });
      }
      return res.json({ url: `http://localhost:${PORT}/files/${path.basename(outMp4)}` });
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get("/files/:name", (req, res) => {
  const p = path.join(OUTDIR, req.params.name);
  if (!fs.existsSync(p)) return res.status(404).end();
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(p);
});

app.listen(PORT, () => {
  console.log(`Recorder proxy on http://localhost:${PORT}`);
});
