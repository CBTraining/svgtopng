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
        <span style={{ background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', fontWeight: 'bold' }}>{ratioStr}</span>
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
