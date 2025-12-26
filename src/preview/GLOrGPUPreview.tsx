import React, { useEffect, useRef } from 'react';
import type { EffectParams } from '../shared/params';
const GL_URL = new URL('./worker.ts', import.meta.url);
type Props = { file: File | null; params: EffectParams; width?: number; height?: number };
export default function GLOrGPUPreview({ file, params, width=960, height=540 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const worker = new Worker(GL_URL, { type: 'module' });
    workerRef.current = worker;
    const off = canvas.transferControlToOffscreen();
    worker.postMessage({ kind: 'init', canvas: off, width, height }, [off as unknown as Transferable]);
    return () => { worker.terminate(); workerRef.current = null; };
  }, [width, height]);
  useEffect(() => { workerRef.current?.postMessage({ kind: 'params', ...params }); }, [params]);
  useEffect(() => {
    if (!file) return;
    const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true;
    const url = URL.createObjectURL(file); v.src = url; v.onloadedmetadata = () => v.play().catch(()=>{});
    // @ts-ignore
    const useRVFC = typeof v.requestVideoFrameCallback === 'function';
    let raf = 0;
    // @ts-ignore
    const cb = (_: any) => { if (!workerRef.current) return;
      createImageBitmap(v).then((bmp) => {
        workerRef.current!.postMessage({ kind: 'frame', bitmap: bmp, ts: performance.now() }, [bmp as unknown as Transferable]);
        // @ts-ignore
        v.requestVideoFrameCallback(cb);
      }).catch(()=>{});
    };
    if (useRVFC) { /* @ts-ignore */ v.requestVideoFrameCallback(cb); }
    else { const tick = () => { if (!workerRef.current) return;
        if (v.videoWidth) { createImageBitmap(v).then((bmp) => {
          workerRef.current!.postMessage({ kind: 'frame', bitmap: bmp, ts: performance.now() }, [bmp as unknown as Transferable]);
        }).catch(()=>{}); }
        raf = requestAnimationFrame(tick);
      }; raf = requestAnimationFrame(tick); }
    return () => { if (raf) cancelAnimationFrame(raf); v.pause(); if (url) URL.revokeObjectURL(url); };
  }, [file]);
  return <canvas ref={canvasRef} width={width} height={height} style={{ width:'100%', maxWidth:`${width}px`, borderRadius:12, background:'#000' }} />;
}