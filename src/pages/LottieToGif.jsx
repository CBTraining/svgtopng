import { useState, useRef, useEffect } from 'react';
import { ScissorsIcon as Scissors, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download, XMarkIcon as XMark } from '@heroicons/react/24/solid';
import Dropzone from '../components/Dropzone';
import lottie from 'lottie-web';
import GIF from 'gif.js';
import { useProcessing } from '../contexts/ProcessingContext';

const TOOL_ID = 'lottie-to-gif';

function LottieToGifSlot({ slot }) {
  const { jobs, addJob, updateJob, removeJob, removeSlot } = useProcessing();
  
  const myJobId = slot.id;
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

  const { lottieData, fileName } = slot;
  const containerRef = useRef(null);

  const handleConvert = async () => {
    if (!lottieData || isProcessing) return;
    
    addJob({ id: myJobId, title: 'Converting Lottie to GIF', type: 'lottie-to-gif' });

    // Create a temporary hidden container for canvas rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '300px';
    tempContainer.style.height = '300px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);

    const animItem = lottie.loadAnimation({
      container: tempContainer,
      renderer: 'canvas',
      loop: false,
      autoplay: false,
      animationData: lottieData,
    });

    await new Promise(resolve => animItem.addEventListener('DOMLoaded', resolve));

    const totalFrames = animItem.totalFrames;
    const frameRate = animItem.frameRate;
    const delay = 1000 / frameRate;

    const canvas = tempContainer.querySelector('canvas');
    
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: canvas.width,
      height: canvas.height,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
      transparent: 0x000000
    });

    gif.on('progress', p => {
      updateJob(myJobId, { progress: p * 100, log: `Rendering frame...` });
    });
    
    gif.on('finished', (blob) => {
      const rUrl = URL.createObjectURL(blob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, downloadName: `lottie-${Date.now()}.gif` });
      animItem.destroy();
      document.body.removeChild(tempContainer);
    });

    for (let i = 0; i < totalFrames; i++) {
      animItem.goToAndStop(i, true);
      gif.addFrame(canvas, { copy: true, delay });
    }

    gif.render();
  };

  // Re-render preview if we return to the page
  useEffect(() => {
    if (lottieData && containerRef.current) {
      containerRef.current.innerHTML = '';
      lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: lottieData,
      });
    }
  }, [lottieData]);

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
        <div className="glass-panel" style={{background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'center'}}>
          <div ref={containerRef} style={{ width: '200px', height: '200px' }}></div>
        </div>
        
        {!isProcessing && !resultUrl && (
          <button className="btn btn-primary" onClick={handleConvert} style={{marginTop: '1rem'}}>
            Convert to GIF
          </button>
        )}
        
        {isProcessing && (
          <div style={{marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            Processing in background... You can safely navigate to other tools!
          </div>
        )}
      </div>

      {resultUrl && (
        <div className="glass-panel preview-panel" style={{marginTop: '1.5rem', background: 'var(--bg-tertiary)'}}>
           <h3 style={{marginTop: 0}}>Result</h3>
           <div className="canvas-container" style={{background: 'var(--bg-tertiary)'}}>
              <img src={resultUrl} alt="GIF Result" style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
           </div>
           <div className="button-group" style={{marginTop: '1rem', justifyContent: 'center'}}>
             <a href={resultUrl} download={`lottie-${fileName}.gif`} className="btn btn-primary">
                <Download style={{width: "18px", height: "18px"}} /> Download GIF
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

export default function LottieToGif() {
  const { workspaces, addSlot } = useProcessing();
  const slots = workspaces[TOOL_ID] || [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Scissors style={{width: 32, height: 32, fill: "url(#accent-grad)"}}/>
        <h1>Lottie to GIF</h1>
      </div>
      <p>Convert your JSON Lottie animations to high-quality GIFs. Open multiple windows below!</p>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {slots.map(slot => (
          <LottieToGifSlot key={slot.id} slot={slot} />
        ))}

        <div className="glass-panel controls" style={{ borderStyle: 'dashed', borderColor: 'var(--border-color)', borderWidth: '2px', background: 'transparent' }}>
          <Dropzone 
            onDrop={(files) => {
              const fileList = Array.isArray(files) ? files : [files];
              fileList.forEach(file => {
                if (file && file.name.endsWith('.json')) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const json = JSON.parse(e.target.result);
                      const slotId = `${TOOL_ID}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                      addSlot(TOOL_ID, {
                        id: slotId,
                        lottieData: json,
                        fileName: file.name
                      });
                    } catch (err) {
                      alert("Invalid JSON file");
                    }
                  };
                  reader.readAsText(file);
                }
              });
            }}
            accept=".json"
            title={slots.length > 0 ? "Add another Lottie JSON" : "Upload Lottie JSON"}
            subtitle="Drag & drop or click to select"
            icon={<UploadCloud style={{width: 48, height: 48, color: 'var(--text-secondary)'}}/>}
          />
        </div>
      </div>
    </div>
  );
}
