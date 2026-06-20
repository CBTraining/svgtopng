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

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <FileCode2 />
        <h1>SVG Icon Converter</h1>
      </div>
      <p>Paste SVG code, scale to any dimension, and convert to a transparent PNG.</p>

      <div className="grid-container">
        <div className="glass-panel controls">
          <div className="control-group">
            <label>SVG Code</label>
            <textarea 
              className="input-field"
              style={{ minHeight: '200px', fontFamily: 'monospace' }}
              value={svgText}
              onChange={(e) => setSvgText(e.target.value)}
              placeholder="<svg>...</svg>"
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
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
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
