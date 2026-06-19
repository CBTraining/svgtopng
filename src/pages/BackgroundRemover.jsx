import { useState } from 'react';
import { SparklesIcon as ImageMinus } from '@heroicons/react/24/solid';
import { CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/outline';
import Dropzone from '../components/Dropzone';
import { removeBackground } from '@imgly/background-removal';
import { useProcessing } from '../contexts/ProcessingContext';

export default function BackgroundRemover() {
  const [imageFile, setImageFile] = useState(null);
  const [originalSrc, setOriginalSrc] = useState(null);

  const { jobs, addJob, updateJob, removeJob } = useProcessing();
  const myJobId = 'bg-remove';
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setOriginalSrc(URL.createObjectURL(file));
      if (myJob) removeJob(myJobId);
    }
  };

  const processImage = async () => {
    if (!imageFile || isProcessing) return;
    
    addJob({ id: myJobId, title: 'Removing Background', type: 'bg-remove' });

    try {
      const config = {
        progress: (key, current, total) => {
          // Progress roughly goes through fetching model -> processing
          // `current` / `total` represents fetch progress.
          if (total) {
            updateJob(myJobId, { progress: 10 + (current / total) * 80, log: 'AI Model Processing...' });
          }
        }
      };

      const imageBlob = await removeBackground(imageFile, config);
      const rUrl = URL.createObjectURL(imageBlob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, downloadName: `nobg-${Date.now()}.png`, progress: 100 });
    } catch (err) {
      console.error(err);
      updateJob(myJobId, { status: 'error', error: 'Ensure you are connected to the internet on first run to download the model.' });
      alert('Error removing background. Ensure you are connected to the internet on first run to download the model.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <ImageMinus style={{width: 32, height: 32, fill: "url(#accent-grad)"}}/>
        <h1>Background Remover</h1>
      </div>
      <p>Remove backgrounds from images locally using an AI model right in your browser.</p>
      
      <div className="glass-panel" style={{marginBottom: '1rem', background: 'var(--accent-transparent)', border: '1px solid var(--accent-color)'}}>
        <strong>Note:</strong> The AI model (~40MB) will be downloaded to your browser on the first use. Subsequent uses will work offline!
      </div>

      <div className="grid-container">
        <div className="glass-panel controls">
          {!originalSrc ? (
            <Dropzone 
              onDrop={(file) => {
                if (file && file.type.startsWith('image/')) {
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onload = (e) => setOriginalSrc(e.target.result);
                  reader.readAsDataURL(file);
                  if (myJob) removeJob(myJobId);
                }
              }}
              title="Upload Image"
              subtitle="Select an image to remove its background"
              icon={<UploadCloud style={{width: 48, height: 48}}/>}
            />
          ) : (
            <div className="controls">
               <img src={originalSrc} alt="Original" style={{maxWidth: '100%', borderRadius: 'var(--border-radius-sm)'}} />
               
               {!isProcessing && !resultUrl && (
                 <button className="btn btn-primary" onClick={processImage}>
                   Remove Background
                 </button>
               )}

               {isProcessing && (
                 <div style={{marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                   Processing in background... You can safely navigate to other tools!
                 </div>
               )}

               {resultUrl && (
                 <div className="button-group" style={{marginTop: '1rem'}}>
                   <a className="btn btn-primary" href={resultUrl} download={`nobg-${Date.now()}.png`}>
                     <Download style={{width: "18px", height: "18px"}} /> Download Result
                   </a>
                   <button className="btn" onClick={() => {setOriginalSrc(null); setImageFile(null); removeJob(myJobId);}}>
                     Reset
                   </button>
                 </div>
               )}
            </div>
          )}
        </div>

        {resultUrl && (
          <div className="glass-panel preview-panel">
             <h3>Result</h3>
             <div className="canvas-container">
                <img src={resultUrl} alt="No Background" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
