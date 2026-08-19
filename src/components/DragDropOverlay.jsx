import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessing } from '../contexts/ProcessingContext';
import { 
  SparklesIcon, PhotoIcon, ArrowDownTrayIcon, FilmIcon, GifIcon, DocumentArrowDownIcon, CodeBracketIcon, Square3Stack3DIcon, CubeIcon
} from '@heroicons/react/24/outline';

import { isVideoFile, isImageFile } from '../utils/fileTypes';

export default function DragDropOverlay({ onDropImageToModal, onDirectDownload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState('none');
  const navigate = useNavigate();
  const { addSlot } = useProcessing();
  const dragCounter = useRef(0);
  
  useEffect(() => {
    
    const handleDragEnter = (e) => {
      e.preventDefault();
      dragCounter.current++;
      if (dragCounter.current === 1) {
        setIsDragging(true);
        const items = e.dataTransfer.items;
        if (items && items.length > 0) {
          let found = false;
          // Look for files first
          for (let i = 0; i < items.length; i++) {
             if (items[i].kind === 'file') {
                 found = true;
                 const type = items[i].type || '';
                 const fileObj = items[i].getAsFile ? items[i].getAsFile() : null;
                 
                 if (type === 'image/svg+xml' || (fileObj && /\.svg$/i.test(fileObj.name))) {
                   setDragType('svg');
                 } else if (type === 'application/pdf' || (fileObj && /\.pdf$/i.test(fileObj.name))) {
                   setDragType('pdf');
                 } else if (type === 'application/json' || type === 'text/json' || (fileObj && /\.json$/i.test(fileObj.name))) {
                   setDragType('json');
                 } else if (isVideoFile(fileObj) || type.startsWith('video/') || (fileObj && /\.(mov|mp4|webm|mkv|avi|ogv)$/i.test(fileObj.name))) {
                   setDragType('video');
                 } else if (isImageFile(fileObj) || type.startsWith('image/') || type === '') {
                   setDragType('image'); // Windows often gives empty MIME type for .webp, .avif, .ico - default to image tools
                 } else {
                   setDragType('unknown');
                 }
                 break;
             }
          }
          if (!found) setDragType('none');
        }
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragging(false);
        setDragType('none');
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault(); // necessary to allow dropping
    };

    const handleDrop = (e) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      setDragType('none');
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('global-drag-active', isDragging);
    return () => document.body.classList.remove('global-drag-active');
  }, [isDragging]);

  if (!isDragging || dragType === 'none') return null;

  const handleZoneDrop = async (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    setDragType('none');
    window.dispatchEvent(new CustomEvent('burst', { detail: { type: 'radial', x: e.clientX, y: e.clientY } }));

    if (action === 'create-collage') {
      const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(f.name));
      if (files.length > 0) {
        navigate('/collage-maker', { state: { droppedFiles: files } });
      } else {
        navigate('/collage-maker');
      }
      return;
    }
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (dragType === 'json') {
      if (action === 'json-editor') {
        const text = await file.text();
        navigate('/json-saver', { state: { jsonText: text } });
        return;
      } else if (action === 'lottie-convert') {
        const text = await file.text();
        try {
          const json = JSON.parse(text);
          const slotId = `lottie-to-gif-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          addSlot('lottie-to-gif', {
            id: slotId,
            lottieData: json,
            fileName: file.name
          });
          navigate('/lottie-to-gif');
        } catch (err) {
          alert("Invalid JSON file: " + err.message);
        }
        return;
      }
    }

    if (dragType === 'svg') {
      if (action === 'svg-3d') {
        const text = await file.text();
        navigate('/svg-to-3d', { state: { svgContent: text, fileName: file.name } });
        return;
      } else if (action === 'svg-convert') {
        const text = await file.text();
        navigate('/svg-converter', { state: { svgText: text } });
        return;
      }
    }
    
    if (dragType === 'pdf' && action === 'pdf-extract') {
      navigate('/pdf-image-extractor', { state: { pdfFile: file } });
      return;
    }

    if (dragType === 'image') {
      if (action === 'download-png') {
        onDirectDownload(file, 'png');
      } else if (action === 'rename-png') {
        onDropImageToModal(file);
      } else if (action === 'remove-bg') {
        addSlot('bg-remove', { id: crypto.randomUUID(), imageFile: file, previewUrl: URL.createObjectURL(file) });
        navigate('/bg-remover');
      } else if (action === 'upscale') {
        addSlot('ai-upscaler', { id: crypto.randomUUID(), imageFile: file, previewUrl: URL.createObjectURL(file) });
        navigate('/image-upscaler');
      }
    } else if (dragType === 'video') {
      if (action === 'convert-gif') {
        addSlot('video-to-gif', { id: crypto.randomUUID(), videoFile: file, previewUrl: URL.createObjectURL(file) });
        navigate('/video-to-gif');
      } else if (action === 'compress-video') {
        addSlot('video-compressor', { id: crypto.randomUUID(), videoFile: file, previewUrl: URL.createObjectURL(file) });
        navigate('/video-compressor');
      } else if (action === 'extract-frame') {
        navigate('/video-frame-extractor', { state: { videoFile: file } });
      }
    }
  };

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    zIndex: 9998,
    display: 'flex',
    padding: '2rem',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto'
  };

  const Card = ({ title, icon, action }) => (
    <div 
      className="dropzone"
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
      onDragLeave={(e) => { e.currentTarget.classList.remove('active'); }}
      onDrop={(e) => { e.currentTarget.classList.remove('active'); handleZoneDrop(e, action); }}
      style={{
        minHeight: '250px',
        padding: '3rem 2rem'
      }}
    >
      {icon}
      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>{title}</h3>
    </div>
  );

  return (
    <div style={overlayStyle} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}>
      <div style={{ width: '100%', maxWidth: '900px', display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {dragType === 'image' && (
          <>
            <Card title="Create Photo Collage" icon={<Square3Stack3DIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="create-collage" />
            <Card title="Remove background" icon={<SparklesIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="remove-bg" />
            <Card title="Upscale" icon={<PhotoIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="upscale" />
            <Card title="Download as PNG" icon={<ArrowDownTrayIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="download-png" />
          </>
        )}
        {dragType === 'video' && (
          <>
            <Card title="Extract Frame" icon={<FilmIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="extract-frame" />
            <Card title="Convert to GIF" icon={<GifIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="convert-gif" />
            <Card title="Compress Video" icon={<FilmIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="compress-video" />
          </>
        )}
        {dragType === 'pdf' && (
          <Card title="Extract PDF Images" icon={<DocumentArrowDownIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="pdf-extract" />
        )}
        {dragType === 'svg' && (
          <>
            <Card title="Convert SVG to 3D" icon={<CubeIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="svg-3d" />
            <Card title="SVG Converter" icon={<CodeBracketIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="svg-convert" />
          </>
        )}
        {dragType === 'json' && (
          <>
            <Card title="Format & Save JSON" icon={<CodeBracketIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="json-editor" />
            <Card title="Convert Lottie to GIF" icon={<GifIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="lottie-convert" />
          </>
        )}
        {dragType === 'unknown' && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Unsupported file type. Drop anywhere to cancel.</div>
        )}
      </div>
    </div>
  );
}
