import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessing } from '../contexts/ProcessingContext';
import { ArrowDownTrayIcon, SparklesIcon, PhotoIcon, GifIcon, FilmIcon, CodeBracketIcon, DocumentPlusIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

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
          // Look for files first (not text strings)
          for (let i = 0; i < items.length; i++) {
             if (items[i].kind === 'file') {
                 found = true;
                 const type = items[i].type;
                 if (type === 'image/svg+xml') {
                   setDragType('svg');
                 } else if (type === 'application/pdf') {
                   setDragType('pdf');
                 } else if (type.startsWith('image/') || type === '') {
                   setDragType('image'); // Empty type occurs on Windows for .webp or unknown files, default to image tools
                 } else if (type.startsWith('video/')) {
                   setDragType('video');
                 } else {
                   setDragType('unknown');
                 }
                 break;
             }
          }
          if (!found) setDragType('none'); // don't trigger for dragging text
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
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (dragType === 'svg' && action === 'svg-convert') {
      const text = await file.text();
      navigate('/svg-converter', { state: { svgText: text } });
      return;
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
            <Card title="Download as PNG" icon={<ArrowDownTrayIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="download-png" />
            <Card title="Rename & Download PNG" icon={<DocumentPlusIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="rename-png" />
            <Card title="Remove background" icon={<SparklesIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="remove-bg" />
            <Card title="Upscale" icon={<PhotoIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="upscale" />
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
          <Card title="SVG Converter" icon={<CodeBracketIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="svg-convert" />
        )}
        {dragType === 'unknown' && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Unsupported file type. Drop anywhere to cancel.</div>
        )}
      </div>
    </div>
  );
}
