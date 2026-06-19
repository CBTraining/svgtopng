import { useState, useEffect } from 'react';
import { SparklesIcon as ImageMinus, XMarkIcon as XMark } from '@heroicons/react/24/solid';
import { CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/outline';
import Dropzone from '../components/Dropzone';
import { removeBackground } from '@imgly/background-removal';
import { useProcessing } from '../contexts/ProcessingContext';

const TOOL_ID = 'bg-remove';

function BackgroundRemoverSlot({ slot }) {
  const { jobs, addJob, updateJob, removeJob, removeSlot } = useProcessing();

  const myJobId = slot.id;
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

  const { imageFile, previewUrl } = slot;

  const processImage = async () => {
    if (!imageFile || isProcessing) return;
    
    addJob({ id: myJobId, title: 'Removing Background', type: 'bg-remove' });

    try {
      const config = {
        progress: (key, current, total) => {
          if (total > 0) {
            updateJob(myJobId, { progress: (current / total) * 100, log: `Processing ${key}...` });
          }
        }
      };

      const imageBlob = await removeBackground(imageFile, config);
      const rUrl = URL.createObjectURL(imageBlob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, downloadName: `nobg-${Date.now()}.png` });
    } catch (err) {
      console.error(err);
      updateJob(myJobId, { status: 'error', error: err.message });
      alert("Failed to remove background. Please try a different image.");
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

      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
         <img src={previewUrl} alt="Original" style={{maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: 'var(--border-radius-sm)', display: 'block', margin: '0 auto'}} />
         
         {!isProcessing && !resultUrl && (
           <button className="btn btn-primary" onClick={processImage} style={{width: '100%'}}>
             Remove Background
           </button>
         )}
         
         {isProcessing && (
           <div style={{marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
             AI is analyzing and removing background...
           </div>
         )}
      </div>

      {resultUrl && (
        <div className="glass-panel preview-panel" style={{marginTop: '1.5rem', background: 'var(--bg-tertiary)'}}>
           <h3 style={{marginTop: 0}}>Result</h3>
           <div className="canvas-container">
              <img src={resultUrl} alt="No Background" style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
           </div>
           <div className="button-group" style={{marginTop: '1rem'}}>
             <a href={resultUrl} download={`nobg-${imageFile.name}.png`} className="btn btn-primary">
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

export default function BackgroundRemover() {
  const { workspaces, addSlot } = useProcessing();
  const slots = workspaces[TOOL_ID] || [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <ImageMinus style={{width: 32, height: 32, fill: "url(#accent-grad)"}}/>
        <h1>Background Remover</h1>
      </div>
      <p>Remove backgrounds from images locally using on-device AI. 100% private.</p>
      
      <div className="grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {slots.map(slot => (
          <BackgroundRemoverSlot key={slot.id} slot={slot} />
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
