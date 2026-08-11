import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowDownTrayIcon as Download, 
  GlobeAltIcon, 
  SparklesIcon, 
  CodeBracketIcon, 
  CubeIcon, 
  PhotoIcon, 
  FilmIcon, 
  MagnifyingGlassIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  XMarkIcon,
  EyeIcon,
  CommandLineIcon
} from '@heroicons/react/24/solid';
import JSZip from 'jszip';
import { playDing } from '../utils/audio';

const PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// Helper to resolve relative URLs against base URL
function resolveUrl(relativeUrl, baseUrl) {
  if (!relativeUrl) return '';
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (e) {
    return relativeUrl;
  }
}

// Sample websites for quick testing
const SAMPLE_SITES = [
  { name: 'Stripe', url: 'https://stripe.com' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'TailwindCSS', url: 'https://tailwindcss.com' },
  { name: 'Vite', url: 'https://vite.dev' }
];

export default function AssetExtractor() {
  const [targetUrl, setTargetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [assets, setAssets] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [zipping, setZipping] = useState(false);
  const [previewModalAsset, setPreviewModalAsset] = useState(null);
  const navigate = useNavigate();

  // Cleanup object URLs when assets change or component unmounts
  useEffect(() => {
    return () => {
      assets.forEach(asset => {
        if (asset.url && asset.url.startsWith('blob:')) {
          URL.revokeObjectURL(asset.url);
        }
      });
    };
  }, [assets]);

  const handleExtract = async (urlToFetch) => {
    const inputUrl = urlToFetch || targetUrl;
    if (!inputUrl.trim()) return;

    let formattedUrl = inputUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    setTargetUrl(formattedUrl);

    // Revoke previous blob URLs before clearing list
    assets.forEach(asset => {
      if (asset.url && asset.url.startsWith('blob:')) {
        URL.revokeObjectURL(asset.url);
      }
    });

    setLoading(true);
    setLoadingStatus('Working...');
    setErrorMsg('');
    setAssets([]);

    let htmlText = '';
    let fetchSuccess = false;

    // Try direct fetch first
    try {
      setLoadingStatus('Working...');
      const res = await fetch(formattedUrl);
      if (res.ok) {
        htmlText = await res.text();
        fetchSuccess = true;
      }
    } catch (e) {
      console.warn("Direct fetch CORS blocked, attempting proxy fallbacks...");
    }

    // Try CORS proxy fallbacks if direct fetch failed
    if (!fetchSuccess) {
      for (let i = 0; i < PROXIES.length; i++) {
        try {
          setLoadingStatus('Working...');
          const proxyUrl = PROXIES[i](formattedUrl);
          const res = await fetch(proxyUrl);
          if (res.ok) {
            htmlText = await res.text();
            fetchSuccess = true;
            break;
          }
        } catch (err) {
          console.warn(`Proxy ${i + 1} failed:`, err);
        }
      }
    }

    if (!fetchSuccess || !htmlText) {
      setLoading(false);
      setErrorMsg('Failed to load website. The website may be blocking automated requests or offline.');
      return;
    }

    setLoadingStatus('Working...');

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const baseUrl = formattedUrl;
      const extractedList = [];
      const seenUrls = new Set();

      // 1. Extract Inline <svg> Elements
      const svgElements = doc.querySelectorAll('svg');
      svgElements.forEach((svg, index) => {
        const clone = svg.cloneNode(true);
        if (!clone.getAttribute('xmlns')) {
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        
        // Ensure SVG has proper dimensions / viewBox so it renders sharply
        if (!clone.getAttribute('viewBox')) {
          const w = parseInt(clone.getAttribute('width')) || 100;
          const h = parseInt(clone.getAttribute('height')) || 100;
          clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
        }

        clone.style.width = '100%';
        clone.style.height = '100%';
        clone.style.maxHeight = '120px';

        const svgString = clone.outerHTML;
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);

        extractedList.push({
          id: `svg-inline-${index}`,
          type: 'svg',
          name: `vector_icon_${index + 1}.svg`,
          url: blobUrl,
          rawSvg: svgString,
          source: 'Inline SVG Vector'
        });
      });

      // 2. Extract <img> Tags (src, srcset, data-src)
      const imgElements = doc.querySelectorAll('img, picture source');
      imgElements.forEach((img, index) => {
        let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('srcset');
        if (src) {
          if (src.includes(' ')) src = src.split(' ')[0];
          const fullUrl = resolveUrl(src, baseUrl);
          if (fullUrl && !seenUrls.has(fullUrl)) {
            seenUrls.add(fullUrl);
            const ext = fullUrl.split('.').pop().split('?')[0].toLowerCase();
            const isSvg = ext === 'svg' || fullUrl.includes('.svg');
            const isLottie = ext === 'json' || fullUrl.includes('lottie');

            extractedList.push({
              id: `img-${index}`,
              type: isSvg ? 'svg' : isLottie ? 'lottie' : 'image',
              name: fullUrl.split('/').pop().split('?')[0] || `image_${index + 1}.${ext || 'png'}`,
              url: fullUrl,
              source: `<img> tag (${ext.toUpperCase() || 'Image'})`,
              extension: ext
            });
          }
        }
      });

      // 3. Extract CSS Background Images
      const allElements = doc.querySelectorAll('*[style*="background"]');
      allElements.forEach((el, index) => {
        const style = el.getAttribute('style') || '';
        const match = style.match(/url\(['"]?(.*?)['"]?\)/i);
        if (match && match[1]) {
          const fullUrl = resolveUrl(match[1], baseUrl);
          if (fullUrl && !seenUrls.has(fullUrl)) {
            seenUrls.add(fullUrl);
            const ext = fullUrl.split('.').pop().split('?')[0].toLowerCase();
            extractedList.push({
              id: `bg-${index}`,
              type: ext === 'svg' ? 'svg' : 'image',
              name: fullUrl.split('/').pop().split('?')[0] || `bg_image_${index + 1}.${ext || 'png'}`,
              url: fullUrl,
              source: 'CSS Background Image'
            });
          }
        }
      });

      // 4. Extract <video> & <source> Media
      const videoElements = doc.querySelectorAll('video, video source');
      videoElements.forEach((vid, index) => {
        const src = vid.getAttribute('src');
        if (src) {
          const fullUrl = resolveUrl(src, baseUrl);
          if (fullUrl && !seenUrls.has(fullUrl)) {
            seenUrls.add(fullUrl);
            extractedList.push({
              id: `video-${index}`,
              type: 'video',
              name: fullUrl.split('/').pop().split('?')[0] || `video_clip_${index + 1}.mp4`,
              url: fullUrl,
              source: '<video> Stream'
            });
          }
        }
      });

      // 5. Extract Favicons & App Icons
      const iconLinks = doc.querySelectorAll('link[rel*="icon"], link[rel*="apple-touch-icon"]');
      iconLinks.forEach((link, index) => {
        const href = link.getAttribute('href');
        if (href) {
          const fullUrl = resolveUrl(href, baseUrl);
          if (fullUrl && !seenUrls.has(fullUrl)) {
            seenUrls.add(fullUrl);
            extractedList.push({
              id: `icon-${index}`,
              type: 'icon',
              name: fullUrl.split('/').pop().split('?')[0] || `favicon_${index + 1}.ico`,
              url: fullUrl,
              source: 'Favicon / Website Icon'
            });
          }
        }
      });

      // 6. Extract Lottie Animation Scripts / URLs
      const scripts = doc.querySelectorAll('script, lottie-player');
      scripts.forEach((scr, index) => {
        const src = scr.getAttribute('src') || scr.getAttribute('path') || scr.getAttribute('data-animation-path');
        if (src && (src.endsWith('.json') || src.includes('lottie'))) {
          const fullUrl = resolveUrl(src, baseUrl);
          if (fullUrl && !seenUrls.has(fullUrl)) {
            seenUrls.add(fullUrl);
            extractedList.push({
              id: `lottie-${index}`,
              type: 'lottie',
              name: fullUrl.split('/').pop().split('?')[0] || `lottie_animation_${index + 1}.json`,
              url: fullUrl,
              source: 'Lottie JSON Animation'
            });
          }
        }
      });

      setAssets(extractedList);
      playDing();
    } catch (err) {
      console.error("Asset Parsing Error:", err);
      setErrorMsg(`Parsing error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtered asset list
  const filteredAssets = assets.filter(asset => {
    const matchesTab = activeTab === 'all' || asset.type === activeTab;
    const matchesSearch = !searchQuery || asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || asset.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadAsset = async (asset) => {
    try {
      if (asset.rawSvg) {
        const blob = new Blob([asset.rawSvg], { type: 'image/svg+xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = asset.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return;
      }
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = asset.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      window.open(asset.url, '_blank');
    }
  };

  const openInSvgConverter = async (asset) => {
    let svgText = asset.rawSvg;
    if (!svgText) {
      try {
        const res = await fetch(asset.url);
        svgText = await res.text();
      } catch (e) {
        console.error("Failed fetching SVG for Converter tool:", e);
        return;
      }
    }
    navigate('/svg-converter', { state: { svgText, fileName: asset.name } });
  };

  const downloadAllZip = async () => {
    if (assets.length === 0 || zipping) return;
    setZipping(true);

    try {
      const zip = new JSZip();
      const svgFolder = zip.folder("svg_vectors");
      const imgFolder = zip.folder("images");
      const videoFolder = zip.folder("videos");
      const iconFolder = zip.folder("icons");
      const lottieFolder = zip.folder("lottie_animations");

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        try {
          let folder = imgFolder;
          if (asset.type === 'svg') folder = svgFolder;
          else if (asset.type === 'video') folder = videoFolder;
          else if (asset.type === 'icon') folder = iconFolder;
          else if (asset.type === 'lottie') folder = lottieFolder;

          if (asset.rawSvg) {
            folder.file(asset.name, asset.rawSvg);
          } else {
            const res = await fetch(asset.url);
            const blob = await res.blob();
            folder.file(asset.name, blob);
          }
        } catch (e) {
          console.warn(`Could not add ${asset.name} to zip:`, e);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      const url = URL.createObjectURL(zipBlob);
      link.href = url;
      link.download = `extracted_website_assets_${Date.now()}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      playDing();
    } catch (err) {
      console.error("Zip generation error:", err);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header">
        <GlobeAltIcon style={{ width: 32, height: 32, fill: "url(#accent-grad)" }} />
        <h1>Website Asset & Component Extruder</h1>
      </div>
      <p style={{ marginTop: '-0.5rem', color: 'var(--text-secondary)' }}>
        Extract SVG vector icons, images, videos, favicons, and Lottie animations directly from any website URL without inspecting DOM elements!
      </p>

      {/* URL Input Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleExtract(); }}
          style={{ display: 'flex', gap: '0.75rem', width: '100%' }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <GlobeAltIcon style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Paste website URL (e.g. https://stripe.com or tailwindcss.com)..." 
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              style={{ paddingLeft: '2.75rem', width: '100%', height: '48px', fontSize: '0.95rem' }}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !targetUrl.trim()}
            style={{ height: '48px', padding: '0 1.5rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px', justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <div className="loader" style={{ width: 16, height: 16 }}></div>
                Extracting...
              </>
            ) : (
              <>
                <SparklesIcon style={{ width: 18, height: 18 }} />
                Extract Assets
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Site Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Try sample sites:</span>
          {SAMPLE_SITES.map((site) => (
            <button
              key={site.name}
              className="btn"
              onClick={() => handleExtract(site.url)}
              disabled={loading}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}
            >
              {site.name}
            </button>
          ))}
        </div>

        {/* Loading Progress Indicator */}
        {loading && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-color)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowPathIcon style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            {loadingStatus}
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', fontSize: '0.85rem', color: '#ef4444' }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Results Header & Category Filter Tabs */}
      {assets.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Extracted Media Assets
                <span style={{ fontSize: '0.85rem', background: 'var(--accent-color)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '12px' }}>
                  {filteredAssets.length} / {assets.length} items
                </span>
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <MagnifyingGlassIcon style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Filter assets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.8rem', width: '180px' }}
                />
              </div>

              {/* Download All Zip Button */}
              <button 
                className="btn btn-primary"
                onClick={downloadAllZip}
                disabled={zipping}
                style={{ height: '36px', padding: '0 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Download style={{ width: 16, height: 16 }} />
                {zipping ? 'Zipping...' : 'Download All (.ZIP)'}
              </button>
            </div>
          </div>

          {/* Filter Category Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', overflowX: 'auto' }}>
            {[
              { id: 'all', label: `All (${assets.length})` },
              { id: 'svg', label: `SVG Vectors (${assets.filter(a => a.type === 'svg').length})` },
              { id: 'image', label: `Images (${assets.filter(a => a.type === 'image').length})` },
              { id: 'video', label: `Videos (${assets.filter(a => a.type === 'video').length})` },
              { id: 'icon', label: `Icons (${assets.filter(a => a.type === 'icon').length})` },
              { id: 'lottie', label: `Lottie (${assets.filter(a => a.type === 'lottie').length})` }
            ].map(tab => (
              <button
                key={tab.id}
                className="btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '20px',
                  background: activeTab === tab.id ? 'var(--accent-color)' : 'rgba(255,255,255,0.04)',
                  color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  border: 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Media Asset Gallery Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {filteredAssets.map((asset, index) => (
              <div 
                key={asset.id} 
                className="glass-panel" 
                style={{ 
                  padding: '0.85rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem', 
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  position: 'relative'
                }}
              >
                {/* Media Preview Box with Checkerboard Background */}
                <div 
                  onClick={() => setPreviewModalAsset(asset)}
                  style={{ 
                    height: '140px', 
                    background: asset.type === 'svg' 
                      ? 'linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.08) 75%) #080c16'
                      : '#090d16',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    borderRadius: '6px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justify: 'center', 
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '8px'
                  }}
                  title="Click to expand high-res preview"
                >
                  {asset.type === 'svg' ? (
                    asset.rawSvg ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: asset.rawSvg }} 
                        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }} 
                      />
                    ) : (
                      <img 
                        src={asset.url} 
                        alt={asset.name} 
                        style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} 
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )
                  ) : asset.type === 'video' ? (
                    <video src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop onMouseOver={e => e.target.play()} onMouseOut={e => e.target.pause()} />
                  ) : (
                    <img src={asset.url} alt={asset.name} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  )}

                  <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.75)', color: 'var(--accent-color)', fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {asset.type}
                  </span>
                </div>

                {/* Info Text */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={asset.name}>
                    {asset.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {asset.source}
                  </div>
                </div>

                {/* Interactive Action Buttons */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                  
                  {/* Download Button */}
                  <button 
                    className="btn" 
                    onClick={() => handleDownloadAsset(asset)}
                    style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    title="Download Asset"
                  >
                    <Download style={{ width: 14, height: 14 }} /> Download
                  </button>

                  {/* Direct Bridge to SVG Converter */}
                  {asset.type === 'svg' && (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => openInSvgConverter(asset)}
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Convert, recolor, tint, or resize this SVG vector!"
                    >
                      <CommandLineIcon style={{ width: 14, height: 14 }} /> Convert SVG
                    </button>
                  )}

                  {/* Copy Code / URL */}
                  <button 
                    className="btn" 
                    onClick={() => copyToClipboard(asset.rawSvg || asset.url, index)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                    title="Copy Code or URL"
                  >
                    {copiedIndex === index ? <CheckIcon style={{ width: 14, height: 14, color: '#10b981' }} /> : <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expanded High-Res Preview Modal */}
      {previewModalAsset && (
        <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#0b0f19', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <button 
              onClick={() => setPreviewModalAsset(null)}
              style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <XMarkIcon style={{ width: 20, height: 20 }} />
            </button>

            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <EyeIcon style={{ width: 20, height: 20, color: 'var(--accent-color)' }} />
              High-Res Asset Preview: {previewModalAsset.name}
            </h3>

            {/* High-Res Preview Box */}
            <div style={{ 
              width: '100%', 
              height: '340px', 
              background: 'linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.08) 75%) #090d16',
              backgroundSize: '20px 20px',
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justify: 'center', 
              padding: '1.5rem',
              overflow: 'hidden'
            }}>
              {previewModalAsset.type === 'svg' ? (
                previewModalAsset.rawSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: previewModalAsset.rawSvg }} style={{ width: '80%', height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }} />
                ) : (
                  <img src={previewModalAsset.url} alt={previewModalAsset.name} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                )
              ) : previewModalAsset.type === 'video' ? (
                <video src={previewModalAsset.url} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '6px' }} />
              ) : (
                <img src={previewModalAsset.url} alt={previewModalAsset.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Source: {previewModalAsset.source}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {previewModalAsset.type === 'svg' && (
                  <button className="btn btn-primary" onClick={() => { setPreviewModalAsset(null); openInSvgConverter(previewModalAsset); }}>
                    <CommandLineIcon style={{ width: 16, height: 16 }} /> Open in SVG Converter
                  </button>
                )}
                <button className="btn" onClick={() => handleDownloadAsset(previewModalAsset)}>
                  <Download style={{ width: 16, height: 16 }} /> Download Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
