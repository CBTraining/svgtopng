import { useState, useEffect, useRef } from 'react';
import { EyeDropperIcon as EyeDropper, DocumentDuplicateIcon as CopyIcon, CheckIcon as Check, TrashIcon as Trash, SwatchIcon } from '@heroicons/react/24/solid';

const hexToHSL = (hex) => {
  if (!hex || hex.length < 7) return [0, 0, 0];
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const hslToHex = (h, s, l) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

const generateScheme = (baseHex) => {
  if (!baseHex) return null;
  const [h, s, l] = hexToHSL(baseHex);
  
  return [
    { label: 'Complementary', hex: hslToHex((h + 180) % 360, s, l) },
    { label: 'Analogous', hex: hslToHex((h + 30) % 360, s, l) },
    { label: 'Analogous', hex: hslToHex((h + 330) % 360, s, l) },
    { label: 'Triadic', hex: hslToHex((h + 120) % 360, s, l) },
    { label: 'Triadic', hex: hslToHex((h + 240) % 360, s, l) }
  ];
};

export default function ColorPicker() {
  const [colors, setColors] = useState([]);
  const [copiedColor, setCopiedColor] = useState(null);
  const [isDropping, setIsDropping] = useState(false);
  const [useNative, setUseNative] = useState(true);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    // Check API support and OS
    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
    if (!window.EyeDropper || isWindows) {
      setUseNative(false);
    }
    // Load history
    const saved = localStorage.getItem('colorPickerHistory');
    if (saved) {
      try {
        setColors(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse color history");
      }
    }
  }, []);

  const handleFallbackColorChange = (e) => {
    const hex = e.target.value.toUpperCase();
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      // Add to history
      setColors(prev => {
        if (prev[0] === hex) return prev; // avoid immediate duplicate
        const newColors = [hex, ...prev.filter(c => c !== hex)];
        localStorage.setItem('colorPickerHistory', JSON.stringify(newColors));
        return newColors;
      });
      // Copy to clipboard
      navigator.clipboard.writeText(hex).then(() => {
        setCopiedColor(hex);
        setTimeout(() => setCopiedColor(null), 2000);
      }).catch(err => console.error("Clipboard copy failed", err));
    }, 600); // 600ms pause means they have finalized their color
  };

  const saveColors = (newColors) => {
    setColors(newColors);
    localStorage.setItem('colorPickerHistory', JSON.stringify(newColors));
  };

  const pickColor = async () => {
    if (!window.EyeDropper) {
      alert("Your browser does not support the EyeDropper API. Try using Chrome or Edge.");
      return;
    }
    
    setIsDropping(true);
    const abortController = new AbortController();
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open({ signal: abortController.signal });
      abortController.abort(); // Force cleanup of native modal window handle on Windows 11
      const hex = result.sRGBHex.toUpperCase();
      // Add to front of history, avoid duplicates if it's the very first one
      const newColors = [hex, ...colors.filter(c => c !== hex)];
      saveColors(newColors);
    } catch (e) {
      // User canceled the picker
      console.log("EyeDropper canceled", e);
    } finally {
      // Small timeout ensures the native picker fully closes before we re-enable the button
      setTimeout(() => setIsDropping(false), 200);
    }
  };

  const copyToClipboard = (color, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(color).then(() => {
      setCopiedColor(color);
      setTimeout(() => setCopiedColor(null), 2000);
    });
  };

  const deleteColor = (colorToDelete, e) => {
    if (e) e.stopPropagation();
    const newColors = colors.filter(c => c !== colorToDelete);
    saveColors(newColors);
  };

  const clearAll = () => {
    saveColors([]);
  };

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h1 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <EyeDropper style={{width: 32, height: 32}}/> Color Picker
          </h1>
          <p style={{marginTop: '0.5rem', color: 'var(--text-secondary)'}}>
            Pick any color from your screen using the native eyedropper, and save your palette history.
          </p>
        </div>
      </header>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '2rem', alignItems: 'start' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          {!useNative && !window.EyeDropper && (
            <div style={{ background: 'rgba(255, 50, 50, 0.1)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '2rem', color: '#ff6b6b' }}>
              <strong>Browser Unsupported:</strong> The EyeDropper API is currently only supported in Chromium browsers (Chrome, Edge, Opera).
            </div>
          )}
          
          {useNative ? (
            <button 
              className="btn btn-primary" 
              onClick={pickColor}
              disabled={isDropping}
              style={{ fontSize: '1.2rem', padding: '1rem 2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', borderRadius: '50px' }}
            >
              <EyeDropper style={{width: 24, height: 24}}/> 
              {isDropping ? 'Picking...' : 'Pick Color'}
            </button>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input 
                type="color" 
                onChange={handleFallbackColorChange}
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  width: '100%', 
                  height: '100%', 
                  opacity: 0, 
                  cursor: 'pointer',
                  zIndex: 10
                }}
              />
              <button 
                className="btn btn-primary" 
                style={{ fontSize: '1.2rem', padding: '1rem 2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', borderRadius: '50px', pointerEvents: 'none' }}
              >
                <EyeDropper style={{width: 24, height: 24}}/> 
                Pick Color
              </button>
            </div>
          )}
          
          <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
            {useNative 
              ? "Clicking the button will open a magnifying glass. Click anywhere on your screen to capture the color."
              : "Click the button to open the color picker. You can use the eyedropper icon inside the dialog to pick from your screen."}
          </p>
        </div>

        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Color History</h3>
            {colors.length > 0 && (
              <button className="btn" onClick={clearAll} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                Clear All
              </button>
            )}
          </div>
          
          {colors.length === 0 ? (
            <div className="empty-state">
              <EyeDropper style={{width: 48, height: 48, opacity: 0.5, marginBottom: '1rem'}}/>
              <p>Your saved colors will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
              {colors.map((color, i) => (
                <div 
                  key={`${color}-${i}`}
                  onClick={() => copyToClipboard(color)}
                  style={{ 
                    background: color, 
                    height: '100px', 
                    borderRadius: 'var(--border-radius-sm)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    position: 'relative',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
                    e.currentTarget.querySelector('.delete-btn').style.opacity = '1';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
                    e.currentTarget.querySelector('.delete-btn').style.opacity = '0';
                  }}
                >
                  <button 
                    className="delete-btn"
                    onClick={(e) => deleteColor(color, e)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      padding: '4px'
                    }}
                    title="Remove color"
                  >
                    <Trash />
                  </button>
                  
                  {copiedColor === color ? (
                    <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                      <Check style={{width: 20, height: 20}}/> Copied!
                    </span>
                  ) : (
                    color
                  )}
                  
                  <span style={{
                    fontSize: '0.8rem', 
                    opacity: 0.8, 
                    marginTop: '0.5rem',
                    fontWeight: 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <CopyIcon style={{width: 14, height: 14}}/> Click to copy
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Toast Notification */}
      {copiedColor && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          padding: '0.75rem 1.5rem',
          borderRadius: '50px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--accent-gradient)',
          color: 'white',
          fontWeight: 'bold'
        }}>
          <Check style={{width: 24, height: 24}}/>
          {copiedColor} copied to clipboard!
        </div>
      )}
      
      {colors.length > 0 && (
        <div className="glass-panel" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <SwatchIcon style={{width: 24, height: 24, color: 'var(--accent-color)'}} />
            <h3 style={{ margin: 0 }}>Color Scheme (Based on Latest)</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            {generateScheme(colors[0]).map((item, i) => (
              <div 
                key={`${item.hex}-${i}`}
                onClick={() => copyToClipboard(item.hex)}
                style={{ 
                  background: item.hex, 
                  height: '120px', 
                  borderRadius: 'var(--border-radius-sm)', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
                }}
              >
                {copiedColor === item.hex ? (
                  <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                    <Check style={{width: 20, height: 20}}/> Copied!
                  </span>
                ) : (
                  item.hex
                )}
                
                <span style={{
                  fontSize: '0.8rem', 
                  opacity: 0.9, 
                  marginTop: '0.5rem',
                  fontWeight: 'normal',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
