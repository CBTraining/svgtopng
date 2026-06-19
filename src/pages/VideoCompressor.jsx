import { useState, useEffect } from 'react';
import { ArrowsPointingInIcon as Compress, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download, XMarkIcon as XMark } from '@heroicons/react/24/solid';
import Dropzone from '../components/Dropzone';
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

const TOOL_ID = 'video-compress';

function VideoCompressorSlot({ slot }) {
  const { jobs, addJob, updateJob, removeJob, ffmpeg, isFfmpegLoaded, updateSlot, removeSlot } = useProcessing();

  const myJobId = slot.id; // Job ID is exactly the slot ID!
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

  const { videoFile, previewUrl, originalFps, quality, preset, fps } = slot;

  // Estimation Logic
  const estimatedCrf = 38 - Math.round(((quality - 1) / 99) * 20);
  let estimatedSizeFactor = 0.1 + ((quality - 1) / 99) * 0.8;
  
  const presetMultipliers = {
    ultrafast: 1.8, superfast: 1.4, veryfast: 1.2,
    faster: 1.1, fast: 1.0, medium: 0.9, slow: 0.7
  };
  estimatedSizeFactor *= presetMultipliers[preset];
  
  if (fps !== 'original' && originalFps) {
    const targetFps = parseInt(fps);
    if (targetFps < originalFps) {
      estimatedSizeFactor *= (targetFps / originalFps);
    }
  }

  const estimatedSize = videoFile ? videoFile.size * estimatedSizeFactor : 0;

  // Initial Probe (runs once when slot is added if it hasn't been probed yet)
  useEffect(() => {
    if (isFfmpegLoaded && videoFile && originalFps === null && !slot.isProbing) {
      updateSlot(TOOL_ID, slot.id, { isProbing: true });
      const probeVideo = async () => {
         try {
             const inputName = 'probe_' + slot.id + '_' + videoFile.name.replace(/\s+/g, '_');
             await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
             let detectedFps = null;
             const logHandler = ({ message }) => {
                const match = message.match(/, ([\d.]+) fps,/);
                if (match) detectedFps = parseFloat(match[1]);
             };
             ffmpeg.on('log', logHandler);
             await ffmpeg.exec(['-i', inputName]);
             ffmpeg.off('log', logHandler);
             if (detectedFps) {
                 updateSlot(TOOL_ID, slot.id, { originalFps: Math.round(detectedFps) });
             } else {
                 updateSlot(TOOL_ID, slot.id, { originalFps: 30 }); // fallback
             }
         } catch(err) {
             console.error("Probe error", err);
             updateSlot(TOOL_ID, slot.id, { originalFps: 30 }); // fallback
         }
      };
      probeVideo();
    }
  }, [isFfmpegLoaded, videoFile, originalFps, slot.isProbing, slot.id, updateSlot, ffmpeg]);

  const processVideo = async () => {
    if (!videoFile || !isFfmpegLoaded || isProcessing) return;
    
    addJob({ id: myJobId, title: 'Compressing Video', type: 'video-compress' });

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
      const ext = videoFile.name.split('.').pop() || 'mp4';
      const inputName = `input_${slot.id}.${ext}`;
      
      // Write file to memory
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Compress Video
      let args = [
        '-y', 
        '-i', inputName, 
        '-vcodec', 'libx264', 
        '-crf', estimatedCrf.toString(), 
        '-preset', preset
      ];

      // Enforce FPS limit
      if (fps !== 'original') {
         let targetFps = parseInt(fps);
         if (originalFps && targetFps > originalFps) {
            targetFps = originalFps;
         }
         args.push('-r', targetFps.toString(), '-fpsmax', targetFps.toString());
      }

      const outputName = `output_${slot.id}.mp4`;
      args.push(outputName);

      const execResult = await ffmpeg.exec(args);
      
      if (execResult !== 0) {
        throw new Error(`FFmpeg exited with code ${execResult}. Last logs:\n${fullLog.substring(fullLog.length - 400)}`);
      }

      const data = await ffmpeg.readFile(outputName);
      if (data.length === 0) throw new Error("Generated video is 0 bytes");

      const blob = new Blob([data], { type: 'video/mp4' });
      const rUrl = URL.createObjectURL(blob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, downloadName: `compressed_${videoFile.name}` });
      playDing();
    } catch (err) {
      console.error(err);
      updateJob(myJobId, { status: 'error', error: err.message });
      alert("Failed to compress video:\n" + err.message);
    } finally {
      ffmpeg.off('log', logHandler);
      ffmpeg.off('progress', progressHandler);
    }
  };

  return (
    <div className="glass-panel controls" style={{ position: 'relative', marginBottom: '2rem' }}>
      <button 
        onClick={() => removeSlot(TOOL_ID, slot.id)} 
        style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '50%', padding: '0.25rem', cursor: 'pointer', zIndex: 10 }}
        title="Close Slot"
      >
        <XMark style={{ width: 20, height: 20, color: 'var(--text-secondary)' }} />
      </button>
      
      <video src={previewUrl} controls style={{width: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: 'var(--border-radius-sm)', background: '#000', marginBottom: '1rem'}} />
      
      {!isProcessing && !resultUrl && (
        <div style={{marginBottom: '1.5rem'}}>
          <div className="input-group" style={{marginBottom: '1rem'}}>
            <label style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
              <span>Quality</span>
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
          </div>

          <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
            <div className="input-group" style={{flex: '1 1 200px'}}>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Compression Speed</label>
              <select 
                value={preset} 
                onChange={(e) => updateSlot(TOOL_ID, slot.id, { preset: e.target.value })}
                style={{width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px'}}
              >
                <option value="ultrafast">Ultrafast (Largest File, Fastest)</option>
                <option value="superfast">Superfast</option>
                <option value="veryfast">Veryfast</option>
                <option value="faster">Faster</option>
                <option value="fast">Fast (Recommended)</option>
                <option value="medium">Medium</option>
                <option value="slow">Slow (Smallest File, Slowest)</option>
              </select>
            </div>

            <div className="input-group" style={{flex: '1 1 200px'}}>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Framerate (FPS)</label>
              <select 
                value={fps} 
                onChange={(e) => updateSlot(TOOL_ID, slot.id, { fps: e.target.value })}
                style={{width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px'}}
              >
                <option value="original">Original{originalFps ? ` (${originalFps}fps)` : ''}</option>
                {(!originalFps || originalFps >= 60) && <option value="60">60 FPS</option>}
                {(!originalFps || originalFps >= 30) && <option value="30">30 FPS</option>}
                {(!originalFps || originalFps >= 24) && <option value="24">24 FPS</option>}
                {(!originalFps || originalFps >= 15) && <option value="15">15 FPS</option>}
                {(!originalFps || originalFps >= 10) && <option value="10">10 FPS</option>}
              </select>
            </div>
          </div>

          <div style={{background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
              <span style={{color: 'var(--text-secondary)'}}>Original Size:</span>
              <span style={{fontWeight: 'bold'}}>{formatBytes(videoFile.size)}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: 'var(--text-secondary)'}}>Estimated Size:</span>
              <span style={{fontWeight: 'bold', color: 'var(--accent-color)'}}>~{formatBytes(estimatedSize)}</span>
            </div>
          </div>

          <div className="button-group">
            <button className="btn btn-primary" onClick={processVideo} disabled={!isFfmpegLoaded}>
              Compress Video
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
        <div className="result-container animate-fade-in" style={{marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)'}}>
          <h3 style={{marginTop: 0}}>Compressed Video</h3>
          <div className="button-group" style={{marginTop: '1rem'}}>
            <a href={resultUrl} download={`compressed_${videoFile.name}`} className="btn btn-primary">
              <Download style={{width: 20, height: 20}}/> Download
            </a>
            <button className="btn" onClick={() => removeJob(myJobId)}>
              Discard Result
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VideoCompressor() {
  const { isFfmpegLoaded, workspaces, addSlot } = useProcessing();
  
  const slots = workspaces[TOOL_ID] || [];

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file && file.type.startsWith('video/')) {
        const slotId = `video-compress-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        addSlot(TOOL_ID, {
          id: slotId,
          videoFile: file,
          previewUrl: URL.createObjectURL(file),
          originalFps: null,
          isProbing: false,
          quality: 50,
          preset: 'fast',
          fps: 'original'
        });
      }
    });
    // Reset file input so same file can be uploaded again if needed
    e.target.value = null;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Compress style={{width: 32, height: 32, fill: "url(#accent-grad)"}}/>
        <h1>Video Compressor</h1>
      </div>
      <p>Compress MP4 videos instantly, fully offline in your browser. Open multiple windows below!</p>
      
      {!isFfmpegLoaded && (
        <div className="glass-panel" style={{marginBottom: '1rem', background: 'var(--accent-transparent)', border: '1px solid var(--accent-color)'}}>
          <div className="loader" style={{width: '16px', height: '16px', marginRight: '10px'}}></div>
          Loading FFmpeg engine globally...
        </div>
      )}

      <div className="grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {slots.map(slot => (
          <VideoCompressorSlot key={slot.id} slot={slot} />
        ))}

        <div className="glass-panel controls" style={{ borderStyle: 'dashed', borderColor: 'var(--border-color)', borderWidth: '2px', background: 'transparent' }}>
          <Dropzone 
            onDrop={(files) => {
              const fileList = Array.isArray(files) ? files : [files];
              fileList.forEach(file => {
                if (file && file.type.startsWith('video/')) {
                  const slotId = `video-compress-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                  addSlot(TOOL_ID, {
                    id: slotId,
                    videoFile: file,
                    previewUrl: URL.createObjectURL(file),
                    originalFps: null,
                    isProbing: false,
                    quality: 50,
                    preset: 'fast',
                    fps: 'original'
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
