import React, { useEffect, useRef } from "react";

type Props = { lutData: Float32Array | null };

export function LUTVisualizer3D({ lutData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!lutData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl2")!;
    if (!gl) return;

    const size = Math.cbrt(lutData.length / 3);
    const vertices: number[] = [];

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (z * size * size + y * size + x) * 3;
          vertices.push(lutData[i], lutData[i + 1], lutData[i + 2]);
        }
      }
    }

    const vertSrc = `#version 300 es
    precision highp float;
    in vec3 a_pos;
    uniform mat4 u_mvp;
    out vec3 v_color;
    void main(){
      v_color = a_pos;
      gl_Position = u_mvp * vec4(a_pos * 2.0 - 1.0, 1.0);
      gl_PointSize = 2.5;
    }`;

    const fragSrc = `#version 300 es
    precision highp float;
    in vec3 v_color;
    out vec4 o;
    void main(){ o = vec4(v_color, 1.0); }`;

    const compile = (t: number, s: string) => {
      const sh = gl.createShader(t)!;
      gl.shaderSource(sh, s);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        throw gl.getShaderInfoLog(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);

    const u_mvp = gl.getUniformLocation(prog, "u_mvp");

    let angle = 0;
    let zoom = 3;
    let dragging = false;
    let lastX = 0, lastY = 0;

    const draw = () => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const mvp = new Float32Array([
        c / zoom, 0, s, 0,
        0, 1 / zoom, 0, 0,
        -s, 0, c / zoom, 0,
        0, 0, -3, 1,
      ]);
      gl.uniformMatrix4fv(u_mvp, false, mvp);
      gl.drawArrays(gl.POINTS, 0, vertices.length / 3);
      requestAnimationFrame(draw);
    };

    draw();

    const onDown = (e: MouseEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => (dragging = false);
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      angle += dx * 0.01;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onWheel = (e: WheelEvent) => {
      zoom += e.deltaY * 0.001;
      if (zoom < 1) zoom = 1;
      if (zoom > 10) zoom = 10;
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("wheel", onWheel);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [lutData]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="rounded-lg border border-neutral-700 shadow-md cursor-grab"
      />
      <p className="text-xs text-neutral-400">🧊 3D LUT Visualizer (drag to rotate, scroll to zoom)</p>
    </div>
  );
}
