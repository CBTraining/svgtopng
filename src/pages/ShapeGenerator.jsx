import { useState, useRef, useEffect, useCallback } from 'react';
import { SparklesIcon, ArrowDownTrayIcon as Download, ClipboardDocumentIcon, CheckIcon as Check } from '@heroicons/react/24/solid';

export default function ShapeGenerator() {
  const [outputWidth, setOutputWidth] = useState(512);
  const [outputHeight, setOutputHeight] = useState(512);
  const [shapeWidth, setShapeWidth] = useState(300);
  const [shapeHeight, setShapeHeight] = useState(300);
  const [borderRadius, setBorderRadius] = useState(64);
  const [blurRadius, setBlurRadius] = useState(0);

  const [tintMode, setTintMode] = useState('gradient'); // 'solid' or 'gradient'
  const [solidColor, setSolidColor] = useState('#3b82f6');
  const [gradStart, setGradStart] = useState('#ef4444');
  const [gradEnd, setGradEnd] = useState('#3b82f6');
  const [gradDirection, setGradDirection] = useState('to-bottom-right');

  const [previewUrl, setPreviewUrl] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const canvasRef = useRef(null);

  const renderShape = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, outputWidth, outputHeight);

    // Apply Blur
    if (blurRadius > 0) {
      ctx.filter = `blur(${blurRadius}px)`;
    } else {
      ctx.filter = 'none';
    }

    // Set Fill Style
    if (tintMode === 'solid') {
      ctx.fillStyle = solidColor;
    } else {
      let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
      switch(gradDirection) {
        case 'to-bottom': x0 = 0; y0 = 0; x1 = 0; y1 = outputHeight; break;
        case 'to-top': x0 = 0; y0 = outputHeight; x1 = 0; y1 = 0; break;
        case 'to-right': x0 = 0; y0 = 0; x1 = outputWidth; y1 = 0; break;
        case 'to-left': x0 = outputWidth; y0 = 0; x1 = 0; y1 = 0; break;
        case 'to-bottom-right': x0 = 0; y0 = 0; x1 = outputWidth; y1 = outputHeight; break;
        case 'to-top-left': x0 = outputWidth; y0 = outputHeight; x1 = 0; y1 = 0; break;
        case 'to-top-right': x0 = 0; y0 = outputHeight; x1 = outputWidth; y1 = 0; break;
        case 'to-bottom-left': x0 = outputWidth; y0 = 0; x1 = 0; y1 = outputHeight; break;
        default: x0 = 0; y0 = 0; x1 = outputWidth; y1 = outputHeight;
      }
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, gradStart);
      gradient.addColorStop(1, gradEnd);
      ctx.fillStyle = gradient;
    }

    // Draw Rounded Rectangle in the center
    const x = (outputWidth - shapeWidth) / 2;
    const y = (outputHeight - shapeHeight) / 2;
    
    ctx.beginPath();
    ctx.roundRect(x, y, shapeWidth, shapeHeight, borderRadius);
    ctx.fill();

    // Reset filter
    ctx.filter = 'none';

    // Generate Preview
    setPreviewUrl(canvas.toDataURL('image/png'));
  }, [outputWidth, outputHeight, shapeWidth, shapeHeight, borderRadius, blurRadius, tintMode, solidColor, gradStart, gradEnd, gradDirection]);

  // Debounce auto-render
  useEffect(() => {
    const timer = setTimeout(() => {
      renderShape();
    }, 150);
    return () => clearTimeout(timer);
  }, [renderShape]);

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy image: ', err);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = 'generated-shape.png';
    a.click();
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Shape Generator</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Generate perfectly rounded, gradient-filled, blurred shapes for backgrounds, icons, or avatars.
      </p>

      <div className="layout-split">
        {/* Left Column: Controls */}
        <div className="glass-panel controls-column">
          <div className="control-group">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
              <SparklesIcon style={{ width: '20px', height: '20px' }} />
              Canvas Settings
            </h3>
            
            <div className="slider-group">
              <label>Output Width: <span>{outputWidth}px</span></label>
              <input type="range" min="32" max="2048" step="16" value={outputWidth} onChange={e => setOutputWidth(Number(e.target.value))} />
            </div>
            
            <div className="slider-group">
              <label>Output Height: <span>{outputHeight}px</span></label>
              <input type="range" min="32" max="2048" step="16" value={outputHeight} onChange={e => setOutputHeight(Number(e.target.value))} />
            </div>
            
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
              Shape Settings
            </h3>
            
            <div className="slider-group">
              <label>Shape Width: <span>{shapeWidth}px</span></label>
              <input type="range" min="16" max="2048" step="16" value={shapeWidth} onChange={e => setShapeWidth(Number(e.target.value))} />
            </div>
            
            <div className="slider-group">
              <label>Shape Height: <span>{shapeHeight}px</span></label>
              <input type="range" min="16" max="2048" step="16" value={shapeHeight} onChange={e => setShapeHeight(Number(e.target.value))} />
            </div>

            <div className="slider-group">
              <label>Corner Radius: <span>{borderRadius}px</span></label>
              <input type="range" min="0" max={Math.min(shapeWidth, shapeHeight)/2} value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} />
            </div>
            
            <div className="slider-group">
              <label>Blur Radius: <span>{blurRadius}px</span></label>
              <input type="range" min="0" max="200" value={blurRadius} onChange={e => setBlurRadius(Number(e.target.value))} />
            </div>

            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
              Fill Options
            </h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="tintMode" 
                  value="solid" 
                  checked={tintMode === 'solid'} 
                  onChange={() => setTintMode('solid')}
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                Solid
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="tintMode" 
                  value="gradient" 
                  checked={tintMode === 'gradient'} 
                  onChange={() => setTintMode('gradient')}
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                Gradient
              </label>
            </div>

            {tintMode === 'solid' ? (
              <div className="color-picker-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="color" value={solidColor} onChange={e => setSolidColor(e.target.value)} style={{ width: '50px', height: '40px', padding: '0', cursor: 'pointer', background: 'none', border: 'none' }} />
                  <input type="text" value={solidColor} onChange={e => setSolidColor(e.target.value)} className="text-input" style={{ flex: 1 }} />
                </div>
              </div>
            ) : (
              <>
                <div className="color-picker-group">
                  <label>Start Color</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="color" value={gradStart} onChange={e => setGradStart(e.target.value)} style={{ width: '50px', height: '40px', padding: '0', cursor: 'pointer', background: 'none', border: 'none' }} />
                    <input type="text" value={gradStart} onChange={e => setGradStart(e.target.value)} className="text-input" style={{ flex: 1 }} />
                  </div>
                </div>
                <div className="color-picker-group">
                  <label>End Color</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="color" value={gradEnd} onChange={e => setGradEnd(e.target.value)} style={{ width: '50px', height: '40px', padding: '0', cursor: 'pointer', background: 'none', border: 'none' }} />
                    <input type="text" value={gradEnd} onChange={e => setGradEnd(e.target.value)} className="text-input" style={{ flex: 1 }} />
                  </div>
                </div>
                <div className="color-picker-group" style={{ marginTop: '1rem' }}>
                  <label>Gradient Direction</label>
                  <select className="text-input" value={gradDirection} onChange={e => setGradDirection(e.target.value)}>
                    <option value="to-bottom-right">Top-Left to Bottom-Right</option>
                    <option value="to-top-left">Bottom-Right to Top-Left</option>
                    <option value="to-top-right">Bottom-Left to Top-Right</option>
                    <option value="to-bottom-left">Top-Right to Bottom-Left</option>
                    <option value="to-right">Left to Right</option>
                    <option value="to-left">Right to Left</option>
                    <option value="to-bottom">Top to Bottom</option>
                    <option value="to-top">Bottom to Top</option>
                  </select>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="primary-btn" onClick={handleCopy} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                {copySuccess ? <Check style={{width: '20px', height: '20px'}} /> : <ClipboardDocumentIcon style={{width: '20px', height: '20px'}} />}
                {copySuccess ? 'Copied!' : 'Copy PNG'}
              </button>
              <button className="primary-btn outline" onClick={handleDownload} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                <Download style={{width: '20px', height: '20px'}} />
                Save PNG
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="preview-column">
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', height: '100%' }}>
            <div className="checkerboard-bg" style={{ 
              borderRadius: '8px', 
              overflow: 'hidden', 
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '100%',
              aspectRatio: outputWidth / outputHeight
            }}>
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  alt="Shape Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </div>
            
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {outputWidth} x {outputHeight}
            </p>
          </div>
        </div>
      </div>
      
      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
