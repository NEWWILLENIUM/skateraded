import React, { useState, useRef, useEffect } from 'react';
import { FilterConfig, FilterType } from '../types';
import { generateFFmpegCommand } from '../services/geminiService';
import { SettingsIcon, PlayIcon, CheckIcon, PlusSquareIcon } from './Icons';

const DEFAULT_CONFIG: FilterConfig = {
  type: FilterType.NONE,
  grainIntensity: 0.2,
  vignetteIntensity: 0.3,
  saturationBoost: 0,
  contrastBoost: 0,
  whiteBalance: 0,
  addTimestamp: false,
  speedRamp: {
    isEnabled: false,
    startTime: 0,
    endTime: 3,
    speed: 0.5
  }
};

// Helper to generate CSS string for preview
const getCSSFilter = (config: FilterConfig): string => {
  let filters = [];
  
  // Base adjustments
  filters.push(`contrast(${1 + config.contrastBoost * 0.5})`);
  filters.push(`saturate(${1 + config.saturationBoost})`);

  switch (config.type) {
    case FilterType.VX1000:
      filters.push('brightness(1.1)');
      break;
    case FilterType.VHS:
      filters.push('blur(0.5px)');
      filters.push('hue-rotate(-5deg)');
      break;
    case FilterType.DVX100:
      filters.push('sepia(0.2)');
      filters.push('brightness(0.95)');
      break;
    default:
      break;
  }
  return filters.join(' ');
};

export const Editor: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<FilterConfig>(DEFAULT_CONFIG);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedCommand, setGeneratedCommand] = useState<{cmd: string, notes: string} | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setGeneratedCommand(null);
      setConfig({...DEFAULT_CONFIG});
    }
  };

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      if (dur > 2) {
          setConfig(prev => ({
              ...prev,
              speedRamp: {
                  ...prev.speedRamp,
                  startTime: Math.floor(dur / 3),
                  endTime: Math.floor(dur / 3) + 2
              }
          }));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);

        if (config.speedRamp.isEnabled) {
            const { startTime, endTime, speed } = config.speedRamp;
            if (time >= startTime && time < endTime) {
                if (videoRef.current.playbackRate !== speed) {
                    videoRef.current.playbackRate = speed;
                }
            } else {
                if (videoRef.current.playbackRate !== 1) {
                    videoRef.current.playbackRate = 1;
                }
            }
        } else {
             if (videoRef.current.playbackRate !== 1) {
                videoRef.current.playbackRate = 1;
             }
        }
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    setGeneratedCommand(null);
    const result = await generateFFmpegCommand(config, videoFile?.name || 'skate_clip.mp4');
    setGeneratedCommand({ cmd: result.command, notes: result.notes });
    setIsProcessing(false);
  };

  const getPercent = (time: number) => duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 pb-24 md:pt-4 min-h-screen flex flex-col items-center">
       <h1 className="font-display text-3xl tracking-tighter italic text-slate-900 mb-6">LAB <span className="text-blue-600">EDITOR</span></h1>

       {!videoUrl ? (
         <div className="w-full max-w-2xl border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors shadow-sm cursor-pointer group">
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleFileChange} 
              className="hidden" 
              id="video-upload"
            />
            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
              <div className="bg-slate-100 p-6 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <PlusSquareIcon className="w-10 h-10 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900 mb-2">Drop your clip here</span>
              <span className="text-sm text-slate-500 font-medium">MP4 or MOV • Auto-scaled to 1080p</span>
            </label>
         </div>
       ) : (
         <div className="w-full space-y-6">
            {/* Main Video Editor Container */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-900 group">
              
              {/* 1. Video Layer */}
              <div 
                className="w-full h-full transition-all duration-300 relative"
                style={{ 
                   filter: getCSSFilter(config),
                   position: 'relative'
                }}
              >
                  <video 
                    ref={videoRef}
                    src={videoUrl} 
                    className="w-full h-full object-contain" 
                    controls={false} // Custom controls overlay
                    loop
                    playsInline
                    autoPlay
                    muted
                    onLoadedMetadata={handleMetadataLoaded}
                    onTimeUpdate={handleTimeUpdate}
                  />
                  
                  {/* Effects Overlays */}
                  <div 
                    className="absolute inset-0 pointer-events-none mix-blend-overlay"
                    style={{
                        backgroundColor: config.whiteBalance > 0 ? '#ffb700' : '#0077ff',
                        opacity: Math.abs(config.whiteBalance) * 0.3
                    }}
                  ></div>

                  {config.type === FilterType.VX1000 && (
                    <div className="absolute inset-0 pointer-events-none mix-blend-multiply bg-[radial-gradient(circle,transparent_60%,#000_150%)]"></div>
                  )}
                  
                  {config.type === FilterType.VHS && (
                     <>
                      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise_tv.png')] mix-blend-overlay animate-pulse"></div>
                      {config.addTimestamp && (
                          <div className="absolute bottom-8 right-8 pointer-events-none font-mono text-white/80 text-xl tracking-widest drop-shadow-md">
                             PLAY &#9658; <br/> SP {new Date().toLocaleDateString()}
                          </div>
                      )}
                     </>
                  )}
              </div>

              {/* 2. HUD Controls Layer */}
              <div className={`absolute inset-0 pointer-events-none flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                 
                 {/* Top Bar */}
                 <div className="pointer-events-auto flex items-start justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                     {/* Filter Pills */}
                     <div className="flex space-x-2 overflow-x-auto max-w-[80%] pb-2 scrollbar-hide">
                        {Object.values(FilterType).map((t) => (
                          <button
                            key={t}
                            onClick={() => setConfig({ ...config, type: t })}
                            className={`px-3 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider backdrop-blur-md transition-all border ${
                              config.type === t 
                                ? 'bg-blue-600/90 text-white border-blue-500' 
                                : 'bg-black/40 text-slate-300 border-white/10 hover:bg-black/60 hover:text-white'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                     </div>
                     
                     <button 
                        onClick={() => { setVideoUrl(null); setVideoFile(null); setGeneratedCommand(null); }}
                        className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                     >
                       <span className="text-xs font-bold">✕</span>
                     </button>
                 </div>

                 {/* Center Play Toggle (Clicking background usually toggles play, handled by video tag if controls=true, but here we custom) */}
                 <div 
                    className="absolute inset-0 z-[-1] pointer-events-auto"
                    onClick={() => {
                        if (videoRef.current?.paused) videoRef.current.play();
                        else videoRef.current?.pause();
                    }}
                 ></div>

                 {/* Bottom Control Panel */}
                 <div className="pointer-events-auto bg-black/80 backdrop-blur-md border-t border-white/10 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        
                        {/* Left Column: Visual Adjustments */}
                        <div className="space-y-3">
                           <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                      GRAIN: {(config.grainIntensity * 100).toFixed(0)}%
                                    </label>
                                    <input type="range" min="0" max="1" step="0.05" value={config.grainIntensity} onChange={(e) => setConfig({...config, grainIntensity: parseFloat(e.target.value)})} className="w-full h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-blue-500"/>
                                </div>
                                <div>
                                    <label className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                      VIGNETTE: {(config.vignetteIntensity * 100).toFixed(0)}%
                                    </label>
                                    <input type="range" min="0" max="1" step="0.05" value={config.vignetteIntensity} onChange={(e) => setConfig({...config, vignetteIntensity: parseFloat(e.target.value)})} className="w-full h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-blue-500"/>
                                </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                      SATURATION: {config.saturationBoost.toFixed(1)}
                                    </label>
                                    <input type="range" min="-1" max="1" step="0.1" value={config.saturationBoost} onChange={(e) => setConfig({...config, saturationBoost: parseFloat(e.target.value)})} className="w-full h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-blue-500"/>
                                </div>
                                <div>
                                    <label className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                      WB: {config.whiteBalance.toFixed(1)}
                                    </label>
                                    <input type="range" min="-1" max="1" step="0.1" value={config.whiteBalance} onChange={(e) => setConfig({...config, whiteBalance: parseFloat(e.target.value)})} className="w-full h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-orange-500"/>
                                </div>
                           </div>
                           <div className="flex items-center space-x-2 pt-1">
                                <input 
                                    type="checkbox" 
                                    id="ts-toggle"
                                    checked={config.addTimestamp} 
                                    onChange={() => setConfig({...config, addTimestamp: !config.addTimestamp})}
                                    className="w-3 h-3 accent-blue-500"
                                />
                                <label htmlFor="ts-toggle" className="text-[10px] font-bold text-slate-300">TIMESTAMP OVERLAY</label>
                           </div>
                        </div>

                        {/* Right Column: Speed Ramp & Export */}
                        <div className="space-y-3 border-l border-white/10 pl-0 md:pl-4">
                           <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Speed Ramp</span>
                                <button 
                                    onClick={() => setConfig(prev => ({...prev, speedRamp: { ...prev.speedRamp, isEnabled: !prev.speedRamp.isEnabled }}))}
                                    className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${config.speedRamp.isEnabled ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                                >
                                    {config.speedRamp.isEnabled ? 'ON' : 'OFF'}
                                </button>
                           </div>

                           {config.speedRamp.isEnabled && (
                               <div className="bg-slate-800/50 rounded p-2 border border-white/5 space-y-2">
                                   {/* Timeline Vis */}
                                   <div className="relative w-full h-4 bg-slate-700 rounded overflow-hidden">
                                        <div 
                                            className="absolute top-0 bottom-0 bg-blue-500/60"
                                            style={{
                                                left: `${getPercent(config.speedRamp.startTime)}%`,
                                                width: `${getPercent(config.speedRamp.endTime - config.speedRamp.startTime)}%`
                                            }}
                                        ></div>
                                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: `${getPercent(currentTime)}%` }}></div>
                                   </div>
                                   
                                   <div className="flex space-x-2">
                                        <div className="flex-1">
                                            <label className="block text-[8px] text-slate-400">START</label>
                                            <input type="range" min="0" max={Math.max(0, config.speedRamp.endTime - 0.5)} step="0.1" value={config.speedRamp.startTime} onChange={(e) => setConfig(prev => ({...prev, speedRamp: { ...prev.speedRamp, startTime: parseFloat(e.target.value) }}))} className="w-full h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-blue-400"/>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[8px] text-slate-400">END</label>
                                            <input type="range" min={config.speedRamp.startTime + 0.5} max={duration} step="0.1" value={config.speedRamp.endTime} onChange={(e) => setConfig(prev => ({...prev, speedRamp: { ...prev.speedRamp, endTime: parseFloat(e.target.value) }}))} className="w-full h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-blue-400"/>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[8px] text-slate-400">SPEED: {config.speedRamp.speed}x</label>
                                            <input type="range" min="0.1" max="2.0" step="0.1" value={config.speedRamp.speed} onChange={(e) => setConfig(prev => ({...prev, speedRamp: { ...prev.speedRamp, speed: parseFloat(e.target.value) }}))} className="w-full h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-orange-400"/>
                                        </div>
                                   </div>
                               </div>
                           )}

                           <button 
                                onClick={handleExport}
                                disabled={isProcessing}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                            >
                                {isProcessing ? (
                                    <span className="animate-pulse">PROCESSING 1080P...</span>
                                ) : (
                                    <>
                                        <CheckIcon className="w-4 h-4" />
                                        <span>GENERATE 1080P EXPORT</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Generated Command Output */}
            {generatedCommand && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-fade-in shadow-xl">
                 <div className="flex items-center space-x-2 mb-4">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <h3 className="text-green-500 font-mono text-sm uppercase font-bold">FFmpeg Command Ready</h3>
                 </div>
                 <p className="text-slate-400 text-sm mb-4 italic">
                   "{generatedCommand.notes}"
                 </p>
                 <div className="bg-black border border-slate-800 rounded p-4 overflow-x-auto relative shadow-inner">
                    <code className="text-blue-400 font-mono text-xs whitespace-pre-wrap break-all">
                      {generatedCommand.cmd}
                    </code>
                 </div>
                 <p className="text-slate-500 text-xs mt-4 text-center">
                    Run this command to render your 1920x1080 clip.
                 </p>
              </div>
            )}
         </div>
       )}
    </div>
  );
};