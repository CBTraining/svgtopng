import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  DocumentArrowDownIcon as DocumentIcon, 
  ArrowDownTrayIcon as DownloadIcon, 
  ClipboardDocumentCheckIcon as CopyIcon, 
  XMarkIcon as XMark,
  MagnifyingGlassIcon,
  SparklesIcon,
  PlayIcon,
  SpeakerWaveIcon,
  FilmIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid, CheckIcon } from '@heroicons/react/24/solid';
import JSZip from 'jszip';
import Dropzone from '../components/Dropzone';
import SendToDropdown from '../components/SendToDropdown';
import { playDing } from '../utils/audio';
import { useLocation } from 'react-router-dom';

// Import pdfjs
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const MIME_MAP = {
  gif: 'image/gif',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg'
};

export default function ContentExtractor() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filter & Search States
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'gif', 'png', 'jpg', 'svg', 'video', 'audio', 'other'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Handle incoming file from drag and drop or router state
  useEffect(() => {
    const file = location.state?.file || location.state?.pdfFile;
    if (file && !isProcessing && items.length === 0) {
      extractContent(file);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach(item => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [items]);

  const extractContent = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setItems([]);
    setSelectedIds(new Set());
    setErrorMsg('');
    
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setFileName(baseName);
    const ext = file.name.split('.').pop().toLowerCase();

    try {
      if (ext === 'pdf' || file.type === 'application/pdf') {
        await extractPdf(file, baseName);
      } else {
        // PPTX, DOCX, XLSX, ZIP, KEY, ODP, ODT
        await extractZipArchive(file, baseName);
      }
    } catch (err) {
      console.error("Extraction error:", err);
      setErrorMsg("Failed to extract content: " + (err.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatusText('');
    }
  };

  // 1. Extract from PPTX / DOCX / XLSX / ZIP Archives using JSZip
  const extractZipArchive = async (file, baseName) => {
    setStatusText('Opening archive & scanning media files...');
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const extractedList = [];
    let counter = 0;

    const entries = Object.keys(contents.files).filter(path => !contents.files[path].dir);
    const total = entries.length;

    for (let i = 0; i < total; i++) {
      const path = entries[i];
      const entry = contents.files[path];
      setProgress(Math.round(((i + 1) / total) * 100));

      const fileExt = path.split('.').pop().toLowerCase();
      const isMedia = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'ogg', 'emf', 'wmf'].includes(fileExt);

      // Check if it's inside a media folder or has media extension
      if (isMedia || path.includes('/media/') || path.includes('/embeddings/')) {
        try {
          const blob = await entry.async('blob');
          const mime = MIME_MAP[fileExt] || (fileExt === 'emf' || fileExt === 'wmf' ? 'image/x-emf' : 'application/octet-stream');
          const typedBlob = new Blob([blob], { type: mime });
          const url = URL.createObjectURL(typedBlob);

          let mediaCategory = 'other';
          if (fileExt === 'gif') mediaCategory = 'gif';
          else if (['png'].includes(fileExt)) mediaCategory = 'png';
          else if (['jpg', 'jpeg'].includes(fileExt)) mediaCategory = 'jpg';
          else if (fileExt === 'svg') mediaCategory = 'svg';
          else if (['mp4', 'mov', 'webm'].includes(fileExt)) mediaCategory = 'video';
          else if (['mp3', 'wav', 'm4a', 'ogg'].includes(fileExt)) mediaCategory = 'audio';

          // Try to get dimensions if image
          let width = 0;
          let height = 0;
          if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt)) {
            try {
              const dims = await new Promise((res) => {
                const img = new Image();
                img.onload = () => res({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
                img.onerror = () => res({ w: 0, h: 0 });
                img.src = url;
              });
              width = dims.w;
              height = dims.h;
            } catch {}
          }

          const rawName = path.split('/').pop() || `media_${counter + 1}.${fileExt}`;

          extractedList.push({
            id: `item-${counter++}`,
            name: rawName,
            path,
            url,
            blob: typedBlob,
            size: blob.size,
            ext: fileExt,
            category: mediaCategory,
            width,
            height
          });
        } catch (e) {
          console.warn("Could not parse zip entry:", path, e);
        }
      }
    }

    setItems(extractedList);
    setSelectedIds(new Set(extractedList.map(item => item.id)));

    if (extractedList.length === 0) {
      setErrorMsg(`No embedded images, GIFs, or media found in this ${file.name.split('.').pop().toUpperCase()} file.`);
    } else {
      playDing();
    }
  };

  // 2. Extract from PDF using PDF.js
  const extractPdf = async (file, baseName) => {
    setStatusText('Parsing PDF document...');
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const extractedList = [];
    let globalImgId = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      setProgress(Math.round(((pageNum - 1) / pdf.numPages) * 100));
      setStatusText(`Extracting images from page ${pageNum} of ${pdf.numPages}...`);
      
      try {
        const page = await pdf.getPage(pageNum);
        const ops = await page.getOperatorList();
        
        for (let i = 0; i < ops.fnArray.length; i++) {
          if (
            ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject || 
            ops.fnArray[i] === pdfjsLib.OPS.paintInlineImageXObject
          ) {
            const objId = ops.argsArray[i][0];
            let imgObj = null;
            try {
              imgObj = await new Promise((resolve) => {
                 try {
                   const res = page.objs.get(objId, resolve);
                   if (res !== undefined) resolve(res);
                 } catch (e) { resolve(null); }
              });
              if (!imgObj) imgObj = page.objs.get(objId);
            } catch(e) {
              console.warn("Failed to get image object", objId, e);
            }

            if (!imgObj) continue;

            const canvas = document.createElement('canvas');
            const width = imgObj.width || 0;
            const height = imgObj.height || 0;
            if (width === 0 || height === 0) continue;
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            let successfullyDrawn = false;

            if (imgObj.bitmap || imgObj instanceof ImageBitmap || imgObj instanceof HTMLImageElement || imgObj instanceof HTMLCanvasElement) {
              ctx.drawImage(imgObj.bitmap || imgObj, 0, 0);
              successfullyDrawn = true;
            } else if (imgObj.data) {
              const data = imgObj.data;
              let imageData = null;
              if (data.length === width * height * 4) {
                imageData = new ImageData(new Uint8ClampedArray(data), width, height);
              } else if (data.length === width * height * 3) {
                const rgba = new Uint8ClampedArray(width * height * 4);
                for(let j=0, k=0; j<data.length; j+=3, k+=4) {
                  rgba[k] = data[j]; rgba[k+1] = data[j+1]; rgba[k+2] = data[j+2]; rgba[k+3] = 255;
                }
                imageData = new ImageData(rgba, width, height);
              } else if (data.length === width * height) {
                const rgba = new Uint8ClampedArray(width * height * 4);
                for(let j=0, k=0; j<data.length; j+=1, k+=4) {
                  rgba[k] = data[j]; rgba[k+1] = data[j]; rgba[k+2] = data[j]; rgba[k+3] = 255;
                }
                imageData = new ImageData(rgba, width, height);
              }
              if (imageData) {
                ctx.putImageData(imageData, 0, 0);
                successfullyDrawn = true;
              }
            }
            
            if (successfullyDrawn) {
              const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
              if (blob) {
                const url = URL.createObjectURL(blob);
                const idNum = globalImgId++;
                extractedList.push({
                  id: `pdf-img-${pageNum}-${idNum}`,
                  name: `page_${pageNum}_img_${idNum + 1}.png`,
                  path: `page_${pageNum}/image_${idNum + 1}.png`,
                  url,
                  blob,
                  size: blob.size,
                  ext: 'png',
                  category: 'png',
                  pageNum,
                  width,
                  height
                });
              }
            }
          }
        }
      } catch (pageErr) {
        console.warn(`Error processing page ${pageNum}:`, pageErr);
      }
    }

    setItems(extractedList);
    setSelectedIds(new Set(extractedList.map(item => item.id)));
    if (extractedList.length === 0) {
      setErrorMsg("No embedded images found in this PDF.");
    } else {
      playDing();
    }
  };

  const handleDrop = (files) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (file) extractContent(file);
  };

  // Filter Categories & Counts
  const counts = useMemo(() => {
    const c = { all: items.length, gif: 0, png: 0, jpg: 0, svg: 0, video: 0, audio: 0, other: 0 };
    items.forEach(item => {
      if (c[item.category] !== undefined) c[item.category]++;
      else c.other++;
    });
    return c;
  }, [items]);

  // Filtered items based on category and search query
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = activeFilter === 'all' || item.category === activeFilter;
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.ext.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, activeFilter, searchQuery]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredItems.map(i => i.id);
    const allFilteredSelected = filteredIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (allFilteredSelected) {
        filteredIds.forEach(id => newSet.delete(id));
      } else {
        filteredIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const copyToClipboard = async (blob, id) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      alert("Failed to copy image to clipboard.");
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadZip = async () => {
    if (selectedIds.size === 0) return;
    const zip = new JSZip();
    const folder = zip.folder(`${fileName}_extracted_media`);
    
    items.forEach(item => {
      if (selectedIds.has(item.id)) {
        folder.file(item.name, item.blob);
      }
    });
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${fileName}_extracted_media.zip`);
  };

  const reset = () => {
    items.forEach(item => URL.revokeObjectURL(item.url));
    setItems([]);
    setSelectedIds(new Set());
    setFileName('');
    setErrorMsg('');
    setActiveFilter('all');
    setSearchQuery('');
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="animate-fade-in page-container">
      <div className="page-header">
        <DocumentIcon style={{ width: 32, height: 32, stroke: "url(#accent-grad)" }} />
        <h1>Content Extractor</h1>
      </div>
      
      <p style={{ marginTop: '-0.5rem', color: 'var(--text-secondary)' }}>
        Extract all raw embedded GIFs, images, videos, audio, and vector graphics from <strong>PPTX, PDF, DOCX, XLSX, ODP, and ZIP</strong> files locally in your browser.
      </p>

      {errorMsg && (
        <div className="glass-panel" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
          {errorMsg}
        </div>
      )}

      {items.length === 0 && !isProcessing && (
        <div className="glass-panel" style={{ padding: '3rem 2rem', borderStyle: 'dashed', borderColor: 'var(--border-color)', borderWidth: '2px', background: 'transparent' }}>
          <Dropzone 
            onDrop={handleDrop}
            accept=".pptx,.pdf,.docx,.xlsx,.zip,.key,.odp,.odt"
            title="Upload Presentation or Document"
            subtitle="Drop a PowerPoint (.pptx), PDF (.pdf), Word (.docx), or ZIP file here"
            icon={<DocumentIcon style={{ width: 48, height: 48, color: 'var(--accent-color)' }} />}
          />
        </div>
      )}

      {isProcessing && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.25rem auto' }}></div>
          <h3>Extracting Media & Assets...</h3>
          <div className="progress-bar-bg" style={{ marginTop: '1rem', maxWidth: '400px', margin: '1rem auto 0 auto' }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {statusText || `Processing... ${progress}%`}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="results-container animate-slide-up">
          {/* Top Control Bar */}
          <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                  Found {items.length} Extracted File{items.length !== 1 ? 's' : ''}
                </h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
                  Source: <strong>{fileName}</strong> • {selectedIds.size} of {items.length} selected
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button 
                  className="btn" 
                  onClick={toggleSelectAllFiltered} 
                  style={{ background: 'var(--bg-tertiary)', fontSize: '0.82rem' }}
                >
                  {filteredItems.every(i => selectedIds.has(i.id)) && filteredItems.length > 0 ? 'Deselect Filtered' : 'Select All Filtered'}
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={downloadZip}
                  disabled={selectedIds.size === 0}
                  style={{ opacity: selectedIds.size === 0 ? 0.5 : 1, fontSize: '0.82rem' }}
                >
                  <DownloadIcon style={{ width: 16, height: 16 }} />
                  Download ZIP ({selectedIds.size})
                </button>
                <button 
                  className="btn" 
                  onClick={reset}
                  style={{ background: 'var(--bg-tertiary)', color: '#ef4444', fontSize: '0.82rem' }}
                >
                  <XMark style={{ width: 16, height: 16 }} />
                  Extract New File
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              {/* Category Filter Chips */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All', count: counts.all, icon: null },
                  { id: 'gif', label: 'GIFs', count: counts.gif, icon: '🎬' },
                  { id: 'png', label: 'PNG', count: counts.png, icon: '🖼️' },
                  { id: 'jpg', label: 'JPEG', count: counts.jpg, icon: '📷' },
                  { id: 'svg', label: 'SVG', count: counts.svg, icon: '📐' },
                  { id: 'video', label: 'Video', count: counts.video, icon: '🎥' },
                  { id: 'audio', label: 'Audio', count: counts.audio, icon: '🎵' },
                  { id: 'other', label: 'Other', count: counts.other, icon: '📦' }
                ].filter(tab => tab.id === 'all' || tab.count > 0).map(tab => {
                  const isActive = activeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className="btn"
                      onClick={() => setActiveFilter(tab.id)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.78rem',
                        borderRadius: '20px',
                        background: isActive ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        border: isActive ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                        fontWeight: isActive ? 'bold' : 'normal',
                        gap: '0.3rem'
                      }}
                    >
                      {tab.icon && <span>{tab.icon}</span>}
                      <span>{tab.label}</span>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        opacity: 0.8,
                        background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--bg-primary)',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '10px'
                      }}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '200px' }}>
                <MagnifyingGlassIcon style={{ width: 14, height: 14, position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="Filter by name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '0.35rem 0.6rem 0.35rem 2rem', fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </div>

          {/* Extracted Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {filteredItems.map((item, idx) => {
              const isSelected = selectedIds.has(item.id);
              const isGif = item.category === 'gif';
              const isVideo = item.category === 'video';
              const isAudio = item.category === 'audio';
              const isSvg = item.category === 'svg';

              return (
                <div 
                  key={item.id} 
                  className="glass-panel hover-glow" 
                  style={{ 
                    padding: '0.75rem', 
                    cursor: 'pointer',
                    position: 'relative',
                    border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.6rem'
                  }}
                  onClick={() => toggleSelect(item.id)}
                >
                  {/* Selection Checkbox Badge */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                    {isSelected ? (
                      <CheckSolid style={{ width: 22, height: 22, color: 'var(--accent-color)', background: 'var(--bg-primary)', borderRadius: '50%' }} />
                    ) : (
                      <div style={{ width: 20, height: 20, border: '2px solid var(--text-muted)', borderRadius: '50%', background: 'rgba(0,0,0,0.4)' }} />
                    )}
                  </div>

                  {/* Format Badge */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 'bold', 
                      background: isGif ? 'rgba(234, 179, 8, 0.9)' : isVideo ? 'rgba(239, 68, 68, 0.9)' : isAudio ? 'rgba(168, 85, 247, 0.9)' : 'rgba(0, 0, 0, 0.75)', 
                      color: isGif ? '#000' : '#fff', 
                      padding: '0.15rem 0.45rem', 
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {item.ext}
                    </span>
                  </div>

                  {/* Media Preview Box */}
                  <div style={{ 
                    width: '100%', 
                    aspectRatio: '1', 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: 'var(--border-radius-sm)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {isVideo ? (
                      <video 
                        src={item.url} 
                        controls 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onClick={(e) => e.stopPropagation()} 
                      />
                    ) : isAudio ? (
                      <div style={{ textAlign: 'center', padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                        <SpeakerWaveIcon style={{ width: 44, height: 44, color: 'var(--accent-color)', margin: '0 auto 0.5rem auto' }} />
                        <audio src={item.url} controls style={{ width: '100%', maxWidth: '180px' }} />
                      </div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt={item.name} 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        loading="lazy"
                      />
                    )}
                  </div>
                  
                  {/* File Metadata */}
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {item.width > 0 ? `${item.width} × ${item.height} px • ` : ''}{formatSize(item.size)}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    {!isVideo && !isAudio && (
                      <button 
                        className="btn" 
                        style={{ flex: 1, padding: '0.35rem', background: 'var(--bg-tertiary)', fontSize: '0.75rem' }}
                        onClick={() => copyToClipboard(item.blob, item.id)}
                        title="Copy to Clipboard"
                      >
                        {copiedId === item.id ? <CheckIcon style={{ width: 14, height: 14, color: '#10b981' }} /> : <CopyIcon style={{ width: 14, height: 14 }} />}
                      </button>
                    )}
                    
                    <button 
                      className="btn" 
                      style={{ flex: 1, padding: '0.35rem', background: 'var(--bg-tertiary)', fontSize: '0.75rem' }}
                      onClick={() => downloadBlob(item.blob, item.name)}
                      title={`Download ${item.ext.toUpperCase()}`}
                    >
                      <DownloadIcon style={{ width: 14, height: 14 }} />
                    </button>

                    <SendToDropdown 
                      file={new File([item.blob], item.name, { type: item.blob.type })}
                      imageUrl={!isVideo && !isAudio ? item.url : undefined}
                      videoFile={isVideo ? new File([item.blob], item.name, { type: item.blob.type }) : undefined}
                      mediaType={isVideo ? 'video' : isSvg ? 'svg' : 'image'}
                      style={{ padding: '0.35rem', fontSize: '0.75rem' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
