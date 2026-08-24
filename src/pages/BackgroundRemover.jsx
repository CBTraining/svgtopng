import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SparklesIcon as ImageMinus, 
  XMarkIcon as XMark,
  ArrowPathIcon,
  CheckIcon,
  EyeIcon,
  PaintBrushIcon,
  AdjustmentsHorizontalIcon,
  SwatchIcon
} from '@heroicons/react/24/solid';
import { CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/outline';
import Dropzone from '../components/Dropzone';
import SendToDropdown from '../components/SendToDropdown';
import { removeBackground } from '@imgly/background-removal';
import { useProcessing } from '../contexts/ProcessingContext';

const TOOL_ID = 'bg-remove';

function CanvasEditor({ originalUrl, resultUrl, fileName, onDiscard }) {
  const canvasRef = useRef(null);
  const [editorTab, setEditorTab] = useState('refine'); // 'refine', 'backdrop', 'brush', 'colorkey'

  // Edge Refinement States
  const [edgeInset, setEdgeInset] = useState(0);       // -5px to +5px (Erode/Contract)
  const [edgeFeather, setEdgeFeather] = useState(0);   // 0px to 10px
  const [defringe, setDefringe] = useState(30);        // 0% to 100% (De-fringe halo reduction)

  // Backdrop States
  const [backdropType, setBackdropType] = useState('transparent'); // 'transparent', 'solid', 'gradient', 'bokeh'
  const [solidColor, setSolidColor] = useState('#ffffff');
  const [gradientPreset, setGradientPreset] = useState('studio'); // 'studio', 'tech', 'sunset', 'dark'
  const [bokehBlur, setBokehBlur] = useState(12);       // 0px to 30px Gaussian blur on original background

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
  const [rawCutoutImage, setRawCutoutImage] = useState(null);
  const [rawCutoutData, setRawCutoutData] = useState(null);
  const [originalData, setOriginalData] = useState(null);

  // Load original image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      setOriginalData(cx.getImageData(0, 0, img.width, img.height));
    };
    img.src = originalUrl;
  }, [originalUrl]);

  // Load raw cutout result
  useEffect(() => {
    if (!resultUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setRawCutoutImage(img);
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      const data = cx.getImageData(0, 0, img.width, img.height);
      setRawCutoutData(data);
      setBaseImageData(data);
    };
    img.src = resultUrl;
  }, [resultUrl]);

  // Render edge refinement and backdrops onto canvas
  const renderComposite = useCallback(() => {
    if (!rawCutoutImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = rawCutoutImage.width;
    const h = rawCutoutImage.height;

    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    // 1. Draw Backdrop if not transparent
    if (backdropType === 'solid') {
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, w, h);
    } else if (backdropType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      if (gradientPreset === 'studio') {
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(1, '#cbd5e1');
      } else if (gradientPreset === 'tech') {
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e3a8a');
      } else if (gradientPreset === 'sunset') {
        grad.addColorStop(0, '#ff7e5f');
        grad.addColorStop(1, '#feb47b');
      } else if (gradientPreset === 'dark') {
        grad.addColorStop(0, '#18181b');
        grad.addColorStop(1, '#09090b');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (backdropType === 'bokeh' && originalImage) {
      ctx.save();
      if (bokehBlur > 0) {
        ctx.filter = `blur(${bokehBlur}px)`;
      }
      ctx.drawImage(originalImage, 0, 0, w, h);
      ctx.restore();
    }

    // 2. Prepare Cutout with Edge Refinement (Erode & De-fringe)
    if (!rawCutoutData) {
      ctx.drawImage(rawCutoutImage, 0, 0);
      return;
    }

    const cutCanvas = document.createElement('canvas');
    cutCanvas.width = w;
    cutCanvas.height = h;
    const cutCtx = cutCanvas.getContext('2d', { willReadFrequently: true });
    
    // Copy base raw cutout data
    const outputData = cutCtx.createImageData(w, h);
    const src = rawCutoutData.data;
    const orig = originalData ? originalData.data : null;
    const dst = outputData.data;

    for (let i = 0; i < src.length; i++) dst[i] = src[i];

    // Morphological Erode / Inset (-5px to +5px)
    if (edgeInset < 0) {
      const radius = Math.abs(edgeInset);
      const rInt = Math.ceil(radius);
      const alphaCopy = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) alphaCopy[i] = src[i * 4 + 3];

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          const a = alphaCopy[idx];
          if (a > 0 && a < 255) {
            let minA = a;
            for (let dy = -rInt; dy <= rInt; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= h) continue;
              for (let dx = -rInt; dx <= rInt; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= w) continue;
                if (dx * dx + dy * dy <= radius * radius) {
                  const neighborA = alphaCopy[ny * w + nx];
                  if (neighborA < minA) minA = neighborA;
                }
              }
            }
            dst[idx * 4 + 3] = minA;
          }
        }
      }
    }

    // De-fringe / Anti-Halo (Remove background color bleed on edge pixels)
    if (defringe > 0 && orig) {
      const factor = defringe / 100;
      for (let i = 0; i < w * h; i++) {
        const pi = i * 4;
        const a = dst[pi + 3];
        if (a > 5 && a < 250) {
          const alphaFrac = a / 255;
          const desat = (dst[pi] + dst[pi + 1] + dst[pi + 2]) / 3;
          dst[pi] = Math.round(dst[pi] * (1 - factor * (1 - alphaFrac)) + desat * factor * (1 - alphaFrac));
          dst[pi + 1] = Math.round(dst[pi + 1] * (1 - factor * (1 - alphaFrac)) + desat * factor * (1 - alphaFrac));
          dst[pi + 2] = Math.round(dst[pi + 2] * (1 - factor * (1 - alphaFrac)) + desat * factor * (1 - alphaFrac));
        }
      }
    }

    cutCtx.putImageData(outputData, 0, 0);

    // Apply Edge Feather
    if (edgeFeather > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = edgeFeather;
      ctx.drawImage(cutCanvas, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(cutCanvas, 0, 0);
    }
  }, [rawCutoutImage, rawCutoutData, originalImage, originalData, backdropType, solidColor, gradientPreset, bokehBlur, edgeInset, edgeFeather, defringe]);

  useEffect(() => {
    if (editorTab === 'refine' || editorTab === 'backdrop') {
      renderComposite();
    }
  }, [renderComposite, editorTab]);

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
    if (editorTab !== 'brush' && editorTab !== 'colorkey') return;
    if (e.cancelable) e.preventDefault();
    
    if (editorTab === 'colorkey') {
      if (!canvasRef.current || !baseImageData) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      setIsDrawingLine(true);
      const coords = getCanvasCoords(e);
      const currentImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setPreStrokeImageData(currentImgData);
      
      const newPath = [coords];
      setStrokePath(newPath);
      
      const tempColors = [];
      sampleColorsAlongLine(coords.x, coords.y, coords.x, coords.y, baseImageData.data, baseImageData.width, baseImageData.height, tempColors);
      setTempStrokeColors(tempColors);
    } else if (editorTab === 'brush') {
      setIsDrawing(true);
      const { x, y } = getCanvasCoords(e);
      const ctx = canvasRef.current.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
      drawBrush(e);
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
      
      ctx.putImageData(preStrokeImageData, 0, 0);
      
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(newPath[0].x, newPath[0].y);
      for (let i = 1; i < newPath.length; i++) {
        ctx.lineTo(newPath[i].x, newPath[i].y);
      }
      ctx.stroke();
      ctx.restore();
      
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
    } else if (editorTab === 'brush') {
      drawBrush(e);
    }
  };

  const drawBrush = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (originalImage) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(originalImage, 0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.restore();
    }
  };

  const stopDrawing = () => {
    if (editorTab === 'colorkey' && isDrawingLine) {
      setIsDrawingLine(false);
      const finalColors = [...sampledColors, ...tempStrokeColors];
      setSampledColors(finalColors);
      applyColorKey(finalColors, tolerance, feather);
      setStrokePath([]);
      setPreStrokeImageData(null);
      setTempStrokeColors([]);
    } else if (editorTab === 'brush') {
      setIsDrawing(false);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
      }
    }
  };

  const sampleColorsAlongLine = (x0, y0, x1, y1, data, width, height, targetArray) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(Math.ceil(Math.max(dx, dy)), 1);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(x0 + (x1 - x0) * t);
      const py = Math.round(y0 + (y1 - y0) * t);
      
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        if (data[idx + 3] > 0) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          let isDuplicate = false;
          for (let c = 0; c < targetArray.length; c++) {
            const sc = targetArray[c];
            const dist = Math.sqrt((r - sc.r)**2 + (g - sc.g)**2 + (b - sc.b)**2);
            if (dist < 4) { isDuplicate = true; break; }
          }
          
          if (!isDuplicate) {
            targetArray.push({ r, g, b });
          }
        }
      }
    }
  };

  const applyColorKey = (colors, currentTolerance, currentFeather) => {
    if (!canvasRef.current || !baseImageData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!colors || colors.length === 0) {
      ctx.putImageData(baseImageData, 0, 0);
      return;
    }
    
    const w = baseImageData.width;
    const h = baseImageData.height;
    const imgData = ctx.createImageData(w, h);
    const src = baseImageData.data;
    const dst = imgData.data;
    
    const tolSq = currentTolerance * currentTolerance * 3;
    const featherDist = currentFeather * 1.5;
    const outerTolSq = (currentTolerance + featherDist) * (currentTolerance + featherDist) * 3;
    
    for (let i = 0; i < src.length; i += 4) {
      const a = src[i + 3];
      if (a === 0) {
        dst[i] = src[i]; dst[i+1] = src[i+1]; dst[i+2] = src[i+2]; dst[i+3] = 0;
        continue;
      }
      
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      
      let minDistanceSq = Infinity;
      for (let j = 0; j < colors.length; j++) {
        const sc = colors[j];
        const dSq = (r - sc.r)**2 + (g - sc.g)**2 + (b - sc.b)**2;
        if (dSq < minDistanceSq) {
          minDistanceSq = dSq;
          if (minDistanceSq <= tolSq) break;
        }
      }
      
      dst[i] = r; dst[i + 1] = g; dst[i + 2] = b;
      
      if (minDistanceSq <= tolSq) {
        dst[i + 3] = 0;
      } else if (minDistanceSq < outerTolSq && currentFeather > 0) {
        const dist = Math.sqrt(minDistanceSq);
        const factor = (dist - currentTolerance * Math.sqrt(3)) / (featherDist * Math.sqrt(3));
        dst[i + 3] = Math.round(a * Math.max(0, Math.min(1, factor)));
      } else {
        dst[i + 3] = a;
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName ? `nobg-${fileName.replace(/\.[^/.]+$/, "")}.png` : `nobg-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  const handleResetCanvas = () => {
    setEdgeInset(0);
    setEdgeFeather(0);
    setDefringe(30);
    setBackdropType('transparent');
    setSampledColors([]);
    if (editorTab === 'refine' || editorTab === 'backdrop') {
      renderComposite();
    } else if (rawCutoutImage && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(rawCutoutImage, 0, 0);
    }
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
       {/* Tab Switcher */}
       <div style={{display: 'flex', gap: '0.4rem', background: 'var(--bg-primary)', padding: '0.3rem', borderRadius: 'var(--border-radius-sm)', flexWrap: 'wrap'}}>
          <button 
             className="btn"
             onClick={() => setEditorTab('refine')}
             style={{
               flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem',
               background: editorTab === 'refine' ? 'var(--accent-color)' : 'transparent',
               color: editorTab === 'refine' ? 'white' : 'var(--text-secondary)',
               border: 'none', fontWeight: editorTab === 'refine' ? 'bold' : 'normal'
             }}
          >
             <AdjustmentsHorizontalIcon style={{ width: 14, height: 14 }} /> Edge Refine (Anti-Halo)
          </button>
          <button 
             className="btn"
             onClick={() => setEditorTab('backdrop')}
             style={{
               flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem',
               background: editorTab === 'backdrop' ? 'var(--accent-color)' : 'transparent',
               color: editorTab === 'backdrop' ? 'white' : 'var(--text-secondary)',
               border: 'none', fontWeight: editorTab === 'backdrop' ? 'bold' : 'normal'
             }}
          >
             <SwatchIcon style={{ width: 14, height: 14 }} /> Studio Backdrop & Blur
          </button>
          <button 
             className="btn"
             onClick={() => setEditorTab('brush')}
             style={{
               flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem',
               background: editorTab === 'brush' ? 'var(--accent-color)' : 'transparent',
               color: editorTab === 'brush' ? 'white' : 'var(--text-secondary)',
               border: 'none', fontWeight: editorTab === 'brush' ? 'bold' : 'normal'
             }}
          >
             <PaintBrushIcon style={{ width: 14, height: 14 }} /> Manual Brush
          </button>
          <button 
             className="btn"
             onClick={() => setEditorTab('colorkey')}
             style={{
               flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem',
               background: editorTab === 'colorkey' ? 'var(--accent-color)' : 'transparent',
               color: editorTab === 'colorkey' ? 'white' : 'var(--text-secondary)',
               border: 'none', fontWeight: editorTab === 'colorkey' ? 'bold' : 'normal'
             }}
          >
             🎯 3D Color Keyer
          </button>
       </div>

       {/* Tab 1: Edge Refinement */}
       {editorTab === 'refine' && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* Edge Inset / Erode */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>📐 Edge Inset / Erode</span>
                  <span style={{ color: edgeInset !== 0 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{edgeInset}px</span>
                </div>
                <input 
                  type="range" 
                  min="-4" 
                  max="4" 
                  step="0.5"
                  value={edgeInset} 
                  onChange={(e) => setEdgeInset(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Contract inward (-px) to instantly eliminate edge halos.
                </div>
              </div>

              {/* De-Fringe / Anti-Halo */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>✨ De-Fringe (De-Spill)</span>
                  <span style={{ color: defringe > 0 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{defringe}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={defringe} 
                  onChange={(e) => setDefringe(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Removes background color bleed & light bounce from hair.
                </div>
              </div>

              {/* Edge Feather */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>🪶 Edge Softness / Feather</span>
                  <span style={{ color: edgeFeather > 0 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{edgeFeather}px</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="8" 
                  step="0.5"
                  value={edgeFeather} 
                  onChange={(e) => setEdgeFeather(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Smooths pixelated cut lines for natural transition.
                </div>
              </div>
            </div>
         </div>
       )}

       {/* Tab 2: Studio Backdrop */}
       {editorTab === 'backdrop' && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
               {[
                 { id: 'transparent', label: 'Transparent' },
                 { id: 'solid', label: 'Studio Solid' },
                 { id: 'gradient', label: 'Gradient' },
                 { id: 'bokeh', label: 'Portrait Bokeh Blur' }
               ].map(b => (
                 <button
                   key={b.id}
                   type="button"
                   className="btn"
                   onClick={() => setBackdropType(b.id)}
                   style={{
                     padding: '0.3rem 0.6rem', fontSize: '0.78rem',
                     background: backdropType === b.id ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                     color: backdropType === b.id ? 'white' : 'var(--text-secondary)',
                     border: backdropType === b.id ? '1px solid var(--accent-color)' : '1px solid var(--border-color)'
                   }}
                 >
                   {b.label}
                 </button>
               ))}
            </div>

            {backdropType === 'solid' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Color Preset:</span>
                {['#ffffff', '#0b0f19', '#f1f5f9', '#ef4444', '#3b82f6', '#10b981'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSolidColor(c)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: c,
                      border: solidColor === c ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer'
                    }}
                  />
                ))}
                <input 
                  type="color" 
                  value={solidColor} 
                  onChange={(e) => setSolidColor(e.target.value)} 
                  style={{ width: '32px', height: '26px', border: 'none', background: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}
                  title="Custom Color"
                />
              </div>
            )}

            {backdropType === 'gradient' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Style:</span>
                {[
                  { id: 'studio', label: 'Studio Minimal' },
                  { id: 'tech', label: 'Cyber Tech' },
                  { id: 'sunset', label: 'Sunset Glow' },
                  { id: 'dark', label: 'Dark Charcoal' }
                ].map(g => (
                  <button
                    key={g.id}
                    type="button"
                    className="btn"
                    onClick={() => setGradientPreset(g.id)}
                    style={{
                      padding: '0.25rem 0.5rem', fontSize: '0.75rem',
                      background: gradientPreset === g.id ? 'var(--accent-color)' : 'var(--bg-tertiary)'
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}

            {backdropType === 'bokeh' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Background Blur: {bokehBlur}px</span>
                <input 
                  type="range" 
                  min="0" 
                  max="30" 
                  value={bokehBlur} 
                  onChange={(e) => setBokehBlur(parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                />
              </div>
            )}
         </div>
       )}

       {/* Tab 3: Brush Controls */}
       {editorTab === 'brush' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)' }}>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <button 
                      className={`btn ${mode === 'erase' ? 'btn-primary' : ''}`}
                      onClick={() => setMode('erase')}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                   >Erase</button>
                   <button 
                      className={`btn ${mode === 'restore' ? 'btn-primary' : ''}`}
                      onClick={() => setMode('restore')}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                   >Restore Original</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Brush: {brushSize}px</span>
                   <input 
                      type="range" 
                      min="5" 
                      max="150" 
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
                      max="1" 
                      step="0.05"
                      value={overlayOpacity} 
                      onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                   />
                </div>
             </div>
          </div>
       )}

       {/* Tab 4: Color Key Controls */}
       {editorTab === 'colorkey' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-sm)' }}>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button 
                   className="btn"
                   onClick={() => {
                     setSampledColors([]);
                     applyColorKey([], tolerance, feather);
                   }}
                   style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                >
                   Clear Sampled Colors ({sampledColors.length})
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '130px' }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Tolerance: {tolerance}</span>
                   <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={tolerance} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setTolerance(val);
                        applyColorKey(sampledColors, val, feather);
                      }}
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
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setFeather(val);
                        applyColorKey(sampledColors, tolerance, val);
                      }}
                      style={{ flex: 1 }}
                   />
                </div>
             </div>
          </div>
       )}

       {/* Canvas Display */}
       <div 
         style={{ 
           width: '100%', 
           overflow: 'hidden',
           background: backdropType === 'transparent' ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'><rect width=\'10\' height=\'10\' fill=\'%23ddd\'/><rect x=\'10\' y=\'10\' width=\'10\' height=\'10\' fill=\'%23ddd\'/><rect x=\'10\' width=\'10\' height=\'10\' fill=\'%23eee\'/><rect y=\'10\' width=\'10\' height=\'10\' fill=\'%23eee\'/></svg>")' : 'transparent',
           borderRadius: 'var(--border-radius-sm)',
           border: '1px solid var(--border-color)',
           touchAction: 'none',
           position: 'relative'
         }}
       >
         {editorTab === 'brush' && originalImage && (
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
             cursor: (editorTab === 'brush' || editorTab === 'colorkey') ? 'crosshair' : 'default',
             position: 'relative',
             zIndex: 2
           }}
         />
       </div>

       {/* Bottom Export & Actions */}
       <div className="button-group" style={{marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
         <button onClick={handleDownload} className="btn btn-primary">
            <Download style={{width: "18px", height: "18px"}} /> Download Cutout (PNG)
         </button>
         <SendToDropdown imageUrl={canvasRef.current ? canvasRef.current.toDataURL('image/png') : resultUrl} mediaType="image" />
         <button className="btn" onClick={handleResetCanvas}>
            Reset Adjustments
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
      addJob({ id: myJobId, title: 'Opening Color Key Editor', type: 'bg-remove' });
      updateJob(myJobId, { status: 'success', resultUrl: previewUrl, downloadName: `nobg-${Date.now()}.png` });
      return;
    }

    addJob({ id: myJobId, title: 'Removing Background', type: 'bg-remove' });

    try {
      const config = {
        publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
        device: "gpu",
        model: modelVariant,
        progress: (key, current, total) => {
          if (total > 0) {
            updateJob(myJobId, { progress: (current / total) * 100, log: `Processing ${key}...` });
          }
        }
      };

      let imageBlob;
      try {
        imageBlob = await removeBackground(imageFile, config);
      } catch (gpuErr) {
        console.warn("GPU background removal failed, retrying with CPU...", gpuErr);
        updateJob(myJobId, { log: "Retrying with CPU mode..." });
        imageBlob = await removeBackground(imageFile, { ...config, device: "cpu" });
      }

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
                    <option value="isnet_fp16">Balanced (isnet_fp16 - GPU Fast)</option>
                    <option value="isnet">High Precision (isnet - Full Size Quality)</option>
                    <option value="isnet_quint8">Lightweight (isnet_quint8 - Fast Quantized)</option>
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
           <h3 style={{marginTop: 0, marginBottom: '1rem'}}>Refine & Customize Result</h3>
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
    <div className="tool-page page-container animate-fade-in">
      <div className="page-header">
        <ImageMinus style={{width: 32, height: 32, fill: "url(#accent-grad)"}}/>
        <h1>Background Remover</h1>
      </div>
      <p style={{marginBottom: '2rem'}}>Remove backgrounds from images locally in your browser using high-precision AI and sub-pixel edge refinement.</p>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 450px), 1fr))', gap: '2rem', alignItems: 'start' }}>
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
