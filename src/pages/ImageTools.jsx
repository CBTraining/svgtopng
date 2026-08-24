import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  PhotoIcon as ImageIcon, 
  CloudArrowUpIcon as UploadCloud, 
  ArrowDownTrayIcon as Download, 
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/solid';
import Dropzone from '../components/Dropzone';
import SendToDropdown from '../components/SendToDropdown';

const PRESETS = [
  { name: 'Normal', values: { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0, sepia: 0, hue: 0, invert: 0 } },
  { name: 'Vivid', values: { brightness: 105, contrast: 125, saturation: 140, blur: 0, grayscale: 0, sepia: 0, hue: 0, invert: 0 } },
  { name: 'B&W Vintage', values: { brightness: 100, contrast: 130, saturation: 0, blur: 0, grayscale: 100, sepia: 30, hue: 0, invert: 0 } },
  { name: 'Warm Glow', values: { brightness: 105, contrast: 110, saturation: 115, blur: 0, grayscale: 0, sepia: 35, hue: -10, invert: 0 } },
  { name: 'Cool Breeze', values: { brightness: 100, contrast: 110, saturation: 95, blur: 0, grayscale: 0, sepia: 0, hue: 180, invert: 0 } },
  { name: 'Dramatic', values: { brightness: 90, contrast: 150, saturation: 110, blur: 0, grayscale: 0, sepia: 0, hue: 0, invert: 0 } },
  { name: 'Soft Privacy Blur', values: { brightness: 100, contrast: 100, saturation: 100, blur: 12, grayscale: 0, sepia: 0, hue: 0, invert: 0 } },
  { name: 'Cyberpunk', values: { brightness: 110, contrast: 140, saturation: 160, blur: 0, grayscale: 0, sepia: 0, hue: 90, invert: 0 } }
];

export default function ImageTools() {
  const location = useLocation();
  const [imageFile, setImageFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [naturalWidth, setNaturalWidth] = useState(800);
  const [naturalHeight, setNaturalHeight] = useState(600);
  
  // Dimensions & Aspect Ratio
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [lockAspect, setLockAspect] = useState(true);
  const [radius, setRadius] = useState(0);

  // Filters & Adjustments
  const [brightness, setBrightness] = useState(100);   // 0% - 200%
  const [contrast, setContrast] = useState(100);       // 0% - 200%
  const [saturation, setSaturation] = useState(100);   // 0% - 200%
  const [blur, setBlur] = useState(0);                 // 0px - 40px
  const [grayscale, setGrayscale] = useState(0);       // 0% - 100%
  const [sepia, setSepia] = useState(0);               // 0% - 100%
  const [hue, setHue] = useState(0);                   // -180deg to +180deg
  const [invert, setInvert] = useState(0);             // 0% - 100%

  // Transform
  const [rotation, setRotation] = useState(0);         // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Output
  const [quality, setQuality] = useState(0.92);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [activeTab, setActiveTab] = useState('adjust'); // 'adjust', 'transform', 'presets'

  const canvasRef = useRef(null);
  const loadedImgRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  // Load a file into memory and cache the image element
  const loadFile = (file) => {
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageSrc(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImgRef.current = img;
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      setNaturalWidth(nw);
      setNaturalHeight(nh);
      setWidth(nw);
      setHeight(nh);
    };
    img.src = url;
  };

  // Load from location.state if navigated via drag or Send To
  useEffect(() => {
    if (location.state?.imageFile) {
      loadFile(location.state.imageFile);
      window.history.replaceState({}, document.title);
    } else if (location.state?.previewUrl || location.state?.imageUrl) {
      const url = location.state.previewUrl || location.state.imageUrl;
      setImageSrc(url);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImgRef.current = img;
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;
        setNaturalWidth(nw);
        setNaturalHeight(nh);
        setWidth(nw);
        setHeight(nh);
      };
      img.src = url;
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleWidthChange = (newWidth) => {
    setWidth(newWidth);
    if (lockAspect && naturalWidth > 0) {
      setHeight(Math.round(newWidth * (naturalHeight / naturalWidth)));
    }
  };

  const handleHeightChange = (newHeight) => {
    setHeight(newHeight);
    if (lockAspect && naturalHeight > 0) {
      setWidth(Math.round(newHeight * (naturalWidth / naturalHeight)));
    }
  };

  // Reset all adjustments
  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setGrayscale(0);
    setSepia(0);
    setHue(0);
    setInvert(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setRadius(0);
    if (naturalWidth > 0) {
      setWidth(naturalWidth);
      setHeight(naturalHeight);
    }
  };

  const applyPreset = (preset) => {
    const v = preset.values;
    setBrightness(v.brightness);
    setContrast(v.contrast);
    setSaturation(v.saturation);
    setBlur(v.blur);
    setGrayscale(v.grayscale);
    setSepia(v.sepia);
    setHue(v.hue);
    setInvert(v.invert);
  };

  // 60fps instant direct canvas rendering
  const renderCanvas = useCallback(() => {
    const img = loadedImgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    const isSideways = rotation === 90 || rotation === 270;
    const targetW = isSideways ? height : width;
    const targetH = isSideways ? width : height;

    canvas.width = targetW;
    canvas.height = targetH;

    ctx.clearRect(0, 0, targetW, targetH);

    // Rounded corners clipping
    if (radius > 0) {
      const r = Math.min(radius, targetW / 2, targetH / 2);
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(targetW - r, 0);
      ctx.quadraticCurveTo(targetW, 0, targetW, r);
      ctx.lineTo(targetW, targetH - r);
      ctx.quadraticCurveTo(targetW, targetH, targetW - r, targetH);
      ctx.lineTo(r, targetH);
      ctx.quadraticCurveTo(0, targetH, 0, targetH - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.clip();
    }

    // Apply Canvas Filters (Brightness, Contrast, Saturation, Blur, Grayscale, Sepia, Hue, Invert)
    const filterParts = [];
    if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filterParts.push(`saturate(${saturation}%)`);
    if (blur > 0) filterParts.push(`blur(${blur}px)`);
    if (grayscale > 0) filterParts.push(`grayscale(${grayscale}%)`);
    if (sepia > 0) filterParts.push(`sepia(${sepia}%)`);
    if (hue !== 0) filterParts.push(`hue-rotate(${hue}deg)`);
    if (invert > 0) filterParts.push(`invert(${invert}%)`);

    ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

    // Transformations (Rotate, Flip)
    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const drawW = isSideways ? targetH : targetW;
    const drawH = isSideways ? targetW : targetH;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [width, height, radius, brightness, contrast, saturation, blur, grayscale, sepia, hue, invert, rotation, flipH, flipV]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, naturalWidth, naturalHeight]);

  const handleDownload = (format = 'png') => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : format;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = imageFile?.name ? imageFile.name.replace(/\.[^/.]+$/, "") : 'edited-image';
      a.download = `${baseName}_edited.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, mime, quality);
  };

  const handleCopy = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error("Failed copying to clipboard:", err);
      }
    }, 'image/png');
  };

  return (
    <div className="animate-fade-in page-container">
      {/* Header */}
      <div className="page-header">
        <ImageIcon style={{ width: 32, height: 32, fill: "url(#accent-grad)" }} />
        <h1>Image Editor</h1>
      </div>
      <p style={{ marginTop: '-0.5rem', color: 'var(--text-secondary)' }}>
        Resize, crop, round corners, and apply Gaussian blur, brightness, contrast, and color filters with instant live preview.
      </p>

      {!imageSrc ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', borderStyle: 'dashed', borderColor: 'var(--border-color)', borderWidth: '2px', background: 'transparent' }}>
          <Dropzone 
            onDrop={(files) => {
              const file = Array.isArray(files) ? files[0] : files;
              loadFile(file);
            }}
            accept="image/*"
            title="Upload Image to Edit"
            subtitle="Drag & drop any JPG, PNG, WEBP, or SVG, or click to browse"
            icon={<UploadCloud style={{ width: 48, height: 48, color: 'var(--accent-color)' }} />}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Controls Column */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '0.3rem', borderRadius: 'var(--border-radius-sm)', gap: '0.3rem' }}>
              {[
                { id: 'adjust', label: 'Adjustments', icon: AdjustmentsHorizontalIcon },
                { id: 'transform', label: 'Transform', icon: ArrowsPointingOutIcon },
                { id: 'presets', label: 'Presets', icon: SparklesIcon }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className="btn"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.78rem',
                      border: 'none',
                      background: isActive ? 'var(--accent-color)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: isActive ? '600' : 'normal',
                      gap: '0.3rem'
                    }}
                  >
                    <Icon style={{ width: 14, height: 14 }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Adjustments */}
            {activeTab === 'adjust' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Gaussian Blur */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🌫️ Gaussian Blur</span>
                    <span style={{ color: blur > 0 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{blur}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="40" 
                    step="0.5" 
                    value={blur} 
                    onChange={(e) => setBlur(parseFloat(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>

                {/* Brightness */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>☀️ Brightness</span>
                    <span style={{ color: brightness !== 100 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{brightness}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    value={brightness} 
                    onChange={(e) => setBrightness(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>

                {/* Contrast */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🌓 Contrast</span>
                    <span style={{ color: contrast !== 100 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{contrast}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    value={contrast} 
                    onChange={(e) => setContrast(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>

                {/* Saturation */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🎨 Saturation</span>
                    <span style={{ color: saturation !== 100 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{saturation}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    value={saturation} 
                    onChange={(e) => setSaturation(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>

                {/* Grayscale */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>⚪ Black & White / Grayscale</span>
                    <span style={{ color: grayscale > 0 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{grayscale}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={grayscale} 
                    onChange={(e) => setGrayscale(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>

                {/* Sepia */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>📜 Vintage Sepia</span>
                    <span style={{ color: sepia > 0 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{sepia}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sepia} 
                    onChange={(e) => setSepia(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>

                {/* Hue Rotate */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🌈 Hue / Color Tint</span>
                    <span style={{ color: hue !== 0 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{hue}°</span>
                  </div>
                  <input 
                    type="range" 
                    min="-180" 
                    max="180" 
                    value={hue} 
                    onChange={(e) => setHue(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>

                {/* Invert */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>🔄 Invert Colors</span>
                    <span style={{ color: invert > 0 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{invert}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={invert} 
                    onChange={(e) => setInvert(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Transform & Geometry */}
            {activeTab === 'transform' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Dimensions */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Resolution & Scaling</span>
                    <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: lockAspect ? 'var(--accent-color)' : 'var(--text-muted)' }}>
                      <input 
                        type="checkbox" 
                        checked={lockAspect} 
                        onChange={(e) => setLockAspect(e.target.checked)} 
                      />
                      Lock Aspect Ratio ({(naturalWidth / naturalHeight).toFixed(2)})
                    </label>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Width (px)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={width} 
                        onChange={(e) => handleWidthChange(parseInt(e.target.value) || 10)} 
                        style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Height (px)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={height} 
                        onChange={(e) => handleHeightChange(parseInt(e.target.value) || 10)} 
                        style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  {/* Preset Dimension Scaling Buttons */}
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
                    {[0.25, 0.5, 0.75, 1, 1.5, 2].map(scale => (
                      <button
                        key={scale}
                        type="button"
                        className="btn"
                        onClick={() => {
                          setWidth(Math.round(naturalWidth * scale));
                          setHeight(Math.round(naturalHeight * scale));
                        }}
                        style={{ flex: 1, padding: '0.2rem 0.3rem', fontSize: '0.7rem', background: 'var(--bg-tertiary)' }}
                      >
                        {scale * 100}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Corner Radius */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>⭕ Corner Radius</span>
                    <span style={{ color: radius > 0 ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>{radius}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={Math.min(width, height) / 2} 
                    value={radius} 
                    onChange={(e) => setRadius(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>

                {/* Rotation & Flip */}
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                    Orientation & Flip
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                    <button 
                      type="button" 
                      className="btn" 
                      onClick={() => setRotation(r => (r + 270) % 360)}
                      style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                      title="Rotate 90° Counter-Clockwise"
                    >
                      ↺ -90°
                    </button>
                    <button 
                      type="button" 
                      className="btn" 
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                      title="Rotate 90° Clockwise"
                    >
                      ↻ +90°
                    </button>
                    <button 
                      type="button" 
                      className="btn" 
                      onClick={() => setFlipH(f => !f)}
                      style={{ padding: '0.4rem', fontSize: '0.75rem', background: flipH ? 'var(--accent-color)' : 'var(--bg-tertiary)' }}
                      title="Flip Horizontal"
                    >
                      ⇄ Flip H
                    </button>
                    <button 
                      type="button" 
                      className="btn" 
                      onClick={() => setFlipV(f => !f)}
                      style={{ padding: '0.4rem', fontSize: '0.75rem', background: flipV ? 'var(--accent-color)' : 'var(--bg-tertiary)' }}
                      title="Flip Vertical"
                    >
                      ⇅ Flip V
                    </button>
                  </div>
                </div>

                {/* JPEG Quality Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>JPEG / WEBP Quality</span>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{Math.round(quality * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05"
                    value={quality} 
                    onChange={(e) => setQuality(parseFloat(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                </div>

              </div>
            )}

            {/* Tab 3: Presets */}
            {activeTab === 'presets' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className="btn"
                    onClick={() => applyPreset(preset)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center'
                    }}
                  >
                    <SparklesIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{preset.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Global Reset */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn" 
                onClick={resetFilters} 
                style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
              >
                <ArrowPathIcon style={{ width: 14, height: 14 }} /> Reset Adjustments
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={() => { setImageSrc(null); setImageFile(null); loadedImgRef.current = null; }} 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: '#ff4444' }}
              >
                New Image
              </button>
            </div>

          </div>

          {/* Preview & Export Column */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Resolution: <strong style={{ color: 'var(--text-primary)' }}>{rotation === 90 || rotation === 270 ? height : width} × {rotation === 90 || rotation === 270 ? width : height} px</strong>
              </div>

              {/* Hold to View Original */}
              <button
                type="button"
                className="btn"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  background: showOriginal ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                  gap: '0.35rem'
                }}
                title="Press and hold to compare with original image"
              >
                <EyeIcon style={{ width: 14, height: 14 }} />
                {showOriginal ? 'Showing Original' : 'Hold to View Original'}
              </button>
            </div>

            {/* Direct Canvas Preview Container */}
            <div 
              className="checkerboard-bg"
              style={{
                borderRadius: 'var(--border-radius-sm)',
                overflow: 'hidden',
                maxHeight: '60vh',
                minHeight: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
            >
              {showOriginal && (
                <img 
                  src={imageSrc} 
                  alt="Original Source" 
                  style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain' }} 
                />
              )}

              {/* Visible Live Working Canvas */}
              <canvas 
                ref={canvasRef} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '55vh', 
                  objectFit: 'contain',
                  display: showOriginal ? 'none' : 'block'
                }} 
              />
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => handleDownload('png')}
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
              >
                <Download style={{ width: 16, height: 16 }} /> Download PNG
              </button>
              <button 
                className="btn" 
                onClick={() => handleDownload('jpeg')}
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
              >
                <Download style={{ width: 16, height: 16 }} /> Download JPG
              </button>
              <button 
                className="btn" 
                onClick={() => handleDownload('webp')}
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
              >
                <Download style={{ width: 16, height: 16 }} /> Download WEBP
              </button>
              <button 
                className="btn" 
                onClick={handleCopy}
                style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
              >
                {copySuccess ? <CheckIcon style={{ width: 16, height: 16, color: '#10b981' }} /> : <ClipboardDocumentIcon style={{ width: 16, height: 16 }} />}
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>

              <SendToDropdown 
                imageUrl={canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined} 
                file={imageFile} 
                mediaType="image" 
              />
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
