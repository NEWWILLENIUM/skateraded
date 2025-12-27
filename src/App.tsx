import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import './App.css';

export default function App() {
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Effect controls
  const [effects, setEffects] = useState({
    grain: 0.3,
    fisheye: 0.5,
    vignette: 0.5,
    saturation: 1.2,
    contrast: 1.1,
    chromatic: 0.15
  });
  
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load FFmpeg
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const loadFFmpeg = async () => {
      const ffmpegInstance = new FFmpeg();
      
      ffmpegInstance.on('log', ({ message }) => {
        console.log(message);
      });
      
      ffmpegInstance.on('progress', ({ progress: prog }) => {
        setProgress(Math.round(prog * 100));
      });

      try {
        setLoadingMessage('Downloading FFmpeg core...');
        
        timeoutId = setTimeout(() => {
          setLoadError(true);
          setLoaded(true);
          setLoadingMessage('Continuing without export...');
        }, 45000);

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        
        setLoadingMessage('Loading video processor...');
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        
        setLoadingMessage('Almost ready...');
        await ffmpegInstance.load({
          coreURL,
          wasmURL,
        });
        
        clearTimeout(timeoutId);
        setFFmpeg(ffmpegInstance);
        setLoaded(true);
        setLoadingMessage('Ready!');
      } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        clearTimeout(timeoutId);
        setLoadError(true);
        setLoaded(true);
      }
    };

    loadFFmpeg();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Handle video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideo(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      
      // Auto-play when loaded
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(e => console.log('Auto-play prevented:', e));
        }
      }, 100);
    }
  };

  // WebGL Fisheye shader rendering
  useEffect(() => {
    if (!videoRef.current || !glCanvasRef.current || !videoUrl) return;

    const video = videoRef.current;
    const canvas = glCanvasRef.current;
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
      console.error('WebGL2 not supported - falling back to basic rendering');
      // Fallback: just show the video without effects
      return;
    }

    // Vertex shader
    const vertexShaderSource = `#version 300 es
      in vec2 a_position;
      in vec2 a_texCoord;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    // Fragment shader with all effects
    const fragmentShaderSource = `#version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      uniform sampler2D u_texture;
      uniform float u_fisheye;
      uniform float u_grain;
      uniform float u_vignette;
      uniform float u_saturation;
      uniform float u_contrast;
      uniform float u_chromatic;
      uniform float u_time;
      
      float random(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec2 uv = v_texCoord;
        vec2 center = vec2(0.5, 0.5);
        vec2 delta = uv - center;
        float dist = length(delta);
        
        // Fisheye distortion
        if (u_fisheye > 0.01 && dist > 0.0) {
          float power = 1.0 + dist * dist * u_fisheye * 2.5;
          vec2 direction = normalize(delta);
          uv = center + direction * dist * power;
        }
        
        // Check bounds
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          fragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }
        
        // Chromatic aberration
        vec2 offset = delta * u_chromatic * 0.015;
        float r = texture(u_texture, uv + offset).r;
        float g = texture(u_texture, uv).g;
        float b = texture(u_texture, uv - offset).b;
        
        vec3 color = vec3(r, g, b);
        
        // Saturation
        float gray = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(vec3(gray), color, u_saturation);
        
        // Contrast
        color = (color - 0.5) * u_contrast + 0.5;
        
        // Animated film grain
        float noise = random(uv * u_time) - 0.5;
        color += noise * u_grain * 0.25;
        
        // Vignette
        float vignetteFactor = 1.0 - (dist * u_vignette * 1.8);
        color *= max(vignetteFactor, 0.0);
        
        color = clamp(color, 0.0, 1.0);
        
        fragColor = vec4(color, 1.0);
      }
    `;

    function compileShader(gl: WebGL2RenderingContext, source: string, type: number) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      
      return shader;
    }

    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positions = new Float32Array([
      -1, -1,   1, -1,   -1,  1,   1,  1,
    ]);
    
    const texCoords = new Float32Array([
      0, 1,   1, 1,   0, 0,   1, 0,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    
    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const fisheyeLoc = gl.getUniformLocation(program, 'u_fisheye');
    const grainLoc = gl.getUniformLocation(program, 'u_grain');
    const vignetteLoc = gl.getUniformLocation(program, 'u_vignette');
    const saturationLoc = gl.getUniformLocation(program, 'u_saturation');
    const contrastLoc = gl.getUniformLocation(program, 'u_contrast');
    const chromaticLoc = gl.getUniformLocation(program, 'u_chromatic');
    const timeLoc = gl.getUniformLocation(program, 'u_time');

    let animationId: number;
    let startTime = Date.now();

    const render = () => {
      if (!video.videoWidth || !video.videoHeight) {
        animationId = requestAnimationFrame(render);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

      gl.uniform1f(fisheyeLoc, effects.fisheye);
      gl.uniform1f(grainLoc, effects.grain);
      gl.uniform1f(vignetteLoc, effects.vignette);
      gl.uniform1f(saturationLoc, effects.saturation);
      gl.uniform1f(contrastLoc, effects.contrast);
      gl.uniform1f(chromaticLoc, effects.chromatic);
      gl.uniform1f(timeLoc, (Date.now() - startTime) * 0.001);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationId = requestAnimationFrame(render);
    };

    // Start rendering immediately
    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [videoUrl, effects]);

  // Track video play state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoUrl]);

  const handleExport = async () => {
    if (!ffmpeg || !video) {
      alert('⚠️ Export is unavailable. Please refresh and wait for the processor to load.');
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const videoData = await fetchFile(video);
      await ffmpeg.writeFile('input.mp4', videoData);

      const duration = videoRef.current?.duration || 0;
      const startTime = (duration * trimStart) / 100;
      const endTime = (duration * trimEnd) / 100;

      const filters = [
        `eq=saturation=${effects.saturation}:contrast=${effects.contrast}`,
        `noise=alls=${Math.round(effects.grain * 100)}:allf=t+u`,
        `vignette=${effects.vignette}`
      ].join(',');

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', startTime.toFixed(2),
        '-to', endTime.toFixed(2),
        '-vf', filters,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'copy',
        'output.mp4'
      ]);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `skateraded-${Date.now()}.mp4`;
      a.click();

      URL.revokeObjectURL(url);
      
      alert('✅ Video exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Export failed. Please try again with a smaller video or different settings.');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const skipLoading = () => {
    setLoaded(true);
    setLoadError(true);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🛹 SKATERADED</h1>
        <p>EA SKATE CLIP EDITOR</p>
      </header>

      <main className="main">
        {!videoUrl ? (
          <div className="upload-zone">
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              id="video-upload"
              className="file-input"
            />
            <label htmlFor="video-upload" className="upload-label">
              <div className="upload-icon">📹</div>
              <h2>Drop your EA Skate footage here</h2>
              <p>or click to browse</p>
            </label>
          </div>
        ) : (
          <div className="editor">
            <div className="preview-section">
              <div className="video-container">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="video-source"
                  loop
                  muted
                  playsInline
                  crossOrigin="anonymous"
                />
                <canvas
                  ref={glCanvasRef}
                  className="video-canvas"
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                      } else {
                        videoRef.current.pause();
                      }
                    }
                  }}
                />
                {!isPlaying && (
                  <div className="play-overlay" onClick={() => videoRef.current?.play()}>
                    <div className="play-button">▶</div>
                  </div>
                )}
              </div>
            </div>

            <div className="controls-section">
              <h3>🎥 SKATE VIDEO EFFECTS</h3>
              
              <div className="control-group">
                <label>
                  🐟 FISHEYE LENS
                  <span>{Math.round(effects.fisheye * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={effects.fisheye}
                  onChange={(e) => setEffects({...effects, fisheye: parseFloat(e.target.value)})}
                />
              </div>

              <div className="control-group">
                <label>
                  📹 FILM GRAIN
                  <span>{Math.round(effects.grain * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={effects.grain}
                  onChange={(e) => setEffects({...effects, grain: parseFloat(e.target.value)})}
                />
              </div>

              <div className="control-group">
                <label>
                  🌑 VIGNETTE
                  <span>{Math.round(effects.vignette * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={effects.vignette}
                  onChange={(e) => setEffects({...effects, vignette: parseFloat(e.target.value)})}
                />
              </div>

              <div className="control-group">
                <label>
                  🎨 SATURATION
                  <span>{effects.saturation.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.01"
                  value={effects.saturation}
                  onChange={(e) => setEffects({...effects, saturation: parseFloat(e.target.value)})}
                />
              </div>

              <div className="control-group">
                <label>
                  🔆 CONTRAST
                  <span>{effects.contrast.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.01"
                  value={effects.contrast}
                  onChange={(e) => setEffects({...effects, contrast: parseFloat(e.target.value)})}
                />
              </div>

              <div className="control-group">
                <label>
                  🌈 CHROMATIC ABERRATION
                  <span>{Math.round(effects.chromatic * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={effects.chromatic}
                  onChange={(e) => setEffects({...effects, chromatic: parseFloat(e.target.value)})}
                />
              </div>

              <h3>✂️ TRIM VIDEO</h3>
              
              <div className="control-group">
                <label>
                  START POINT
                  <span>{trimStart}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={trimEnd - 1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(parseInt(e.target.value))}
                />
              </div>

              <div className="control-group">
                <label>
                  END POINT
                  <span>{trimEnd}%</span>
                </label>
                <input
                  type="range"
                  min={trimStart + 1}
                  max="100"
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(parseInt(e.target.value))}
                />
              </div>

              <div className="button-group">
                <button
                  className="export-btn"
                  onClick={handleExport}
                  disabled={!ffmpeg || processing || loadError}
                >
                  {processing ? `⏳ EXPORTING... ${progress}%` : loadError ? '❌ EXPORT UNAVAILABLE' : '⬇️ EXPORT VIDEO'}
                </button>

                <button
                  className="reset-btn"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.pause();
                    }
                    URL.revokeObjectURL(videoUrl);
                    setVideoUrl('');
                    setVideo(null);
                    setTrimStart(0);
                    setTrimEnd(100);
                    setIsPlaying(false);
                    setEffects({
                      grain: 0.3,
                      fisheye: 0.5,
                      vignette: 0.5,
                      saturation: 1.2,
                      contrast: 1.1,
                      chromatic: 0.15
                    });
                  }}
                >
                  🔄 NEW VIDEO
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {!loaded && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{loadingMessage}</p>
          <small>This may take 30-60 seconds on first load...</small>
          <button className="skip-btn" onClick={skipLoading}>
            Continue Without Export
          </button>
        </div>
      )}
    </div>
  );
}