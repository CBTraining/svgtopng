import { useState, useEffect, useRef } from 'react';
import { 
  QrCodeIcon, 
  ArrowDownTrayIcon, 
  TrashIcon, 
  BookmarkSquareIcon, 
  PhotoIcon, 
  XMarkIcon, 
  ClipboardDocumentIcon, 
  CheckIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';
import QRCodeStyling from 'qr-code-styling';

function PresetGallery({ presets, onApply, onDelete }) {
  if (!presets || presets.length === 0) return null;
  return (
    <div style={{ marginTop: '2rem' }}>
      <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Saved Presets</h4>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {presets.map(preset => (
          <div key={preset.id} className="glass-panel" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
            <div 
              style={{
                width: '40px', height: '40px', borderRadius: preset.isRounded ? '50%' : '4px',
                background: preset.isGradient 
                  ? `linear-gradient(135deg, ${preset.color1}, ${preset.color2})` 
                  : preset.singleColor,
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
              onClick={() => onApply(preset)}
              title="Apply preset"
            />
            <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: '#ff4444' }} onClick={() => onDelete(preset.id)} title="Delete preset">
              <TrashIcon width={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QrGenerator() {
  const [data, setData] = useState('https://google.com');
  const [size, setSize] = useState(320);
  const [isGradient, setIsGradient] = useState(true);
  const [singleColor, setSingleColor] = useState('#ffffff');
  const [color1, setColor1] = useState('#40E0D0');
  const [color2, setColor2] = useState('#12a5d1');
  const [bgColor, setBgColor] = useState('transparent');
  const [isRounded, setIsRounded] = useState(true);
  const [dotType, setDotType] = useState('rounded'); // 'rounded', 'dots', 'classy-rounded', 'square', 'extra-rounded'
  
  // Center Logo / SVG Options
  const [rawLogoUrl, setRawLogoUrl] = useState('');
  const [processedLogoUrl, setProcessedLogoUrl] = useState('');
  const [logoFileName, setLogoFileName] = useState('');
  const [logoSize, setLogoSize] = useState(0.26); // 26% of QR size (safe threshold)
  const [logoMargin, setLogoMargin] = useState(4); // 4px safe margin
  const [logoShape, setLogoShape] = useState('auto'); // 'auto', 'circle', 'rounded', 'square'
  const [logoBgColor, setLogoBgColor] = useState('#ffffff'); // White background badge by default for maximum scan contrast
  const [logoBgPadding, setLogoBgPadding] = useState(10); // 10% padding
  const [hideDotsBehindLogo, setHideDotsBehindLogo] = useState(true);
  const [errorCorrection, setErrorCorrection] = useState('H'); // 'H' (30%) is essential for reliable logo scanning!
  
  const [savedPresets, setSavedPresets] = useState([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  
  const qrRef = useRef(null);
  const qrCodeInstance = useRef(null);
  const logoInputRef = useRef(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (rawLogoUrl && rawLogoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(rawLogoUrl);
      }
    };
  }, [rawLogoUrl]);

  // Pre-process Logo to match QR Code Roundness & Shape
  useEffect(() => {
    if (!rawLogoUrl) {
      setProcessedLogoUrl('');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const sz = 512; // High-resolution logo badge
      canvas.width = sz;
      canvas.height = sz;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, sz, sz);

      // Determine corner radius matching QR style
      let effectiveShape = logoShape;
      if (effectiveShape === 'auto') {
        if (dotType === 'dots') {
          effectiveShape = 'circle';
        } else if (dotType === 'square') {
          effectiveShape = 'square';
        } else {
          effectiveShape = 'rounded';
        }
      }

      let radius = 0;
      if (effectiveShape === 'circle') {
        radius = sz / 2;
      } else if (effectiveShape === 'rounded') {
        radius = sz * 0.22;
      } else if (effectiveShape === 'square') {
        radius = 0;
      }

      // Draw background badge if not transparent
      if (logoBgColor !== 'transparent') {
        ctx.fillStyle = logoBgColor;
        ctx.beginPath();
        if (radius > 0 && ctx.roundRect) {
          ctx.roundRect(0, 0, sz, sz, radius);
        } else if (radius > 0) {
          ctx.arc(sz / 2, sz / 2, radius, 0, Math.PI * 2);
        } else {
          ctx.rect(0, 0, sz, sz);
        }
        ctx.fill();
      }

      // Clip inner logo to the matching radius
      ctx.save();
      ctx.beginPath();
      if (radius > 0 && ctx.roundRect) {
        ctx.roundRect(0, 0, sz, sz, radius);
      } else if (radius > 0) {
        ctx.arc(sz / 2, sz / 2, radius, 0, Math.PI * 2);
      } else {
        ctx.rect(0, 0, sz, sz);
      }
      ctx.clip();

      // Contain-fit aspect ratio for the logo inside the padded area
      const imgAspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      const pad = logoBgColor !== 'transparent' ? (logoBgPadding * (sz / 100)) : 0;
      const drawArea = sz - pad * 2;
      let dW = drawArea;
      let dH = drawArea;
      let dX = pad;
      let dY = pad;

      if (imgAspect > 1) {
        dH = drawArea / imgAspect;
        dY = pad + (drawArea - dH) / 2;
      } else {
        dW = drawArea * imgAspect;
        dX = pad + (drawArea - dW) / 2;
      }

      ctx.drawImage(img, dX, dY, dW, dH);
      ctx.restore();

      setProcessedLogoUrl(canvas.toDataURL('image/png'));
    };
    img.src = rawLogoUrl;
  }, [rawLogoUrl, logoShape, logoBgColor, logoBgPadding, dotType, isRounded]);

  // Load Saved Presets
  useEffect(() => {
    const savedP = localStorage.getItem('qrPresetsHistory');
    if (savedP) {
      try {
        setSavedPresets(JSON.parse(savedP));
      } catch (e) {}
    } else {
      setSavedPresets([
        {
          id: 'default-black',
          isGradient: false,
          singleColor: '#000000',
          color1: '#000000',
          color2: '#000000',
          isRounded: true,
          dotType: 'rounded'
        },
        {
          id: 'default-cyan',
          isGradient: true,
          singleColor: '#40E0D0',
          color1: '#40E0D0',
          color2: '#12a5d1',
          isRounded: true,
          dotType: 'rounded'
        }
      ]);
    }

    qrCodeInstance.current = new QRCodeStyling({
      width: size,
      height: size,
      data: data || ' ',
      image: processedLogoUrl || '',
      qrOptions: {
        errorCorrectionLevel: errorCorrection
      },
      imageOptions: {
        hideBackgroundDots: hideDotsBehindLogo,
        imageSize: logoSize,
        margin: logoMargin,
        crossOrigin: 'anonymous'
      },
      dotsOptions: {
        type: dotType,
        ...(isGradient ? {
          gradient: {
            type: 'linear',
            rotation: 0.785398, // 45 degrees
            colorStops: [
              { offset: 0, color: color1 },
              { offset: 1, color: color2 }
            ]
          }
        } : {
          color: singleColor
        })
      },
      cornersSquareOptions: {
        type: isRounded ? 'extra-rounded' : 'square'
      },
      backgroundOptions: {
        color: bgColor
      }
    });

    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qrCodeInstance.current.append(qrRef.current);
    }
  }, []);

  // Update QR Code on state changes
  useEffect(() => {
    if (qrCodeInstance.current) {
      qrCodeInstance.current.update({
        width: size,
        height: size,
        data: data || ' ',
        image: processedLogoUrl || '',
        qrOptions: {
          errorCorrectionLevel: errorCorrection
        },
        imageOptions: {
          hideBackgroundDots: hideDotsBehindLogo,
          imageSize: logoSize,
          margin: logoMargin,
          crossOrigin: 'anonymous'
        },
        dotsOptions: {
          type: dotType,
          ...(isGradient ? {
            gradient: {
              type: 'linear',
              rotation: 0.785398,
              colorStops: [
                { offset: 0, color: color1 },
                { offset: 1, color: color2 }
              ]
            }
          } : {
            gradient: null,
            color: singleColor
          })
        },
        cornersSquareOptions: {
          type: isRounded ? 'extra-rounded' : 'square'
        },
        backgroundOptions: {
          color: bgColor
        }
      });
    }
  }, [data, size, color1, color2, isRounded, isGradient, singleColor, bgColor, dotType, processedLogoUrl, logoSize, logoMargin, hideDotsBehindLogo, errorCorrection]);

  const handleColorBlur = () => {
    setTimeout(() => {
      window.focus();
      if (document.activeElement) document.activeElement.blur();
    }, 50);
  };

  const handleLogoFile = (file) => {
    if (!file) return;
    if (rawLogoUrl && rawLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(rawLogoUrl);
    }

    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const svgText = e.target.result;
        const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setRawLogoUrl(url);
        setLogoFileName(file.name);
        setErrorCorrection('H'); // Auto boost error correction to High (30%) for reliable scanning!
      };
      reader.readAsText(file);
    } else {
      const url = URL.createObjectURL(file);
      setRawLogoUrl(url);
      setLogoFileName(file.name);
      setErrorCorrection('H'); // Auto boost error correction to High (30%) for reliable scanning!
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) handleLogoFile(file);
  };

  const handleRemoveLogo = () => {
    if (rawLogoUrl && rawLogoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(rawLogoUrl);
    }
    setRawLogoUrl('');
    setProcessedLogoUrl('');
    setLogoFileName('');
    if (logoInputRef.current) logoInputRef.current.value = null;
  };

  const downloadQR = (ext) => {
    if (qrCodeInstance.current) {
      qrCodeInstance.current.download({ name: `qrcode-${Date.now()}`, extension: ext });
    }
  };

  const handleCopyQR = async () => {
    if (!qrRef.current) return;
    try {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        });
      }
    } catch (err) {
      console.error("Failed to copy QR code", err);
      alert("Unable to copy to clipboard directly. Please use Download PNG.");
    }
  };

  const handleSavePreset = () => {
    const newPreset = {
      id: Date.now().toString(),
      isGradient,
      singleColor,
      color1,
      color2,
      isRounded,
      dotType
    };
    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    localStorage.setItem('qrPresetsHistory', JSON.stringify(updated));
  };

  const handleDeletePreset = (id) => {
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('qrPresetsHistory', JSON.stringify(updated));
  };

  const handleApplyPreset = (preset) => {
    setIsGradient(preset.isGradient);
    setSingleColor(preset.singleColor);
    setColor1(preset.color1);
    setColor2(preset.color2);
    setIsRounded(preset.isRounded);
    if (preset.dotType) setDotType(preset.dotType);
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCodeIcon style={{ width: 32, height: 32 }} /> QR Code Generator
          </h1>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Create scannable, high-resolution QR codes with custom SVG/image center logos matching QR roundness, gradients, and custom styles.
          </p>
        </div>
      </header>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '2rem', alignItems: 'start' }}>
        <div className="glass-panel controls">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Customization</h3>
            <button className="btn" onClick={handleSavePreset} title="Save current styles as a preset" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              <BookmarkSquareIcon width={16} /> Save Preset
            </button>
          </div>
          
          {/* Payload */}
          <div className="control-group">
            <label>Payload (URL or Text)</label>
            <input 
              type="text" 
              className="text-input" 
              value={data} 
              onChange={(e) => setData(e.target.value)} 
              placeholder="https://example.com"
              style={{ width: '100%' }}
            />
          </div>

          {/* Center Logo / SVG Section */}
          <div className="control-group" style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PhotoIcon style={{ width: 18, height: 18, color: 'var(--accent-color)' }} /> Center Logo / SVG
              </label>
              {rawLogoUrl && (
                <button 
                  onClick={handleRemoveLogo}
                  style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <XMarkIcon style={{ width: 14, height: 14 }} /> Remove Logo
                </button>
              )}
            </div>

            {!rawLogoUrl ? (
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsLogoDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsLogoDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsLogoDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleLogoFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => logoInputRef.current && logoInputRef.current.click()}
                style={{
                  border: isLogoDragging ? '2px dashed var(--accent-color)' : '2px dashed var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '1.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isLogoDragging ? 'rgba(59,130,246,0.1)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <input 
                  ref={logoInputRef}
                  type="file" 
                  accept=".svg,.png,.jpg,.jpeg,.webp,.ico" 
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }} 
                />
                <PhotoIcon style={{ width: 32, height: 32, margin: '0 auto 0.5rem', color: 'var(--text-secondary)' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-primary)' }}>Click to upload SVG or Image logo</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Supports .SVG, .PNG, .JPG, .WEBP</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--border-radius-sm)' }}>
                  <img 
                    src={processedLogoUrl || rawLogoUrl} 
                    alt="Center Logo Preview" 
                    style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#ffffff', borderRadius: logoShape === 'circle' || (logoShape === 'auto' && dotType === 'dots') ? '50%' : '6px', padding: '2px', border: '1px solid var(--border-color)' }} 
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {logoFileName || 'Custom Logo'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <SparklesIcon style={{ width: 12, height: 12 }} /> Auto-shaped to QR roundness
                    </div>
                  </div>
                  <label className="btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                    Change
                    <input 
                      type="file" 
                      accept=".svg,.png,.jpg,.jpeg,.webp,.ico" 
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>

                {/* Logo Shape & Roundness Matching */}
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                    Logo Corner Roundness
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                    {[
                      { label: 'Auto (Match QR)', value: 'auto' },
                      { label: 'Circle', value: 'circle' },
                      { label: 'Rounded', value: 'rounded' },
                      { label: 'Square', value: 'square' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className="btn"
                        onClick={() => setLogoShape(opt.value)}
                        style={{
                          padding: '0.3rem 0.35rem',
                          fontSize: '0.7rem',
                          background: logoShape === opt.value ? 'var(--accent-color)' : 'var(--bg-secondary)',
                          color: 'white',
                          border: logoShape === opt.value ? '1px solid var(--accent-color)' : '1px solid var(--border-color)'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo Background Badge Color */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Logo Background Badge</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High contrast for dark/light themes</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {[
                      { label: 'White', color: '#ffffff' },
                      { label: 'Dark', color: '#090d16' },
                      { label: 'Transparent', color: 'transparent' }
                    ].map(bg => (
                      <button
                        key={bg.color}
                        type="button"
                        className="btn"
                        onClick={() => setLogoBgColor(bg.color)}
                        style={{
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.75rem',
                          background: logoBgColor === bg.color ? 'var(--accent-color)' : 'var(--bg-secondary)',
                          color: 'white',
                          border: logoBgColor === bg.color ? '1px solid var(--accent-color)' : '1px solid var(--border-color)'
                        }}
                      >
                        {bg.label}
                      </button>
                    ))}
                    {logoBgColor !== 'transparent' && (
                      <input 
                        type="color" 
                        value={logoBgColor.startsWith('#') ? logoBgColor : '#ffffff'} 
                        onChange={(e) => setLogoBgColor(e.target.value)} 
                        style={{ width: '32px', height: '28px', border: 'none', background: 'none', cursor: 'pointer' }}
                        title="Custom badge color"
                      />
                    )}
                  </div>
                </div>

                {/* Logo Size */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Logo Size</span>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{Math.round(logoSize * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.10" 
                    max="0.34" 
                    step="0.02" 
                    value={logoSize} 
                    onChange={(e) => setLogoSize(parseFloat(e.target.value))} 
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Keep under 30% for guaranteed camera detection.
                  </div>
                </div>

                {/* Logo Margin */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Logo Safe Margin</span>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{logoMargin}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="16" 
                    step="1" 
                    value={logoMargin} 
                    onChange={(e) => setLogoMargin(parseInt(e.target.value))} 
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                {/* Hide Background Dots */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={hideDotsBehindLogo} 
                    onChange={(e) => setHideDotsBehindLogo(e.target.checked)} 
                    className="accent-primary"
                  />
                  Clear QR dots behind logo (Recommended)
                </label>
              </div>
            )}
          </div>

          {/* Error Correction Level */}
          <div className="control-group" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheckIcon style={{ width: 16, height: 16, color: '#10b981' }} /> Error Correction Level
              </label>
              <span style={{ fontSize: '0.75rem', color: errorCorrection === 'H' ? '#10b981' : 'var(--text-secondary)' }}>
                {errorCorrection === 'H' ? 'High (30% - Best for Logos)' : errorCorrection === 'Q' ? 'Quartile (25%)' : errorCorrection === 'M' ? 'Medium (15%)' : 'Low (7%)'}
              </span>
            </div>
            <select 
              className="input-field" 
              value={errorCorrection} 
              onChange={(e) => setErrorCorrection(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)' }}
            >
              <option value="H">High (H - 30% recovery, Essential for Logos)</option>
              <option value="Q">Quartile (Q - 25% recovery)</option>
              <option value="M">Medium (M - 15% recovery)</option>
              <option value="L">Low (L - 7% recovery, No Logo)</option>
            </select>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              High level allows up to 30% of the QR code to be covered by a logo while remaining 100% readable.
            </div>
          </div>

          {/* Colors */}
          <div className="control-group" style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              QR Pattern Colors
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'normal' }}>
                <input 
                  type="checkbox" 
                  checked={isGradient} 
                  onChange={(e) => setIsGradient(e.target.checked)} 
                  className="accent-primary"
                />
                Use Gradient
              </label>
            </label>
            
            {isGradient ? (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="color" 
                    value={color1} 
                    onChange={(e) => setColor1(e.target.value)} 
                    onBlur={handleColorBlur}
                    style={{ width: '100%', height: '40px', cursor: 'pointer', border: 'none', background: 'none', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    type="color" 
                    value={color2} 
                    onChange={(e) => setColor2(e.target.value)} 
                    onBlur={handleColorBlur}
                    style={{ width: '100%', height: '40px', cursor: 'pointer', border: 'none', background: 'none', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '0.5rem' }}>
                <input 
                  type="color" 
                  value={singleColor} 
                  onChange={(e) => setSingleColor(e.target.value)} 
                  onBlur={handleColorBlur}
                  style={{ width: '100%', height: '40px', cursor: 'pointer', border: 'none', background: 'none', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}
                />
              </div>
            )}
          </div>

          {/* Dot Pattern Shapes */}
          <div className="control-group" style={{ marginTop: '1.5rem' }}>
            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Dot Pattern Style</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {[
                { label: 'Rounded', value: 'rounded' },
                { label: 'Dots', value: 'dots' },
                { label: 'Classy', value: 'classy-rounded' },
                { label: 'Square', value: 'square' },
                { label: 'Extra Round', value: 'extra-rounded' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className="btn"
                  onClick={() => {
                    setDotType(opt.value);
                    setIsRounded(opt.value !== 'square');
                  }}
                  style={{
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.75rem',
                    background: dotType === opt.value ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                    color: 'white',
                    border: dotType === opt.value ? '1px solid var(--accent-color)' : '1px solid var(--border-color)'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Download Size */}
          <div className="control-group" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <label>Export Resolution</label>
              <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{size} x {size} px</span>
            </div>
            <input 
              type="range" 
              min="200" 
              max="2000" 
              step="40"
              value={size} 
              onChange={(e) => setSize(Number(e.target.value))} 
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <PresetGallery presets={savedPresets} onApply={handleApplyPreset} onDelete={handleDeletePreset} />
        </div>

        {/* Live Preview Panel */}
        <div className="glass-panel preview" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ width: '100%', textAlign: 'left', marginTop: 0 }}>Live Preview</h3>
          
          <div 
            className="qr-preview-container" 
            style={{ 
              marginTop: '1rem', 
              background: 'linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.05) 75%) #090d16',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              padding: '1.5rem', 
              borderRadius: 'var(--border-radius)', 
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              maxWidth: '100%',
              overflow: 'hidden'
            }}
          >
            <div ref={qrRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '100%' }}></div>
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Error Correction: <strong style={{ color: '#10b981' }}>{errorCorrection} (30% Recovery)</strong> {rawLogoUrl ? '• Logo Active' : ''}
          </div>
          
          <div className="button-group" style={{ marginTop: '1.5rem', width: '100%', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => downloadQR('png')}>
              <ArrowDownTrayIcon style={{ width: 18, height: 18 }} /> Download PNG
            </button>
            <button className="btn" onClick={() => downloadQR('svg')}>
              <ArrowDownTrayIcon style={{ width: 18, height: 18 }} /> Download SVG
            </button>
            <button className="btn" onClick={handleCopyQR}>
              {isCopied ? <CheckIcon style={{ width: 18, height: 18, color: '#10b981' }} /> : <ClipboardDocumentIcon style={{ width: 18, height: 18 }} />}
              {isCopied ? 'Copied!' : 'Copy PNG'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
