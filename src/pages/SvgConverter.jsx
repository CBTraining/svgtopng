import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { CommandLineIcon as FileCode2, ArrowDownTrayIcon as Download, ClipboardDocumentIcon, CheckIcon as Check } from '@heroicons/react/24/solid';

export default function SvgConverter() {
  const location = useLocation();
  const [svgText, setSvgText] = useState(location.state?.svgText || '');
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
    if (location.state?.svgText) {
      setSvgText(location.state.svgText);
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.svgText]);

  // Robust SVG Dimension & Native Aspect Ratio Parser
  useEffect(() => {
    if (!svgText.trim() || !svgText.includes('<svg')) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      const svgEl = doc.querySelector('svg');
      if (svgEl) {
        let wAttr = svgEl.getAttribute('width');
        let hAttr = svgEl.getAttribute('height');
        const viewBox = svgEl.getAttribute('viewBox');
        
        let parsedW = null;
        let parsedH = null;

        // Parse viewBox first for accurate aspect ratio
        if (viewBox) {
          const parts = viewBox.split(/[ ,\n\t]+/).filter(Boolean).map(parseFloat);
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            parsedW = parts[2];
            parsedH = parts[3];
          }
        }

        // If width/height attributes are explicit numeric pixels, use them
        if (wAttr && !wAttr.includes('%')) {
          const wVal = parseFloat(wAttr);
          if (wVal > 0) parsedW = wVal;
        }
        if (hAttr && !hAttr.includes('%')) {
          const hVal = parseFloat(hAttr);
          if (hVal > 0) parsedH = hVal;
        }

        if (parsedW && parsedH && parsedW > 0 && parsedH > 0) {
          const ratio = parsedW / parsedH;
          setAspectRatio(ratio);
          
          // Match output height to keep initial proportions without stretching
          const targetW = 512;
          const targetH = Math.round(targetW / ratio);
          setWidth(targetW);
          setHeight(targetH);
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

  const handleConvert = useCallback(() => {
    if (!svgText.trim() || !canvasRef.current || !svgText.includes('<svg')) return;

    // Sanitize SVG blob so width/height match viewbox aspect ratio
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);

      // Calculate Contain-Fit Aspect Ratio so vector NEVER stretches
      const imgW = img.naturalWidth || img.width || width;
      const imgH = img.naturalHeight || img.height || height;
      const imgAspect = imgW / imgH;

      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;

      if (keepProportions && imgAspect > 0) {
        const canvasAspect = width / height;
        if (imgAspect > canvasAspect) {
          drawH = width / imgAspect;
          drawY = (height - drawH) / 2;
        } else {
          drawW = height * imgAspect;
          drawX = (width - drawW) / 2;
        }
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      
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
  }, [svgText, width, height, keepProportions, applyTint, tintMode, solidColor, gradStart, gradEnd, gradDirection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleConvert();
    }, 150);
    return () => clearTimeout(timer);
  }, [handleConvert]);

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `vector-${width}x${height}.png`;
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

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
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
    
    let file = null;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      if (e.dataTransfer.items[0].kind === 'file') {
        file = e.dataTransfer.items[0].getAsFile();
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      file = e.dataTransfer.files[0];
    }
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSvgText(event.target.result);
      };
      reader.readAsText(file);
      return;
    }
    
    const textData = e.dataTransfer.getData('text');
    if (textData) {
      setSvgText(textData);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <FileCode2 />
        <h1>SVG Converter</h1>
      </div>
      <p>Upload or paste SVG vector graphics, scale to any resolution without stretching, apply solid/gradient color overrides, and export as transparent PNGs.</p>

      <div className="grid-container">
        <div 
          className="glass-panel controls"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ 
            border: isDragging ? '2px dashed var(--primary-color)' : '',
            backgroundColor: isDragging ? 'var(--bg-tertiary)' : ''
          }}
        >
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
                fontFamily: 'monospace'
              }}
              value={svgText}
              onChange={(e) => setSvgText(e.target.value)}
              placeholder="<svg>...</svg> or drag & drop a .svg file anywhere in this panel"
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
          
          <div style={{ marginBottom: '1rem', marginTop: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
              Vertical Height Presets:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[500, 1000, 1500, 2000].map(size => (
                <button 
                  key={size}
                  className="btn" 
                  style={{ 
                    padding: '0.3rem 0.75rem', 
                    fontSize: '0.8rem', 
                    background: height === size ? 'var(--accent-color)' : 'var(--bg-tertiary)', 
                    color: 'white',
                    border: height === size ? '1px solid var(--accent-color)' : '1px solid var(--border-color)'
                  }}
                  onClick={() => {
                    setHeight(size);
                    if (keepProportions && aspectRatio) setWidth(Math.round(size * aspectRatio));
                  }}
                >
                  {size}px
                </button>
              ))}
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
                    <select 
                      className="input-field" 
                      value={gradDirection} 
                      onChange={(e) => setGradDirection(e.target.value)}
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      <option value="to-bottom">Top to Bottom</option>
                      <option value="to-right">Left to Right</option>
                      <option value="to-bottom-right">Diagonal (TL to BR)</option>
                      <option value="to-top-right">Diagonal (BL to TR)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel preview-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {previewUrl ? (
            <div className="preview-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div 
                className="canvas-container"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '400px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justify: 'center',
                  padding: '1rem',
                  borderRadius: 'var(--border-radius-sm)',
                  background: 'linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.08) 75%) #090d16',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                }}
              >
                <img 
                  src={previewUrl} 
                  alt="Converted SVG PNG Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '360px', 
                    objectFit: 'contain'
                  }} 
                />
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Resolution: <strong>{width} x {height} px</strong>
              </div>

              <div className="button-group" style={{ width: '100%', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={handleDownload}>
                  <Download style={{ width: 18, height: 18 }} /> Download PNG
                </button>
                <button className="btn" onClick={handleCopy}>
                  {copySuccess ? <Check style={{ width: 18, height: 18, color: '#10b981' }} /> : <ClipboardDocumentIcon style={{ width: 18, height: 18 }} />}
                  {copySuccess ? 'Copied!' : 'Copy PNG'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              Enter SVG code or upload a file to generate a live PNG preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
