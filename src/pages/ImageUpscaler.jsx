import { useState, useEffect, useRef } from 'react';
import { XMarkIcon as XMark } from '@heroicons/react/24/solid';
import { SparklesIcon, ArrowDownTrayIcon as Download } from '@heroicons/react/24/outline';
import Dropzone from '../components/Dropzone';
import { useProcessing } from '../contexts/ProcessingContext';
import './ImageUpscaler.css';

const TOOL_ID = 'ai-upscaler';

function UpscalerSlot({ slot }) {
  const { jobs, addJob, updateJob, removeJob, removeSlot } = useProcessing();
  const workerRef = useRef(null);

  const myJobId = slot.id;
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

  const { imageFile, previewUrl } = slot;

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/upscalerWorker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (event) => {
      const { jobId, status, progressData, log, resultUrl, error } = event.data;
      if (jobId !== myJobId) return;

      if (status === 'init') {
        updateJob(myJobId, { log });
      } else if (status === 'progress') {
        if (progressData && progressData.status === 'downloading') {
           // Downloading models
           // transformers.js progress object: { name, file, progress, status }
           updateJob(myJobId, { 
               log: `Downloading AI Model (${progressData.file || 'weights'}): ${Math.round(progressData.progress || 0)}%` 
           });
        }
      } else if (status === 'processing') {
        updateJob(myJobId, { log });
      } else if (status === 'success') {
        updateJob(myJobId, { status: 'success', resultUrl, downloadName: `upscaled-${Date.now()}.png` });
      } else if (status === 'error') {
        updateJob(myJobId, { status: 'error', error });
        alert("Failed to upscale image. Please try again.");
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [myJobId, updateJob]);

  const processImage = async () => {
    if (!imageFile || isProcessing) return;
    
    addJob({ id: myJobId, title: 'Upscaling Image', type: 'ai-upscaler' });

    workerRef.current.postMessage({
      jobId: myJobId,
      imageBlobUrl: previewUrl
    });
  };

  const [isClosing, setIsClosing] = useState(false);
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => removeSlot(TOOL_ID, slot.id), 200);
  };

  return (
    <div className={`glass-panel controls animate-pop-in ${isClosing ? 'animate-pop-out' : ''}`} style={{ position: 'relative', marginBottom: '2rem' }}>
      <button 
        onClick={handleClose} 
        style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '50%', padding: '0.25rem', cursor: 'pointer', zIndex: 10 }}
        title="Close Slot"
      >
        <XMark style={{ width: 20, height: 20, color: 'var(--text-secondary)' }} />
      </button>

      <div className="upscaler-workspace">
         <div className="upscaler-canvas glass-panel">
           {resultUrl ? (
             <img src={resultUrl} alt="Upscaled" className="upscaler-preview-image" />
           ) : (
             <img src={previewUrl} alt="Original" className="upscaler-preview-image" style={{ filter: isProcessing ? 'blur(4px) brightness(0.7)' : 'none' }} />
           )}
           
           {isProcessing && (
             <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
               <div className="spinner"></div>
               <span style={{ background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'white', fontWeight: 'bold' }}>
                 {myJob?.log || 'Processing...'}
               </span>
             </div>
           )}
         </div>
         
         <div className="upscaler-controls glass-panel">
            <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <SparklesIcon style={{width: 20, height: 20, color: 'var(--accent-color)'}}/> 
              AI Upscaler
            </h3>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem'}}>
              Boost image resolution by 2x using the local Swin2SR AI model running entirely in your browser.
            </p>

            {!isProcessing && !resultUrl && (
              <button className="upscaler-download-btn" onClick={processImage}>
                Upscale 2x
              </button>
            )}
            
            {resultUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <a href={resultUrl} download={`upscaled-${imageFile.name}.png`} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontWeight: 'bold' }}>
                   <Download style={{width: "20px", height: "20px"}} /> Download HD
                </a>
                <button className="btn" onClick={() => removeJob(myJobId)}>
                   Discard Result
                </button>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}

export default function ImageUpscaler() {
  const { workspaces, addSlot } = useProcessing();
  const slots = workspaces[TOOL_ID] || [];

  return (
    <div className="tool-page page-container animate-fade-in">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="tool-icon-wrapper">
            <SparklesIcon className="tool-icon" />
          </div>
          <div>
            <h1>Upscaler</h1>
            <p className="subtitle">Enhance and upscale images 2x directly in your browser using local AI (Free & Offline).</p>
          </div>
        </div>
      </header>

      {slots.map(slot => (
        <UpscalerSlot key={slot.id} slot={slot} />
      ))}

      <div style={{ marginTop: slots.length > 0 ? '2rem' : '0' }}>
        <Dropzone 
          onDrop={(files) => {
            files.forEach(file => {
              if (file.type.startsWith('image/')) {
                addSlot(TOOL_ID, file);
              }
            });
          }} 
          accept="image/*" 
          title="Drop images to upscale..."
        />
      </div>
    </div>
  );
}
