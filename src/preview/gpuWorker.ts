export type GPUInitMsg = { kind: 'init'; canvas: OffscreenCanvas; width: number; height: number; };
export type GPUFrameMsg = { kind: 'frame'; bitmap: ImageBitmap; ts: number; };
export type GPUParamsMsg = {
  kind: 'params';
  brightness: number; contrast: number; saturation: number;
  vignette: number; grain: number; fisheye: number; zoom: number;
};
export type GPUResizeMsg = { kind: 'resize'; width: number; height: number; };
type MsgGPU = GPUInitMsg | GPUFrameMsg | GPUParamsMsg | GPUResizeMsg;

let device: GPUDevice | null = null;
let ctx: GPUCanvasContext | null = null;
let sampler: GPUSampler | null = null;
let texGPU: GPUTexture | null = null;
let bind: GPUBindGroup | null = null;
let pipe: GPURenderPipeline | null = null;
let uniformBuf: GPUBuffer | null = null;
let canvasRefGPU: OffscreenCanvas | null = null;

const wgsl = /* wgsl */`
struct Params { brightness:f32; contrast:f32; saturation:f32; vignette:f32; grain:f32; fisheye:f32; zoom:f32; time:f32; res:vec2<f32>; }
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var texIn: texture_2d<f32>;
@group(0) @binding(2) var<uniform> P: Params;

struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };
@vertex fn vs(@builtin(vertex_index) vi:u32)->VSOut{
  var pos=array<vec2<f32>,6>(vec2(-1.,-1.),vec2(1.,-1.),vec2(-1.,1.),vec2(-1.,1.),vec2(1.,-1.),vec2(1.,1.));
  var uv =array<vec2<f32>,6>(vec2(0.,0.),vec2(1.,0.),vec2(0.,1.),vec2(0.,1.),vec2(1.,0.),vec2(1.,1.));
  var o:VSOut; o.pos=vec4(pos[vi],0.,1.); o.uv=uv[vi]; return o;
}
fn rgb2hsv(c:vec3<f32>)->vec3<f32>{
  let K=vec4<f32>(0.,-1./3.,2./3.,-1.);
  let p=mix(vec4<f32>(c.bg,K.wz),vec4<f32>(c.gb,K.xy), f32(c.b<=c.g));
  let q=mix(vec4<f32>(p.xyw,c.r),vec4<f32>(c.r,p.yzx), f32(p.x<=c.r));
  let d=q.x - min(q.w,q.y)+1e-5; let h=abs(q.w-q.y)/(6.*d+1e-5)+(q.z);
  return vec3<f32>(fract(h), d/(q.x+1e-5), q.x);
}
fn hsv2rgb(c:vec3<f32>)->vec3<f32>{
  let p=abs(fract(c.xxx+vec3<f32>(0.,1./3.,2./3.))*6.-3.);
  return c.z * mix(vec3<f32>(1.), clamp(p-1.,0.,1.), c.y);
}
fn lens(uv:vec2<f32>,k:f32)->vec2<f32>{ let p=uv*2.-1.; let r=dot(p,p); let pd=p*(1.+k*r); return (pd+1.)*0.5; }
fn rand(co:vec2<f32>)->f32{ return fract(sin(dot(co,vec2<f32>(12.9898,78.233)))*43758.5453); }

@fragment
fn fs(in:VSOut)->@location(0) vec4<f32>{
  let center=vec2<f32>(0.5,0.5);
  var uv=(in.uv-center)/max(P.zoom,1e-5)+center;
  uv=lens(uv,P.fisheye);
  var c=textureSample(texIn,samp,uv).rgb;
  c=(c-0.5)*P.contrast+0.5+P.brightness;
  var hsv=rgb2hsv(c); hsv.y=hsv.y*P.saturation; c=hsv2rgb(hsv);
  let d=distance(uv,center); let vig=smoothstep(1.0,0.4+(1.0-P.vignette)*0.3,d); c=c*vig;
  let g=(rand(uv*P.res + P.time*60.)-0.5)*P.grain*0.15; c=c+vec3<f32>(g);
  return vec4<f32>(c,1.);
}
`;

async function ensurePipeline(canvas: OffscreenCanvas, w: number, h: number) {
  // @ts-ignore
  if (!('gpu' in navigator)) throw new Error('WebGPU not supported');
  // @ts-ignore
  const adapter = await navigator.gpu.requestAdapter(); if (!adapter) throw new Error('No GPU adapter');
  const dev = await adapter.requestDevice(); device = dev;
  // @ts-ignore
  const context = canvas.getContext('webgpu'); if (!context) throw new Error('webgpu ctx failed'); ctx = context;
  // @ts-ignore
  const format = navigator.gpu.getPreferredCanvasFormat(); ctx.configure({ device: dev, format, alphaMode:'opaque' });
  sampler = dev.createSampler({ magFilter:'linear', minFilter:'linear' });
  texGPU = dev.createTexture({ size:[w,h], format:'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT });
  const module = dev.createShaderModule({ code: wgsl });
  pipe = dev.createRenderPipeline({ layout:'auto', vertex:{ module, entryPoint:'vs' }, fragment:{ module, entryPoint:'fs', targets:[{ format }] }, primitive:{ topology:'triangle-list' } });
  uniformBuf = dev.createBuffer({ size: 16*4, usage: GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST });
  bind = dev.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries:[
    { binding:0, resource: sampler! },
    { binding:1, resource: texGPU!.createView() },
    { binding:2, resource: { buffer: uniformBuf! } },
  ]});
}
function writeUniforms(p: GPUParamsMsg, w: number, h: number, tMs: number) {
  const f = new Float32Array(16);
  f[0]=p.brightness; f[1]=p.contrast; f[2]=p.saturation; f[3]=p.vignette;
  f[4]=p.grain; f[5]=p.fisheye; f[6]=p.zoom; f[7]=tMs/1000;
  f[8]=w; f[9]=h;
  (device as GPUDevice).queue.writeBuffer(uniformBuf!, 0, f.buffer);
}
function draw(timeMs: number) {
  if (!ctx || !device || !pipe) return;
  const view = (ctx as any).getCurrentTexture().createView();
  const enc = (device as GPUDevice).createCommandEncoder();
  const pass = enc.beginRenderPass({ colorAttachments:[{ view, loadOp:'clear', clearValue:{r:0,g:0,b:0,a:1}, storeOp:'store' }] });
  pass.setPipeline(pipe); pass.setBindGroup(0, bind!); pass.draw(6); pass.end();
  (device as GPUDevice).queue.submit([enc.finish()]);
}
self.onmessage = async (ev: MessageEvent<MsgGPU>) => {
  const m = ev.data;
  if (m.kind==='init') { canvasRefGPU=m.canvas; await ensurePipeline(canvasRefGPU, m.width, m.height); }
  else if (m.kind==='resize' && device && canvasRefGPU) {
    texGPU = (device as GPUDevice).createTexture({ size:[m.width,m.height], format:'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT });
    bind = (device as GPUDevice).createBindGroup({ layout: (pipe as GPURenderPipeline).getBindGroupLayout(0), entries:[
      { binding:0, resource: sampler! }, { binding:1, resource: texGPU!.createView() }, { binding:2, resource: { buffer: uniformBuf! } },
    ]});
  } else if (m.kind==='params' && device && canvasRefGPU) {
    writeUniforms(m, canvasRefGPU.width, canvasRefGPU.height, performance.now());
  } else if (m.kind==='frame' && device && texGPU && canvasRefGPU) {
    (device as GPUDevice).queue.copyExternalImageToTexture({ source: m.bitmap as any }, { texture: texGPU }, { width: m.bitmap.width, height: m.bitmap.height });
    (m.bitmap as any).close?.(); draw(m.ts);
  }
};
