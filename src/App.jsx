import { useEffect, useState, useRef, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/solid';
import Sidebar from './components/Sidebar';
import ImageTools from './pages/ImageTools';
import BackgroundRemover from './pages/BackgroundRemover';
import VideoCompressor from './pages/VideoCompressor';
import VideoToGif from './pages/VideoToGif';
import LottieToGif from './pages/LottieToGif';
import SvgConverter from './pages/SvgConverter';
import JsonSaver from './pages/JsonSaver';
import ColorPicker from './pages/ColorPicker';
import QrGenerator from './pages/QrGenerator';
import ImageUpscaler from './pages/ImageUpscaler';
import TimezoneConverter from './pages/TimezoneConverter';
import HtmlPreview from './pages/HtmlPreview';
import BackgroundDots from './components/BackgroundDots';
import RightPanel from './components/RightPanel/RightPanel';
import { ProcessingProvider } from './contexts/ProcessingContext';
import BackgroundJobsWidget from './components/BackgroundJobsWidget';
import ClockModeOverlay from './components/ClockModeOverlay';
import DiagnosticsOverlay from './components/DiagnosticsOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import DragDropOverlay from './components/DragDropOverlay';
import { isVideoFile, compressImageUnder20MB } from './utils/fileTypes';

import ContentExtractor from './pages/ContentExtractor';
import ShapeGenerator from './pages/ShapeGenerator';
import ComponentGenerator from './pages/ComponentGenerator';
import VideoFrameExtractor from './pages/VideoFrameExtractor';
import CollageMaker from './pages/CollageMaker';
import SvgTo3D from './pages/SvgTo3D';
import AssetExtractor from './pages/AssetExtractor';

import { NavLink } from 'react-router-dom';
import {
  PhotoIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
  PaintBrushIcon,
  RectangleGroupIcon,
  CommandLineIcon,
  FilmIcon,
  GifIcon,
  ScissorsIcon,
  GlobeAltIcon,
  QrCodeIcon,
  CodeBracketSquareIcon,
  ClockIcon,
  WindowIcon,
  CubeIcon,
  Square3Stack3DIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

const FEATURE_CATEGORIES = [
  {
    title: 'Image & Graphic Tools',
    items: [
      {
        to: '/image-tools',
        icon: PhotoIcon,
        title: 'Image Editor',
        desc: 'Gaussian and Radial Zoom blur, lighting, contrast, saturation, hue tint, rotation, and corner rounding.'
      },
      {
        to: '/content-extractor',
        icon: DocumentArrowDownIcon,
        title: 'Content Extractor',
        desc: 'Extract all embedded GIFs, images, videos, and audio from PPTX, PDF, DOCX, XLSX, and ZIP archives.'
      },
      {
        to: '/bg-remover',
        icon: SparklesIcon,
        title: 'Background Remover',
        desc: 'On-device AI cutout with sub-pixel edge refinement, anti-halo de-fringe, and studio backdrops.'
      },
      {
        to: '/image-upscaler',
        icon: SparklesIcon,
        title: 'AI Image Upscaler',
        desc: 'Enhance and upscale photos by 2x or 4x locally using neural super-resolution networks.'
      },
      {
        to: '/collage-maker',
        icon: Square3Stack3DIcon,
        title: 'Photo Collage Maker',
        desc: 'Combine multiple images into customizable grid and masonry photo layouts.'
      },
      {
        to: '/svg-to-3d',
        icon: CubeIcon,
        title: 'SVG to 3D',
        desc: 'Extrude 2D SVG vector graphics into interactive 3D meshes with real-time lighting.'
      },
      {
        to: '/svg-converter',
        icon: CommandLineIcon,
        title: 'SVG Converter',
        desc: 'Scale vectors to any resolution without loss, apply color overrides, and export PNGs.'
      },
      {
        to: '/color-picker',
        icon: PaintBrushIcon,
        title: 'Color Picker',
        desc: 'Extract color palettes and sample hex, rgb, hsl, and cmyk values.'
      },
      {
        to: '/shape-generator',
        icon: RectangleGroupIcon,
        title: 'Shape Generator',
        desc: 'Generate custom CSS and SVG geometric shapes, organic blobs, and decorative waves.'
      }
    ]
  },
  {
    title: 'Video & Animation',
    items: [
      {
        to: '/video-compressor',
        icon: FilmIcon,
        title: 'Video Compressor',
        desc: 'Client-side FFmpeg compression to shrink video file size while maintaining visual clarity.'
      },
      {
        to: '/video-to-gif',
        icon: GifIcon,
        title: 'Video to GIF',
        desc: 'Convert video clips into smooth, optimized animated GIFs with custom FPS and sizing.'
      },
      {
        to: '/video-frame-extractor',
        icon: FilmIcon,
        title: 'Video Frame Extractor',
        desc: 'Capture full-resolution still frames from uploaded video files or direct video URLs.'
      },
      {
        to: '/lottie-to-gif',
        icon: ScissorsIcon,
        title: 'Lottie to GIF',
        desc: 'Render Lottie JSON animation files into lightweight, looping animated GIFs.'
      }
    ]
  },
  {
    title: 'Web & Developer Utilities',
    items: [
      {
        to: '/asset-extractor',
        icon: GlobeAltIcon,
        title: 'Website Asset Extractor',
        desc: 'Scrape and extract SVGs, images, logos, and media from any live web page URL.'
      },
      {
        to: '/qr-generator',
        icon: QrCodeIcon,
        title: 'QR Code Generator',
        desc: 'Create custom branded QR codes with center logos, custom dot styles, and color gradients.'
      },
      {
        to: '/json-saver',
        icon: CodeBracketSquareIcon,
        title: 'JSON Formatter & Saver',
        desc: 'Format, validate, and inspect JSON documents with syntax highlighting.'
      },
      {
        to: '/timezone-converter',
        icon: ClockIcon,
        title: 'Timezone Converter',
        desc: 'Compare and convert multiple time zones across global locations in real time.'
      },
      {
        to: '/html-preview',
        icon: WindowIcon,
        title: 'HTML Live Preview',
        desc: 'Sandboxed code playground for HTML, CSS, and JS with instant split-pane preview.'
      },
      {
        to: '/component-generator',
        icon: CodeBracketSquareIcon,
        title: 'Component Generator',
        desc: 'Interactive UI builder generating clean React and Tailwind component code.'
      }
    ]
  }
];

const Home = () => (
  <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
    {/* Draggable region for Window Controls Overlay */}
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 'env(titlebar-area-height, 30px)',
      WebkitAppRegion: 'drag',
      zIndex: 999
    }} />
    
    <div className="page-header" style={{ marginBottom: '0.5rem', borderBottom: 'none', paddingBottom: '0', paddingTop: 'env(titlebar-area-height, 0px)' }}>
      <h1>Welcome to WebTools</h1>
    </div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
      A suite of fast, offline-capable, private client-side utilities. No servers, no tracking, 100% in-browser.
    </div>

    {/* Feature Sections */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {FEATURE_CATEGORIES.map((cat, idx) => (
        <div key={idx}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {cat.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {cat.items.map((feat) => {
              const Icon = feat.icon;
              return (
                <NavLink
                  key={feat.to}
                  to={feat.to}
                  className="glass-panel hover-glow"
                  style={{
                    padding: '1.25rem',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    borderRadius: 'var(--border-radius-sm)',
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon style={{ width: 22, height: 22, color: 'var(--accent-color)' }} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {feat.title}
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                    {feat.desc}
                  </p>
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </div>
);

function MainContentWrapper({ children }) {
  const location = useLocation();
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div ref={wrapperRef} className="main-content">
      {children}
    </div>
  );
}

function App() {
  const [showModal, setShowModal] = useState(false);
  const [filename, setFilename] = useState('clipboard_image');
  const [pendingBlob, setPendingBlob] = useState(null);
  const [blobType, setBlobType] = useState('png'); // 'png' or 'gif'
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClockMode, setIsClockMode] = useState(() => localStorage.getItem('isClockMode') === 'true');
  const [globalToast, setGlobalToast] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (showModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showModal]);

  // Persist clock mode
  useEffect(() => {
    localStorage.setItem('isClockMode', String(isClockMode));
  }, [isClockMode]);

  // Clear global toast after 3 seconds
  useEffect(() => {
    if (globalToast) {
      const timer = setTimeout(() => setGlobalToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [globalToast]);

  // Revoke preview URL on close
  useEffect(() => {
    if (!showModal && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [showModal, previewUrl]);

  // Track mouse position for glowing card effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      const elements = document.querySelectorAll('.glass-panel, .nav-link, .sidebar, .glow-card');
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Double-click background to toggle fullscreen
  useEffect(() => {
    const handleDoubleClick = (e) => {
      if (
        e.target.tagName.toLowerCase() === 'input' || 
        e.target.tagName.toLowerCase() === 'button' ||
        e.target.tagName.toLowerCase() === 'textarea' ||
        e.target.tagName.toLowerCase() === 'a' ||
        e.target.tagName.toLowerCase() === 'select' ||
        e.target.closest('.glass-panel') ||
        e.target.closest('.sidebar') ||
        e.target.closest('.sidebar-overlay') ||
        e.target.closest('.right-panel')
      ) {
        return;
      }

      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener('dblclick', handleDoubleClick);
    return () => window.removeEventListener('dblclick', handleDoubleClick);
  }, []);

  // Check magic bytes for GIF (GIF87a or GIF89a)
  const isGifBlob = async (blob) => {
    if (!blob) return false;
    if (blob.type === 'image/gif') return true;
    if (blob.size >= 6) {
      try {
        const buffer = await blob.slice(0, 6).arrayBuffer();
        const header = new TextDecoder().decode(buffer);
        if (header.startsWith('GIF8')) return true;
      } catch (e) {}
    }
    return false;
  };

  const processImageBlob = useCallback(async (blob, defaultName = 'clipboard_image') => {
    const isGif = await isGifBlob(blob);
    if (isGif) {
      const gifBlob = blob.type === 'image/gif' ? blob : new Blob([blob], { type: 'image/gif' });
      setPendingBlob(gifBlob);
      setBlobType('gif');
      const url = URL.createObjectURL(gifBlob);
      setPreviewUrl(url);
      const cleanName = defaultName.replace(/\.(png|gif|jpe?g|webp)$/i, '');
      setFilename(`${cleanName}.gif`);
      setShowModal(true);
      return;
    }

    // Otherwise convert static image to clean PNG
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        setPendingBlob(pngBlob);
        setBlobType('png');
        const url = URL.createObjectURL(pngBlob);
        setPreviewUrl(url);
        const cleanName = defaultName.replace(/\.(png|gif|jpe?g|webp)$/i, '');
        setFilename(`${cleanName}.png`);
        setShowModal(true);
      }, 'image/png');
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(blob);
  }, []);

  // Global Clipboard Listener
  useEffect(() => {
    const handlePaste = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      let handled = false;
      let availableTypes = [];

      if (items) {
        for (let item of items) {
          availableTypes.push(item.type);
        }

        // Prioritize text/html from Google Slides / Docs / Web to preserve raw GIF animation & high-res assets
        const htmlItem = Array.from(items).find(i => i.type === 'text/html');
        if (htmlItem) {
          e.preventDefault();
          htmlItem.getAsString(async (html) => {
            const res = await processHtmlPaste(html);
            if (!res.success) {
              // Fallback to native image item if html extraction failed
              const imgItem = Array.from(items).find(i => i.type.startsWith('image/'));
              if (imgItem) {
                const blob = imgItem.getAsFile();
                if (blob) processImageBlob(blob);
              } else {
                setGlobalToast(`Ext: ${res.error} Len: ${html.length}`);
                window.dispatchEvent(new Event('paste-error'));
              }
            }
          });
          return;
        }

        // Check image items directly
        for (let item of items) {
          if (item.type.indexOf('image') === 0) {
            const blob = item.getAsFile();
            if (blob) {
              e.preventDefault();
              processImageBlob(blob);
              handled = true;
              break;
            }
          }
        }
      }

      if (!handled) {
        setGlobalToast("Ctrl+V Diagnostic: Types seen: " + availableTypes.join(', '));
        window.dispatchEvent(new Event('paste-error'));
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImageBlob]);

  const handleManualPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      let allTypes = [];
      for (const clipboardItem of clipboardItems) {
        allTypes.push(...clipboardItem.types);

        // If text/html is present (e.g. Google Slides), prioritize extracting source URL / raw GIF
        if (clipboardItem.types.includes('text/html')) {
          const blob = await clipboardItem.getType('text/html');
          const html = await blob.text();
          const res = await processHtmlPaste(html);
          if (res.success) return;
        }

        // Check image/gif first if explicitly present
        if (clipboardItem.types.includes('image/gif')) {
          const blob = await clipboardItem.getType('image/gif');
          if (blob) {
            processImageBlob(blob, 'clipboard_animation');
            return;
          }
        }

        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        for (const type of imageTypes) {
          const blob = await clipboardItem.getType(type);
          if (blob) {
            processImageBlob(blob);
            return;
          }
        }
      }
      
      setGlobalToast(`Button Diagnostic: Types seen: ${allTypes.join(', ')}`);
      window.dispatchEvent(new Event('paste-error'));
    } catch (err) {
      console.warn("Clipboard API failed:", err);
      setGlobalToast("Clipboard blocked by browser. Please use Ctrl+V instead.");
      window.dispatchEvent(new Event('paste-error'));
    }
  };

  const processHtmlPaste = async (html) => {
    try {
      let src = null;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1. Try standard img tag
      const imgs = doc.querySelectorAll('img');
      for (let i=0; i<imgs.length; i++) {
        if (imgs[i].src && imgs[i].src.startsWith('http')) { src = imgs[i].src; break; }
        if (imgs[i].src && imgs[i].src.startsWith('data:image')) { src = imgs[i].src; break; }
      }

      // 2. Try SVG image tag
      if (!src) {
        const svgImgs = doc.querySelectorAll('image');
        for (let i=0; i<svgImgs.length; i++) {
          const href = svgImgs[i].getAttribute('href') || svgImgs[i].getAttribute('xlink:href');
          if (href) { src = href; break; }
        }
      }

      // 3. Clean Regex fallback for strictly valid base64 characters
      if (!src) {
        const dataUriRegex = /(data:image\/[^;"'\s]+;base64,[a-zA-Z0-9+/=]+)/i;
        const match = html.match(dataUriRegex);
        if (match) src = match[1];
      }

      // 4. Look for raw google content URLs
      if (!src) {
        const urlRegex = /(https:\/\/[a-zA-Z0-9-]+\.googleusercontent\.com\/[^"'\s]+)/i;
        const match = html.match(urlRegex);
        if (match) src = match[1];
      }

      if (!src) {
        return { success: false, error: "No image source found in HTML." };
      }

      // Handle Data URIs directly
      if (src.startsWith('data:image/')) {
        try {
          const response = await fetch(src);
          if (!response.ok) throw new Error("Fetch response not ok");
          const blob = await response.blob();
          processImageBlob(blob, src.startsWith('data:image/gif') ? 'pasted_animation' : 'clipboard_image');
          return { success: true };
        } catch (err) {
          // Fallback manual base64 parsing if fetch fails
          try {
            const arr = src.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            let b64Data = arr[1].replace(/[\s\r\n]+/g, '').replace(/&quot;/g, '').replace(/&amp;/g, '&');
            if (b64Data.endsWith('"') || b64Data.endsWith("'")) b64Data = b64Data.slice(0, -1);
            
            const bstr = atob(b64Data);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--) { u8arr[n] = bstr.charCodeAt(n); }
            const blob = new Blob([u8arr], {type: mime});
            processImageBlob(blob, mime === 'image/gif' ? 'pasted_animation' : 'clipboard_image');
            return { success: true };
          } catch(manualErr) {
            return { success: false, error: `atob failed: ${manualErr.message}. Src len: ${src.length}` };
          }
        }
      }

      // Handle URLs (like lh3.googleusercontent.com from Google Slides)
      // Normalize Google User Content URLs to =s0 so Google returns the raw original uploaded asset (the animated GIF)
      let targetUrl = src;
      if (/googleusercontent\.com/i.test(src)) {
        if (/=[swh]\d+/i.test(src)) {
          targetUrl = src.replace(/=[swh]\d+.*$/i, '=s0');
        } else if (!src.includes('=')) {
          targetUrl = `${src}=s0`;
        }
      }

      // Fetch the raw blob directly so animated GIFs preserve full frame sequences!
      const fetchDirectBlob = async (url) => {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Fetch status: ${resp.status}`);
        const b = await resp.blob();
        if (!b || b.size < 10) throw new Error("Empty blob");
        return b;
      };

      const loadImageFallback = (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 800;
            canvas.height = img.height || 600;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Canvas toBlob failed"));
            }, 'image/png');
          };
          img.onerror = () => reject(new Error("Image failed to load crossOrigin"));
          img.src = url;
        });
      };

      // 1. Try Direct Raw Fetch on normalized URL (Preserves GIFs)
      try {
        const rawBlob = await fetchDirectBlob(targetUrl);
        processImageBlob(rawBlob, 'google_slides_image');
        return { success: true };
      } catch (eDirect) {
        // 2. Try Codetabs CORS Proxy Raw Fetch (Fastest CORS proxy for images)
        try {
          const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
          const rawBlob = await fetchDirectBlob(proxyUrl);
          processImageBlob(rawBlob, 'google_slides_image');
          return { success: true };
        } catch (eProxy0) {
          // 3. Try AllOrigins CORS Proxy Raw Fetch
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
            const rawBlob = await fetchDirectBlob(proxyUrl);
            processImageBlob(rawBlob, 'google_slides_image');
            return { success: true };
          } catch (eProxy1) {
            // 4. Try CorsProxy.io Raw Fetch
            try {
              const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
              const rawBlob = await fetchDirectBlob(proxyUrl2);
              processImageBlob(rawBlob, 'google_slides_image');
              return { success: true };
            } catch (eProxy2) {
              // 5. Final Fallback: Canvas DOM image load
              try {
                const fallbackBlob = await loadImageFallback(targetUrl);
                processImageBlob(fallbackBlob, 'google_slides_image');
                return { success: true };
              } catch (eFinal) {
                return { success: false, error: "Network fetch blocked by CORS on all proxies." };
              }
            }
          }
        }
      }
    } catch (err) {
      return { success: false, error: "Fatal extractor error: " + err.message };
    }
  };

  const handleDownload = () => {
    if (pendingBlob && filename) {
      window.dispatchEvent(new CustomEvent('burst', { detail: { type: 'vertical', x: 0 } }));
      const url = URL.createObjectURL(pendingBlob);
      const a = document.createElement('a');
      a.href = url;
      const isGif = blobType === 'gif' || pendingBlob.type === 'image/gif' || filename.toLowerCase().endsWith('.gif');
      const ext = isGif ? '.gif' : '.png';
      const cleanName = filename.replace(/\.(png|gif|jpe?g|webp)$/i, '');
      a.download = `${cleanName}${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    setShowModal(false);
    setPendingBlob(null);
  };

  const handleCancel = () => {
    setShowModal(false);
    setPendingBlob(null);
  };

  return (
    <ProcessingProvider>
      <Router>
        <BackgroundDots />
        <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
          <defs>
            <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#40E0D0" />
              <stop offset="100%" stopColor="#12a5d1" />
            </linearGradient>
          </defs>
        </svg>
        <div className="app-layout">
          <div className="mobile-header">
            <button onClick={() => setIsSidebarOpen(true)}>
              <Bars3Icon style={{width: '28px', height: '28px'}} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
              <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="WebTools Logo" width="24" height="24" />
              <span style={{ fontWeight: 'normal', fontSize: '1.2rem' }}>Web<span className="text-gradient">Tools</span></span>
            </div>
          </div>
          
          {globalToast && (
            <div className="toast animate-fade-in" style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: typeof globalToast === 'object' && globalToast.type === 'success' ? 'var(--success-color, #52c41a)' : '#ff4444', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              {typeof globalToast === 'object' ? globalToast.text : globalToast}
            </div>
          )}

          {isClockMode && <ClockModeOverlay 
            onClose={() => setIsClockMode(false)} 
            onDropFile={(file) => {
              if (isImageFile(file) || file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0);
                  
                  canvas.toBlob((blob) => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name ? file.name.replace(/\.[^/.]+$/, "") + ".png" : 'pngconvert.png';
                    a.click();
                    URL.revokeObjectURL(url);
                    setGlobalToast({ text: "Image auto-converted to PNG and downloaded!", type: 'success' });
                  }, 'image/png');
                };
                img.src = URL.createObjectURL(file);
              } else if (isVideoFile(file)) {
                alert('Passive Video to GIF conversion via ffmpeg.wasm will trigger here!');
              } else {
                alert('Unsupported file type for passive conversion.');
              }
            }}
          />}

          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onManualPaste={handleManualPaste} onClockClick={() => setIsClockMode(true)} showDiagnostics={showDiagnostics} onToggleDiagnostics={() => setShowDiagnostics(!showDiagnostics)} />
          <MainContentWrapper>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/image-tools" element={<ImageTools />} />
              <Route path="/bg-remover" element={<BackgroundRemover />} />
              <Route path="/video-compressor" element={<VideoCompressor />} />
              <Route path="/video-to-gif" element={<VideoToGif />} />
              <Route path="/lottie-to-gif" element={<LottieToGif />} />
              <Route path="/svg-converter" element={<SvgConverter />} />
              <Route path="/json-saver" element={<JsonSaver />} />
              <Route path="/color-picker" element={<ColorPicker />} />
              <Route path="/qr-generator" element={<QrGenerator />} />
              <Route path="/image-upscaler" element={<ImageUpscaler />} />
              <Route path="/content-extractor" element={<ContentExtractor />} />
              <Route path="/pdf-image-extractor" element={<ContentExtractor />} />
              <Route path="/timezone-converter" element={<TimezoneConverter />} />
              <Route path="/html-preview" element={<HtmlPreview />} />
              <Route path="/shape-generator" element={<ShapeGenerator />} />
              <Route path="/component-generator" element={<ComponentGenerator />} />
              <Route path="/video-frame-extractor" element={<VideoFrameExtractor />} />
              <Route path="/collage-maker" element={<CollageMaker />} />
              <Route path="/svg-to-3d" element={<SvgTo3D />} />
              <Route path="/asset-extractor" element={<AssetExtractor />} />
            </Routes>
          </MainContentWrapper>
          
          <DragDropOverlay 
            onDropImageToModal={(file) => processImageBlob(file, file.name)}
            onDirectDownload={(file, format = 'png') => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                  if (!blob) return;
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = file.name ? file.name.replace(/\.[^/.]+$/, "") + `.${format}` : `converted.${format}`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setGlobalToast({ text: `Image auto-converted to ${format.toUpperCase()} and downloaded!`, type: 'success' });
                }, `image/${format}`);
              };
              img.onerror = () => {
                setGlobalToast({ text: "Error: The dragged file is not a valid image.", type: 'error' });
              };
              img.src = URL.createObjectURL(file);
            }}
            onCompressImage={async (file) => {
              try {
                setGlobalToast({ text: "Compressing image under 20MB (preserving full resolution)...", type: 'success' });
                const res = await compressImageUnder20MB(file);
                setGlobalToast({ 
                  text: `Compressed to ${res.sizeMB} MB (${res.format}, ${res.width}x${res.height}px) and downloaded!`, 
                  type: 'success' 
                });
              } catch (err) {
                console.error(err);
                setGlobalToast({ text: `Compression failed: ${err.message}`, type: 'error' });
              }
            }}
          />

          {showDiagnostics && (
            <ErrorBoundary name="Diagnostics">
              <DiagnosticsOverlay />
            </ErrorBoundary>
          )}

          <RightPanel />

          <BackgroundJobsWidget />

          {showModal && (
            <div className="modal-overlay">
              <div className="modal glass-panel animate-fade-in" style={{ maxWidth: '420px', width: '90%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>Save {blobType === 'gif' ? 'Animated GIF' : 'Image'}</h3>
                  {blobType === 'gif' && (
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold', 
                      background: 'rgba(64, 224, 208, 0.15)', 
                      color: 'var(--accent-color)', 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '12px',
                      border: '1px solid var(--accent-color)',
                      letterSpacing: '0.5px'
                    }}>
                      ✨ ANIMATED GIF
                    </span>
                  )}
                </div>
                <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {blobType === 'gif' 
                    ? 'Animated GIF detected! We preserved all frames and original animation.' 
                    : 'Enter a name for your pasted image.'}
                </p>

                {previewUrl && (
                  <div style={{ 
                    maxHeight: '160px', 
                    borderRadius: 'var(--border-radius-sm)', 
                    overflow: 'hidden', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '1rem',
                    background: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\'><rect width=\'8\' height=\'8\' fill=\'%23222\'/><rect x=\'8\' y=\'8\' width=\'8\' height=\'8\' fill=\'%23222\'/><rect x=\'8\' width=\'8\' height=\'8\' fill=\'%23333\'/><rect y=\'8\' width=\'8\' height=\'8\' fill=\'%23333\'/></svg>")',
                    border: '1px solid var(--border-color)',
                    padding: '0.5rem'
                  }}>
                    <img 
                      src={previewUrl} 
                      alt="Pasted Preview" 
                      style={{ maxWidth: '100%', maxHeight: '140px', objectFit: 'contain' }} 
                    />
                  </div>
                )}

                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  Filename ({blobType === 'gif' ? '.gif' : '.png'}):
                </label>
                <input 
                  ref={inputRef}
                  type="text" 
                  className="input-field" 
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDownload();
                    if (e.key === 'Escape') handleCancel();
                  }}
                  style={{ width: '100%' }}
                />
                <div className="button-group" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button className="btn" onClick={handleCancel}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleDownload}>
                    Save {blobType === 'gif' ? 'as GIF' : 'as PNG'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Router>
    </ProcessingProvider>
  );
}

export default App;
