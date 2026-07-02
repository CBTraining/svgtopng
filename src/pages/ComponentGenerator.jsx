import { useState, useEffect, useRef } from 'react';
import { CodeBracketSquareIcon, ClipboardDocumentIcon, CheckIcon as Check, PhotoIcon } from '@heroicons/react/24/solid';
import { toBlob } from 'html-to-image';
import GradientEditor from '../components/GradientEditor';

export default function ComponentGenerator() {
  // State variables for component properties
  const [maxWidth, setMaxWidth] = useState(400);
  const [minHeight, setMinHeight] = useState(250);
  const [borderRadius, setBorderRadius] = useState(32);
  const [innerShadowColor, setInnerShadowColor] = useState('#13243f');
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [glowHeight, setGlowHeight] = useState(30);
  const [glowBlur, setGlowBlur] = useState(15);
  const [hoverAnimation, setHoverAnimation] = useState('none');
  
  const [cardTitle, setCardTitle] = useState('Content Title');
  const [cardSubtitle, setCardSubtitle] = useState('Content description.');
  const [iconSvg, setIconSvg] = useState(`<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: white;">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
</svg>`);
  const [iconLink, setIconLink] = useState('');

  const previewRef = useRef(null);
  
  const [gradStops, setGradStops] = useState([
    { color: '#4285F4', position: 0 },
    { color: '#4285F4', position: 0.55 },
    { color: '#EA4335', position: 0.70 },
    { color: '#FBBC04', position: 0.85 },
    { color: '#34A853', position: 1.0 }
  ]);

  const [copySuccess, setCopySuccess] = useState(false);
  const [copyImageSuccess, setCopyImageSuccess] = useState(false);

  // Generate CSS string
  const sortedStops = [...gradStops].sort((a, b) => a.position - b.position);
  const gradientString = `linear-gradient(\n    90deg, \n    ${sortedStops.map(s => `${s.color} ${Math.round(s.position * 100)}%`).join(',\n    ')}\n  )`;

  let animationCss = '';
  if (hoverAnimation === 'float') {
    animationCss = `\n
.glow-card:hover {
  transform: translateY(-5px);
  box-shadow: 
    inset 0 4px 30px ${innerShadowColor},
    inset 0 0 0 1px ${innerShadowColor},
    0 10px 20px rgba(0,0,0,0.5);
}
.glow-card:hover::before {
  opacity: 0.8;
}`;
  } else if (hoverAnimation === 'pulse') {
    animationCss = `\n
.glow-card:hover::before {
  filter: blur(${glowBlur + 10}px);
  height: ${glowHeight + 10}px;
}`;
  } else if (hoverAnimation === 'expand') {
    animationCss = `\n
.glow-card:hover {
  transform: scale(1.02);
}`;
  } else if (hoverAnimation === 'tilt') {
    animationCss = `\n
.glow-card:hover {
  transform: perspective(1000px) rotateX(2deg) rotateY(-2deg) scale(1.01);
}`;
  } else if (hoverAnimation === 'shift-right') {
    animationCss = `\n
.glow-card:hover {
  transform: translateX(8px);
}`;
  } else if (hoverAnimation === 'jiggle') {
    animationCss = `\n
@keyframes jiggle {
  0% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
  100% { transform: rotate(-3deg); }
}
.glow-card:hover {
  animation: jiggle 0.3s ease-in-out infinite;
}`;
  } else if (hoverAnimation === 'glow-flash') {
    animationCss = `\n
@keyframes glowFlash {
  0% { filter: blur(${glowBlur}px); height: ${glowHeight}px; opacity: 0.5; }
  50% { filter: blur(${glowBlur + 15}px); height: ${glowHeight + 15}px; opacity: 1; }
  100% { filter: blur(${glowBlur}px); height: ${glowHeight}px; opacity: 0.5; }
}
.glow-card:hover::before {
  animation: glowFlash 1s infinite;
}`;
  }

  const cssCode = `
.glow-card {
  width: 100%;
  max-width: ${maxWidth}px;
  min-height: ${minHeight}px;
  background-color: ${backgroundColor};
  border-radius: ${borderRadius}px;
  box-shadow: 
    inset 0 4px 30px ${innerShadowColor},
    inset 0 0 0 1px ${innerShadowColor};
  position: relative;
  overflow: hidden;
  z-index: 1;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.glow-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.glow-card-icon a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: inherit;
  text-decoration: none;
}

.glow-card-icon:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.glow-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: white;
  font-family: system-ui, -apple-system, sans-serif;
}

.glow-card-title {
  font-weight: 700;
  font-size: 1.1rem;
  margin: 0;
}

.glow-card-subtitle {
  font-weight: 400;
  font-size: 0.9rem;
  opacity: 0.8;
  margin: 0;
}

.glow-card::before {
  content: '';
  position: absolute;
  bottom: -10px;
  left: -5%;
  width: 110%;
  height: ${glowHeight}px;
  background: ${gradientString};
  filter: blur(${glowBlur}px);
  z-index: -1;
  opacity: 1;
  transition: all 0.3s ease;
}${animationCss}`.trim();

  const htmlCode = `
<div class="glow-card">
  <div class="glow-card-icon">
    ${iconLink.trim() ? `<a href="${iconLink}" target="_blank" rel="noopener noreferrer">\n      ${iconSvg.trim().split('\\n').join('\\n      ')}\n    </a>` : iconSvg.trim()}
  </div>
  <div class="glow-card-content">
    <div class="glow-card-title">${cardTitle}</div>
    <div class="glow-card-subtitle">${cardSubtitle}</div>
  </div>
</div>`.trim();

  const handleCopyCode = async () => {
    try {
      const fullCode = `<style>\n${cssCode}\n</style>\n\n${htmlCode}`;
      await navigator.clipboard.writeText(fullCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  const handleCopyImage = async () => {
    if (!previewRef.current) return;
    try {
      // Need a slight margin to capture the glow filter properly
      const blob = await toBlob(previewRef.current, {
        pixelRatio: 4, // Boost resolution to 4x
        width: previewRef.current.offsetWidth + 100,
        height: previewRef.current.offsetHeight + 100,
        skipFonts: true, // Fix for SecurityError: Failed to read the 'cssRules' property
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '50px' // give the glow room to breathe
        }
      });
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopyImageSuccess(true);
        setTimeout(() => setCopyImageSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy image", err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '0' }}>
        <CodeBracketSquareIcon />
        <h1>Component Generator</h1>
      </div>

      <div className="editor-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Preview Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="checkerboard-bg" style={{ 
            borderRadius: '16px', 
            minHeight: '500px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '2rem',
            backgroundColor: '#000',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
          }}>
            <style>{cssCode}</style>
            <div ref={previewRef}>
              <div className="glow-card" dangerouslySetInnerHTML={{ __html: htmlCode.replace('<div class="glow-card">', '').slice(0, -6) }} />
            </div>
          </div>

          {/* Code Output */}
          <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn" 
                onClick={handleCopyImage} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
              >
                {copyImageSuccess ? <Check style={{width: '16px', height: '16px'}} /> : <PhotoIcon style={{width: '16px', height: '16px'}} />}
                {copyImageSuccess ? 'Copied Image!' : 'Copy Image'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCopyCode} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
              >
                {copySuccess ? <Check style={{width: '16px', height: '16px'}} /> : <ClipboardDocumentIcon style={{width: '16px', height: '16px'}} />}
                {copySuccess ? 'Copied Code!' : 'Copy Code'}
              </button>
            </div>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>HTML & CSS Output</h3>
            
            <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1.5rem', borderRadius: '8px', overflowX: 'auto', fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
              <span style={{ color: '#569cd6' }}>&lt;style&gt;</span>{'\n'}
              {cssCode}{'\n'}
              <span style={{ color: '#569cd6' }}>&lt;/style&gt;</span>{'\n\n'}
              {htmlCode}
            </div>
          </div>
        </div>

        {/* Controls Area */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '2rem', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Properties</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="control-group">
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Title</label>
              <input type="text" className="input-field" value={cardTitle} onChange={e => setCardTitle(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div className="control-group">
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Subtitle</label>
              <input type="text" className="input-field" value={cardSubtitle} onChange={e => setCardSubtitle(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div className="control-group">
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Icon SVG Code</label>
              <textarea 
                className="input-field" 
                value={iconSvg} 
                onChange={e => setIconSvg(e.target.value)} 
                style={{ width: '100%', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8rem' }} 
              />
            </div>

            <div className="control-group">
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Icon Link URL (Optional)</label>
              <input 
                type="url" 
                className="input-field" 
                placeholder="https://..." 
                value={iconLink} 
                onChange={e => setIconLink(e.target.value)} 
                style={{ width: '100%' }} 
              />
            </div>

            <div className="control-group" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Max Width</label>
                <input type="number" className="input-field" value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="100" max="1000" value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))} />
            </div>

            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Min Height</label>
                <input type="number" className="input-field" value={minHeight} onChange={e => setMinHeight(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="50" max="800" value={minHeight} onChange={e => setMinHeight(Number(e.target.value))} />
            </div>
            
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Border Radius</label>
                <input type="number" className="input-field" value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="0" max="200" value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} />
            </div>

            <div className="control-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Inner Glow Color</label>
              <input 
                type="color" 
                value={innerShadowColor} 
                onChange={e => setInnerShadowColor(e.target.value)} 
                style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
              />
            </div>
            
            <div className="control-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Background Color</label>
              <input 
                type="text" 
                className="input-field"
                value={backgroundColor} 
                onChange={e => setBackgroundColor(e.target.value)} 
                style={{ width: '120px', padding: '0.25rem 0.5rem' }}
              />
            </div>

            <div className="control-group" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', marginBottom: '1rem' }}>Bottom Glow Colors</label>
              <GradientEditor stops={gradStops} onChange={setGradStops} />
            </div>

            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Glow Height</label>
                <input type="number" className="input-field" value={glowHeight} onChange={e => setGlowHeight(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="10" max="150" value={glowHeight} onChange={e => setGlowHeight(Number(e.target.value))} />
            </div>

            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Glow Blur Radius</label>
                <input type="number" className="input-field" value={glowBlur} onChange={e => setGlowBlur(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="0" max="100" value={glowBlur} onChange={e => setGlowBlur(Number(e.target.value))} />
            </div>

            <div className="control-group" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Hover Animation</label>
              <select 
                className="input-field" 
                value={hoverAnimation} 
                onChange={e => setHoverAnimation(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="none">None</option>
                <option value="float">Float Up</option>
                <option value="pulse">Pulse Glow</option>
                <option value="expand">Expand Scale</option>
                <option value="tilt">3D Tilt</option>
                <option value="shift-right">Shift Right</option>
                <option value="jiggle">Jiggle</option>
                <option value="glow-flash">Glow Flash</option>
              </select>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
