import { useState, useRef, useEffect } from 'react';
import { DocumentArrowDownIcon as DocumentIcon, ArrowDownTrayIcon as DownloadIcon, ClipboardDocumentCheckIcon as CopyIcon, XMarkIcon as XMark } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';
import JSZip from 'jszip';
import Dropzone from '../components/Dropzone';
import { playDing } from '../utils/audio';

import { useLocation } from 'react-router-dom';

// Import pdfjs
import * as pdfjsLib from 'pdfjs-dist';
// For Vite, to get the worker URL correctly:
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export default function PdfImageExtractor() {
  const location = useLocation();
  const [images, setImages] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle incoming file from drag and drop
  useEffect(() => {
    if (location.state?.pdfFile && !isProcessing && images.length === 0) {
      extractImages(location.state.pdfFile);
      // Clean up the state so it doesn't re-run on reload
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.url) URL.revokeObjectURL(img.url);
      });
    };
  }, [images]);

  const extractImages = async (file) => {
    setIsProcessing(true);
    setProgress(0);
    setImages([]);
    setSelectedIds(new Set());
    setErrorMsg('');
    setFileName(file.name.replace('.pdf', ''));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const extractedImages = [];
      let globalImgId = 0;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setProgress(Math.round(((pageNum - 1) / pdf.numPages) * 100));
        
        try {
          const page = await pdf.getPage(pageNum);
          const ops = await page.getOperatorList();
          
          for (let i = 0; i < ops.fnArray.length; i++) {
            if (
              ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject || 
              ops.fnArray[i] === pdfjsLib.OPS.paintInlineImageXObject
            ) {
              const objId = ops.argsArray[i][0];
              
              // Fallback to try/catch for obj get
              let imgObj = null;
              try {
                imgObj = await new Promise((resolve) => {
                   // some versions are sync, some are async callback
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
                // TypedArray data
                const data = imgObj.data;
                let imageData = null;
                
                if (data.length === width * height * 4) {
                    imageData = new ImageData(new Uint8ClampedArray(data), width, height);
                } else if (data.length === width * height * 3) {
                    const rgba = new Uint8ClampedArray(width * height * 4);
                    for(let j=0, k=0; j<data.length; j+=3, k+=4) {
                        rgba[k] = data[j];
                        rgba[k+1] = data[j+1];
                        rgba[k+2] = data[j+2];
                        rgba[k+3] = 255;
                    }
                    imageData = new ImageData(rgba, width, height);
                } else if (data.length === width * height) { // Grayscale
                    const rgba = new Uint8ClampedArray(width * height * 4);
                    for(let j=0, k=0; j<data.length; j+=1, k+=4) {
                        rgba[k] = data[j];
                        rgba[k+1] = data[j];
                        rgba[k+2] = data[j];
                        rgba[k+3] = 255;
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
                  extractedImages.push({
                    id: `img-${pageNum}-${globalImgId++}`,
                    url,
                    blob,
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
      
      setProgress(100);
      setImages(extractedImages);
      // Select all by default
      setSelectedIds(new Set(extractedImages.map(img => img.id)));
      if (extractedImages.length === 0) {
        setErrorMsg("No images found in this PDF.");
      } else {
        playDing();
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Failed to parse PDF: " + (error.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleDrop = (files) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (file && file.type === 'application/pdf') {
      extractImages(file);
    } else {
      setErrorMsg("Please drop a valid PDF file.");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map(img => img.id)));
    }
  };

  const copyToClipboard = async (blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
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
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const downloadZip = async () => {
    if (selectedIds.size === 0) return;
    
    const zip = new JSZip();
    const folder = zip.folder(`${fileName}_images`);
    
    let counter = 1;
    images.forEach(img => {
      if (selectedIds.has(img.id)) {
        folder.file(`image_${counter++}.png`, img.blob);
      }
    });
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${fileName}_images.zip`);
  };

  const reset = () => {
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
    setSelectedIds(new Set());
    setFileName('');
    setErrorMsg('');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>PDF Image Extractor</h1>
      </div>
      
      <p>Extract all embedded images from a PDF file locally. No files are uploaded.</p>

      {errorMsg && (
        <div className="glass-panel" style={{ backgroundColor: 'var(--danger-color)', color: 'white', marginBottom: '1rem', padding: '1rem', borderRadius: '8px' }}>
          {errorMsg}
        </div>
      )}

      {images.length === 0 && !isProcessing && (
        <Dropzone 
          onDrop={handleDrop}
          title="Upload PDF"
          subtitle="Drop a PDF file here"
          icon={<DocumentIcon style={{width: 48, height: 48, color: 'var(--text-secondary)'}}/>}
        />
      )}

      {isProcessing && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <h3>Parsing PDF...</h3>
          <div className="progress-bar-bg" style={{ marginTop: '1rem' }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Extracting images... {progress}%</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="results-container animate-slide-up">
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Found {images.length} Image{images.length !== 1 ? 's' : ''}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{selectedIds.size} selected</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn" onClick={toggleSelectAll} style={{ background: 'var(--bg-tertiary)' }}>
                  {selectedIds.size === images.length ? 'Deselect All' : 'Select All'}
                </button>
                <button 
                  className="btn primary" 
                  onClick={downloadZip}
                  disabled={selectedIds.size === 0}
                  style={{ opacity: selectedIds.size === 0 ? 0.5 : 1 }}
                >
                  <DownloadIcon style={{ width: 18, height: 18, marginRight: 8 }} />
                  Download ZIP
                </button>
                <button 
                  className="btn" 
                  onClick={() => {
                    reset();
                    setImages([]);
                  }}
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--danger-color)' }}
                >
                  <XMark style={{ width: 18, height: 18, marginRight: 8 }} />
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {images.map((img, idx) => {
              const isSelected = selectedIds.has(img.id);
              return (
                <div 
                  key={img.id} 
                  className="glass-panel hover-glow" 
                  style={{ 
                    padding: '0.5rem', 
                    cursor: 'pointer',
                    position: 'relative',
                    border: isSelected ? '2px solid var(--accent-color)' : '2px solid transparent'
                  }}
                  onClick={() => toggleSelect(img.id)}
                >
                  {isSelected && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'var(--bg-primary)', borderRadius: '50%' }}>
                      <CheckSolid style={{ width: 24, height: 24, color: 'var(--accent-color)' }} />
                    </div>
                  )}
                  
                  <div style={{ 
                    width: '100%', 
                    aspectRatio: '1', 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: 'var(--border-radius-sm)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <img 
                      src={img.url} 
                      alt={`Extracted from page ${img.pageNum}`} 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Page {img.pageNum} • {img.width}x{img.height}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn" 
                      style={{ flex: 1, padding: '0.4rem', background: 'var(--bg-tertiary)' }}
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(img.blob); }}
                      title="Copy to Clipboard"
                    >
                      <CopyIcon style={{ width: 16, height: 16, margin: '0 auto' }} />
                    </button>
                    <button 
                      className="btn" 
                      style={{ flex: 1, padding: '0.4rem', background: 'var(--bg-tertiary)' }}
                      onClick={(e) => { e.stopPropagation(); downloadBlob(img.blob, `${fileName}_img${idx+1}.png`); }}
                      title="Download PNG"
                    >
                      <DownloadIcon style={{ width: 16, height: 16, margin: '0 auto' }} />
                    </button>
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
