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
  const [enableLuminance, setEnableLuminance] = useState(true);
  const [hoverAnimations, setHoverAnimations] = useState({
    float: false,
    pulse: false,
    expand: false,
    tilt: false,
    shiftRight: false,
    jiggle: false,
    glowFlash: false
  });
  const [animIntensity, setAnimIntensity] = useState(1.0);

  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgBrightness, setBgBrightness] = useState(100);
  const [bgContrast, setBgContrast] = useState(100);
  const [bgTint, setBgTint] = useState('transparent');
  const [cardTitle, setCardTitle] = useState('Content Title');
  const [cardSubtitle, setCardSubtitle] = useState('Content description.');
  const [iconSvg, setIconSvg] = useState(`<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" style="color: white;">
  <path fill-rule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clip-rule="evenodd" />
</svg>`);
  const [iconLink, setIconLink] = useState('');

  const [iconType, setIconType] = useState('svg');
  const [iconName, setIconName] = useState('star');


  const [presets, setPresets] = useState({});
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('componentGeneratorPresets');
    if (saved) {
      try { setPresets(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) return alert("Enter a preset name");
    const newPresets = {
      ...presets,
      [presetName]: {
        maxWidth, minHeight, borderRadius, innerShadowColor, backgroundColor,
        glowHeight, glowBlur, enableLuminance, hoverAnimations, animIntensity,
        bgImageUrl, bgBrightness, bgContrast, bgTint, cardTitle, cardSubtitle,
        iconSvg, iconLink, gradStops, iconType, iconName
      }
    };
    setPresets(newPresets);
    localStorage.setItem('componentGeneratorPresets', JSON.stringify(newPresets));
    setPresetName(''); // Clear input after save
  };

  const loadPreset = (name) => {
    if (!name) return;
    const p = presets[name];
    if (!p) return;
    if (p.maxWidth !== undefined) setMaxWidth(p.maxWidth);
    if (p.minHeight !== undefined) setMinHeight(p.minHeight);
    if (p.borderRadius !== undefined) setBorderRadius(p.borderRadius);
    if (p.innerShadowColor !== undefined) setInnerShadowColor(p.innerShadowColor);
    if (p.backgroundColor !== undefined) setBackgroundColor(p.backgroundColor);
    if (p.glowHeight !== undefined) setGlowHeight(p.glowHeight);
    if (p.glowBlur !== undefined) setGlowBlur(p.glowBlur);
    if (p.enableLuminance !== undefined) setEnableLuminance(p.enableLuminance);
    if (p.hoverAnimations !== undefined) setHoverAnimations(p.hoverAnimations);
    if (p.animIntensity !== undefined) setAnimIntensity(p.animIntensity);
    if (p.bgImageUrl !== undefined) setBgImageUrl(p.bgImageUrl);
    if (p.bgBrightness !== undefined) setBgBrightness(p.bgBrightness);
    if (p.bgContrast !== undefined) setBgContrast(p.bgContrast);
    if (p.bgTint !== undefined) setBgTint(p.bgTint);
    if (p.cardTitle !== undefined) setCardTitle(p.cardTitle);
    if (p.cardSubtitle !== undefined) setCardSubtitle(p.cardSubtitle);
    if (p.iconSvg !== undefined) setIconSvg(p.iconSvg);
    if (p.iconLink !== undefined) setIconLink(p.iconLink);

    if (p.iconType !== undefined) setIconType(p.iconType);
    if (p.iconName !== undefined) setIconName(p.iconName);

    if (p.gradStops !== undefined) setGradStops(p.gradStops);
  };


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
  let transformStr = '';
  if (hoverAnimations.float) transformStr += `translateY(${-5 * animIntensity}px) `;
  if (hoverAnimations.expand) transformStr += `scale(${1 + (0.02 * animIntensity)}) `;
  if (hoverAnimations.tilt) transformStr += `perspective(1000px) rotateX(${2 * animIntensity}deg) rotateY(${-2 * animIntensity}deg) `;
  if (hoverAnimations.shiftRight) transformStr += `translateX(${8 * animIntensity}px) `;

  const hasTransform = transformStr.trim().length > 0;
  
  if (hasTransform || hoverAnimations.float || hoverAnimations.jiggle) {
    animationCss += `\n.glow-card:hover {`;
    if (hasTransform) animationCss += `\n  transform: ${transformStr.trim()};`;
    if (hoverAnimations.float) animationCss += `\n  box-shadow: \n    0 ${10 * animIntensity}px ${20 * animIntensity}px rgba(0,0,0,0.5);`;
    if (hoverAnimations.jiggle) animationCss += `\n  animation: jiggle 0.3s ease-in-out infinite;`;
    animationCss += `\n}`;
  }

  if (hoverAnimations.jiggle) {
    animationCss += `\n@keyframes jiggle {
  0% { transform: rotate(${-3 * animIntensity}deg); }
  50% { transform: rotate(${3 * animIntensity}deg); }
  100% { transform: rotate(${-3 * animIntensity}deg); }
}`;
  }

  if (hoverAnimations.pulse || hoverAnimations.glowFlash || hoverAnimations.float) {
    animationCss += `\n.glow-card:hover::after {`;
    if (hoverAnimations.float) animationCss += `\n  opacity: 0.8;`;
    if (hoverAnimations.pulse) animationCss += `\n  filter: blur(${glowBlur + (10 * animIntensity)}px);\n  height: ${glowHeight + (10 * animIntensity)}px;`;
    if (hoverAnimations.glowFlash) animationCss += `\n  animation: glowFlash 1s infinite;`;
    animationCss += `\n}`;
  }

  if (hoverAnimations.glowFlash) {
    animationCss += `\n@keyframes glowFlash {
  0% { filter: blur(${glowBlur}px); height: ${glowHeight}px; opacity: 0.5; }
  50% { filter: blur(${glowBlur + (15 * animIntensity)}px); height: ${glowHeight + (15 * animIntensity)}px; opacity: 1; }
  100% { filter: blur(${glowBlur}px); height: ${glowHeight}px; opacity: 0.5; }
}`;
  }

  const cssCode = `
.glow-card {
  width: 100%;
  max-width: ${maxWidth}px;
  min-height: ${minHeight}px;
  background-color: ${backgroundColor};
  border-radius: ${borderRadius}px;
  position: relative;
  overflow: hidden;
  z-index: 1;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.glow-card::before {
  content: '';
  position: absolute;
  inset: 0;
  box-shadow: 
    inset 0 4px 30px ${innerShadowColor},
    inset 0 0 0 1px ${innerShadowColor};
  z-index: 2;
  pointer-events: none;
  border-radius: inherit;
}

.glow-card::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: -5%;
  width: 110%;
  height: ${glowHeight}px;
  background: ${gradientString};
  filter: blur(${glowBlur}px);
  z-index: 0;
  opacity: 1;
  transition: all 0.3s ease;
}

${bgImageUrl ? `
.glow-card-bg {
  position: absolute;
  inset: 0;
  background-image: url('${bgImageUrl}');
  background-size: cover;
  background-position: center;
  filter: brightness(${bgBrightness}%) contrast(${bgContrast}%);
  z-index: 1;
}

.glow-card-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-color: ${bgTint};
}
` : ''}
${enableLuminance ? `
.luminance-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    circle 200px at var(--mouse-x, -200px) var(--mouse-y, -200px),
    rgba(255, 255, 255, 0.08),
    transparent 80%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 3;
}
.glow-card:hover .luminance-overlay {
  opacity: 1;
}` : ''}

.glow-card-icon, .glow-card-content {
  position: relative;
  z-index: 3;
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
}${animationCss}`.trim();

const iconContent = iconType === 'svg' 
    ? iconSvg.trim().split('\\n').join('\\n    ')
    : `<span class="material-symbols-outlined" style="font-size: 24px; color: white;">${iconName}</span>`;

  const materialLink = iconType === 'material' 
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
` 
    : '';

  const jsSnippet = enableLuminance ? `
<script>
  document.querySelectorAll('.glow-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', \`\${x}px\`);
      card.style.setProperty('--mouse-y', \`\${y}px\`);
    });
  });
</script>` : '';

  const htmlCode = iconLink.trim() ? `
${materialLink}<a href="${iconLink}" target="_blank" rel="noopener noreferrer" class="glow-card" style="text-decoration: none; color: inherit;">
  ${bgImageUrl ? `<div class="glow-card-bg"></div>
  ` : ''}${enableLuminance ? `<div class="luminance-overlay"></div>
  ` : ''}<div class="glow-card-icon">
    ${iconContent}
  </div>
  <div class="glow-card-content">
    <div class="glow-card-title">${cardTitle}</div>
    <div class="glow-card-subtitle">${cardSubtitle}</div>
  </div>
</a>${jsSnippet}`.trim() : `
${materialLink}<div class="glow-card">
  ${bgImageUrl ? `<div class="glow-card-bg"></div>
  ` : ''}${enableLuminance ? `<div class="luminance-overlay"></div>
  ` : ''}<div class="glow-card-icon">
    ${iconContent}
  </div>
  <div class="glow-card-content">
    <div class="glow-card-title">${cardTitle}</div>
    <div class="glow-card-subtitle">${cardSubtitle}</div>
  </div>
</div>${jsSnippet}`.trim();

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
  {/* Preview Area */}
        
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
            <div dangerouslySetInnerHTML={{ __html: materialLink }} />
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              {iconLink.trim() ? (
                <a ref={previewRef} href={iconLink} target="_blank" rel="noopener noreferrer" className="glow-card" dangerouslySetInnerHTML={{ __html: innerHtml }} style={{ textDecoration: 'none', color: 'inherit' }} />
              ) : (
                <div ref={previewRef} className="glow-card" dangerouslySetInnerHTML={{ __html: innerHtml }} />
              )}
            </div>
          </div>

  {/* Controls Area */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Properties</h2>
          

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
            <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>Presets:</span>
            <input type="text" className="input-field" placeholder="New Preset Name" value={presetName} onChange={e => setPresetName(e.target.value)} style={{ width: '200px', padding: '0.5rem' }} />
            <button className="btn" onClick={savePreset}>Save</button>
            <div style={{ flex: 1 }}></div>
            <select className="input-field" style={{ padding: '0.5rem', width: '200px' }} onChange={e => loadPreset(e.target.value)} value="">
              <option value="" disabled>Load Preset...</option>
              {Object.keys(presets).map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            
            <div className="control-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Title</label>
              <input type="text" className="input-field" value={cardTitle} onChange={e => setCardTitle(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div className="control-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Subtitle</label>
              <input type="text" className="input-field" value={cardSubtitle} onChange={e => setCardSubtitle(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div className="control-group" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Icon</label>
                <select className="input-field" value={iconType} onChange={e => setIconType(e.target.value)} style={{ padding: '2px 8px', width: 'auto', fontSize: '0.8rem' }}>
                  <option value="svg">SVG Code</option>
                  <option value="material">Google Font (Material)</option>
                </select>
              </div>
              {iconType === 'svg' ? (
                <textarea 
                  className="input-field" 
                  value={iconSvg} 
                  onChange={e => setIconSvg(e.target.value)} 
                  style={{ width: '100%', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8rem' }} 
                />
              ) : (
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. star, home, settings" 
                  value={iconName} 
                  onChange={e => setIconName(e.target.value)} 
                  style={{ width: '100%' }} 
                />
              )}
            </div>

            <div className="control-group" style={{ gridColumn: 'span 2' }}>
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

            <div className="control-group" style={{ gridColumn: 'span 1', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Max Width</label>
                <input type="number" className="input-field" value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="100" max="1000" value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))} />
            </div>

            <div className="control-group" style={{ gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Min Height</label>
                <input type="number" className="input-field" value={minHeight} onChange={e => setMinHeight(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="50" max="800" value={minHeight} onChange={e => setMinHeight(Number(e.target.value))} />
            </div>
            
            <div className="control-group" style={{ gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Border Radius</label>
                <input type="number" className="input-field" value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="0" max="200" value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} />
            </div>

            <div className="control-group" style={{ gridColumn: 'span 1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Inner Glow Color</label>
              <input 
                type="color" 
                value={innerShadowColor} 
                onChange={e => setInnerShadowColor(e.target.value)} 
                style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
              />
            </div>
            
            <div className="control-group" style={{ gridColumn: 'span 1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Background Color</label>
              <input 
                type="text" 
                className="input-field"
                value={backgroundColor} 
                onChange={e => setBackgroundColor(e.target.value)} 
                style={{ width: '120px', padding: '0.25rem 0.5rem' }}
              />
            </div>

            <div className="control-group" style={{ gridColumn: 'span 1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={enableLuminance} onChange={e => setEnableLuminance(e.target.checked)} style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }} />
              <label style={{ cursor: 'pointer', fontSize: '0.95rem' }} onClick={() => setEnableLuminance(!enableLuminance)}>Interactive Luminance Effect</label>
            </div>

            <div className="control-group" style={{ gridColumn: 'span 4', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', marginBottom: '1rem' }}>Bottom Glow Colors</label>
              <GradientEditor stops={gradStops} onChange={setGradStops} />
            </div>

            <div className="control-group" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Glow Height</label>
                <input type="number" className="input-field" value={glowHeight} onChange={e => setGlowHeight(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="10" max="150" value={glowHeight} onChange={e => setGlowHeight(Number(e.target.value))} />
            </div>

            <div className="control-group" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Glow Blur Radius</label>
                <input type="number" className="input-field" value={glowBlur} onChange={e => setGlowBlur(Number(e.target.value))} style={{ width: '80px', padding: '0.25rem 0.5rem' }} />
              </div>
              <input type="range" min="0" max="100" value={glowBlur} onChange={e => setGlowBlur(Number(e.target.value))} />
            </div>

            <div className="control-group" style={{ gridColumn: 'span 4', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Background Image</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Image URL" 
                  value={bgImageUrl} 
                  onChange={e => setBgImageUrl(e.target.value)}
                  style={{ flex: 1 }}
                />
                <label className="btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '0.5rem' }}>
                  <PhotoIcon width="16" />
                  Upload
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => setBgImageUrl(event.target.result);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>

              {bgImageUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem' }}>Tint Overlay Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => setBgTint('transparent')}>Clear</button>
                      <input type="color" value={bgTint === 'transparent' ? '#000000' : bgTint.substring(0, 7)} onChange={e => setBgTint(e.target.value + '80')} style={{ width: '30px', height: '30px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }} title="Picks color at 50% opacity" />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '0.85rem' }}>Brightness</label><span style={{ fontSize: '0.85rem' }}>{bgBrightness}%</span></div>
                    <input type="range" min="0" max="200" value={bgBrightness} onChange={e => setBgBrightness(Number(e.target.value))} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '0.85rem' }}>Contrast</label><span style={{ fontSize: '0.85rem' }}>{bgContrast}%</span></div>
                    <input type="range" min="0" max="200" value={bgContrast} onChange={e => setBgContrast(Number(e.target.value))} />
                  </div>
                  <button className="btn" style={{ marginTop: '0.5rem' }} onClick={() => setBgImageUrl('')}>Remove Image</button>
                </div>
              )}
            </div>



            <div className="control-group" style={{ gridColumn: 'span 4', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', marginBottom: '1rem' }}>Hover Animations (Mix & Match)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.keys(hoverAnimations).map(animKey => (
                  <label key={animKey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      checked={hoverAnimations[animKey]} 
                      onChange={e => setHoverAnimations(prev => ({ ...prev, [animKey]: e.target.checked }))} 
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    {animKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label>Animation Intensity</label>
                  <span style={{ fontSize: '0.9rem' }}>{animIntensity.toFixed(1)}x</span>
                </div>
                <input type="range" min="0.1" max="3" step="0.1" value={animIntensity} onChange={e => setAnimIntensity(Number(e.target.value))} />
              </div>
            </div>

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
            
            <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1.5rem', borderRadius: '8px', overflowX: 'auto', fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span style={{ color: '#569cd6' }}>&lt;style&gt;</span>{'\n'}
              {cssCode}{'\n'}
              <span style={{ color: '#569cd6' }}>&lt;/style&gt;</span>{'\n\n'}
              {htmlCode}
            </div>
          </div>
        </div>
    </div>
  );
}
