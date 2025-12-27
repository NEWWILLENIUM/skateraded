// === Skateraded Studio: worker.ts ===
// WebGL2 worker for real-time shader preview + LUT support.

export type PreviewInitMsg = { kind: "init"; canvas: OffscreenCanvas; width: number; height: number };
export type PreviewFrameMsg = { kind: "frame"; bitmap: ImageBitmap; ts: number };
export type PreviewParamsMsg = {
  kind: "params";
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
  grain: number;
  fisheye: number;
  zoom: number;
};
export type PreviewResizeMsg = { kind: "resize"; width: number; height: number };
export type PreviewLUTMsg = { kind: "lut"; title: string; size: number; data: Float32Array };
type Msg = PreviewInitMsg | PreviewFrameMsg | PreviewParamsMsg | PreviewResizeMsg | PreviewLUTMsg;

let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let tex: WebGLTexture | null = null;
let vao: WebGLVertexArrayObject | null = null;
let uTime: WebGLUniformLocation | null = null;
let uRes: WebGLUniformLocation | null = null;
let uParams: Record<string, WebGLUniformLocation | null> = {};
let uUseLUT: WebGLUniformLocation | null = null;
let uLUT: WebGLUniformLocation | null = null;
let lutTex: WebGLTexture | null = null;
let lutSize = 0;
let canvasRef: OffscreenCanvas;

// === Vertex Shader ===
const vert = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_uv;
out vec2 v_uv;
void main(){
  v_uv = a_uv;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// === Fragment Shader ===
const frag = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 o;

uniform sampler2D u_tex;
uniform sampler2D u_lut;
uniform bool u_useLUT;
uniform vec2 u_res;
uniform float u_time;

uniform float u_brightness, u_contrast, u_saturation;
uniform float u_vignette, u_grain, u_fisheye, u_zoom;

vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0., -1./3., 2./3., -1.);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y) + 1e-5;
  float h = abs(q.w - q.y) / (6. * d + 1e-5) + q.z;
  return vec3(fract(h), d / (q.x + 1e-5), q.x);
}

vec3 hsv2rgb(vec3 c){
  vec3 p = abs(fract(c.xxx + vec3(0.,1./3.,2./3.)) * 6. - 3.);
  return c.z * mix(vec3(1.), clamp(p - 1., 0., 1.), c.y);
}

vec2 lens(vec2 uv, float k){
  vec2 p = uv * 2. - 1.;
  float r = dot(p, p);
  vec2 pd = p * (1. + k * r);
  return (pd + 1.) * 0.5;
}

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyLUT(vec3 color){
  float size = float(textureSize(u_lut, 0).x);
  float sliceSize = 1.0 / size;
  float zSlice = color.b * (size - 1.0);
  float zLow = floor(zSlice);
  float zHigh = min(size - 1.0, zLow + 1.0);
  float mixVal = fract(zSlice);
  float x = color.r * (size - 1.0);
  float y = color.g * (size - 1.0);
  vec2 uvLow = vec2((x + 0.5) / size, (y + 0.5 + zLow * size) / (size * size));
  vec2 uvHigh = vec2((x + 0.5) / size, (y + 0.5 + zHigh * size) / (size * size));
  vec3 cLow = texture(u_lut, uvLow).rgb;
  vec3 cHigh = texture(u_lut, uvHigh).rgb;
  return mix(cLow, cHigh, mixVal);
}

void main(){
  vec2 center = vec2(0.5);
  vec2 uv = (v_uv - center) / max(u_zoom, 1e-5) + center;
  uv = lens(uv, u_fisheye);

  // Flip Y to correct orientation
  uv.y = 1.0 - uv.y;

  vec3 c = texture(u_tex, uv).rgb;

  // Brightness & Contrast
  c = (c - 0.5) * u_contrast + 0.5 + u_brightness;

  // Saturation
  vec3 hsv = rgb2hsv(c);
  hsv.y *= u_saturation;
  c = hsv2rgb(hsv);

  // LUT (optional)
  if (u_useLUT)
    c = applyLUT(c);

  // Vignette
  float d = distance(uv, center);
  float vig = smoothstep(1.0, 0.4 + (1.0 - u_vignette) * 0.3, d);
  c *= vig;

  // Grain
  float g = (rand(uv * u_res + u_time * 60.0) - 0.5) * u_grain * 0.15;
  o = vec4(c + g, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
  return sh;
}

function link(gl: WebGL2RenderingContext, v: WebGLShader, f: WebGLShader) {
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) || "program link failed");
  return p;
}

function initGL(canvas: OffscreenCanvas, w: number, h: number) {
  canvas.width = w;
  canvas.height = h;
  gl = canvas.getContext("webgl2", { premultipliedAlpha: false }) as WebGL2RenderingContext | null;
  if (!gl) throw new Error("WebGL2 not supported");

  program = link(gl, compile(gl, gl.VERTEX_SHADER, vert), compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.useProgram(program);

  const buf = gl.createBuffer();
  const vao_ = gl.createVertexArray();
  vao = vao_;
  gl.bindVertexArray(vao_);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1, 0, 0,
      1, -1, 1, 0,
      -1, 1, 0, 1,
      1, 1, 1, 1,
    ]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

  tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  uTime = gl.getUniformLocation(program!, "u_time");
  uRes = gl.getUniformLocation(program!, "u_res");
  uParams = {
    brightness: gl.getUniformLocation(program!, "u_brightness"),
    contrast: gl.getUniformLocation(program!, "u_contrast"),
    saturation: gl.getUniformLocation(program!, "u_saturation"),
    vignette: gl.getUniformLocation(program!, "u_vignette"),
    grain: gl.getUniformLocation(program!, "u_grain"),
    fisheye: gl.getUniformLocation(program!, "u_fisheye"),
    zoom: gl.getUniformLocation(program!, "u_zoom"),
  };
  uUseLUT = gl.getUniformLocation(program!, "u_useLUT");
  uLUT = gl.getUniformLocation(program!, "u_lut");

  gl.viewport(0, 0, w, h);
  gl.uniform2f(uRes, w, h);
  gl.uniform1f(uParams.brightness, 0.0);
  gl.uniform1f(uParams.contrast, 1.0);
  gl.uniform1f(uParams.saturation, 1.0);
  gl.uniform1f(uParams.vignette, 0.0);
  gl.uniform1f(uParams.grain, 0.0);
  gl.uniform1f(uParams.fisheye, 0.0);
  gl.uniform1f(uParams.zoom, 1.0);
  gl.uniform1i(uUseLUT, 0);
  console.log("WebGL initialized", w, "x", h);
}

function draw(bitmap: ImageBitmap, t: number) {
  if (!gl || !program || !tex) return;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, (gl as any).BROWSER_DEFAULT_WEBGL);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  bitmap.close();
  gl.uniform1f(uTime, t / 1000.0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function applyParams(p: PreviewParamsMsg) {
  if (!gl) return;
  gl.uniform1f(uParams.brightness, p.brightness);
  gl.uniform1f(uParams.contrast, p.contrast);
  gl.uniform1f(uParams.saturation, p.saturation);
  gl.uniform1f(uParams.vignette, p.vignette);
  gl.uniform1f(uParams.grain, p.grain);
  gl.uniform1f(uParams.fisheye, p.fisheye);
  gl.uniform1f(uParams.zoom, p.zoom);
}

function uploadLUT(size: number, data: Float32Array) {
  if (!gl) return;
  if (!lutTex) lutTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, lutTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, size, size * size, 0, gl.RGB, gl.FLOAT, data);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, lutTex);
  gl.uniform1i(uLUT, 1);
  gl.uniform1i(uUseLUT, 1);
  lutSize = size;
  console.log("LUT uploaded:", size);
}

self.onmessage = (ev: MessageEvent<Msg>) => {
  const m = ev.data;
  switch (m.kind) {
    case "init":
      canvasRef = m.canvas;
      initGL(canvasRef, m.width, m.height);
      break;
    case "params":
      applyParams(m);
      break;
    case "resize":
      if (gl && canvasRef) {
        canvasRef.width = m.width;
        canvasRef.height = m.height;
        gl.viewport(0, 0, m.width, m.height);
        gl.uniform2f(uRes!, m.width, m.height);
      }
      break;
    case "frame":
      draw(m.bitmap, m.ts);
      break;
    case "lut":
      uploadLUT(m.size, m.data);
      break;
  }
};

console.log("Shader worker loaded");

