import { useState, useRef, useEffect } from 'react';
import { 
  GifIcon as Gif, 
  CloudArrowUpIcon as UploadCloud, 
  ArrowDownTrayIcon as Download, 
  XMarkIcon as XMark,
  PlayIcon,
  PauseIcon,
  FilmIcon
} from '@heroicons/react/24/solid';
import { fetchFile } from '@ffmpeg/util';
import { playDing } from '../utils/audio';
import { useProcessing } from '../contexts/ProcessingContext';
import Dropzone from '../components/Dropzone';

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const TOOL_ID = 'video-to-gif';

function VideoToGifSlot({ slot }) {
  const { jobs, addJob, updateJob, removeJob, isFfmpegLoaded, updateSlot, removeSlot, createFfmpegInstance } = useProcessing();
  const videoRef = useRef(null);

  const myJobId = slot.id;
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;
  const isResultMp4 = myJob?.isMp4;

  const { 
    videoFile, 
    previewUrl, 
    originalFps = null, 
    quality = 80, 
    enableCrop = false, 
    startTime = 0, 
    endTime = 5, 
    fps = '15',
    videoDuration = 0
  } = slot;

  const [isPlayingLoop, setIsPlayingLoop] = useState(false);

  // Estimation Logic
  const targetFps = fps === 'original' ? (originalFps || 15) : parseInt(fps);
  const targetScale = Math.floor(240 + ((quality - 1) / 99) * 560); // 240 to 800 width
  const duration = Math.max(0.1, endTime - startTime);
  const estimatedHeight = targetScale * (9 / 16);
  const estimatedBytes = (targetScale * estimatedHeight * targetFps * duration) / 3.5;

  // Initial Probe for FPS and Duration
  useEffect(() => {
    if (isFfmpegLoaded && videoFile && originalFps === null && !slot.isProbing) {
      updateSlot(TOOL_ID, slot.id, { isProbing: true });
      const probeVideo = async () => {
         let localFfmpeg = null;
         try {
             localFfmpeg = await createFfmpegInstance();
             const inputName = 'probe_' + slot.id + '_' + videoFile.name.replace(/\s+/g, '_');
             await localFfmpeg.writeFile(inputName, await fetchFile(videoFile));
             let detectedFps = null;
             const logHandler = ({ message }) => {
                const match = message.match(/, ([\d.]+) fps,/);
                if (match) detectedFps = parseFloat(match[1]);
             };
             localFfmpeg.on('log', logHandler);
             await localFfmpeg.exec(['-i', inputName]);
             localFfmpeg.off('log', logHandler);
             if (detectedFps) {
                const roundedFps = Math.round(detectedFps);
                let newFps = fps;
                if (fps !== 'original' && parseInt(fps) > roundedFps) {
                   if (roundedFps >= 15) newFps = '15';
                   else newFps = '10';
                }
                updateSlot(TOOL_ID, slot.id, { originalFps: roundedFps, fps: newFps });
             } else {
                updateSlot(TOOL_ID, slot.id, { originalFps: 30 }); // fallback
             }
         } catch(err) {
             console.error("Probe error", err);
             updateSlot(TOOL_ID, slot.id, { originalFps: 30 });
         } finally {
             if (localFfmpeg) localFfmpeg.terminate();
         }
      };
      probeVideo();
    }
  }, [isFfmpegLoaded, videoFile, originalFps, slot.isProbing, slot.id, updateSlot, createFfmpegInstance, fps]);

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration > 0) {
      const dur = videoRef.current.duration;
      const initialEnd = (endTime === 5 && dur > 0) ? Math.min(dur, Math.floor(dur * 10) / 10) : endTime;
      updateSlot(TOOL_ID, slot.id, { 
        videoDuration: dur,
        endTime: Math.min(dur, initialEnd) 
      });
    }
  };

  // Selection Loop Listener
  const handleTimeUpdate = () => {
    if (isPlayingLoop && videoRef.current && enableCrop) {
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
        videoRef.current.play();
      }
    }
  };

  const toggleLoopPlay = () => {
    if (!videoRef.current) return;
    if (isPlayingLoop) {
      setIsPlayingLoop(false);
      videoRef.current.pause();
    } else {
      setIsPlayingLoop(true);
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
    }
  };

  const seekToTime = (timeSeconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeSeconds;
    }
  };

  // Convert to GIF
  const processVideo = async () => {
    if (!videoFile || !isFfmpegLoaded || isProcessing) return;
    
    addJob({ id: myJobId, title: 'Converting Video to GIF', type: 'video-to-gif' });

    let localFfmpeg = null;
    let fullLog = '';
    const logHandler = ({ message }) => { 
      fullLog += message + '\n'; 
      updateJob(myJobId, { log: message });
    };
    
    const progressHandler = ({ progress }) => {
      updateJob(myJobId, { progress: progress * 100 });
    };

    try {
      localFfmpeg = await createFfmpegInstance();
      localFfmpeg.on('log', logHandler);
      localFfmpeg.on('progress', progressHandler);

      const inputName = `input_${slot.id}_` + videoFile.name.replace(/\s+/g, '_');
      const outputName = `output_${slot.id}.gif`;
      
      await localFfmpeg.writeFile(inputName, await fetchFile(videoFile));

      let args = ['-y'];
      
      if (enableCrop) {
        args.push('-ss', startTime.toString(), '-to', endTime.toString());
      }

      let finalFps = targetFps;
      if (originalFps && finalFps > originalFps) {
         finalFps = originalFps;
      }
      
      args.push(
        '-i', inputName, 
        '-vf', `fps=${finalFps},scale=${targetScale}:-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`, 
        '-loop', '0', 
        outputName
      );

      const execResult = await localFfmpeg.exec(args);
      if (execResult !== 0) {
        throw new Error(`FFmpeg exited with code ${execResult}. Last logs:\n${fullLog.substring(fullLog.length - 400)}`);
      }

      const data = await localFfmpeg.readFile(outputName);
      if (data.length === 0) throw new Error("Generated GIF is 0 bytes");

      const blob = new Blob([data], { type: 'image/gif' });
      const rUrl = URL.createObjectURL(blob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, isMp4: false, downloadName: `animation-${Date.now()}.gif` });
      playDing();
    } catch (err) {
      console.error(err);
      if (err.message.includes('av1') && err.message.includes('Missing Sequence Header')) {
        const friendlyError = "This video appears to be an AV1 file, which isn't fully supported by our browser-based processing engine. Please try using a standard MP4 (H.264) video instead.";
        updateJob(myJobId, { status: 'error', error: friendlyError });
      } else {
        updateJob(myJobId, { status: 'error', error: err.message });
      }
    } finally {
      if (localFfmpeg) {
        localFfmpeg.off('log', logHandler);
        localFfmpeg.off('progress', progressHandler);
        localFfmpeg.terminate();
      }
    }
  };

  // Export Trimmed Video (MP4)
  const processTrimmedVideo = async () => {
    if (!videoFile || !isFfmpegLoaded || isProcessing) return;
    
    addJob({ id: myJobId, title: 'Trimming & Exporting MP4 Video', type: 'video-trim' });

    let localFfmpeg = null;
    let fullLog = '';
    const logHandler = ({ message }) => { 
      fullLog += message + '\n'; 
      updateJob(myJobId, { log: message });
    };
    
    const progressHandler = ({ progress }) => {
      updateJob(myJobId, { progress: progress * 100 });
    };

    try {
      localFfmpeg = await createFfmpegInstance();
      localFfmpeg.on('log', logHandler);
      localFfmpeg.on('progress', progressHandler);

      const inputName = `input_${slot.id}_` + videoFile.name.replace(/\s+/g, '_');
      const outputName = `trimmed_${slot.id}.mp4`;
      
      await localFfmpeg.writeFile(inputName, await fetchFile(videoFile));

      let args = ['-y'];
      if (enableCrop) {
        args.push('-ss', startTime.toString(), '-to', endTime.toString());
      }
      args.push('-i', inputName, '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac', outputName);

      const execResult = await localFfmpeg.exec(args);
      if (execResult !== 0) {
        throw new Error(`FFmpeg exited with code ${execResult}. Last logs:\n${fullLog.substring(fullLog.length - 400)}`);
      }

      const data = await localFfmpeg.readFile(outputName);
      if (data.length === 0) throw new Error("Trimmed video is 0 bytes");

      const blob = new Blob([data], { type: 'video/mp4' });
      const rUrl = URL.createObjectURL(blob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, isMp4: true, downloadName: `trimmed-${Date.now()}.mp4` });
      playDing();
    } catch (err) {
      console.error(err);
      updateJob(myJobId, { status: 'error', error: err.message });
    } finally {
      if (localFfmpeg) {
        localFfmpeg.off('log', logHandler);
        localFfmpeg.off('progress', progressHandler);
        localFfmpeg.terminate();
      }
    }
  };

  const [isClosing, setIsClosing] = useState(false);
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => removeSlot(TOOL_ID, slot.id), 200);
  };

  // Duration ratio percentages for visual timeline bar
  const totalDur = videoDuration || 10;
  const startPct = Math.min(100, Math.max(0, (startTime / totalDur) * 100));
  const endPct = Math.min(100, Math.max(0, (endTime / totalDur) * 100));

  return (
    <div className={`glass-panel controls animate-pop-in ${isClosing ? 'animate-pop-out' : ''}`} style={{ position: 'relative', marginBottom: '2rem' }}>
      <button 
        onClick={handleClose} 
        style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '50%', padding: '0.25rem', cursor: 'pointer', zIndex: 10 }}
        title="Close Slot"
      >
        <XMark style={{ width: 20, height: 20, color: 'var(--text-secondary)' }} />
      </button>

      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        
        {/* Video Player */}
        <video 
          ref={videoRef}
          src={previewUrl} 
          controls 
          onLoadedMetadata={handleVideoLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          style={{width: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: 'var(--border-radius-sm)', background: '#000'}} 
        />

        {/* Selection Preview Play Bar */}
        {enableCrop && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Crop Selection: <strong style={{ color: 'var(--accent-color)' }}>{formatTime(startTime)}</strong> to <strong style={{ color: 'var(--accent-color)' }}>{formatTime(endTime)}</strong> ({duration.toFixed(1)}s)
            </span>
            <button 
              className="btn"
              onClick={toggleLoopPlay}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isPlayingLoop ? 'var(--accent-color)' : 'rgba(255,255,255,0.08)',
                color: 'white'
              }}
            >
              {isPlayingLoop ? (
                <>
                  <PauseIcon style={{ width: '14px', height: '14px' }} /> Pause Selection
                </>
              ) : (
                <>
                  <PlayIcon style={{ width: '14px', height: '14px' }} /> Play Selection (Loop)
                </>
              )}
            </button>
          </div>
        )}
        
        {!isProcessing && !resultUrl && (
          <div>
            <div className="input-group" style={{marginBottom: '1rem'}}>
              <label style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <span>GIF Quality (Resolution)</span>
                <span style={{color: 'var(--accent-color)'}}>{quality}%</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={quality} 
                onChange={(e) => updateSlot(TOOL_ID, slot.id, { quality: Number(e.target.value) })}
                style={{width: '100%', cursor: 'pointer'}}
              />
              <small style={{color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem'}}>
                Higher quality yields larger file sizes.
              </small>
            </div>

            <div className="input-group" style={{marginBottom: '1.5rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Framerate (FPS)</label>
              <select 
                value={fps} 
                onChange={(e) => updateSlot(TOOL_ID, slot.id, { fps: e.target.value })}
                style={{width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px'}}
              >
                <option value="original">Original{originalFps ? ` (${originalFps}fps)` : ''}</option>
                {(!originalFps || originalFps >= 30) && <option value="30">30 FPS</option>}
                {(!originalFps || originalFps >= 24) && <option value="24">24 FPS</option>}
                {(!originalFps || originalFps >= 20) && <option value="20">20 FPS</option>}
                {(!originalFps || originalFps >= 15) && <option value="15">15 FPS</option>}
                {(!originalFps || originalFps >= 10) && <option value="10">10 FPS</option>}
                {(!originalFps || originalFps >= 5) && <option value="5">5 FPS</option>}
              </select>
            </div>

            {/* Crop Duration Settings with Visual Range Bar */}
            <div className="input-group" style={{marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: enableCrop ? '1rem' : '0'}}>
                <input 
                  type="checkbox" 
                  checked={enableCrop} 
                  onChange={(e) => updateSlot(TOOL_ID, slot.id, { enableCrop: e.target.checked })} 
                  style={{width: 'auto'}}
                />
                <span style={{fontWeight: '500'}}>Crop Duration & Timeline Trimmer</span>
              </label>

              {enableCrop && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Interactive Visual Timeline Bar */}
                  {totalDur > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div 
                        style={{
                          position: 'relative',
                          height: '24px',
                          background: 'rgba(0,0,0,0.4)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          overflow: 'hidden',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                          seekToTime(ratio * totalDur);
                        }}
                        title="Click timeline to seek player position"
                      >
                        {/* Highlighted Crop Region */}
                        <div 
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${startPct}%`,
                            width: `${Math.max(0, endPct - startPct)}%`,
                            background: 'rgba(59, 130, 246, 0.4)',
                            borderLeft: '3px solid var(--accent-color)',
                            borderRight: '3px solid var(--accent-color)'
                          }}
                        />
                      </div>

                      {/* Visual Sliders for Start & End Handles */}
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                            <span>Start Handle</span>
                            <span style={{ color: 'var(--accent-color)' }}>{formatTime(startTime)}</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max={Math.max(0, endTime - 0.1)}
                            step="0.1"
                            value={startTime}
                            onChange={(e) => {
                              const val = Math.min(Number(e.target.value), endTime - 0.1);
                              updateSlot(TOOL_ID, slot.id, { startTime: val });
                              seekToTime(val);
                            }}
                            style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                            <span>End Handle</span>
                            <span style={{ color: 'var(--accent-color)' }}>{formatTime(endTime)}</span>
                          </div>
                          <input 
                            type="range"
                            min={Math.min(totalDur, startTime + 0.1)}
                            max={totalDur}
                            step="0.1"
                            value={endTime}
                            onChange={(e) => {
                              const val = Math.max(Number(e.target.value), startTime + 0.1);
                              updateSlot(TOOL_ID, slot.id, { endTime: val });
                              seekToTime(val);
                            }}
                            style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Numeric Input Fields */}
                  <div style={{display: 'flex', gap: '1rem'}}>
                    <div className="input-group" style={{flex: 1}}>
                      <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Start Time (m:s)</label>
                      <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="MM"
                          value={Math.floor(startTime / 60) || 0} 
                          onChange={(e) => {
                            const val = (Number(e.target.value) * 60) + (startTime % 60);
                            updateSlot(TOOL_ID, slot.id, { startTime: val });
                            seekToTime(val);
                          }}
                          style={{width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px'}}
                        />
                        <span>:</span>
                        <input 
                          type="number" 
                          min="0"
                          max="59.9"
                          step="0.1"
                          placeholder="SS.s"
                          value={Number((startTime % 60).toFixed(1))} 
                          onChange={(e) => {
                            const val = (Math.floor(startTime / 60) * 60) + Number(e.target.value);
                            updateSlot(TOOL_ID, slot.id, { startTime: val });
                            seekToTime(val);
                          }}
                          style={{width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px'}}
                        />
                      </div>
                    </div>
                    <div className="input-group" style={{flex: 1}}>
                      <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>End Time (m:s)</label>
                      <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="MM"
                          value={Math.floor(endTime / 60) || 0} 
                          onChange={(e) => {
                            const val = (Number(e.target.value) * 60) + (endTime % 60);
                            updateSlot(TOOL_ID, slot.id, { endTime: val });
                            seekToTime(val);
                          }}
                          style={{width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px'}}
                        />
                        <span>:</span>
                        <input 
                          type="number" 
                          min="0"
                          max="59.9"
                          step="0.1"
                          placeholder="SS.s"
                          value={Number((endTime % 60).toFixed(1))} 
                          onChange={(e) => {
                            const val = (Math.floor(endTime / 60) * 60) + Number(e.target.value);
                            updateSlot(TOOL_ID, slot.id, { endTime: val });
                            seekToTime(val);
                          }}
                          style={{width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px'}}
                        />
                      </div>
                    </div>
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

            {/* Action Buttons: GIF vs MP4 */}
            <div className="button-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={processVideo} disabled={!isFfmpegLoaded}>
                <Gif style={{ width: '18px', height: '18px' }} /> Convert to GIF
              </button>
              <button className="btn" onClick={processTrimmedVideo} disabled={!isFfmpegLoaded} style={{ background: 'rgba(255,255,255,0.08)' }}>
                <FilmIcon style={{ width: '18px', height: '18px', color: '#3b82f6' }} /> Export Cut Video (MP4)
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
          <div className="result-container animate-fade-in" style={{marginTop: '1.5rem'}}>
            <h3 style={{marginTop: 0}}>{isResultMp4 ? 'Trimmed Video Result (MP4)' : 'GIF Result'}</h3>
            <div className="canvas-container" style={{background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)'}}>
              {isResultMp4 ? (
                <video src={resultUrl} controls style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: '4px' }} />
              ) : (
                <img src={resultUrl} alt="GIF Result" style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
              )}
            </div>
            <div className="button-group" style={{marginTop: '1rem'}}>
              <a className="btn btn-primary" href={resultUrl} download={isResultMp4 ? `trimmed-${Date.now()}.mp4` : `animation-${Date.now()}.gif`}>
                <Download style={{width: "18px", height: "18px"}} /> Download {isResultMp4 ? 'Video (MP4)' : 'GIF'}
              </a>
              <button className="btn" onClick={() => removeJob(myJobId)}>
                Discard Result
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VideoToGif() {
  const { isFfmpegLoaded, workspaces, addSlot } = useProcessing();
  const slots = workspaces[TOOL_ID] || [];

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file && file.type.startsWith('video/')) {
        const slotId = `${TOOL_ID}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        addSlot(TOOL_ID, {
          id: slotId,
          videoFile: file,
          previewUrl: URL.createObjectURL(file),
          originalFps: null,
          isProbing: false,
          quality: 80,
          enableCrop: false,
          startTime: 0,
          endTime: 5,
          fps: '15'
        });
      }
    });
    e.target.value = null;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Gif style={{width: "32px", height: "32px", fill: "url(#accent-grad)"}} />
        <h1>Video to GIF & Video Trimmer</h1>
      </div>
      <p>Convert videos to high-quality GIFs or trim MP4 video clips offline with a visual timeline trimmer and loop preview player.</p>
      
      {!isFfmpegLoaded && (
        <div className="glass-panel" style={{marginBottom: '1rem', background: 'var(--accent-transparent)', border: '1px solid var(--accent-color)'}}>
          <div className="loader" style={{width: '16px', height: '16px', marginRight: '10px'}}></div>
          Loading FFmpeg engine globally...
        </div>
      )}

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))', gap: '2rem', alignItems: 'start' }}>
        {slots.map(slot => (
          <VideoToGifSlot key={slot.id} slot={slot} />
        ))}

        <div className="glass-panel controls" style={{ borderStyle: 'dashed', borderColor: 'var(--border-color)', borderWidth: '2px', background: 'transparent' }}>
          <Dropzone 
            onDrop={(files) => {
              const fileList = Array.isArray(files) ? files : [files];
              fileList.forEach(file => {
                if (file && file.type.startsWith('video/')) {
                  const slotId = `${TOOL_ID}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                  addSlot(TOOL_ID, {
                    id: slotId,
                    videoFile: file,
                    previewUrl: URL.createObjectURL(file),
                    originalFps: null,
                    isProbing: false,
                    quality: 80,
                    enableCrop: false,
                    startTime: 0,
                    endTime: 5,
                    fps: '15'
                  });
                }
              });
            }}
            accept="video/*"
            title={slots.length > 0 ? "Add another video" : "Upload Video"}
            subtitle="Drag & drop or click to select"
            icon={<UploadCloud style={{width: 48, height: 48, color: 'var(--text-secondary)'}}/>}
          />
        </div>
      </div>
    </div>
  );
}
