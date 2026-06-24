import { useState, useRef, useEffect, useCallback } from 'react';
import { RectangleGroupIcon, ArrowDownTrayIcon as Download, ClipboardDocumentIcon, CheckIcon as Check } from '@heroicons/react/24/solid';
import GradientEditor from '../components/GradientEditor';

const trimCanvas = (canvas) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  
  let x, y, bound = {
    top: height,
    left: width,
    right: 0,
    bottom: 0
  };

  for (y = 0; y < height; y++) {
    for (x = 0; x < width; x++) {
      let alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        if (y < bound.top) bound.top = y;
        if (y > bound.bottom) bound.bottom = y;
        if (x < bound.left) bound.left = x;
        if (x > bound.right) bound.right = x;
      }
    }
  }

  if (bound.top > bound.bottom || bound.left > bound.right) return canvas;

  const trimHeight = bound.bottom - bound.top + 1;
  const trimWidth = bound.right - bound.left + 1;

  const trimmed = document.createElement('canvas');
  trimmed.width = trimWidth;
  trimmed.height = trimHeight;
  const tCtx = trimmed.getContext('2d');
  tCtx.drawImage(canvas, bound.left, bound.top, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);
  
  return trimmed;
};

export default function ShapeGenerator() {
  const [shapeWidth, setShapeWidth] = useState(() => {
    const saved = localStorage.getItem('sg_shapeWidth');
    return saved !== null ? Number(saved) : 800;
  });
  const [shapeHeight, setShapeHeight] = useState(() => {
    const saved = localStorage.getItem('sg_shapeHeight');
    return saved !== null ? Number(saved) : 30;
  });
  const [borderRadius, setBorderRadius] = useState(() => {
    const saved = localStorage.getItem('sg_borderRadius');
    return saved !== null ? Number(saved) : 64;
  });
  const [blurRadius, setBlurRadius] = useState(() => {
    const saved = localStorage.getItem('sg_blurRadius');
    return saved !== null ? Number(saved) : 0;
  });

  const [tintMode, setTintMode] = useState(() => {
    return localStorage.getItem('sg_tintMode') || 'gradient';
  });
  const [solidColor, setSolidColor] = useState(() => {
    return localStorage.getItem('sg_solidColor') || '#3b82f6';
  });
  
  const [gradStops, setGradStops] = useState(() => {
    const saved = localStorage.getItem('sg_gradStops');
    return saved ? JSON.parse(saved) : [
      { color: '#ef4444', position: 0 },
      { color: '#3b82f6', position: 1 }
    ];
  });
  const [gradDirection, setGradDirection] = useState(() => {
    return localStorage.getItem('sg_gradDirection') || 'to-bottom-right';
  });

  const [savedPresets, setSavedPresets] = useState(() => {
    const saved = localStorage.getItem('sg_savedPresets');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sg_shapeWidth', shapeWidth);
    localStorage.setItem('sg_shapeHeight', shapeHeight);
    localStorage.setItem('sg_borderRadius', borderRadius);
    localStorage.setItem('sg_blurRadius', blurRadius);
    localStorage.setItem('sg_tintMode', tintMode);
    localStorage.setItem('sg_solidColor', solidColor);
    localStorage.setItem('sg_gradStops', JSON.stringify(gradStops));
    localStorage.setItem('sg_gradDirection', gradDirection);
  }, [shapeWidth, shapeHeight, borderRadius, blurRadius, tintMode, solidColor, gradStops, gradDirection]);

  useEffect(() => {
    localStorage.setItem('sg_savedPresets', JSON.stringify(savedPresets));
  }, [savedPresets]);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [actualWidth, setActualWidth] = useState(0);
  const [actualHeight, setActualHeight] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const renderShape = useCallback(() => {
    const canvas = document.createElement('canvas');
    // Give enough padding for any blur to avoid clipping
    const padding = blurRadius * 4 + 20; 
    canvas.width = shapeWidth + padding * 2;
    canvas.height = shapeHeight + padding * 2;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (blurRadius > 0) {
      ctx.filter = `blur(${blurRadius}px)`;
    } else {
      ctx.filter = 'none';
    }

    if (tintMode === 'solid') {
      ctx.fillStyle = solidColor;
    } else {
      let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
      switch(gradDirection) {
        case 'to-bottom': x0 = 0; y0 = 0; x1 = 0; y1 = canvas.height; break;
        case 'to-top': x0 = 0; y0 = canvas.height; x1 = 0; y1 = 0; break;
        case 'to-right': x0 = 0; y0 = 0; x1 = canvas.width; y1 = 0; break;
        case 'to-left': x0 = canvas.width; y0 = 0; x1 = 0; y1 = 0; break;
        case 'to-bottom-right': x0 = 0; y0 = 0; x1 = canvas.width; y1 = canvas.height; break;
        case 'to-top-left': x0 = canvas.width; y0 = canvas.height; x1 = 0; y1 = 0; break;
        case 'to-top-right': x0 = 0; y0 = canvas.height; x1 = canvas.width; y1 = 0; break;
        case 'to-bottom-left': x0 = canvas.width; y0 = 0; x1 = 0; y1 = canvas.height; break;
        default: x0 = 0; y0 = 0; x1 = canvas.width; y1 = canvas.height;
      }
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      
      const sortedStops = [...gradStops].sort((a, b) => a.position - b.position);
      sortedStops.forEach(stop => {
        gradient.addColorStop(stop.position, stop.color);
      });
      
      ctx.fillStyle = gradient;
    }

    const x = padding;
    const y = padding;
    
    ctx.beginPath();
    ctx.roundRect(x, y, shapeWidth, shapeHeight, borderRadius);
    ctx.fill();

    ctx.filter = 'none';

    // Trim the canvas to perfectly crop out all empty space
    const trimmed = trimCanvas(canvas);
    setActualWidth(trimmed.width);
    setActualHeight(trimmed.height);
    setPreviewUrl(trimmed.toDataURL('image/png'));
  }, [shapeWidth, shapeHeight, borderRadius, blurRadius, tintMode, solidColor, gradStops, gradDirection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      renderShape();
    }, 150);
    return () => clearTimeout(timer);
  }, [renderShape]);

  const handleCopy = async () => {
    if (!previewUrl) return;
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
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

  const applyGooglePreset = () => {
    setTintMode('gradient');
    setGradStops([
      { color: '#4285F4', position: 0 },
      { color: '#EA4335', position: 0.33 },
      { color: '#FBBC04', position: 0.66 },
      { color: '#34A853', position: 1 }
    ]);
  };

  const applyNotebookLMPreset = () => {
    setTintMode('gradient');
    setGradStops([
      { color: '#42f067', position: 0 },
      { color: '#7182ff', position: 1 }
    ]);
  };

  const saveCurrentAsPreset = () => {
    const name = prompt('Enter a name for this preset:');
    if (!name) return;
    const newPreset = {
      id: Date.now().toString(),
      name,
      tintMode,
      solidColor,
      gradStops,
      gradDirection
    };
    setSavedPresets([...savedPresets, newPreset]);
  };

  const applyCustomPreset = (preset) => {
    setTintMode(preset.tintMode);
    if (preset.solidColor) setSolidColor(preset.solidColor);
    if (preset.gradStops) setGradStops(preset.gradStops);
    if (preset.gradDirection) setGradDirection(preset.gradDirection);
  };

  const deletePreset = (id) => {
    setSavedPresets(savedPresets.filter(p => p.id !== id));
  };

  const applyOceanPreset = () => {
    setTintMode('gradient');
    setGradStops([
      { color: '#2E3192', position: 0 },
      { color: '#1BFFFF', position: 1 }
    ]);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '0' }}>
        <h1>Shape Generator</h1>
      </div>

      {/* TOP: Preview Area */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', minHeight: '300px' }}>
        <div className="checkerboard-bg" style={{ 
          borderRadius: '8px', 
          overflow: 'hidden', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '100%',
          aspectRatio: actualWidth / actualHeight
        }}>
          {previewUrl && (
            <img 
              src={previewUrl} 
              alt="Shape Preview" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '500px' }}
            />
          )}
        </div>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', width: '100%', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Output Size: <strong>{actualWidth} x {actualHeight}</strong>
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="primary-btn" onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
              {copySuccess ? <Check style={{width: '16px', height: '16px'}} /> : <ClipboardDocumentIcon style={{width: '16px', height: '16px'}} />}
              {copySuccess ? 'Copied!' : 'Copy PNG'}
            </button>
            <button className="primary-btn outline" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
              <Download style={{width: '16px', height: '16px'}} />
              Save PNG
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM: Controls (Grid Layout) */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
          <RectangleGroupIcon style={{ width: '20px', height: '20px' }} />
          Shape Properties
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div className="slider-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Width:</label>
              <input type="number" min="1" max="4096" value={shapeWidth} onChange={e => setShapeWidth(Number(e.target.value))} className="text-input" style={{ width: '80px', padding: '0.2rem 0.5rem' }} />
            </div>
            <input type="range" min="16" max="2048" step="1" value={shapeWidth} onChange={e => setShapeWidth(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="slider-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Height:</label>
              <input type="number" min="1" max="4096" value={shapeHeight} onChange={e => setShapeHeight(Number(e.target.value))} className="text-input" style={{ width: '80px', padding: '0.2rem 0.5rem' }} />
            </div>
            <input type="range" min="16" max="2048" step="1" value={shapeHeight} onChange={e => setShapeHeight(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="slider-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Rounding:</label>
              <input type="number" min="0" max="2048" value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} className="text-input" style={{ width: '80px', padding: '0.2rem 0.5rem' }} />
            </div>
            <input type="range" min="0" max={Math.max(1, Math.min(shapeWidth, shapeHeight)/2)} step="1" value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="slider-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Blur:</label>
              <input type="number" min="0" max="500" value={blurRadius} onChange={e => setBlurRadius(Number(e.target.value))} className="text-input" style={{ width: '80px', padding: '0.2rem 0.5rem' }} />
            </div>
            <input type="range" min="0" max="200" step="1" value={blurRadius} onChange={e => setBlurRadius(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '2rem 0' }} />

        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
          Fill Style
        </h3>
        
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
          <div className="color-picker-group" style={{ maxWidth: '300px' }}>
            <label>Color</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="color" value={solidColor} onChange={e => setSolidColor(e.target.value)} style={{ width: '50px', height: '40px', padding: '0', cursor: 'pointer', background: 'none', border: 'none' }} />
              <input type="text" value={solidColor} onChange={e => setSolidColor(e.target.value)} className="text-input" style={{ flex: 1 }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Presets:</span>
              <button className="primary-btn outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={applyGooglePreset}>Google</button>
              <button className="primary-btn outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={applyNotebookLMPreset}>NotebookLM</button>
              <button className="primary-btn outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={applyOceanPreset}>Ocean</button>
              
              {savedPresets.map(preset => (
                <div key={preset.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <button 
                    className="primary-btn outline" 
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderTopRightRadius: 0, borderBottomRightRadius: 0 }} 
                    onClick={() => applyCustomPreset(preset)}
                  >
                    {preset.name}
                  </button>
                  <button 
                    className="primary-btn outline" 
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none', color: 'var(--error-color)' }} 
                    onClick={() => deletePreset(preset.id)}
                    title="Delete Preset"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              <button className="primary-btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', marginLeft: '0.5rem' }} onClick={saveCurrentAsPreset}>+ Save Custom Preset</button>
              
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Direction:</label>
                <select className="text-input" value={gradDirection} onChange={e => setGradDirection(e.target.value)} style={{ padding: '0.25rem 0.5rem' }}>
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
            </div>

            <GradientEditor stops={gradStops} onChange={setGradStops} />
          </div>
        )}
      </div>
    </div>
  );
}
