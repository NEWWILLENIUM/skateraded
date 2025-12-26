// ✅ Fixed WebGL shader compiler
// Removes invalid gl.COMPILER reference and ensures proper error handling.

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);

  // ✅ Correct compile check — COMPILER does not exist in WebGL
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || "Shader compile failed");
  }

  return sh;
}


// Optional: if the rest of your file has more code, leave it below unchanged.
