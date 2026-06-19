import { useState } from 'react';
import { ArrowsPointingInIcon as Compress, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/solid';
import Dropzone from '../components/Dropzone';
import { fetchFile } from '@ffmpeg/util';
import { playDing } from '../utils/audio';
import { useProcessing } from '../contexts/ProcessingContext';

export default function VideoCompressor() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  
  const { jobs, addJob, updateJob, removeJob, ffmpeg, isFfmpegLoaded } = useProcessing();

  const myJobId = 'video-compress';
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

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
      const inputName = `input.${ext}`;
      
      // Write file to memory
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Compress Video
      const execResult = await ffmpeg.exec(['-y', '-i', inputName, '-vcodec', 'libx264', '-crf', '28', '-preset', 'fast', 'output.mp4']);
      if (execResult !== 0) {
        throw new Error(`FFmpeg exited with code ${execResult}. Last logs:\n${fullLog.substring(fullLog.length - 400)}`);
      }

      const data = await ffmpeg.readFile('output.mp4');
      if (data.length === 0) throw new Error("Generated video is 0 bytes");

      const blob = new Blob([data], { type: 'video/mp4' });
      const rUrl = URL.createObjectURL(blob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, downloadName: 'compressed_video.mp4' });
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
    <div className="animate-fade-in">
      <div className="page-header">
        <Compress />
        <h1>Video Compressor</h1>
      </div>
      <p>Compress MP4 videos instantly, fully offline in your browser.</p>
      
      {!isFfmpegLoaded && (
        <div className="glass-panel" style={{marginBottom: '1rem', background: 'var(--accent-transparent)', border: '1px solid var(--accent-color)'}}>
          <div className="loader" style={{width: '16px', height: '16px', marginRight: '10px'}}></div>
          Loading FFmpeg engine globally...
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
                  // Clear previous job if any
                  if (myJob) removeJob(myJobId);
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
                  <button className="btn btn-primary" onClick={processVideo} disabled={!isFfmpegLoaded}>
                    Compress Video
                  </button>
                  <button className="btn" onClick={() => {setVideoSrc(null); setVideoFile(null);}}>
                    Cancel
                  </button>
                </div>
              )}

              {isProcessing && (
                <div style={{marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  Processing in background... You can safely navigate to other tools!
                </div>
              )}

              {resultUrl && (
                <div className="result-container animate-fade-in" style={{marginTop: '1.5rem'}}>
                  <h3>Compressed Video</h3>
                  <div className="button-group" style={{marginTop: '1rem'}}>
                    <a href={resultUrl} download="compressed_video.mp4" className="btn btn-primary">
                      <Download style={{width: 20, height: 20}}/> Download
                    </a>
                    <button className="btn" onClick={() => {setVideoSrc(null); setVideoFile(null); removeJob(myJobId);}}>
                      Compress Another
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
