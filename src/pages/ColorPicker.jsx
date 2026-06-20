import { useState, useEffect } from 'react';
import { EyeDropperIcon as EyeDropper, DocumentDuplicateIcon as CopyIcon, CheckIcon as Check, TrashIcon as Trash } from '@heroicons/react/24/solid';

export default function ColorPicker() {
  const [colors, setColors] = useState([]);
  const [copiedColor, setCopiedColor] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check API support
    if (!window.EyeDropper) {
      setIsSupported(false);
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

  const saveColors = (newColors) => {
    setColors(newColors);
    localStorage.setItem('colorPickerHistory', JSON.stringify(newColors));
  };

  const pickColor = async () => {
    if (!window.EyeDropper) {
      alert("Your browser does not support the EyeDropper API. Try using Chrome or Edge.");
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const hex = result.sRGBHex.toUpperCase();
      // Add to front of history, avoid duplicates if it's the very first one
      const newColors = [hex, ...colors.filter(c => c !== hex)];
      saveColors(newColors);
    } catch (e) {
      // User canceled the picker
      console.log("EyeDropper canceled", e);
    } finally {
      // Fix for Chrome bug where browser acts like a popup is still open
      // We must run this even if the user cancels the eyedropper, otherwise the UI stays frozen.
      setTimeout(() => {
        window.focus();
        if (document.activeElement) document.activeElement.blur();
      }, 50);
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
          {!isSupported && (
            <div style={{ background: 'rgba(255, 50, 50, 0.1)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '2rem', color: '#ff6b6b' }}>
              <strong>Browser Unsupported:</strong> The EyeDropper API is currently only supported in Chromium browsers (Chrome, Edge, Opera).
            </div>
          )}
          
          <button 
            className="btn btn-primary" 
            onClick={pickColor}
            disabled={!isSupported}
            style={{ fontSize: '1.2rem', padding: '1rem 2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', borderRadius: '50px' }}
          >
            <EyeDropper style={{width: 24, height: 24}}/>
            Pick Color from Screen
          </button>
          
          <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
            Clicking the button will open a magnifying glass. Click anywhere on your screen (even outside the browser!) to capture the color.
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
    </div>
  );
}
