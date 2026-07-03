import { useState, useEffect, useRef } from 'react';
import { CodeBracketSquareIcon, ClipboardDocumentIcon, CheckIcon as Check, PhotoIcon } from '@heroicons/react/24/solid';
import { toBlob } from 'html-to-image';
import GradientEditor from '../components/GradientEditor';

export default function ComponentGenerator() {
  // State variables for component properties
  const [maxWidth, setMaxWidth] = useState(400);
  const [maxWidthUnit, setMaxWidthUnit] = useState('px');
  const [minHeight, setMinHeight] = useState(250);
  const [minHeightUnit, setMinHeightUnit] = useState('px');
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
    glowFlash: false,
    colorCycle: false,
    outerGlow: false,
    shake: false,
    bounce: false
  });
  const [animIntensity, setAnimIntensity] = useState(1.0);

  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgBrightness, setBgBrightness] = useState(100);
  const [bgContrast, setBgContrast] = useState(100);
  const [bgTint, setBgTint] = useState('transparent');
  const [cardTitle, setCardTitle] = useState('Content Title');
  const [cardSubtitle, setCardSubtitle] = useState('Content description.');
  const [cardTitleColor, setCardTitleColor] = useState('#ffffff');
  const [cardSubtitleColor, setCardSubtitleColor] = useState('#ffffff');
  const [cardTitleSize, setCardTitleSize] = useState(1.1);
  const [cardSubtitleSize, setCardSubtitleSize] = useState(0.9);
  const [iconSvg, setIconSvg] = useState(`<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" style="color: white;">
  <path fill-rule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clip-rule="evenodd" />
</svg>`);
  const [iconLink, setIconLink] = useState('');

  const [showText, setShowText] = useState(true);
  const [showIcon, setShowIcon] = useState(true);

  const [iconType, setIconType] = useState('svg');
  const [iconName, setIconName] = useState('star');

  const [iconSize, setIconSize] = useState(40);
  const [iconFill, setIconFill] = useState(true);



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
        maxWidth, maxWidthUnit, minHeight, minHeightUnit, borderRadius, innerShadowColor, backgroundColor,
        glowHeight, glowBlur, enableLuminance, hoverAnimations, animIntensity,
        bgImageUrl, bgBrightness, bgContrast, bgTint, cardTitle, cardSubtitle,
        iconSvg, iconLink, gradStops, iconType, iconName, iconSize, iconFill,
        showText, showIcon, cardTitleColor, cardSubtitleColor, cardTitleSize, cardSubtitleSize
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
    if (p.maxWidthUnit !== undefined) setMaxWidthUnit(p.maxWidthUnit);
    if (p.minHeight !== undefined) setMinHeight(p.minHeight);
    if (p.minHeightUnit !== undefined) setMinHeightUnit(p.minHeightUnit);
    if (p.borderRadius !== undefined) setBorderRadius(p.borderRadius);
    if (p.innerShadowColor !== undefined) setInnerShadowColor(p.innerShadowColor);
    if (p.backgroundColor !== undefined) setBackgroundColor(p.backgroundColor);
    if (p.glowHeight !== undefined) setGlowHeight(p.glowHeight);
    if (p.glowBlur !== undefined) setGlowBlur(p.glowBlur);
    if (p.enableLuminance !== undefined) setEnableLuminance(p.enableLuminance);
    if (p.hoverAnimations !== undefined) setHoverAnimations(prev => ({...prev, ...p.hoverAnimations}));
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
    if (p.iconSize !== undefined) setIconSize(p.iconSize);
    if (p.iconFill !== undefined) setIconFill(p.iconFill);
    if (p.showText !== undefined) setShowText(p.showText);
    if (p.showIcon !== undefined) setShowIcon(p.showIcon);
    if (p.cardTitleColor !== undefined) setCardTitleColor(p.cardTitleColor);
    if (p.cardSubtitleColor !== undefined) setCardSubtitleColor(p.cardSubtitleColor);
    if (p.cardTitleSize !== undefined) setCardTitleSize(p.cardTitleSize);
    if (p.cardSubtitleSize !== undefined) setCardSubtitleSize(p.cardSubtitleSize);

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
  const loopStops = [];
  sortedStops.forEach(s => { loopStops.push(`${s.color} ${Math.round(s.position * 50)}%`); });
  sortedStops.forEach(s => { loopStops.push(`${s.color} ${Math.round(50 + s.position * 50)}%`); });
  
  const gradientString = hoverAnimations.colorCycle 
    ? `linear-gradient(90deg, ${loopStops.join(', ')})`
    : `linear-gradient(90deg, ${sortedStops.map(s => `${s.color} ${Math.round(s.position * 100)}%`).join(', ')});`;

  let animationCss = '';
  let transformStr = '';
  if (hoverAnimations.float) transformStr += `translateY(${-5 * animIntensity}px) `;
  if (hoverAnimations.expand) transformStr += `scale(${1 + (0.02 * animIntensity)}) `;
  
  if (hoverAnimations.shiftRight) transformStr += `translateX(${8 * animIntensity}px) `;

  const hasTransform = transformStr.trim().length > 0;
  let cardAnimations = [];
  if (hoverAnimations.jiggle) cardAnimations.push(`jiggle 0.3s ease-in-out infinite`);
  if (hoverAnimations.shake) cardAnimations.push(`shake 0.4s ease-in-out infinite`);
  if (hoverAnimations.bounce) cardAnimations.push(`bounce 0.5s ease-in-out infinite`);
  
  
  if (hoverAnimations.tilt) {
    animationCss += `\n.glow-card:hover { transition: all 0.3s ease, transform 0.1s ease-out; }`;
  }
  if (hasTransform || hoverAnimations.float || hoverAnimations.outerGlow || cardAnimations.length > 0) {
    animationCss += `\n.glow-card:hover {`;
    if (hasTransform) animationCss += `\n  transform: ${transformStr.trim()};`;
    if (hoverAnimations.float) animationCss += `\n  box-shadow: \n    0 ${10 * animIntensity}px ${20 * animIntensity}px rgba(0,0,0,0.5);`;
    if (hoverAnimations.outerGlow) {
      const glowCol = sortedStops.length > 0 ? sortedStops[0].color : 'rgba(255,255,255,0.5)';
      animationCss += `\n  box-shadow: \n    0 0 ${40 * animIntensity}px ${glowCol};`;
    }
    if (cardAnimations.length > 0) animationCss += `\n  animation: ${cardAnimations.join(', ')};`;
    animationCss += `\n}`;
  }

  if (hoverAnimations.jiggle) {
    animationCss += `\n@keyframes jiggle {
  0% { transform: rotate(${-3 * animIntensity}deg); }
  50% { transform: rotate(${3 * animIntensity}deg); }
  100% { transform: rotate(${-3 * animIntensity}deg); }
}`;
  }
  
  if (hoverAnimations.shake) {
    animationCss += `\n@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(${-4 * animIntensity}px); }
  75% { transform: translateX(${4 * animIntensity}px); }
}`;
  }
  
  if (hoverAnimations.bounce) {
    animationCss += `\n@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(${-10 * animIntensity}px); }
}`;
  }

  if (hoverAnimations.colorCycle) {
    animationCss += `\n@keyframes colorCycle {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}`;
  }

  let afterAnimations = [];
  if (hoverAnimations.glowFlash) afterAnimations.push(`glowFlash 1s infinite`);
  if (hoverAnimations.colorCycle) afterAnimations.push(`colorCycle ${5 / animIntensity}s linear infinite`);

  if (hoverAnimations.pulse || hoverAnimations.float || afterAnimations.length > 0) {
    animationCss += `\n.glow-card:hover::after {`;
    if (hoverAnimations.float) animationCss += `\n  opacity: 0.8;`;
    if (hoverAnimations.pulse) animationCss += `\n  filter: blur(${glowBlur + (10 * animIntensity)}px) saturate(${100 + (glowBlur * 2)}%);\n  height: ${glowHeight + (10 * animIntensity)}px;`;
    if (afterAnimations.length > 0) animationCss += `\n  animation: ${afterAnimations.join(', ')};`;
    animationCss += `\n}`;
  }

  if (hoverAnimations.glowFlash) {
    animationCss += `\n@keyframes glowFlash {
  0% { filter: blur(${glowBlur}px) saturate(${100 + (glowBlur * 2)}%); height: ${glowHeight}px; opacity: 0.5; }
  50% { filter: blur(${glowBlur + (15 * animIntensity)}px) saturate(${100 + (glowBlur * 2)}%); height: ${glowHeight + (15 * animIntensity)}px; opacity: 1; }
  100% { filter: blur(${glowBlur}px) saturate(${100 + (glowBlur * 2)}%); height: ${glowHeight}px; opacity: 0.5; }
}`;
  }

  const cssCode = `
.glow-card {
  width: 100%;
  max-width: ${maxWidth}${maxWidthUnit};
  min-height: ${minHeight}${minHeightUnit};
  background-color: ${backgroundColor};
  border-radius: ${borderRadius}px;
  position: relative;
  overflow: hidden;
  z-index: 1;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* Allows stacking if content doesn't fit */
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
  transition: all 0.3s ease;
}

.glow-card:hover::before {
  box-shadow: 
    inset 0 4px 50px ${innerShadowColor},
    inset 0 0 0 2px ${innerShadowColor};
}

.glow-card::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: -5%;
  width: 110%;
  height: ${glowHeight}px;
  background: ${gradientString};
  background-size: 200% 100%;
  background-position: 0% 50%;
  filter: blur(${glowBlur}px) saturate(${100 + (glowBlur * 2)}%);
  z-index: 2;
  pointer-events: none;
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
}

.glow-card-icon svg {
  width: ${iconSize}px;
  height: ${iconSize}px;
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
  font-size: ${cardTitleSize}rem;
  color: ${cardTitleColor};
  margin: 0;
}

.glow-card-subtitle {
  font-weight: 400;
  font-size: ${cardSubtitleSize}rem;
  opacity: 0.8;
  color: ${cardSubtitleColor};
  margin: 0;
}${animationCss}`.trim();

const iconContent = iconType === 'svg' 
    ? iconSvg.trim().split('\\n').join('\\n    ')
    : `<span class="material-symbols-rounded" style="font-size: ${iconSize}px; color: white; font-variation-settings: 'FILL' ${iconFill ? 1 : 0};">${iconName}</span>`;

  const materialLink = iconType === 'material' 
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0..1,0" />\n` 
    : '';

  const jsSnippet = (enableLuminance || hoverAnimations.tilt) ? `
<script>
  document.querySelectorAll('.glow-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ${enableLuminance ? `
      card.style.setProperty('--mouse-x', \`\${x}px\`);
      card.style.setProperty('--mouse-y', \`\${y}px\`);
      ` : ''}
      ${hoverAnimations.tilt ? `
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -${15 * animIntensity};
      const rotateY = ((x - centerX) / centerX) * ${15 * animIntensity};
      
      let transformStr = \`perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg)\`;
      ${hoverAnimations.expand ? `transformStr += \` scale(${1 + (0.02 * animIntensity)})\`;` : ''}
      ${hoverAnimations.float ? `transformStr += \` translateY(${-5 * animIntensity}px)\`;` : ''}
      ${hoverAnimations.shiftRight ? `transformStr += \` translateX(${8 * animIntensity}px)\`;` : ''}
      
      card.style.transform = transformStr;
      ` : ''}
    });
    ${hoverAnimations.tilt ? `
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
    ` : ''}
  });
</script>` : '';

  const innerHtml = `
  ${enableLuminance ? `<div class="luminance-overlay"></div>\n  ` : ''}${bgImageUrl ? `<div class="glow-card-bg"></div>\n  ` : ''}${showIcon ? `<div class="glow-card-icon">
    ${iconContent}
  </div>\n  ` : ''}${showText ? `<div class="glow-card-content">
    <h3 class="glow-card-title">${cardTitle}</h3>
    <p class="glow-card-subtitle">${cardSubtitle}</p>
  </div>` : ''}
`.trim();

  const htmlCode = iconLink.trim() ? `
${materialLink}<a href="${iconLink}" target="_blank" rel="noopener noreferrer" class="glow-card" style="text-decoration: none; color: inherit;">
  ${innerHtml}
</a>${jsSnippet}`.trim() : `
${materialLink}<div class="glow-card">
  ${innerHtml}
</div>${jsSnippet}`.trim();


  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (enableLuminance) {
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    }

    if (hoverAnimations.tilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -15 * animIntensity;
      const rotateY = ((x - centerX) / centerX) * 15 * animIntensity;
      
      let transformStr = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      if (hoverAnimations.expand) transformStr += ` scale(${1 + (0.02 * animIntensity)})`;
      if (hoverAnimations.float) transformStr += ` translateY(${-5 * animIntensity}px)`;
      if (hoverAnimations.shiftRight) transformStr += ` translateX(${8 * animIntensity}px)`;
      
      card.style.transform = transformStr;
    }
  };

  const handleMouseLeave = (e) => {
    const card = e.currentTarget;
    if (hoverAnimations.tilt) {
      card.style.transform = '';
    }
  };

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
        
        <div style={{ position: 'sticky', top: '1.5rem', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button className="btn" onClick={handleCopyImage} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}>
              {copyImageSuccess ? <Check style={{width: '16px', height: '16px'}} /> : <PhotoIcon style={{width: '16px', height: '16px'}} />}
              {copyImageSuccess ? 'Copied Image!' : 'Copy Image'}
            </button>
            <button className="btn btn-primary" onClick={handleCopyCode} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
              {copySuccess ? <Check style={{width: '16px', height: '16px'}} /> : <ClipboardDocumentIcon style={{width: '16px', height: '16px'}} />}
              {copySuccess ? 'Copied Code!' : 'Copy Code'}
            </button>
          </div>
          <div className="checkerboard-bg" style={{ 
            borderRadius: '16px', 
            minHeight: '350px', 
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
                <a ref={previewRef} href={iconLink} target="_blank" rel="noopener noreferrer" className="glow-card" dangerouslySetInnerHTML={{ __html: innerHtml }} style={{ textDecoration: 'none', color: 'inherit' }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} />
              ) : (
                <div ref={previewRef} className="glow-card" dangerouslySetInnerHTML={{ __html: innerHtml }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} />
              )}
            </div>
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
            
            {/* Column 1: Content & Link */}
            <div className="control-group" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <input type="checkbox" checked={showText} onChange={e => setShowText(e.target.checked)} style={{ accentColor: 'var(--primary-color)' }} />
                <label style={{ fontWeight: 'bold' }}>Enable Text</label>
              </div>
              <div style={{ opacity: showText ? 1 : 0.5, pointerEvents: showText ? 'auto' : 'none', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label>Title</label>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <label style={{fontSize: '0.7rem', opacity: 0.7}}>Size:</label>
                      <input type="number" step="0.1" value={cardTitleSize} onChange={e => setCardTitleSize(Number(e.target.value))} style={{ width: '45px', padding: '0 4px', fontSize: '0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }} title="Font Size (rem)" />
                      <label style={{fontSize: '0.7rem', opacity: 0.7, marginLeft: '4px'}}>Color:</label>
                      <input type="color" value={cardTitleColor} onChange={e => setCardTitleColor(e.target.value)} style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Text Color" />
                    </div>
                  </div>
                  <input type="text" className="input-field" value={cardTitle} onChange={e => setCardTitle(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label>Subtitle</label>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <label style={{fontSize: '0.7rem', opacity: 0.7}}>Size:</label>
                      <input type="number" step="0.1" value={cardSubtitleSize} onChange={e => setCardSubtitleSize(Number(e.target.value))} style={{ width: '45px', padding: '0 4px', fontSize: '0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }} title="Font Size (rem)" />
                      <label style={{fontSize: '0.7rem', opacity: 0.7, marginLeft: '4px'}}>Color:</label>
                      <input type="color" value={cardSubtitleColor} onChange={e => setCardSubtitleColor(e.target.value)} style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Text Color" />
                    </div>
                  </div>
                  <input type="text" className="input-field" value={cardSubtitle} onChange={e => setCardSubtitle(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Click Link URL (Optional)</label>
                  <input type="url" className="input-field" placeholder="https://..." value={iconLink} onChange={e => setIconLink(e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            {/* Column 2: Icon Settings */}
            <div className="control-group" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <input type="checkbox" checked={showIcon} onChange={e => setShowIcon(e.target.checked)} style={{ accentColor: 'var(--primary-color)' }} />
                <label style={{ fontWeight: 'bold' }}>Enable Icon</label>
              </div>
              <div style={{ opacity: showIcon ? 1 : 0.5, pointerEvents: showIcon ? 'auto' : 'none', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label>Icon Type</label>
                    <select className="input-field" value={iconType} onChange={e => setIconType(e.target.value)} style={{ padding: '4px 8px', width: 'auto', fontSize: '0.8rem' }}>
                      <option value="svg">SVG Code</option>
                      <option value="material">Google Font (Material)</option>
                    </select>
                  </div>
                  {iconType === 'svg' ? (
                    <textarea className="input-field" value={iconSvg} onChange={e => setIconSvg(e.target.value)} style={{ width: '100%', minHeight: '90px', fontFamily: 'monospace', fontSize: '0.8rem', padding: '0.5rem', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input type="text" className="input-field" placeholder="e.g. star, home" value={iconName} onChange={e => setIconName(e.target.value)} style={{ width: '100%' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" checked={iconFill} onChange={e => setIconFill(e.target.checked)} style={{ accentColor: 'var(--primary-color)' }} />
                        <label style={{ fontSize: '0.85rem' }}>Filled Icon</label>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label>Icon Size</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" className="input-field" value={iconSize} onChange={e => setIconSize(Number(e.target.value))} style={{ width: '60px', padding: '0.25rem' }} />
                      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>px</span>
                    </div>
                  </div>
                  <input type="range" min="16" max="100" value={iconSize} onChange={e => setIconSize(Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Column 3: Dimensions */}
            <div className="control-group" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <label style={{ fontWeight: 'bold' }}>Dimensions</label>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label>Max Width</label>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{maxWidth}</span>
                    <select className="input-field" value={maxWidthUnit} onChange={e => setMaxWidthUnit(e.target.value)} style={{ padding: '2px 4px', fontSize: '0.7rem' }}>
                      <option value="px">px</option>
                      <option value="%">%</option>
                      <option value="vw">vw</option>
                    </select>
                  </div>
                </div>
                <input type="range" min={maxWidthUnit === 'px' ? 100 : 10} max={maxWidthUnit === 'px' ? 1000 : 100} value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label>Min Height</label>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{minHeight}</span>
                    <select className="input-field" value={minHeightUnit} onChange={e => setMinHeightUnit(e.target.value)} style={{ padding: '2px 4px', fontSize: '0.7rem' }}>
                      <option value="px">px</option>
                      <option value="%">%</option>
                      <option value="vh">vh</option>
                    </select>
                  </div>
                </div>
                <input type="range" min={minHeightUnit === 'px' ? 50 : 10} max={minHeightUnit === 'px' ? 800 : 100} value={minHeight} onChange={e => setMinHeight(Number(e.target.value))} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label>Border Radius</label>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{borderRadius}px</span>
                </div>
                <input type="range" min="0" max="200" value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} />
              </div>
            </div>

            {/* Column 4: Base Styling */}
            <div className="control-group" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <label style={{ fontWeight: 'bold' }}>Base Styling</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Inner Glow</label>
                <input type="color" value={innerShadowColor} onChange={e => setInnerShadowColor(e.target.value)} style={{ width: '28px', height: '28px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Background</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="color" value={backgroundColor !== 'transparent' && !backgroundColor.startsWith('rgba') ? backgroundColor : '#000000'} onChange={e => setBackgroundColor(e.target.value)} style={{ width: '28px', height: '28px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }} />
                  <input type="text" className="input-field" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} style={{ width: '90px', padding: '4px 8px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <input type="checkbox" checked={enableLuminance} onChange={e => setEnableLuminance(e.target.checked)} style={{ accentColor: 'var(--primary-color)' }} />
                <label style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setEnableLuminance(!enableLuminance)}>Interactive Luminance</label>
              </div>
            </div>

            {/* Spanning Elements at the Bottom */}
            <div className="control-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'block' }}>Bottom Glow Gradient</label>
              <GradientEditor stops={gradStops} onChange={setGradStops} />
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label>Glow Height</label>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{glowHeight}px</span>
                  </div>
                  <input type="range" min="10" max="150" value={glowHeight} onChange={e => setGlowHeight(Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label>Glow Blur</label>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{glowBlur}px</span>
                  </div>
                  <input type="range" min="0" max="100" value={glowBlur} onChange={e => setGlowBlur(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="control-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'block' }}>Background Image & Animations</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="input-field" placeholder="Image URL" value={bgImageUrl} onChange={e => setBgImageUrl(e.target.value)} style={{ flex: 1 }} />
                <label className="btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '0.5rem' }}>
                  <PhotoIcon width="16" /> Upload
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

              {/* Advanced Image Controls */}
              {bgImageUrl && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Brightness</label>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{bgBrightness}%</span>
                    </div>
                    <input type="range" min="0" max="200" value={bgBrightness} onChange={e => setBgBrightness(Number(e.target.value))} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>Contrast</label>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{bgContrast}%</span>
                    </div>
                    <input type="range" min="0" max="200" value={bgContrast} onChange={e => setBgContrast(Number(e.target.value))} />
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem' }}>Tint Overlay</label>
                    <input type="text" className="input-field" value={bgTint} onChange={e => setBgTint(e.target.value)} style={{ width: '100px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} />
                  </div>
                </div>
              )}

              {/* Hover Animations */}
              <div style={{ marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label>Hover Effects</label>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Intensity: {animIntensity.toFixed(1)}x</span>
                </div>
                <input type="range" min="0.1" max="10" step="0.1" value={animIntensity} onChange={e => setAnimIntensity(Number(e.target.value))} style={{ marginBottom: '1rem' }} />
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Object.entries({ 
                    float: 'Float', 
                    pulse: 'Pulse', 
                    expand: 'Expand', 
                    tilt: 'Tilt', 
                    shiftRight: 'Shift', 
                    jiggle: 'Jiggle', 
                    shake: 'Shake',
                    bounce: 'Bounce',
                    glowFlash: 'Flash',
                    colorCycle: 'Color Cycle',
                    outerGlow: 'Outer Glow'
                  }).map(([key, label]) => {
                    const isSelected = hoverAnimations[key];
                    return (
                      <label key={key} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        cursor: 'pointer', 
                        background: isSelected ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                        border: isSelected ? '1px solid rgba(255,255,255,0.8)' : '1px solid transparent',
                        color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)',
                        padding: '6px 12px', 
                        borderRadius: '16px', 
                        fontSize: '0.8rem', 
                        transition: 'all 0.2s ease',
                        fontWeight: isSelected ? '600' : '400',
                        boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.2)' : 'none'
                      }}>
                        <input type="checkbox" style={{ display: 'none' }} checked={isSelected} onChange={e => setHoverAnimations({...hoverAnimations, [key]: e.target.checked})} />
                        {isSelected && <Check style={{ width: '12px', height: '12px' }} />}
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>


        </div>
    </div>
  );
}
