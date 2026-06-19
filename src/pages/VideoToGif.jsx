import { useState, useRef } from 'react';
import { GifIcon as Gif, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/solid';
import { fetchFile } from '@ffmpeg/util';
import { playDing } from '../utils/audio';
import { useProcessing } from '../contexts/ProcessingContext';

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function VideoToGif() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);

  // Advanced Options
  const [quality, setQuality] = useState(80);
  const [enableCrop, setEnableCrop] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);

  const videoRef = useRef(null);

  const { jobs, addJob, updateJob, removeJob, ffmpeg, isFfmpegLoaded } = useProcessing();

  const myJobId = 'video-to-gif';
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

  // Estimation Logic
  const targetFps = Math.floor(5 + ((quality - 1) / 99) * 15); // 5 to 20 fps
  const targetScale = Math.floor(240 + ((quality - 1) / 99) * 560); // 240 to 800 width
  const duration = Math.max(0.1, endTime - startTime);
  // Rough GIF byte size estimation: (Width * Height * FPS * Duration) / 3.5
  // Assuming standard 16:9 aspect ratio roughly for height calculation.
  const estimatedHeight = targetScale * (9 / 16);
  const estimatedBytes = (targetScale * estimatedHeight * targetFps * duration) / 3.5;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoSrc(URL.createObjectURL(file));
      if (myJob) removeJob(myJobId);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setEndTime(Math.floor(videoRef.current.duration * 10) / 10);
    }
  };

  const processVideo = async () => {
    if (!videoFile || !isFfmpegLoaded || isProcessing) return;
    
    addJob({ id: myJobId, title: 'Converting Video to GIF', type: 'video-to-gif' });

    let fullLog = '';
    const logHandler = ({ message }) => { 
      fullLog += message + '\n'; 
      updateJob(myJobId, { log: message });
    };
    
    const progressHandler = ({ progress }) => {
      updateJob(myJobId, { progress: progress * 100 });
    };

    ffmpeg.on('log', logHandler);
    ffmpeg.on('progress', progressHandler);

    try {
      const inputName = videoFile.name.replace(/\s+/g, '_');
      
      // Write file to memory
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

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
      const rUrl = URL.createObjectURL(blob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, downloadName: `animation-${Date.now()}.gif` });
      playDing();
    } catch (err) {
      console.error(err);
      updateJob(myJobId, { status: 'error', error: err.message });
      alert("Failed to create GIF:\n" + err.message);
    } finally {
      ffmpeg.off('log', logHandler);
      ffmpeg.off('progress', progressHandler);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Gif style={{width: "32px", height: "32px", fill: "url(#accent-grad)"}} />
        <h1>Video to GIF</h1>
      </div>
      <p>Convert videos to high-quality GIFs offline with complete control.</p>
      
      {!isFfmpegLoaded && (
        <div className="glass-panel" style={{marginBottom: '1rem', background: 'var(--accent-transparent)', border: '1px solid var(--accent-color)'}}>
          <div className="loader" style={{width: '16px', height: '16px', marginRight: '10px'}}></div>
          Loading FFmpeg engine globally...
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

                  <div className="input-group" style={{marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)'}}>
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

                  <div style={{background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: 'var(--text-secondary)'}}>Estimated GIF Size:</span>
                      <span style={{fontWeight: 'bold', color: 'var(--accent-color)'}}>~{formatBytes(estimatedBytes)}</span>
                    </div>
                  </div>

                  <div className="button-group">
                    <button className="btn btn-primary" onClick={processVideo} disabled={!isFfmpegLoaded}>
                      Convert to GIF
                    </button>
                    <button className="btn" onClick={() => {setVideoSrc(null); setVideoFile(null);}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div style={{marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  Processing in background... You can safely navigate to other tools!
                </div>
              )}

              {resultUrl && (
                <div className="button-group" style={{marginTop: '1rem'}}>
                  <a className="btn btn-primary" href={resultUrl} download={`animation-${Date.now()}.gif`}>
                    <Download style={{width: "18px", height: "18px"}} /> Download GIF
                  </a>
                  <button className="btn" onClick={() => {setVideoSrc(null); setVideoFile(null); removeJob(myJobId);}}>
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
