import { useState, useRef, useEffect } from 'react';
import { GifIcon as Gif, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/solid';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { playDing } from '../utils/audio';

export default function VideoToGif() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState('');
  const [resultUrl, setResultUrl] = useState(null);

  // Advanced Options
  const [quality, setQuality] = useState(80);
  const [enableCrop, setEnableCrop] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);

  const ffmpegRef = useRef(new FFmpeg());
  const isLoadingRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Video element ref to get video duration when loaded
  const videoRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const ffmpeg = ffmpegRef.current;
      if (ffmpeg.loaded || isLoadingRef.current) {
        setIsReady(true);
        return;
      }
      isLoadingRef.current = true;
      
      ffmpeg.on('log', ({ message }) => {
        setLog(message);
      });
      
      ffmpeg.on('progress', ({ progress, time }) => {
        setProgress(progress);
      });

      try {
        const baseURL = `${import.meta.env.BASE_URL}ffmpeg`;
        await ffmpeg.load({
          coreURL: `${baseURL}/ffmpeg-core.js?v=2`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm?v=2`,
        });
        setIsReady(true);
      } catch (err) {
        console.error('Failed to load FFmpeg:', err);
        setLoadError(`Failed to load: ${err.message || err.toString()}`);
        isLoadingRef.current = false;
      }
    };
    
    load();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoSrc(URL.createObjectURL(file));
      setResultUrl(null);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setEndTime(Math.floor(videoRef.current.duration * 10) / 10);
    }
  };

  const processVideo = async () => {
    if (!videoFile || !isReady) return;
    setIsProcessing(true);
    setProgress(0);
    setLog('Starting process...');

    const ffmpeg = ffmpegRef.current;
    
    // Accumulate log to show on error
    let fullLog = '';
    const logHandler = ({ message }) => { fullLog += message + '\n'; };
    ffmpeg.on('log', logHandler);

    try {
      const inputName = videoFile.name.replace(/\s+/g, '_');
      
      // Write file to memory
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      const targetFps = Math.floor(5 + ((quality - 1) / 99) * 15); // 5 to 20 fps
      const targetScale = Math.floor(240 + ((quality - 1) / 99) * 560); // 240 to 800 width

      let args = ['-y']; // Force overwrite
      
      // Determine cropping
      if (enableCrop) {
        args.push('-ss', startTime.toString(), '-to', endTime.toString());
      }
      
      // Convert to GIF: Generate palette, then apply
      args.push(
        '-i', inputName, 
        '-vf', `fps=${targetFps},scale=${targetScale}:-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`, 
        '-loop', '0', 
        'output.gif'
      );

      const execResult = await ffmpeg.exec(args);
      if (execResult !== 0) {
        throw new Error(`FFmpeg exited with code ${execResult}. Last logs:\n${fullLog.substring(fullLog.length - 400)}`);
      }

      const data = await ffmpeg.readFile('output.gif');
      if (data.length === 0) throw new Error("Generated GIF is 0 bytes");

      const blob = new Blob([data], { type: 'image/gif' });
      setResultUrl(URL.createObjectURL(blob));
      playDing();
    } catch (err) {
      console.error(err);
      alert("Failed to create GIF:\n" + err.message);
    } finally {
      ffmpeg.off('log', logHandler);
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Gif style={{width: "32px", height: "32px", fill: "url(#accent-grad)"}} />
        <h1>Video to GIF</h1>
      </div>
      <p>Convert videos to high-quality GIFs offline with complete control.</p>
      
      {!isReady && !loadError && (
        <div className="glass-panel" style={{marginBottom: '1rem', background: 'var(--accent-transparent)', border: '1px solid var(--accent-color)'}}>
          <div className="loader" style={{width: '16px', height: '16px', marginRight: '10px'}}></div>
          Loading FFmpeg engine...
        </div>
      )}
      {loadError && (
        <div className="glass-panel" style={{marginBottom: '1rem', background: 'rgba(255, 77, 79, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)'}}>
          <strong>Error: </strong> {loadError}
        </div>
      )}

      <div className="grid-container">
        <div className="glass-panel controls">
          {!videoSrc ? (
            <div className="dropzone">
              <UploadCloud />
              <h3>Upload Video</h3>
              <p>Select an MP4, WebM, or MOV file</p>
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleFileUpload} 
                style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'}} 
                disabled={!isReady}
              />
            </div>
          ) : (
            <div className="controls">
              <video 
                ref={videoRef}
                src={videoSrc} 
                controls 
                onLoadedMetadata={handleVideoLoadedMetadata}
                style={{width: '100%', borderRadius: 'var(--border-radius-sm)', background: '#000', marginBottom: '1rem'}} 
              />
              
              {!isProcessing && !resultUrl && (
                <div style={{marginBottom: '1.5rem'}}>
                  <div className="input-group" style={{marginBottom: '1rem'}}>
                    <label style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                      <span>GIF Quality</span>
                      <span style={{color: 'var(--accent-color)'}}>{quality}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={quality} 
                      onChange={(e) => setQuality(Number(e.target.value))}
                      style={{width: '100%', cursor: 'pointer'}}
                    />
                    <small style={{color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem'}}>
                      Higher quality yields larger file sizes.
                    </small>
                  </div>

                  <div className="input-group" style={{marginBottom: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: enableCrop ? '1rem' : '0'}}>
                      <input 
                        type="checkbox" 
                        checked={enableCrop} 
                        onChange={(e) => setEnableCrop(e.target.checked)} 
                        style={{width: 'auto'}}
                      />
                      <span style={{fontWeight: '500'}}>Crop Duration</span>
                    </label>

                    {enableCrop && (
                      <div style={{display: 'flex', gap: '1rem'}}>
                        <div className="input-group" style={{flex: 1}}>
                          <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Start Time (s)</label>
                          <input 
                            type="number" 
                            min="0"
                            step="0.1"
                            value={startTime} 
                            onChange={(e) => setStartTime(Number(e.target.value))}
                            style={{width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px'}}
                          />
                        </div>
                        <div className="input-group" style={{flex: 1}}>
                          <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>End Time (s)</label>
                          <input 
                            type="number" 
                            min="0"
                            step="0.1"
                            value={endTime} 
                            onChange={(e) => setEndTime(Number(e.target.value))}
                            style={{width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px'}}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="button-group" style={{marginTop: '1.5rem'}}>
                    <button className="btn btn-primary" onClick={processVideo}>
                      Convert to GIF
                    </button>
                    <button className="btn" onClick={() => {setVideoSrc(null); setVideoFile(null);}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="glass-panel animate-fade-in" style={{
                  position: 'fixed',
                  bottom: '2rem',
                  right: '2rem',
                  width: '320px',
                  zIndex: 50,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  border: '1px solid var(--accent-color)'
                }}>
                  <h4 style={{marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem'}}>
                    <div className="loader" style={{width: '14px', height: '14px'}}></div>
                    Converting... {Math.round(progress * 100)}%
                  </h4>
                  <div style={{ width: '100%', background: 'var(--bg-tertiary)', height: '6px', borderRadius: '4px', marginBottom: '0.5rem' }}>
                    <div style={{ width: `${progress * 100}%`, background: 'var(--accent-color)', height: '100%', borderRadius: '4px', transition: 'width 0.2s' }}></div>
                  </div>
                  <small style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', display: 'block', height: '1.5em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{log}</small>
                </div>
              )}

              {resultUrl && (
                <div className="button-group" style={{marginTop: '1rem'}}>
                  <a className="btn btn-primary" href={resultUrl} download={`animation-${Date.now()}.gif`}>
                    <Download style={{width: "18px", height: "18px"}} /> Download GIF
                  </a>
                  <button className="btn" onClick={() => {setVideoSrc(null); setVideoFile(null); setResultUrl(null);}}>
                    Start Over
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {resultUrl && (
          <div className="glass-panel preview-panel">
             <h3>GIF Result</h3>
             <div className="canvas-container" style={{background: 'var(--bg-tertiary)'}}>
               <img src={resultUrl} alt="GIF Result" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
