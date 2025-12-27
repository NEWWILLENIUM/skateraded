console.log("[worker] Loaded ✅");let e=null,i=null,u=null,m=null,s=null,a={},c=null;const g=`#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_uv;
out vec2 v_uv;
void main() {
  v_uv = vec2(a_uv.x, 1.0 - a_uv.y); // Flip Y
  gl_Position = vec4(a_pos, 0., 1.);
}
`,h=`#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_tex;
uniform vec2 u_res; uniform float u_time;
uniform float u_brightness, u_contrast, u_saturation;
uniform float u_vignette, u_grain, u_fisheye, u_zoom;

vec3 rgb2hsv(vec3 c){
  vec4 K=vec4(0., -1./3., 2./3., -1.);
  vec4 p=mix(vec4(c.bg,K.wz), vec4(c.gb,K.xy), step(c.b,c.g));
  vec4 q=mix(vec4(p.xyw,c.r), vec4(c.r,p.yzx), step(p.x,c.r));
  float d=q.x - min(q.w,q.y) + 1e-5;
  float h=abs(q.w-q.y)/(6.*d+1e-5) + q.z;
  return vec3(fract(h), d/(q.x+1e-5), q.x);
}
vec3 hsv2rgb(vec3 c){
  vec3 p=abs(fract(c.xxx+vec3(0.,1./3.,2./3.))*6.-3.);
  return c.z * mix(vec3(1.), clamp(p-1.,0.,1.), c.y);
}
vec2 lens(vec2 uv,float k){
  vec2 p=uv*2.-1.;
  float r=dot(p,p);
  vec2 pd=p*(1.+k*r);
  return (pd+1.)*0.5;
}
float rand(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}

void main(){
  vec2 center=vec2(0.5);
  vec2 uv=(v_uv-center)/max(u_zoom,1e-5)+center;
  uv=lens(uv,u_fisheye);

  vec3 c=texture(u_tex,uv).rgb;
  c=(c-0.5)*u_contrast+0.5+u_brightness;
  vec3 hsv=rgb2hsv(c); hsv.y*=u_saturation; c=hsv2rgb(hsv);

  float d=distance(uv,center);
  float vig=smoothstep(1.0, 0.4+(1.0-u_vignette)*0.3, d);
  c*=vig;

  float g=(rand(uv*u_res + u_time*60.)-0.5)*u_grain*0.15;
  o=vec4(c+g,1.0);
}
`;function _(t,r,n){const o=t.createShader(r);if(t.shaderSource(o,n),t.compileShader(o),!t.getShaderParameter(o,t.COMPILE_STATUS))throw console.error("Shader compile failed:",t.getShaderInfoLog(o)),new Error(t.getShaderInfoLog(o)||"shader compile failed");return o}function E(t,r,n){const o=t.createProgram();if(t.attachShader(o,r),t.attachShader(o,n),t.linkProgram(o),!t.getProgramParameter(o,t.LINK_STATUS))throw console.error("Program link failed:",t.getProgramInfoLog(o)),new Error(t.getProgramInfoLog(o)||"program link failed");return o}function d(t,r,n){if(c=t,e=t.getContext("webgl2",{premultipliedAlpha:!1}),!e)throw new Error("WebGL2 not supported");i=E(e,_(e,e.VERTEX_SHADER,g),_(e,e.FRAGMENT_SHADER,h)),e.useProgram(i);const o=e.createBuffer(),l=e.createVertexArray();e.bindVertexArray(l),e.bindBuffer(e.ARRAY_BUFFER,o),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,0,0,1,-1,1,0,-1,1,0,1,1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,16,0),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,2,e.FLOAT,!1,16,8),u=e.createTexture(),e.bindTexture(e.TEXTURE_2D,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),m=e.getUniformLocation(i,"u_time"),s=e.getUniformLocation(i,"u_res"),a={brightness:e.getUniformLocation(i,"u_brightness"),contrast:e.getUniformLocation(i,"u_contrast"),saturation:e.getUniformLocation(i,"u_saturation"),vignette:e.getUniformLocation(i,"u_vignette"),grain:e.getUniformLocation(i,"u_grain"),fisheye:e.getUniformLocation(i,"u_fisheye"),zoom:e.getUniformLocation(i,"u_zoom")},e.viewport(0,0,r,n),e.uniform2f(s,r,n),Object.entries(a).forEach(([f,v])=>{v&&e.uniform1f(v,f==="contrast"||f==="saturation"?1:0)}),console.log("✅ WebGL initialized",r,"x",n)}function T(t,r){!e||!i||!u||(e.bindTexture(e.TEXTURE_2D,u),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t),t.close(),e.uniform1f(m,r/1e3),e.drawArrays(e.TRIANGLE_STRIP,0,4))}function R(t){e&&(e.uniform1f(a.brightness,t.brightness),e.uniform1f(a.contrast,t.contrast),e.uniform1f(a.saturation,t.saturation),e.uniform1f(a.vignette,t.vignette),e.uniform1f(a.grain,t.grain),e.uniform1f(a.fisheye,t.fisheye),e.uniform1f(a.zoom,t.zoom))}self.onmessage=t=>{const r=t.data;switch(r.kind){case"init":d(r.canvas,r.width,r.height);break;case"params":R(r);break;case"resize":e&&c&&(c.width=r.width,c.height=r.height,e.viewport(0,0,r.width,r.height),e.uniform2f(s,r.width,r.height));break;case"frame":T(r.bitmap,r.ts);break;case"lut":console.log("LUT loaded:",r.title,"size",r.size);break}};
