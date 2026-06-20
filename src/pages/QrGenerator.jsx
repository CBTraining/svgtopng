import { useState, useEffect, useRef } from 'react';
import { QrCodeIcon, ArrowDownTrayIcon, TrashIcon, BookmarkSquareIcon } from '@heroicons/react/24/solid';
import QRCodeStyling from 'qr-code-styling';

function ColorSwatches({ colors, onSelect }) {
  if (!colors || colors.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
      {colors.slice(0, 10).map((c, i) => (
        <div 
          key={i}
          onClick={() => onSelect(c)}
          style={{
            width: '20px', height: '20px', borderRadius: '4px', 
            backgroundColor: c, cursor: 'pointer', border: '1px solid var(--border-color)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
          title={c}
        />
      ))}
    </div>
  );
}

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
  const [data, setData] = useState('Place your URL here');
  const [size, setSize] = useState(300);
  const [isGradient, setIsGradient] = useState(true);
  const [singleColor, setSingleColor] = useState('#ffffff');
  const [color1, setColor1] = useState('#40E0D0');
  const [color2, setColor2] = useState('#12a5d1');
  const [isRounded, setIsRounded] = useState(true);
  const [savedColors, setSavedColors] = useState([]);
  const [savedPresets, setSavedPresets] = useState([]);
  
  const qrRef = useRef(null);
  const qrCodeInstance = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('colorPickerHistory');
    if (saved) {
      try {
        setSavedColors(JSON.parse(saved));
      } catch (e) {}
    }

    const savedP = localStorage.getItem('qrPresetsHistory');
    if (savedP) {
      try {
        setSavedPresets(JSON.parse(savedP));
      } catch (e) {}
    }

    qrCodeInstance.current = new QRCodeStyling({
      width: size,
      height: size,
      data: data,
      dotsOptions: {
        type: isRounded ? 'rounded' : 'square',
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
        color: 'transparent'
      }
    });

    if (qrRef.current) {
      qrRef.current.innerHTML = ''; // Clear old canvas
      qrCodeInstance.current.append(qrRef.current);
    }
  }, []);

  const handleColorBlur = () => {
    // Fix for Chrome bug where browser acts like a popup is still open
    setTimeout(() => {
      window.focus();
      if (document.activeElement) document.activeElement.blur();
    }, 50);
  };

  useEffect(() => {
    if (qrCodeInstance.current) {
      qrCodeInstance.current.update({
        width: size,
        height: size,
        data: data || ' ',
        dotsOptions: {
          type: isRounded ? 'rounded' : 'square',
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
        }
      });
    }
  }, [data, size, color1, color2, isRounded, isGradient, singleColor]);

  const downloadQR = (ext) => {
    if (qrCodeInstance.current) {
      qrCodeInstance.current.download({ name: 'qrcode', extension: ext });
    }
  };

  const handleSavePreset = () => {
    const newPreset = {
      id: Date.now().toString(),
      isGradient,
      singleColor,
      color1,
      color2,
      isRounded
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
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h1 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><QrCodeIcon style={{width: 32, height: 32}}/> QR Code Generator</h1>
          <p style={{marginTop: '0.5rem', color: 'var(--text-secondary)'}}>Create highly customizable, beautiful QR codes instantly.</p>
        </div>
      </header>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))', gap: '2rem', alignItems: 'start' }}>
        <div className="glass-panel controls">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Customization</h3>
            <button className="btn" onClick={handleSavePreset} title="Save current styles as a preset">
              <BookmarkSquareIcon width={16} /> Save Preset
            </button>
          </div>
          
          <div className="control-group">
            <label>Payload (URL or Text)</label>
            <input 
              type="text" 
              className="text-input" 
              value={data} 
              onChange={(e) => setData(e.target.value)} 
              placeholder="Enter text or URL here"
            />
          </div>

          <div className="control-group" style={{marginTop: '1.5rem'}}>
            <label>Download Size ({size}px)</label>
            <input 
              type="range" 
              min="200" 
              max="2000" 
              value={size} 
              onChange={(e) => setSize(Number(e.target.value))} 
              style={{width: '100%'}}
            />
          </div>

          <div className="control-group" style={{marginTop: '1.5rem'}}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Colors
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'normal' }}>
                <input 
                  type="checkbox" 
                  checked={isGradient} 
                  onChange={(e) => setIsGradient(e.target.checked)} 
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
                    style={{width: '100%', height: '40px', cursor: 'pointer', border: 'none', background: 'none'}}
                  />
                  <ColorSwatches colors={savedColors} onSelect={setColor1} />
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    type="color" 
                    value={color2} 
                    onChange={(e) => setColor2(e.target.value)} 
                    onBlur={handleColorBlur}
                    style={{width: '100%', height: '40px', cursor: 'pointer', border: 'none', background: 'none'}}
                  />
                  <ColorSwatches colors={savedColors} onSelect={setColor2} />
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '0.5rem' }}>
                <input 
                  type="color" 
                  value={singleColor} 
                  onChange={(e) => setSingleColor(e.target.value)} 
                  onBlur={handleColorBlur}
                  style={{width: '100%', height: '40px', cursor: 'pointer', border: 'none', background: 'none'}}
                />
                <ColorSwatches colors={savedColors} onSelect={setSingleColor} />
              </div>
            )}
          </div>

          <div className="control-group" style={{marginTop: '1.5rem'}}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isRounded} 
                onChange={(e) => setIsRounded(e.target.checked)} 
              />
              Use Rounded Dots
            </label>
          </div>

          <PresetGallery presets={savedPresets} onApply={handleApplyPreset} onDelete={handleDeletePreset} />

        </div>

        <div className="glass-panel preview">
          <h3>Preview</h3>
          <div className="qr-preview-container" style={{ 
            marginTop: '1rem', 
            background: 'var(--bg-secondary)', 
            backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            padding: '1.5rem', 
            borderRadius: 'var(--border-radius)', 
            display: 'inline-block' 
          }}>
            <div ref={qrRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}></div>
          </div>
          
          <div className="button-group" style={{marginTop: '2rem'}}>
            <button className="btn btn-primary" onClick={() => downloadQR('png')}>
              <ArrowDownTrayIcon style={{width: 18, height: 18}} /> Download PNG
            </button>
            <button className="btn" onClick={() => downloadQR('svg')}>
              <ArrowDownTrayIcon style={{width: 18, height: 18}} /> Download SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
