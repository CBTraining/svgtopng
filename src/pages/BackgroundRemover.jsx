import { useState, useEffect, useRef } from 'react';
import { SparklesIcon as ImageMinus, XMarkIcon as XMark } from '@heroicons/react/24/solid';
import { CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/outline';
import Dropzone from '../components/Dropzone';
import { removeBackground } from '@imgly/background-removal';
import { useProcessing } from '../contexts/ProcessingContext';

const TOOL_ID = 'bg-remove';

function CanvasEditor({ originalUrl, resultUrl, fileName, onDiscard }) {
  const canvasRef = useRef(null);
  const [editorTab, setEditorTab] = useState('brush'); // 'brush' or 'colorkey'

  // Brush states
  const [mode, setMode] = useState('erase'); // 'erase' or 'restore'
  const [brushSize, setBrushSize] = useState(40);
  const [overlayOpacity, setOverlayOpacity] = useState(0.3);

  // Color Key states
  const [baseImageData, setBaseImageData] = useState(null);
  const [sampledColors, setSampledColors] = useState([]);
  const [tolerance, setTolerance] = useState(10);
  const [feather, setFeather] = useState(5);
  
  // Line drawing and sampling states
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [strokePath, setStrokePath] = useState([]);
  const [preStrokeImageData, setPreStrokeImageData] = useState(null);
  const [tempStrokeColors, setTempStrokeColors] = useState([]);

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
      
      // Capture base image data if we are already in colorkey tab
      if (editorTab === 'colorkey') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setBaseImageData(imgData);
        setSampledColors([]);
      }
    };
  }, [resultUrl]);

  // Capture canvas state as baseImageData whenever switching to colorkey tab
  useEffect(() => {
    if (editorTab === 'colorkey' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setBaseImageData(imgData);
      setSampledColors([]);
    }
  }, [editorTab]);

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

  const handleCanvasPointerDown = (e) => {
    if (e.cancelable) e.preventDefault();
    
    if (editorTab === 'colorkey') {
      if (!canvasRef.current || !baseImageData) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      setIsDrawingLine(true);
      const coords = getCanvasCoords(e);
      
      // Save canvas state before drawing the yellow line
      const currentImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setPreStrokeImageData(currentImgData);
      
      const newPath = [coords];
      setStrokePath(newPath);
      
      const tempColors = [];
      sampleColorsAlongLine(coords.x, coords.y, coords.x, coords.y, baseImageData.data, baseImageData.width, baseImageData.height, tempColors);
      setTempStrokeColors(tempColors);
    } else {
      setIsDrawing(true);
      const { x, y } = getCanvasCoords(e);
      const ctx = canvasRef.current.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
      draw(e); 
    }
  };

  const handleCanvasPointerMove = (e) => {
    if (editorTab === 'colorkey') {
      if (!isDrawingLine || !canvasRef.current || !preStrokeImageData || !baseImageData) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const coords = getCanvasCoords(e);
      
      const lastPoint = strokePath[strokePath.length - 1];
      const newPath = [...strokePath, coords];
      setStrokePath(newPath);
      
      // Restore canvas state to clear previous line
      ctx.putImageData(preStrokeImageData, 0, 0);
      
      // Draw yellow freehand stroke preview
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#f59e0b'; // Amber/yellow color
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      
      ctx.beginPath();
      ctx.moveTo(newPath[0].x, newPath[0].y);
      for (let i = 1; i < newPath.length; i++) {
        ctx.lineTo(newPath[i].x, newPath[i].y);
      }
      ctx.stroke();
      ctx.restore();
      
      // Sample unique colors along this new segment
      const updatedColors = [...tempStrokeColors];
      sampleColorsAlongLine(
        lastPoint.x, lastPoint.y,
        coords.x, coords.y,
        baseImageData.data,
        baseImageData.width,
        baseImageData.height,
        updatedColors
      );
      setTempStrokeColors(updatedColors);
    } else {
      draw(e);
    }
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
    if (editorTab === 'colorkey') {
      if (isDrawingLine) {
        setIsDrawingLine(false);
        // Remove yellow line preview
        if (canvasRef.current && preStrokeImageData) {
          const ctx = canvasRef.current.getContext('2d');
          ctx.putImageData(preStrokeImageData, 0, 0);
        }
        
        // Merge temp stroke colors into global list
        if (tempStrokeColors.length > 0) {
          setSampledColors(prev => {
            const combined = [...prev];
            tempStrokeColors.forEach(c => {
              const threshold = 8;
              const exists = combined.some(existing => 
                Math.abs(existing.r - c.r) < threshold &&
                Math.abs(existing.g - c.g) < threshold &&
                Math.abs(existing.b - c.b) < threshold
              );
              if (!exists) {
                combined.push(c);
              }
            });
            return combined;
          });
        }
        
        setStrokePath([]);
        setPreStrokeImageData(null);
      }
    } else {
      setIsDrawing(false);
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx.beginPath(); // reset path
      }
    }
  };

  const sampleColorsAlongLine = (x0, y0, x1, y1, baseData, width, height, colorsList) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy);
    
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        const r = baseData[idx];
        const g = baseData[idx+1];
        const b = baseData[idx+2];
        const a = baseData[idx+3];
        if (a > 0) {
          // Check if color is already in list
          const threshold = 8;
          const isDuplicate = colorsList.some(c => 
            Math.abs(c.r - r) < threshold && 
            Math.abs(c.g - g) < threshold && 
            Math.abs(c.b - b) < threshold
          );
          if (!isDuplicate) {
            colorsList.push({ r, g, b });
          }
        }
      }
    }
  };

  const applyChromaKey = (baseImgData, colors, tol, feat) => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImgData) return;
    const ctx = canvas.getContext('2d');
    
    if (colors.length === 0) {
      // If no colors are selected, just restore the base state
      ctx.putImageData(baseImgData, 0, 0);
      return;
    }
    
    // Copy base image data to prevent mutating the original reference
    const imgData = new ImageData(
      new Uint8ClampedArray(baseImgData.data),
      baseImgData.width,
      baseImgData.height
    );
    const data = imgData.data;
    
    const maxDist = 441.67;
    const tolVal = (tol / 100) * maxDist;
    const featherVal = (feat / 100) * maxDist;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      const a = data[i+3];
      
      if (a === 0) continue;
      
      // Calculate minimum Euclidean distance to any sampled color
      let minDistance = Infinity;
      for (let j = 0; j < colors.length; j++) {
        const c = colors[j];
        const dist = Math.sqrt(
          (r - c.r) ** 2 + 
          (g - c.g) ** 2 + 
          (b - c.b) ** 2
        );
        if (dist < minDistance) {
          minDistance = dist;
        }
      }
      
      if (minDistance < tolVal) {
        data[i+3] = 0;
      } else if (featherVal > 0 && minDistance < tolVal + featherVal) {
        const ratio = (minDistance - tolVal) / featherVal;
        const newAlpha = Math.round(ratio * a);
        data[i+3] = Math.min(data[i+3], newAlpha);
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
  };

  // Run Chroma Key automatically when parameters or selection updates
  useEffect(() => {
    if (editorTab === 'colorkey' && baseImageData) {
      applyChromaKey(baseImageData, sampledColors, tolerance, feather);
    }
  }, [tolerance, feather, sampledColors, baseImageData, editorTab]);

  const handleClearChromaSelection = () => {
    setSampledColors([]);
    if (canvasRef.current && baseImageData) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.putImageData(baseImageData, 0, 0);
    }
  };

  const handleRestoreAll = () => {
    if (!originalImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(originalImage, 0, 0);
    ctx.restore();
    
    // If in colorkey tab, update baseImageData
    if (editorTab === 'colorkey') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setBaseImageData(imgData);
      setSampledColors([]);
    }
  };

  const handleClearAll = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // If in colorkey tab, update baseImageData
    if (editorTab === 'colorkey') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setBaseImageData(imgData);
      setSampledColors([]);
    }
  };

  const handleResetCanvas = () => {
    if (!resultUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = resultUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // If in colorkey tab, update baseImageData
      if (editorTab === 'colorkey') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setBaseImageData(imgData);
        setSampledColors([]);
      }
    };
  };
  
  const handleDownload = () => {
     const link = document.createElement('a');
     const name = fileName ? fileName.replace(/\.[^/.]+$/, "") : Date.now();
     link.download = `nobg-edited-${name}.png`;
     link.href = canvasRef.current.toDataURL('image/png');
     link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
       {/* Tab controls */}
       <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button 
             className={`btn ${editorTab === 'brush' ? 'btn-primary' : ''}`}
             onClick={() => setEditorTab('brush')}
             style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
          >Refine Brush</button>
          <button 
             className={`btn ${editorTab === 'colorkey' ? 'btn-primary' : ''}`}
             onClick={() => setEditorTab('colorkey')}
             style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
          >Color Key (Solid)</button>
       </div>

       {editorTab === 'brush' ? (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: 'var(--border-radius-sm)' }}>
                  <button 
                     className={`btn ${mode === 'erase' ? 'btn-primary' : ''}`}
                     onClick={() => setMode('erase')}
                     style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                  >Erase</button>
                  <button 
                     className={`btn ${mode === 'restore' ? 'btn-primary' : ''}`}
                     onClick={() => setMode('restore')}
                     style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                  >Restore</button>
               </div>

               <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                     className="btn"
                     onClick={handleRestoreAll}
                     style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                     title="Restore all original pixels"
                  >Restore All</button>
                  <button 
                     className="btn"
                     onClick={handleClearAll}
                     style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', color: 'var(--danger-color)' }}
                     title="Make entire image transparent"
                  >Clear All</button>
                </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Brush Size: {brushSize}px</span>
                  <input 
                     type="range" 
                     min="5" 
                     max="200" 
                     value={brushSize} 
                     onChange={(e) => setBrushSize(parseInt(e.target.value))}
                     style={{ flex: 1 }}
                  />
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Guide Opacity: {Math.round(overlayOpacity * 100)}%</span>
                  <input 
                     type="range" 
                     min="0" 
                     max="100" 
                     value={Math.round(overlayOpacity * 100)} 
                     onChange={(e) => setOverlayOpacity(parseFloat(e.target.value) / 100)}
                     style={{ flex: 1 }}
                  />
               </div>
            </div>
         </div>
       ) : (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                     Sampled colors: {sampledColors.length}
                  </span>
                  {sampledColors.length > 0 && (
                    <button 
                       className="btn" 
                       onClick={handleClearChromaSelection}
                       style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger-color)' }}
                    >Clear Stroke</button>
                  )}
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '130px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Tolerance: {tolerance}%</span>
                  <input 
                     type="range" 
                     min="0" 
                     max="100" 
                     value={tolerance} 
                     onChange={(e) => setTolerance(parseInt(e.target.value))}
                     style={{ flex: 1 }}
                  />
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '130px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Feather: {feather}%</span>
                  <input 
                     type="range" 
                     min="0" 
                     max="100" 
                     value={feather} 
                     onChange={(e) => setFeather(parseInt(e.target.value))}
                     style={{ flex: 1 }}
                  />
               </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
               Tip: Draw one or more lines directly on the image to select background colors to remove (Resolve-style 3D Keyer).
            </div>
         </div>
       )}

       <div 
         style={{ 
           width: '100%', 
           overflow: 'hidden',
           background: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'><rect width=\'10\' height=\'10\' fill=\'%23ddd\'/><rect x=\'10\' y=\'10\' width=\'10\' height=\'10\' fill=\'%23ddd\'/><rect x=\'10\' width=\'10\' height=\'10\' fill=\'%23eee\'/><rect y=\'10\' width=\'10\' height=\'10\' fill=\'%23eee\'/></svg>")',
           borderRadius: 'var(--border-radius-sm)',
           border: '1px solid var(--border-color)',
           touchAction: 'none',
           position: 'relative'
         }}
       >
         {originalImage && (
           <img 
             src={originalUrl} 
             alt="Guide Overlay" 
             style={{
               position: 'absolute',
               top: '50%',
               left: '50%',
               transform: 'translate(-50%, -50%)',
               maxWidth: '100%',
               maxHeight: '60vh',
               width: 'auto',
               height: 'auto',
               objectFit: 'contain',
               pointerEvents: 'none',
               opacity: overlayOpacity,
               zIndex: 1,
               display: 'block'
             }}
           />
         )}
         <canvas 
           ref={canvasRef}
           onPointerDown={handleCanvasPointerDown}
           onPointerMove={handleCanvasPointerMove}
           onPointerUp={stopDrawing}
           onPointerOut={stopDrawing}
           style={{ 
             maxWidth: '100%', 
             maxHeight: '60vh', 
             objectFit: 'contain', 
             display: 'block', 
             margin: '0 auto',
             cursor: 'crosshair',
             position: 'relative',
             zIndex: 2
           }}
         />
       </div>

       <div className="button-group" style={{marginTop: '0.5rem'}}>
         <button onClick={handleDownload} className="btn btn-primary">
            <Download style={{width: "18px", height: "18px"}} /> Download HD
         </button>
         <button className="btn" onClick={handleResetCanvas}>
            Reset Changes
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
  const [modelVariant, setModelVariant] = useState('isnet_fp16');
  const [removalMethod, setRemovalMethod] = useState('ai'); // 'ai' or 'chromakey'

  const myJobId = slot.id;
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

  const { imageFile, previewUrl } = slot;

  const processImage = async () => {
    if (!imageFile || isProcessing) return;
    
    if (removalMethod === 'chromakey') {
      // Instant success using original image, we skip AI inference
      addJob({ id: myJobId, title: 'Opening Color Key Editor', type: 'bg-remove' });
      updateJob(myJobId, { status: 'success', resultUrl: previewUrl, downloadName: `nobg-${Date.now()}.png` });
      return;
    }

    addJob({ id: myJobId, title: 'Removing Background', type: 'bg-remove' });

    try {
      const config = {
        device: "gpu", // Prioritize WebGL/WebGPU hardware acceleration
        model: modelVariant,
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
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
             <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: 'var(--border-radius-sm)' }}>
                <button 
                   className={`btn ${removalMethod === 'ai' ? 'btn-primary' : ''}`}
                   onClick={() => setRemovalMethod('ai')}
                   style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                >AI Model</button>
                <button 
                   className={`btn ${removalMethod === 'chromakey' ? 'btn-primary' : ''}`}
                   onClick={() => setRemovalMethod('chromakey')}
                   style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                >Color Key (Solid)</button>
             </div>

             {removalMethod === 'ai' ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Model Quality Variant:</label>
                  <select 
                    className="input-field"
                    value={modelVariant}
                    onChange={(e) => setModelVariant(e.target.value)}
                    style={{ padding: '0.5rem', cursor: 'pointer' }}
                  >
                    <option value="isnet_fp16">Balanced (isnet_fp16 - GPU)</option>
                    <option value="isnet">High Precision (isnet - Full Size)</option>
                    <option value="isnet_quint8">Fast / Lightweight (isnet_quint8 - Quantized)</option>
                  </select>
               </div>
             ) : (
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.25rem' }}>
                  Remove solid color backgrounds instantly.
               </div>
             )}

             <button className="btn btn-primary" onClick={processImage} style={{width: '100%'}}>
               {removalMethod === 'ai' ? 'Remove Background' : 'Open Editor'}
             </button>
           </div>
         )}
         
         {isProcessing && (
           <div style={{marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
             Analyzing and processing image...
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
