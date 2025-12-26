import React, { useMemo, useRef, useState } from 'react';
import GLOrGPUPreview from './preview/GLOrGPUPreview';
import { defaultParams, type EffectParams } from './shared/params';
import { signUpload, processVideo, type ProcessingStyle, type ProcessTargets } from './services/vxApi';
import { ConnectivityBadge } from './ConnectivityBadge';
import { listPresets, savePreset, loadPreset, deletePreset, exportAll, importMany, getLastPresetName, type UIPreset, type OutMode } from './shared/presets';
import Recorder from "./Recorder";

function fmtSecs(s: number) { const m = Math.floor(s/60), ss = s % 60; return m ? `${m}m ${ss}s` : `${ss}s`; }

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [p, setP] = useState<EffectParams>(defaultParams);
  const [style, setStyle] = useState<ProcessingStyle>('vx1000');

  type OutModeLocal = OutMode;
  const [outMode, setOutMode] = useState<OutModeLocal>('both');

  const [status, setStatus] = useState<'Idle'|'Signing'|'Uploading'|'Processing'|'Canceled'|'Done'|'Error'>('Idle');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<{ youtube_url?: string; vertical_url?: string } | null>(null);

  const [elapsed, setElapsed] = useState<number>(0);
  const [uploadPct, setUploadPct] = useState<number>(0);

  const abortRef = useRef<AbortController | null>(null);
  const t0Ref = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);

  const [presetName, setPresetName] = useState<string>('');
  const [presetList, setPresetList] = useState<UIPreset[]>(() => listPresets());
  const [selectedPreset, setSelectedPreset] = useState<string>(() => getLastPresetName() ?? '');

  const busy = status === 'Signing' || status === 'Uploading' || status === 'Processing';
  const params = useMemo(()=>p,[p]);

  React.useEffect(() => {
    if (selectedPreset) {
      const loaded = loadPreset(selectedPreset);
      if (loaded) {
        setP(loaded.params);
        setStyle(loaded.style as ProcessingStyle);
        setOutMode(loaded.outMode);
      }
    }
  }, []);

  function startTimer() {
    t0Ref.current = performance.now(); setElapsed(0);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const sec = Math.max(0, Math.round((performance.now() - (t0Ref.current||0)) / 1000));
      setElapsed(sec);
    }, 250);
  }
  function stopTimer() { if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; } }

  function toTargets(mode: OutModeLocal): ProcessTargets {
    if (mode === 'youtube') return ['youtube'];
    if (mode === 'vertical') return ['vertical'];
    return ['youtube','vertical'];
  }

  async function run() {
    if (!file || busy) return;
    setError(''); setResult(null); setUploadPct(0);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setStatus('Signing');
      const { upload_url, gcs_uri } = await signUpload(file.name, file.type || 'video/mp4');

      setStatus('Uploading');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', upload_url);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setUploadPct(Math.min(100, Math.round((ev.loaded / ev.total) * 100))); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`UPLOAD_${xhr.status}`));
        xhr.onerror = () => reject(new Error('UPLOAD_NETWORK'));
        xhr.onabort = () => reject(new Error('UPLOAD_ABORT'));
        ctrl.signal.addEventListener('abort', () => xhr.abort());
        xhr.send(file);
      });

      setStatus('Processing');
      startTimer();
      const out = await processVideo(gcs_uri, style, { signal: ctrl.signal, targets: toTargets(outMode) });
      stopTimer();
      const filtered = {
        youtube_url: outMode !== 'vertical' ? out.youtube_url : undefined,
        vertical_url: outMode !== 'youtube' ? out.vertical_url : undefined,
      };
      setResult(filtered);
      setStatus('Done');
    } catch (e: any) {
      stopTimer();
      if (ctrl.signal.aborted) { setStatus('Canceled'); setError(''); }
      else { setStatus('Error'); setError(String(e?.message || e)); }
    } finally {
      abortRef.current = null;
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0b0d10', color:'#fff', fontFamily:'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:20, display:'grid', gap:16 }}>
        <h1 style={{ margin:0, fontSize:22 }}>Skateraded — Main UI</h1>
        <ConnectivityBadge />

        <div style={{ display:'grid', gap:8, padding:12, border:'1px solid #334155', borderRadius:12, background:'#0f172a' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <strong>Presets</strong>
            <select value={selectedPreset} onChange={(e)=> {
              const n = e.target.value; setSelectedPreset(n); if(n) { const l = loadPreset(n); if(l){ setP(l.params); setStyle(l.style as ProcessingStyle); setOutMode(l.outMode);} }
            }}
              style={{ background:'#111827', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'6px 8px' }}>
              <option value="">(none)</option>
              {presetList.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
            </select>
            <button onClick={()=> { if(selectedPreset){ deletePreset(selectedPreset); setPresetList(listPresets()); setSelectedPreset(''); } }}
              disabled={!selectedPreset}
              style={{ padding:'6px 10px', borderRadius:8, background:'#ef4444', color:'#fff', border:'none' }}>
              Delete
            </button>
            <span style={{ opacity:.8 }}>|</span>
            <input placeholder="New preset name" value={presetName} onChange={(e)=> setPresetName(e.target.value)}
              style={{ background:'#111827', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'6px 8px', minWidth:220 }} />
            <button onClick={()=>{
              const name = (presetName || selectedPreset || '').trim();
              if (!name) return;
              const preset: UIPreset = { name, createdAt: Date.now(), params: p, style, outMode };
              savePreset(preset);
              setPresetList(listPresets()); setSelectedPreset(name); setPresetName('');
            }}
              style={{ padding:'6px 10px', borderRadius:8, background:'#22c55e', color:'#0b0d10', border:'none' }}>
              Save
            </button>
            <span style={{ opacity:.8 }}>|</span>
            <button onClick={()=>{
              const blob = new Blob([exportAll()], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'skateraded-presets.json'; a.click();
              URL.revokeObjectURL(url);
            }}
              style={{ padding:'6px 10px', borderRadius:8, background:'#2563eb', color:'#fff', border:'none' }}>
              Export JSON
            </button>
            <label style={{ display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer' }}>
              <input type="file" accept="application/json" onChange={(ev)=>{
                const f = ev.target.files?.[0]; if (!f) return;
                const reader = new FileReader();
                reader.onload = () => { try { importMany(String(reader.result)); setPresetList(listPresets()); } catch(e:any){ alert(`Import failed: ${String(e?.message||e)}`); } };
                reader.readAsText(f); (ev.target as HTMLInputElement).value = '';
              }} style={{ display:'none' }} />
              <span style={{ padding:'6px 10px', borderRadius:8, background:'#64748b', color:'#fff' }}>Import JSON</span>
            </label>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ display:'grid', gap:10 }}>
            <input type="file" accept="video/*" onChange={(e)=> setFile(e.target.files?.[0] || null)} />

            <label>Style
              <select value={style} onChange={e=> setStyle(e.target.value as ProcessingStyle)} style={{ marginLeft:8 }}>
                {['classic_longlens','mark1_fisheye','vx1000','crt_broadcast','liquid_slowmo','analog_degrade','nightshot','solarize']
                  .map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            <fieldset style={{ border:'1px solid #334155', borderRadius:8, padding:8 }}>
              <legend style={{ padding:'0 6px' }}>Output</legend>
              <label style={{ marginRight:12 }}>
                <input type="radio" name="out" value="youtube" checked={outMode==='youtube'} onChange={()=>setOutMode('youtube')} /> YouTube (16:9)
              </label>
              <label style={{ marginRight:12 }}>
                <input type="radio" name="out" value="vertical" checked={outMode==='vertical'} onChange={()=>setOutMode('vertical')} /> Vertical (9:16)
              </label>
              <label>
                <input type="radio" name="out" value="both" checked={outMode==='both'} onChange={()=>setOutMode('both')} /> Both
              </label>
            </fieldset>

            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <button onClick={run} disabled={!file || busy}
                style={{ padding:'8px 14px', borderRadius:8, background: busy ? '#334155' : '#2563eb', color:'#fff', border:'none' }}>
                {busy ? 'Working…' : 'Export'}
              </button>
              <button onClick={()=> abortRef.current?.abort()} disabled={status!=='Processing' && status!=='Uploading'}
                style={{ padding:'8px 14px', borderRadius:8, background:'#6b7280', color:'#fff', border:'none' }}>
                Cancel
              </button>

              <div style={{ minWidth:120 }}>
                {status==='Uploading' && <div>Uploading… {uploadPct}%</div>}
                {status==='Processing' && <div>Processing… {fmtSecs(elapsed)}</div>}
                {status==='Done' && <div>Done in {fmtSecs(elapsed || 0)}</div>}
                {status==='Canceled' && <div style={{ color:'#fbbf24' }}>Canceled</div>}
                {status==='Error' && <div style={{ color:'#fca5a5' }}>Error</div>}
              </div>
            </div>
            {(status==='Uploading') && (
              <div style={{ background:'#1f2937', borderRadius:8, height:8, overflow:'hidden' }}>
                <div style={{ width:`${uploadPct}%`, height:8, background:'#22c55e', transition:'width .1s linear' }} />
              </div>
            )}
            {error && <div style={{ color:'#fca5a5', fontSize:12 }}>Error: {error}</div>}

            {result && (
              <div style={{ display:'grid', gap:8 }}>
                {(result.youtube_url && outMode!=='vertical') && <div><a href={result.youtube_url} target="_blank">YouTube (16:9) MP4</a></div>}
                {(result.vertical_url && outMode!=='youtube') && <div><a href={result.vertical_url} target="_blank">Vertical (9:16) MP4</a></div>}
                {(result.youtube_url && outMode!=='vertical') && <video src={result.youtube_url} controls style={{ width:'100%', marginTop:8 }} />}
                {(result.vertical_url && outMode==='vertical') && <video src={result.vertical_url} controls style={{ width:'100%', marginTop:8, maxHeight:540 }} />}
              </div>
            )}

            <Recorder canvas={previewCanvas} />
          </div>

          <div>
            <GLOrGPUPreview
              file={file}
              params={params}
              width={960}
              height={540}
              onCanvasReady={setPreviewCanvas}
            />
          </div>
        </div>

        <div style={{ fontSize:12, opacity:.7 }}>
          API Base: {(import.meta as any).env?.DEV ? '/api' : ((import.meta as any).env?.VITE_VX_API_BASE || '(unset)')}
        </div>
      </div>
    </div>
  );
}
