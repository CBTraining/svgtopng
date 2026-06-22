import { useState, useEffect } from 'react';

export default function AspectRatioCalc() {
  const [origW, setOrigW] = useState(1920);
  const [origH, setOrigH] = useState(1080);
  const [newW, setNewW] = useState(1280);
  const [newH, setNewH] = useState(720);
  const [ratioStr, setRatioStr] = useState('16:9');

  useEffect(() => {
    // Calculate aspect ratio string
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(origW, origH);
    if (divisor > 0) {
      setRatioStr(`${origW / divisor}:${origH / divisor}`);
    } else {
      setRatioStr('?:?');
    }
  }, [origW, origH]);

  const handleOrigW = (val) => {
    const w = parseInt(val) || 0;
    setOrigW(w);
    if (w > 0 && origH > 0) setNewH(Math.round((newW / w) * origH));
  };

  const handleOrigH = (val) => {
    const h = parseInt(val) || 0;
    setOrigH(h);
    if (h > 0 && origW > 0) setNewW(Math.round((newH / h) * origW));
  };

  const handleNewW = (val) => {
    const w = parseInt(val) || 0;
    setNewW(w);
    if (origW > 0 && origH > 0) setNewH(Math.round((w / origW) * origH));
  };

  const handleNewH = (val) => {
    const h = parseInt(val) || 0;
    setNewH(h);
    if (origW > 0 && origH > 0) setNewW(Math.round((h / origH) * origW));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Aspect Ratio</h4>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select 
            onChange={(e) => {
              if (!e.target.value) return;
              const [w, h] = e.target.value.split('x').map(Number);
              setOrigW(w);
              setOrigH(h);
              setNewW(w);
              setNewH(h);
              e.target.value = ""; // Reset to placeholder
            }}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              width: '90px'
            }}
          >
            <option value="">Presets</option>
            <option value="3840x2160">UHD (3840x2160)</option>
            <option value="2560x1440">QHD (2560x1440)</option>
            <option value="1920x1200">WUXGA (1920x1200)</option>
            <option value="1920x1080">FHD (1920x1080)</option>
            <option value="1600x900">HD+ (1600x900)</option>
            <option value="1280x720">HD (1280x720)</option>
            <option value="1080x1920">Vertical HD (1080x1920)</option>
            <option value="1024x1024">Square (1024x1024)</option>
          </select>
          <span style={{ background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', fontWeight: 'bold' }}>{ratioStr}</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Original Width</label>
          <input type="number" value={origW || ''} onChange={(e) => handleOrigW(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem' }} />
        </div>
        <span style={{ marginTop: '1.2rem', color: 'var(--text-secondary)' }}>×</span>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Original Height</label>
          <input type="number" value={origH || ''} onChange={(e) => handleOrigH(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>New Width</label>
          <input type="number" value={newW || ''} onChange={(e) => handleNewW(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', borderColor: 'var(--accent-color)' }} />
        </div>
        <span style={{ marginTop: '1.2rem', color: 'var(--text-secondary)' }}>×</span>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>New Height</label>
          <input type="number" value={newH || ''} onChange={(e) => handleNewH(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', borderColor: 'var(--accent-color)' }} />
        </div>
      </div>
    </div>
  );
}
