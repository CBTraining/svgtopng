import { useState, useEffect, useRef } from 'react';
import { SparklesIcon as ImageMinus, XMarkIcon as XMark } from '@heroicons/react/24/solid';
import { CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/outline';
import Dropzone from '../components/Dropzone';
import { removeBackground } from '@imgly/background-removal';
import { useProcessing } from '../contexts/ProcessingContext';

const TOOL_ID = 'bg-remove';

function CanvasEditor({ originalUrl, resultUrl, fileName, onDiscard }) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('erase'); // 'erase' or 'restore'
  const [brushSize, setBrushSize] = useState(40);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [pattern, setPattern] = useState(null);
  
  useEffect(() => {
    const img = new Image();
    img.src = originalUrl;
    img.onload = () => setOriginalImage(img);
  }, [originalUrl]);

  useEffect(() => {
    if (!resultUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    const img = new Image();
    img.src = resultUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  }, [resultUrl]);

  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    setPattern(ctx.createPattern(originalImage, 'no-repeat'));
  }, [originalImage]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    draw(e); 
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = pattern || 'rgba(0,0,0,1)';
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath(); // reset path
    }
  };
  
  const handleDownload = () => {
     const link = document.createElement('a');
     // Use the original filename without the extension, or fallback to timestamp
     const name = fileName ? fileName.replace(/\.[^/.]+$/, "") : Date.now();
     link.download = `nobg-edited-${name}.png`;
     link.href = canvasRef.current.toDataURL('image/png');
     link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
       <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: 'var(--border-radius-sm)' }}>
             <button 
                className={`btn ${mode === 'erase' ? 'btn-primary' : ''}`}
                onClick={() => setMode('erase')}
                style={{ padding: '0.5rem 1rem' }}
             >Erase</button>
             <button 
                className={`btn ${mode === 'restore' ? 'btn-primary' : ''}`}
                onClick={() => setMode('restore')}
                style={{ padding: '0.5rem 1rem' }}
             >Restore</button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Brush Size</span>
             <input 
                type="range" 
                min="5" 
                max="200" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                style={{ flex: 1 }}
             />
          </div>
       </div>

       <div 
         style={{ 
           width: '100%', 
           overflow: 'hidden',
           background: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'><rect width=\'10\' height=\'10\' fill=\'%23ddd\'/><rect x=\'10\' y=\'10\' width=\'10\' height=\'10\' fill=\'%23ddd\'/><rect x=\'10\' width=\'10\' height=\'10\' fill=\'%23eee\'/><rect y=\'10\' width=\'10\' height=\'10\' fill=\'%23eee\'/></svg>")',
           borderRadius: 'var(--border-radius-sm)',
           border: '1px solid var(--border-color)',
           touchAction: 'none'
         }}
       >
         <canvas 
           ref={canvasRef}
           onPointerDown={startDrawing}
           onPointerMove={draw}
           onPointerUp={stopDrawing}
           onPointerOut={stopDrawing}
           style={{ 
             maxWidth: '100%', 
             maxHeight: '60vh', 
             objectFit: 'contain', 
             display: 'block', 
             margin: '0 auto',
             cursor: 'crosshair'
           }}
         />
       </div>

       <div className="button-group" style={{marginTop: '0.5rem'}}>
         <button onClick={handleDownload} className="btn btn-primary">
            <Download style={{width: "18px", height: "18px"}} /> Download HD
         </button>
         <button className="btn" onClick={onDiscard}>
            Discard Result
         </button>
       </div>
    </div>
  );
}

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
        device: "gpu", // Prioritize WebGL/WebGPU hardware acceleration
        progress: (key, current, total) => {
          if (total > 0) {
            updateJob(myJobId, { progress: (current / total) * 100, log: `Processing ${key}...` });
          }
        }
      };

      const imageBlob = await removeBackground(imageFile, config);
      const rUrl = URL.createObjectURL(imageBlob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, downloadName: `nobg-${Date.now()}.png` });
    } catch (error) {
      console.error(error);
      updateJob(myJobId, { status: 'error', error: error.message });
    }
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
         <img src={previewUrl} alt="Original" style={{maxWidth: '100%', width: '100%', minHeight: '150px', maxHeight: '50vh', objectFit: 'contain', borderRadius: 'var(--border-radius-sm)', display: 'block', margin: '0 auto'}} />
         
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
           <h3 style={{marginTop: 0, marginBottom: '1rem'}}>Edit Result</h3>
           <CanvasEditor 
             originalUrl={previewUrl} 
             resultUrl={resultUrl} 
             fileName={imageFile?.name} 
             onDiscard={() => removeJob(myJobId)} 
           />
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
      
      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))', gap: '2rem', alignItems: 'start' }}>
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
