import { useState, useEffect, useRef } from 'react';
import { CodeBracketSquareIcon, ClipboardDocumentIcon, CheckIcon as Check, PhotoIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { toBlob, toSvg, toCanvas } from 'html-to-image';
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
  const [showBottomGlow, setShowBottomGlow] = useState(true);
  const [enableLuminance, setEnableLuminance] = useState(true);
  const [hoverAnimations, setHoverAnimations] = useState({
    float: false,
    pulse: false,
    expand: true,
    tilt: true,
    shiftRight: false,
    jiggle: false,
    glowFlash: false,
    colorCycle: true,
    outerGlow: false,
    edgeGlow: false,
    shake: false,
    bounce: false
  });
  const [animIntensity, setAnimIntensity] = useState(1.0);

  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgImagePosition, setBgImagePosition] = useState('center');
  const [bgBrightness, setBgBrightness] = useState(100);
  const [bgContrast, setBgContrast] = useState(100);
  const [bgTint, setBgTint] = useState('transparent');
  const [fontFamily, setFontFamily] = useState('system-ui, -apple-system, sans-serif');
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

  const [iconType, setIconType] = useState('material');
  const [iconName, setIconName] = useState('star');

  const [iconSize, setIconSize] = useState(50);
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
        glowHeight, glowBlur, showBottomGlow, enableLuminance, hoverAnimations, animIntensity,
        bgImageUrl, bgBrightness, bgContrast, bgTint, bgImagePosition, fontFamily, cardTitle, cardSubtitle,
        iconSvg, iconLink, gradStops, iconType, iconName, iconSize, iconFill,
        showText, showIcon, cardTitleColor, cardSubtitleColor, cardTitleSize, cardSubtitleSize
      }
    };
    setPresets(newPresets);
    localStorage.setItem('componentGeneratorPresets', JSON.stringify(newPresets));
    setPresetName(''); // Clear input after save
  };

  const deletePreset = () => {
    if (!presetName.trim()) return alert("Enter the name of the preset to delete, or load it first.");
    if (!presets[presetName]) return alert("Preset not found.");
    if (!window.confirm(`Delete preset "${presetName}"?`)) return;
    const newPresets = { ...presets };
    delete newPresets[presetName];
    setPresets(newPresets);
    localStorage.setItem('componentGeneratorPresets', JSON.stringify(newPresets));
    setPresetName(''); // Clear input after delete
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
    if (p.showBottomGlow !== undefined) setShowBottomGlow(p.showBottomGlow);
    if (p.enableLuminance !== undefined) setEnableLuminance(p.enableLuminance);
    if (p.hoverAnimations !== undefined) setHoverAnimations(prev => ({...prev, ...p.hoverAnimations}));
    if (p.animIntensity !== undefined) setAnimIntensity(p.animIntensity);
    if (p.bgImageUrl !== undefined) setBgImageUrl(p.bgImageUrl);
    if (p.bgBrightness !== undefined) setBgBrightness(p.bgBrightness);
    if (p.bgContrast !== undefined) setBgContrast(p.bgContrast);
    if (p.bgTint !== undefined) setBgTint(p.bgTint);
    if (p.bgImagePosition !== undefined) setBgImagePosition(p.bgImagePosition);
    if (p.fontFamily !== undefined) setFontFamily(p.fontFamily);
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
    { color: '#4285F4', position: 0.35 },
    { color: '#EA4335', position: 0.65 },
    { color: '#FBBC04', position: 0.82 },
    { color: '#34A853', position: 1.0 }
  ]);

  const [copySuccess, setCopySuccess] = useState(false);
  const [copyImageSuccess, setCopyImageSuccess] = useState(false);
  const [copySvgSuccess, setCopySvgSuccess] = useState(false);

  // Generate CSS string
  const sortedStops = [...gradStops].sort((a, b) => a.position - b.position);
  const loopStops = [];
  sortedStops.forEach(s => { loopStops.push(`${s.color} ${Math.round(s.position * 50)}%`); });
  sortedStops.forEach(s => { loopStops.push(`${s.color} ${Math.round(50 + s.position * 50)}%`); });
  
  const gradientString = hoverAnimations.colorCycle 
    ? `linear-gradient(90deg, ${loopStops.join(', ')})`
    : `linear-gradient(90deg, ${sortedStops.map(s => `${s.color} ${Math.round(s.position * 100)}%`).join(', ')})`;

  let animationCss = '';
  let transformStr = `perspective(1000px) rotateX(0deg) rotateY(0deg) `;
  if (hoverAnimations.expand) transformStr += `scale(${1 + (0.02 * animIntensity)}) `;
  else transformStr += `scale(1) `;
  
  if (hoverAnimations.float) transformStr += `translateY(${-5 * animIntensity}px) `;
  else transformStr += `translateY(0px) `;
  
  if (hoverAnimations.shiftRight) transformStr += `translateX(${8 * animIntensity}px) `;
  else transformStr += `translateX(0px) `;

  const hasTransform = hoverAnimations.expand || hoverAnimations.float || hoverAnimations.shiftRight;
  let cardAnimations = [];
  if (hoverAnimations.jiggle) cardAnimations.push(`jiggle 0.3s ease-in-out infinite`);
  if (hoverAnimations.shake) cardAnimations.push(`shake 0.4s ease-in-out infinite`);
  if (hoverAnimations.bounce) cardAnimations.push(`bounce 0.5s ease-in-out infinite`);
  
  
  if (hoverAnimations.tilt) {
    animationCss += `\n.glow-card:hover { transition: all 0.3s ease, transform 0.1s ease-out; }`;
  }
  if (hasTransform || hoverAnimations.float || hoverAnimations.outerGlow || hoverAnimations.edgeGlow || cardAnimations.length > 0) {
    animationCss += `\n.glow-card:hover {`;
    if (hasTransform) animationCss += `\n  transform: ${transformStr.trim()};`;
    
    let shadows = [];
    if (hoverAnimations.float) shadows.push(`0 ${10 * animIntensity}px ${20 * animIntensity}px rgba(0,0,0,0.5)`);
    if (hoverAnimations.outerGlow) {
      const glowCol = sortedStops.length > 0 ? sortedStops[0].color : 'rgba(255,255,255,0.5)';
      shadows.push(`0 0 ${40 * animIntensity}px ${glowCol}`);
    }
    if (hoverAnimations.edgeGlow) {
      const edgeCol = sortedStops.length > 0 ? sortedStops[0].color : 'white';
      shadows.push(`inset 0 0 0 2px ${edgeCol}`, `0 0 ${20 * animIntensity}px ${edgeCol}`);
    }
    if (shadows.length > 0) {
      animationCss += `\n  box-shadow: \n    ${shadows.join(',\n    ')};`;
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
  0% { background-position: 0% 50%; background-size: 200% 100%; }
  50% { background-size: 300% 150%; }
  100% { background-position: 200% 50%; background-size: 200% 100%; }
}`;
  }

  if (showBottomGlow) {
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
  font-family: ${fontFamily};
  max-width: ${maxWidth}${maxWidthUnit};
  min-height: ${minHeight}${minHeightUnit};
  background-color: ${backgroundColor};
  border-radius: ${borderRadius}px;
  position: relative;
  overflow: hidden;
  z-index: 1;
  transition: all 0.3s ease;
  transform: perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0px) translateX(0px);
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
${showBottomGlow ? `
.glow-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: ${glowHeight}px;
  background: ${gradientString};
  background-size: ${hoverAnimations.colorCycle ? '200% 100%' : '100% 100%'};
  background-position: 0% 50%;
  filter: blur(${glowBlur}px) saturate(${100 + (glowBlur * 2)}%);
  z-index: 2;
  pointer-events: none;
  opacity: 1;
  clip-path: inset(-200px 0 0 0 round 0 0 ${borderRadius}px ${borderRadius}px);
  transition: opacity 0.3s ease, filter 0.3s ease, height 0.3s ease, background-position 1.5s ease-out, background-size 1.5s ease-out;
}
` : ''}
${bgImageUrl ? `
.glow-card-bg {
  position: absolute;
  inset: 0;
  background-image: url('${bgImageUrl}');
  background-size: cover;
  background-position: ${bgImagePosition};
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
      
      let transformStr = \`perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) \`;
      ${hoverAnimations.expand ? `transformStr += \`scale(${1 + (0.02 * animIntensity)}) \`;` : 'transformStr += `scale(1) `;'}
      ${hoverAnimations.float ? `transformStr += \`translateY(${-5 * animIntensity}px) \`;` : 'transformStr += `translateY(0px) `;'}
      ${hoverAnimations.shiftRight ? `transformStr += \`translateX(${8 * animIntensity}px) \`;` : 'transformStr += `translateX(0px) `;'}
      
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

  const generateNativeSvg = async () => {
    if (!previewRef.current) return '';
    const cardRect = previewRef.current.getBoundingClientRect();
    const w = cardRect.width;
    const h = cardRect.height;
    const r = borderRadius;

    let svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    svgStr += `<defs>`;
    
    svgStr += `<linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">`;
    const sortedStops = [...gradStops].sort((a, b) => a.position - b.position);
    sortedStops.forEach(stop => {
      svgStr += `<stop offset="${stop.position * 100}%" stop-color="${stop.color}" />`;
    });
    svgStr += `</linearGradient>`;

    svgStr += `<filter id="glowBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${glowBlur}" />
    </filter>`;

    svgStr += `<filter id="insetShadowBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" />
      <feOffset dx="0" dy="4" />
    </filter>`;

    svgStr += `<clipPath id="cardClip">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${r}" />
    </clipPath>`;
    svgStr += `</defs>`;

    // Background (use innerShadowColor as card base if backgroundColor is transparent)
    const cardBaseFill = (backgroundColor && backgroundColor !== 'transparent') ? backgroundColor : innerShadowColor;
    svgStr += `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="${cardBaseFill}" />`;
    
    if (bgImageUrl) {
      svgStr += `<g clip-path="url(#cardClip)">
        <image href="${bgImageUrl}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" />
        <rect x="0" y="0" width="${w}" height="${h}" fill="${bgTint}" />
      </g>`;
    }

    // Glow
    if (showBottomGlow) {
      svgStr += `<g clip-path="url(#cardClip)">
        <rect x="-${w}" y="${h - glowHeight}" width="${w * 3}" height="${glowHeight + 100}" fill="url(#glowGrad)" filter="url(#glowBlur)" />
      </g>`;
    }

    // Crisp 1px inner border
    svgStr += `<rect x="0.5" y="0.5" width="${w-1}" height="${h-1}" rx="${r}" fill="none" stroke="${innerShadowColor}" stroke-width="1.5" />`;

    // Elements
    const iconNode = previewRef.current.querySelector('.glow-card-icon');
    if (iconNode && showIcon) {
      const iRect = iconNode.getBoundingClientRect();
      const dx = iRect.left - cardRect.left;
      const dy = iRect.top - cardRect.top;
      if (iconType === 'svg') {
         svgStr += `<g transform="translate(${dx}, ${dy})">${iconSvg}</g>`;
      } else {
         try {
           const cleanName = iconName.toLowerCase().trim().replace(/_/g, '-');
           const suffix = iconFill ? '-rounded' : '-outline-rounded';
           let queryName = cleanName;
           if (!queryName.endsWith('-rounded')) queryName += suffix;
           
           const res = await fetch(`https://api.iconify.design/material-symbols/${queryName}.svg`);
           if (res.ok) {
             const svgText = await res.text();
             const sizedSvg = svgText.replace(/width="[^"]*"/, `width="${iconSize}"`).replace(/height="[^"]*"/, `height="${iconSize}"`).replace('<svg ', '<svg color="white" ');
             svgStr += `<g transform="translate(${dx}, ${dy})">${sizedSvg}</g>`;
           } else {
             throw new Error('Icon fetch failed');
           }
         } catch(e) {
           svgStr += `<text x="${dx}" y="${dy}" dominant-baseline="hanging" font-family="Material Symbols Rounded" font-size="${iconSize}px" fill="white" font-weight="400">${iconName}</text>`;
         }
      }
    }

    const titleNode = previewRef.current.querySelector('.glow-card-title');
    if (titleNode && showText) {
      const tRect = titleNode.getBoundingClientRect();
      const dx = tRect.left - cardRect.left;
      const dy = tRect.top - cardRect.top;
      const computedStyle = window.getComputedStyle(titleNode);
      const fontSize = computedStyle.fontSize;
      const fontWeight = computedStyle.fontWeight;
      svgStr += `<text x="${dx}" y="${dy + parseFloat(fontSize) * 0.1}" dominant-baseline="hanging" font-family="${fontFamily.replace(/"/g, "'")}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${cardTitleColor}">${cardTitle}</text>`;
    }

    const subNode = previewRef.current.querySelector('.glow-card-subtitle');
    if (subNode && showText) {
      const sRect = subNode.getBoundingClientRect();
      const dx = sRect.left - cardRect.left;
      const dy = sRect.top - cardRect.top;
      const computedStyle = window.getComputedStyle(subNode);
      const fontSize = computedStyle.fontSize;
      const fontWeight = computedStyle.fontWeight;
      svgStr += `<text x="${dx}" y="${dy + parseFloat(fontSize) * 0.1}" dominant-baseline="hanging" font-family="${fontFamily.replace(/"/g, "'")}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${cardSubtitleColor}" opacity="0.8">${cardSubtitle}</text>`;
    }

    svgStr += `</svg>`;
    return svgStr;
  };

  const parseDataUrlSvg = (dataUrl) => {
    if (!dataUrl) return '';
    if (dataUrl.includes('base64,')) {
      try { return atob(dataUrl.split('base64,')[1]); } catch (e) {}
    }
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx !== -1) {
      try { return decodeURIComponent(dataUrl.substring(commaIdx + 1)); } catch (e) {}
    }
    return dataUrl;
  };

  const generateForeignObjectSvg = () => {
    if (!previewRef.current) return '';
    const rect = previewRef.current.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <style>
${cssCode}
  </style>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
      <div class="glow-card" style="margin: 0;">
        ${innerHtml}
      </div>
    </div>
  </foreignObject>
</svg>`.trim();
  };

  const getComponentSvg = async () => {
    if (!previewRef.current) return '';
    try {
      const originalTransform = previewRef.current.style.transform;
      previewRef.current.style.transform = 'none';

      const svgStr = await generateNativeSvg();

      previewRef.current.style.transform = originalTransform;
      return svgStr;
    } catch (err) {
      console.warn("generateNativeSvg failed", err);
      return '';
    }
  };

  const handleDownloadSvg = async () => {
    if (!previewRef.current) return;
    try {
      const svgStr = await getComponentSvg();
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = 'component.svg';
      link.href = svgUrl;
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(svgUrl), 100);
    } catch (err) {
      console.error("Failed to download SVG", err);
    }
  };

  const handleCopySvg = async () => {
    if (!previewRef.current) return;
    try {
      const svgStr = await getComponentSvg();
      await navigator.clipboard.writeText(svgStr);
      setCopySvgSuccess(true);
      setTimeout(() => setCopySvgSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy SVG", err);
    }
  };


  const handleCopyImage = async () => {
    if (!previewRef.current) return;
    try {
      const rect = previewRef.current.getBoundingClientRect();
      const targetWidth = Math.max(1000, rect.width * 2);
      const scale = targetWidth / rect.width;

      const blob = await toBlob(previewRef.current, {
        pixelRatio: scale,
        backgroundColor: 'transparent'
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

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    try {
      const rect = previewRef.current.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);

      const originalTransform = previewRef.current.style.transform;
      previewRef.current.style.transform = 'none';

      const canvas = await toCanvas(previewRef.current, {
        pixelRatio: 4, // 300+ DPI high resolution vector quality
        backgroundColor: 'transparent'
      });

      previewRef.current.style.transform = originalTransform;

      const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
      const base64Data = jpegUrl.split(',')[1];
      const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const pdfHeader = `%PDF-1.4\n`;
      const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
      const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
      const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources 4 0 R /Contents 5 0 R >>\nendobj\n`;
      const obj4 = `4 0 obj\n<< /ProcSet [/PDF /ImageC /ImageI] /XObject << /Im1 6 0 R >> >>\nendobj\n`;
      
      const streamContent = `q\n${w} 0 0 ${h} 0 0 cm\n/Im1 Do\nQ\n`;
      const obj5 = `5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`;

      const obj6Header = `6 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`;
      const obj6Footer = `\nendstream\nendobj\n`;

      let offset = pdfHeader.length;
      const offsets = [0];
      offsets.push(offset); offset += obj1.length;
      offsets.push(offset); offset += obj2.length;
      offsets.push(offset); offset += obj3.length;
      offsets.push(offset); offset += obj4.length;
      offsets.push(offset); offset += obj5.length;
      offsets.push(offset);

      const encoder = new TextEncoder();
      const headerBytes = encoder.encode(pdfHeader + obj1 + obj2 + obj3 + obj4 + obj5 + obj6Header);
      const footerBytes = encoder.encode(obj6Footer);

      offset += headerBytes.length + imgBytes.length + footerBytes.length;

      let xref = `xref\n0 7\n0000000000 65535 f \n`;
      for (let i = 1; i <= 6; i++) {
        xref += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
      }
      const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;

      const xrefBytes = encoder.encode(xref + trailer);

      const totalLength = headerBytes.length + imgBytes.length + footerBytes.length + xrefBytes.length;
      const pdfBuffer = new Uint8Array(totalLength);
      
      pdfBuffer.set(headerBytes, 0);
      pdfBuffer.set(imgBytes, headerBytes.length);
      pdfBuffer.set(footerBytes, headerBytes.length + imgBytes.length);
      pdfBuffer.set(xrefBytes, headerBytes.length + imgBytes.length + footerBytes.length);

      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'component.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("Failed to export PDF", err);
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
            <button className="btn" onClick={handleDownloadPdf} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}>
              <DocumentArrowDownIcon style={{ width: '16px', height: '16px' }} />
              Download PDF
            </button>
            <button className="btn" onClick={handleDownloadSvg} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
              </svg>
              Download SVG
            </button>
            <button className="btn" onClick={handleCopySvg} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}>
              {copySvgSuccess ? <Check style={{width: '16px', height: '16px'}} /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>}
              {copySvgSuccess ? 'Copied SVG!' : 'Copy SVG'}
            </button>
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
            <input type="text" className="input-field" placeholder="Preset Name" value={presetName} onChange={e => setPresetName(e.target.value)} style={{ width: '200px', padding: '0.5rem' }} />
            <button className="btn" onClick={savePreset}>Save</button>
            <button className="btn" onClick={deletePreset} style={{ color: '#ff4444', borderColor: 'rgba(255,68,68,0.3)' }}>Delete</button>
            <div style={{ flex: 1 }}></div>
            <select className="input-field" style={{ padding: '0.5rem', width: '200px' }} onChange={e => { loadPreset(e.target.value); setPresetName(e.target.value); }} value="">
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Font</label>
                  <select className="input-field" value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={{ padding: '2px 8px', fontSize: '0.8rem', width: 'auto' }}>
                    <option value="system-ui, -apple-system, sans-serif">System Sans</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="'Playfair Display', serif">Playfair Display</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ display: 'block' }}>Background Image & Animations</label>
                <select className="input-field" value={bgImagePosition} onChange={e => setBgImagePosition(e.target.value)} style={{ padding: '2px 8px', fontSize: '0.8rem', width: 'auto' }}>
                  <option value="top">Align Top</option>
                  <option value="center">Align Center</option>
                  <option value="bottom">Align Bottom</option>
                </select>
              </div>
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
                    outerGlow: 'Outer Glow',
                    edgeGlow: 'Edge Glow'
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
