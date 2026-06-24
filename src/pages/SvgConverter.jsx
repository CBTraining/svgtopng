import { useState, useRef, useEffect } from 'react';
import { CommandLineIcon as FileCode2, ArrowDownTrayIcon as Download, ClipboardDocumentIcon, CheckIcon as Check } from '@heroicons/react/24/solid';

export default function SvgConverter() {
  const [svgText, setSvgText] = useState('');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [keepProportions, setKeepProportions] = useState(true);
  const canvasRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [applyTint, setApplyTint] = useState(false);
  const [tintMode, setTintMode] = useState('solid'); // 'solid' or 'gradient'
  const [solidColor, setSolidColor] = useState('#3b82f6');
  const [gradStart, setGradStart] = useState('#ef4444');
  const [gradEnd, setGradEnd] = useState('#3b82f6');
  const [gradDirection, setGradDirection] = useState('to-bottom-right');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!svgText.trim() || !svgText.includes('<svg')) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      const svgEl = doc.querySelector('svg');
      if (svgEl) {
        let w = svgEl.getAttribute('width');
        let h = svgEl.getAttribute('height');
        const viewBox = svgEl.getAttribute('viewBox');
        
        let parsedW = w ? parseFloat(w) : null;
        let parsedH = h ? parseFloat(h) : null;

        if ((!parsedW || !parsedH) && viewBox) {
          const parts = viewBox.split(/[ ,\n\t]+/).filter(Boolean).map(parseFloat);
          if (parts.length === 4) {
            parsedW = parts[2];
            parsedH = parts[3];
          }
        }

        if (parsedW && parsedH && parsedW > 0 && parsedH > 0) {
          setWidth(Math.round(parsedW));
          setHeight(Math.round(parsedH));
          setAspectRatio(parsedW / parsedH);
        }
      }
    } catch (e) {
      console.error("Failed to parse SVG dimensions", e);
    }
  }, [svgText]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleConvert = () => {
    if (!svgText.trim()) return;

    // Check if valid SVG
    if (!svgText.includes('<svg')) {
      alert('Invalid SVG code.');
      return;
    }

    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      if (applyTint) {
        ctx.globalCompositeOperation = 'source-in';
        if (tintMode === 'solid') {
          ctx.fillStyle = solidColor;
        } else {
          let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
          if (gradDirection === 'to-bottom') { y1 = height; }
          else if (gradDirection === 'to-right') { x1 = width; }
          else if (gradDirection === 'to-bottom-right') { x1 = width; y1 = height; }
          else if (gradDirection === 'to-top-right') { y0 = height; x1 = width; }
          
          const grad = ctx.createLinearGradient(x0, y0, x1, y1);
          grad.addColorStop(0, gradStart);
          grad.addColorStop(1, gradEnd);
          ctx.fillStyle = grad;
        }
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      }
      
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        setPreviewUrl(prev => {
           if (prev) URL.revokeObjectURL(prev);
           return URL.createObjectURL(pngBlob);
        });
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `icon-${width}x${height}.png`;
    a.click();
  };

  const handleCopy = async () => {
    if (!previewUrl) return;
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
      alert("Failed to copy image to clipboard.");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSvgText(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (file.name.endsWith('.svg') || file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSvgText(event.target.result);
      };
      reader.readAsText(file);
    } else {
      alert("Please drop a valid .svg file");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <FileCode2 />
        <h1>SVG Icon Converter</h1>
      </div>
      <p>Upload or paste SVG code, scale to any dimension, and convert to a transparent PNG.</p>

      <div className="grid-container">
        <div className="glass-panel controls">
          <div className="control-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>SVG Code</label>
              <label className="btn" style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem', cursor: 'pointer', background: 'var(--bg-tertiary)' }}>
                Upload .svg File
                <input 
                  type="file" 
                  accept=".svg" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
            <textarea 
              className="input-field"
              style={{ 
                minHeight: '200px', 
                fontFamily: 'monospace', 
                border: isDragging ? '2px dashed var(--primary-color)' : '',
                backgroundColor: isDragging ? 'var(--bg-tertiary)' : ''
              }}
              value={svgText}
              onChange={(e) => setSvgText(e.target.value)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              placeholder="<svg>...</svg> or drag & drop a .svg file here"
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="control-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Output Width (px)</label>
              <input 
                type="number" 
                className="input-field" 
                value={width || ''} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setWidth(val);
                  if (keepProportions && aspectRatio) setHeight(Math.round(val / aspectRatio));
                }} 
              />
            </div>
            <div className="control-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Output Height (px)</label>
              <input 
                type="number" 
                className="input-field" 
                value={height || ''} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setHeight(val);
                  if (keepProportions && aspectRatio) setWidth(Math.round(val * aspectRatio));
                }} 
              />
            </div>
          </div>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <input 
              type="checkbox" 
              checked={keepProportions}
              onChange={(e) => {
                setKeepProportions(e.target.checked);
                if (e.target.checked && width && height) {
                  setAspectRatio(width / height);
                }
              }}
              className="accent-primary"
            />
            Keep proportions
          </label>

          {/* Color Tint Controls */}
          <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 'bold' }}>
              <input 
                type="checkbox" 
                checked={applyTint}
                onChange={(e) => setApplyTint(e.target.checked)}
                className="accent-primary"
              />
              Override Colors
            </label>
            
            {applyTint && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input type="radio" checked={tintMode === 'solid'} onChange={() => setTintMode('solid')} className="accent-primary" /> Solid
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input type="radio" checked={tintMode === 'gradient'} onChange={() => setTintMode('gradient')} className="accent-primary" /> Gradient
                  </label>
                </div>

                {tintMode === 'solid' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="color" value={solidColor} onChange={(e) => setSolidColor(e.target.value)} style={{ width: '40px', height: '30px', padding: 0, border: 'none' }} />
                    <span>Color</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="color" value={gradStart} onChange={(e) => setGradStart(e.target.value)} style={{ width: '40px', height: '30px', padding: 0, border: 'none' }} />
                        <span>Start</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="color" value={gradEnd} onChange={(e) => setGradEnd(e.target.value)} style={{ width: '40px', height: '30px', padding: 0, border: 'none' }} />
                        <span>End</span>
                      </div>
                    </div>
                    <div>
                      <select className="input-field" value={gradDirection} onChange={(e) => setGradDirection(e.target.value)} style={{ padding: '0.25rem', marginTop: '0.25rem' }}>
                        <option value="to-bottom-right">Top-Left to Bottom-Right</option>
                        <option value="to-top-right">Bottom-Left to Top-Right</option>
                        <option value="to-right">Left to Right</option>
                        <option value="to-bottom">Top to Bottom</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={handleConvert}>
            Render PNG
          </button>
        </div>

        <div className="glass-panel preview-panel">
          <h3>Preview</h3>
          {previewUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <div className="canvas-container" style={{ background: 'transparent' }}>
                 {/* Invisible canvas for processing */}
                 <canvas ref={canvasRef} style={{ display: 'none' }} />
                 <img src={previewUrl} alt="SVG Preview" style={{ maxWidth: '100%', maxHeight: '400px', border: '1px solid var(--border-color)' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={handleDownload}>
                  <Download style={{width: "18px", height: "18px"}} /> Download PNG
                </button>
                <button className="btn" onClick={handleCopy}>
                  {copySuccess ? <Check style={{width: "18px", height: "18px"}} /> : <ClipboardDocumentIcon style={{width: "18px", height: "18px"}} />} 
                  {copySuccess ? 'Copied!' : 'Copy PNG'}
                </button>
              </div>
            </div>
          ) : (
             <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Render to see preview
                <canvas ref={canvasRef} style={{ display: 'none' }} />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
