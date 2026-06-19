import { useState, useEffect, useRef } from 'react';
import { XMarkIcon as XMark } from '@heroicons/react/24/solid';
import { SparklesIcon, ArrowDownTrayIcon as Download, CloudArrowUpIcon as UploadCloud } from '@heroicons/react/24/outline';
import Dropzone from '../components/Dropzone';
import { useProcessing } from '../contexts/ProcessingContext';

const TOOL_ID = 'ai-upscaler';

function UpscalerSlot({ slot }) {
  const { jobs, addJob, updateJob, removeJob, removeSlot } = useProcessing();
  const workerRef = useRef(null);

  const myJobId = slot.id;
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

  const { imageFile, previewUrl } = slot;
  const [resolution, setResolution] = useState(null);

  useEffect(() => {
    if (previewUrl && !resolution) {
      const img = new Image();
      img.onload = () => {
        setResolution({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = previewUrl;
    }
  }, [previewUrl, resolution]);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/upscalerWorker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onerror = (err) => {
      console.error('Worker initialization or runtime error:', err);
      updateJob(myJobId, { status: 'error', error: 'Worker crashed: ' + err.message });
      alert("Worker failed: " + err.message);
    };

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

      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
         <div style={{ position: 'relative', minHeight: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <img src={previewUrl} alt="Original" style={{maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: 'var(--border-radius-sm)', display: 'block', margin: '0 auto', filter: isProcessing ? 'blur(4px) brightness(0.7)' : 'none' }} />
           {isProcessing && (
             <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
               <div className="spinner"></div>
               <span style={{ background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center' }}>
                 {myJob?.log || 'Processing...'}
               </span>
             </div>
           )}
         </div>
         
         {!isProcessing && !resultUrl && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
             {resolution && (
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                 Original: {resolution.width} x {resolution.height}px<br/>
                 <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Upscaled: {resolution.width * 2} x {resolution.height * 2}px</span>
               </div>
             )}
             <button className="btn btn-primary" onClick={processImage} style={{width: '100%'}}>
               Upscale 2x
             </button>
           </div>
         )}
      </div>

      {resultUrl && (
        <div className="glass-panel preview-panel" style={{marginTop: '1.5rem', background: 'var(--bg-tertiary)'}}>
           <h3 style={{marginTop: 0}}>Result ({resolution ? `${resolution.width * 2}x${resolution.height * 2}` : '2x'})</h3>
           <div className="canvas-container">
              <img src={resultUrl} alt="Upscaled" style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
           </div>
           <div className="button-group" style={{marginTop: '1rem'}}>
             <a href={resultUrl} download={`upscaled-${imageFile.name}.png`} className="btn btn-primary">
                <Download style={{width: "18px", height: "18px"}} /> Download HD
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

export default function ImageUpscaler() {
  const { workspaces, addSlot } = useProcessing();
  const slots = workspaces[TOOL_ID] || [];

  return (
    <div className="tool-page page-container animate-fade-in">
      <div className="page-header">
        <SparklesIcon style={{width: 32, height: 32, color: 'var(--accent-color)'}}/>
        <h1>Upscaler</h1>
      </div>
      <p style={{marginBottom: '2rem'}}>Enhance and upscale images 2x directly in your browser using local AI (Free & Offline).</p>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {slots.map(slot => (
          <UpscalerSlot key={slot.id} slot={slot} />
        ))}

        <div className="glass-panel controls" style={{ borderStyle: 'dashed', borderColor: 'var(--border-color)', borderWidth: '2px', background: 'transparent' }}>
          <Dropzone 
            onDrop={(files) => {
              const fileList = Array.isArray(files) ? files : [files];
              fileList.forEach(file => {
                if (file && file.type.startsWith('image/')) {
                  const slotId = `${TOOL_ID}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                  addSlot(TOOL_ID, {
                    id: slotId,
                    imageFile: file,
                    previewUrl: URL.createObjectURL(file)
                  });
                }
              });
            }} 
            accept="image/*" 
            title={slots.length > 0 ? "Add another image" : "Upload Image"}
            subtitle="Drop a JPG or PNG here"
            icon={<UploadCloud style={{width: 48, height: 48, color: 'var(--text-secondary)'}}/>}
          />
        </div>
      </div>
    </div>
  );
}
