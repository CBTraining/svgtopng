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

import PdfImageExtractor from './pages/PdfImageExtractor';
import AiTextAssistant from './pages/AiTextAssistant';

const Home = () => (
  <div className="animate-fade-in">
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
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
      Made by Christopher Gammello
    </div>
    <p>A suite of offline-capable, highly aesthetic client-side utilities.</p>
    <div className="glass-panel" style={{marginTop: '2rem'}}>
      <h3>Features</h3>
      <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
        <li style={{marginBottom: '0.5rem'}}><strong>Local AI Processing:</strong> Fully offline text summarization and image upscaling right in your browser.</li>
        <li style={{marginBottom: '0.5rem'}}><strong>PDF Image Extraction:</strong> Pull all embedded images out of a PDF securely in your browser.</li>
        <li style={{marginBottom: '0.5rem'}}><strong>Global Clipboard:</strong> Ctrl+V anywhere to save clipboard images directly as PNG.</li>
        <li style={{marginBottom: '0.5rem'}}><strong>Sidebar Drop:</strong> Drag & Drop images to the sidebar for instant PNG conversion.</li>
        <li style={{marginBottom: '0.5rem'}}><strong>Offline Ready:</strong> Install this PWA and use tools without an internet connection.</li>
      </ul>
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

  // Track mouse position for glowing card effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      const elements = document.querySelectorAll('.glass-panel, .nav-link, .sidebar');
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

  const processImageBlob = useCallback((blob, defaultName = 'clipboard_image') => {
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
        setFilename(defaultName);
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

      if (!handled && items) {
        for (let item of items) {
          if (item.type === 'text/html') {
            e.preventDefault();
            item.getAsString(async (html) => {
              const res = await processHtmlPaste(html);
              if (!res.success) {
                setGlobalToast(`Ext: ${res.error} Len: ${html.length}`);
                window.dispatchEvent(new Event('paste-error'));
              }
            });
            return; // Exit early since it's async
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
  }, []);

  const handleManualPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      let allTypes = [];
      for (const clipboardItem of clipboardItems) {
        allTypes.push(...clipboardItem.types);
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        for (const type of imageTypes) {
          const blob = await clipboardItem.getType(type);
          if (blob) {
            processImageBlob(blob);
            return;
          }
        }
      }

      // No native image blob found, let's try reading text/html
      for (const clipboardItem of clipboardItems) {
        if (clipboardItem.types.includes('text/html')) {
          const blob = await clipboardItem.getType('text/html');
          const html = await blob.text();
          const res = await processHtmlPaste(html);
          if (res.success) return;
          setGlobalToast(`Ext: ${res.error} Len: ${html.length}`);
          window.dispatchEvent(new Event('paste-error'));
          return;
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

      // Handle Data URIs immediately
      if (src.startsWith('data:image/')) {
        try {
          const response = await fetch(src);
          if (!response.ok) throw new Error("Fetch response not ok");
          const blob = await response.blob();
          processImageBlob(blob);
          return { success: true };
        } catch (err) {
          // Fallback manual base64 parsing if fetch fails due to size/security
          try {
            const arr = src.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            // Aggressively strip all whitespace, newlines, and html entities from the base64 data
            let b64Data = arr[1].replace(/[\s\r\n]+/g, '').replace(/&quot;/g, '').replace(/&amp;/g, '&');
            if (b64Data.endsWith('"') || b64Data.endsWith("'")) b64Data = b64Data.slice(0, -1);
            
            const bstr = atob(b64Data);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--) { u8arr[n] = bstr.charCodeAt(n); }
            const blob = new Blob([u8arr], {type: mime});
            processImageBlob(blob);
            return { success: true };
          } catch(manualErr) {
            return { success: false, error: `atob failed: ${manualErr.message}. Src len: ${src.length}` };
          }
        }
      }

      // Handle URLs (like lh3.googleusercontent.com)
      const loadImage = (url) => {
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

      try {
        const blob = await loadImage(src);
        processImageBlob(blob);
        return { success: true };
      } catch (e1) {
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`;
          const blob = await loadImage(proxyUrl);
          processImageBlob(blob);
          return { success: true };
        } catch (e2) {
          try {
            const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(src)}`;
            const blob = await loadImage(proxyUrl2);
            processImageBlob(blob);
            return { success: true };
          } catch (e3) {
            return { success: false, error: "Network fetch blocked by CORS on all proxies." };
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
      a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
      a.click();
      URL.revokeObjectURL(url);
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
              if (file.type.startsWith('image/')) {
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
              } else if (file.type.startsWith('video/')) {
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
              <Route path="/pdf-image-extractor" element={<PdfImageExtractor />} />
              <Route path="/timezone-converter" element={<TimezoneConverter />} />
              <Route path="/html-preview" element={<HtmlPreview />} />
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
              <div className="modal glass-panel animate-fade-in">
                <h3>Save Image</h3>
                <p style={{marginBottom: '1rem', fontSize: '0.9rem'}}>Enter a name for your pasted image.</p>
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
                />
                <div className="button-group" style={{justifyContent: 'flex-end', marginTop: '1.5rem'}}>
                  <button className="btn" onClick={handleCancel}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleDownload}>Save</button>
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
