import { useState, useRef, useEffect } from 'react';
import { ArrowsPointingInIcon as Compress, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/solid';
import Dropzone from '../components/Dropzone';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { playDing } from '../utils/audio';

export default function VideoCompressor() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState('');
  const [resultUrl, setResultUrl] = useState(null);

  const ffmpegRef = useRef(new FFmpeg());
  const isLoadingRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState('');

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
      const inputName = videoFile.name.replace(/\s+/g, '_'); // Replace spaces just in case
      
      // Write file to memory
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Compress Video: Re-encode with lower bitrate/CRF
      const execResult = await ffmpeg.exec(['-i', inputName, '-vcodec', 'libx264', '-crf', '28', '-preset', 'fast', 'output.mp4']);
      if (execResult !== 0) {
        throw new Error(`FFmpeg exited with code ${execResult}. Last logs:\n${fullLog.substring(fullLog.length - 400)}`);
      }

      const data = await ffmpeg.readFile('output.mp4');
      if (data.length === 0) throw new Error("Generated video is 0 bytes");

      const blob = new Blob([data], { type: 'video/mp4' });
      setResultUrl(URL.createObjectURL(blob));
      playDing();
    } catch (err) {
      console.error(err);
      alert("Failed to compress video:\n" + err.message);
    } finally {
      ffmpeg.off('log', logHandler);
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Compress />
        <h1>Video Compressor</h1>
      </div>
      <p>Compress MP4 videos instantly, fully offline in your browser.</p>
      
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
          {!videoFile ? (
            <Dropzone 
              onDrop={(file) => {
                if (file && file.type.startsWith('video/')) {
                  setVideoFile(file);
                  setVideoSrc(URL.createObjectURL(file));
                } else {
                  alert("Please upload a video file");
                }
              }}
              accept="video/*"
              title="Upload Video"
              subtitle="Drag & drop or click to select"
              icon={<UploadCloud style={{width: 48, height: 48}}/>}
            />
          ) : (
            <div className="controls">
              <video src={videoSrc} controls style={{width: '100%', borderRadius: 'var(--border-radius-sm)', background: '#000'}} />
              
              {!isProcessing && !resultUrl && (
                <div className="button-group" style={{marginTop: '1rem'}}>
                  <button className="btn btn-primary" onClick={processVideo}>
                    Compress Video
                  </button>
                  <button className="btn" onClick={() => {setVideoSrc(null); setVideoFile(null);}}>
                    Cancel
                  </button>
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
                    {progress >= 0 && progress <= 1 ? `Compressing... ${Math.round(progress * 100)}%` : `Compressing...`}
                  </h4>
                  <div style={{ width: '100%', background: 'var(--bg-tertiary)', height: '6px', borderRadius: '4px', marginBottom: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ 
                      width: progress >= 0 && progress <= 1 ? `${progress * 100}%` : '100%', 
                      background: 'var(--accent-color)', 
                      height: '100%', 
                      borderRadius: '4px', 
                      transition: 'width 0.2s',
                      opacity: progress >= 0 && progress <= 1 ? 1 : 0.5 
                    }}></div>
                  </div>
                  <small style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', display: 'block', height: '1.5em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{log}</small>
                </div>
              )}

              {resultUrl && (
                <div className="button-group" style={{marginTop: '1rem'}}>
                  <a className="btn btn-primary" href={resultUrl} download={`compressed-${Date.now()}.mp4`}>
                    <Download style={{width: "18px", height: "18px"}} /> Download MP4
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
             <h3>Compressed Result</h3>
             <div className="canvas-container">
                <video src={resultUrl} controls style={{ maxWidth: '100%', maxHeight: '60vh', background: '#000' }} />
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
