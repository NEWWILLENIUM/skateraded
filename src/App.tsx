import React, { useMemo, useState } from 'react';
import GLOrGPUPreview from './preview/GLOrGPUPreview';
import { defaultParams, type EffectParams } from './shared/params';
import { signUpload, uploadSigned, processVideo, type ProcessingStyle } from './services/vxApi';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [p, setP] = useState<EffectParams>(defaultParams);
  const [style, setStyle] = useState<ProcessingStyle>('vx1000');
  const [status, setStatus] = useState('Idle');
  const [result, setResult] = useState<{ youtube_url: string; vertical_url: string } | null>(null);
  const [error, setError] = useState<string>('');
  const [elapsed, setElapsed] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const params = useMemo(()=>p,[p]);

  async function run() {
    try {
      if (!file) return;
      setError(''); setResult(null);
      setStatus('Signing upload URL...');
      const { upload_url, gcs_uri } = await signUpload(file.name, file.type || 'video/mp4');

      setStatus('Uploading...');
      await uploadSigned(upload_url, file);
      setUploadProgress(100);

      setStatus('Processing...');
      const t0 = performance.now();
      const out = await processVideo(gcs_uri, style);
      setElapsed(Math.round((performance.now()-t0)/1000));
      setResult(out);
      setStatus('Done');
    } catch (e: any) {
      setStatus('Error');
      setError(String(e?.message || e));
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0b0d10', color:'#fff', fontFamily:'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:20, display:'grid', gap:16 }}>
        <h1 style={{ margin:0, fontSize:22 }}>Skateraded — Main UI</h1>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ display:'grid', gap:10 }}>
            <input type="file" accept="video/*" onChange={(e)=> setFile(e.target.files?.[0] || null)} />
            <label>Style
              <select value={style} onChange={e=> setStyle(e.target.value as ProcessingStyle)} style={{ marginLeft:8 }}>
                {['classic_longlens','mark1_fisheye','vx1000','crt_broadcast','liquid_slowmo','analog_degrade','nightshot','solarize'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Brightness {p.brightness.toFixed(2)}
              <input type="range" min={-0.5} max={0.5} step={0.01} value={p.brightness}
                     onChange={e=>setP({...p, brightness: parseFloat(e.target.value)})}/>
            </label>
            <label>Contrast {p.contrast.toFixed(2)}
              <input type="range" min={0.5} max={1.5} step={0.01} value={p.contrast}
                     onChange={e=>setP({...p, contrast: parseFloat(e.target.value)})}/>
            </label>
            <label>Saturation {p.saturation.toFixed(2)}
              <input type="range" min={0.0} max={2.0} step={0.01} value={p.saturation}
                     onChange={e=>setP({...p, saturation: parseFloat(e.target.value)})}/>
            </label>
            <label>Vignette {p.vignette.toFixed(2)}
              <input type="range" min={0.0} max={1.0} step={0.01} value={p.vignette}
                     onChange={e=>setP({...p, vignette: parseFloat(e.target.value)})}/>
            </label>
            <label>Grain {p.grain.toFixed(2)}
              <input type="range" min={0.0} max={1.0} step={0.01} value={p.grain}
                     onChange={e=>setP({...p, grain: parseFloat(e.target.value)})}/>
            </label>
            <label>Fisheye {p.fisheye.toFixed(2)}
              <input type="range" min={-1.0} max={0.5} step={0.01} value={p.fisheye}
                     onChange={e=>setP({...p, fisheye: parseFloat(e.target.value)})}/>
            </label>
            <label>Zoom {p.zoom.toFixed(3)}
              <input type="range" min={1.0} max={1.2} step={0.001} value={p.zoom}
                     onChange={e=>setP({...p, zoom: parseFloat(e.target.value)})}/>
            </label>

            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button onClick={run} disabled={!file || status==='Processing...'} style={{ padding:'8px 14px', borderRadius:8, background:'#2563eb', color:'#fff', border:'none' }}>Export</button>
              <div>{status}{status==='Done' ? ` (${elapsed}s)` : ''}</div>
            </div>
            {uploadProgress>0 && (
              <div style={{ background:'#1f2937', borderRadius:8, height:8, overflow:'hidden' }}>
                <div style={{ width:`${uploadProgress}%`, height:8, background:'#22c55e' }} />
              </div>
            )}
            {error && <div style={{ color:'#fca5a5', fontSize:12 }}>Error: {error}</div>}
            {result && (
              <div style={{ display:'grid', gap:8 }}>
                <div><a href={result.youtube_url} target="_blank">YouTube (16:9) MP4</a></div>
                <div><a href={result.vertical_url} target="_blank">Vertical (9:16) MP4</a></div>
                <video src={result.youtube_url} controls style={{ width:'100%', marginTop:8 }} />
              </div>
            )}
          </div>
          <div><GLOrGPUPreview file={file} params={params} width={960} height={540}/></div>
        </div>
        <div style={{ fontSize:12, opacity:.7 }}>API Base: {(import.meta as any).env?.DEV ? '/api' : ((import.meta as any).env?.VITE_VX_API_BASE || '(unset)')}</div>
      </div>
    </div>
  );
}