import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessing } from '../contexts/ProcessingContext';
import { ArrowDownTrayIcon, SparklesIcon, PhotoIcon, GifIcon, FilmIcon, CodeBracketIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';

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
                 } else if (type.startsWith('image/')) {
                   setDragType('image');
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

  if (!isDragging || dragType === 'none') return null;

  const handleZoneDrop = async (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    setDragType('none');
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (dragType === 'svg' && action === 'svg-convert') {
      const text = await file.text();
      navigate('/svg-converter', { state: { svgText: text } });
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
        addSlot('image-upscaler', { id: crypto.randomUUID(), imageFile: file, previewUrl: URL.createObjectURL(file) });
        navigate('/image-upscaler');
      }
    } else if (dragType === 'video') {
      if (action === 'convert-gif') {
        addSlot('video-to-gif', { id: crypto.randomUUID(), videoFile: file, previewUrl: URL.createObjectURL(file) });
        navigate('/video-to-gif');
      } else if (action === 'compress-video') {
        addSlot('video-compressor', { id: crypto.randomUUID(), videoFile: file, previewUrl: URL.createObjectURL(file) });
        navigate('/video-compressor');
      }
    }
  };

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    zIndex: 99999,
    display: 'flex',
    padding: '2rem',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto'
  };

  const Card = ({ title, icon, action }) => (
    <div 
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
      onDragLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
      onDrop={(e) => handleZoneDrop(e, action)}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '2px dashed var(--border-color)',
        borderRadius: 'var(--border-radius)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s ease',
        minHeight: '200px'
      }}
    >
      {icon}
      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
    </div>
  );

  return (
    <div style={overlayStyle} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}>
      <div style={{ width: '100%', maxWidth: '800px', display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
            <Card title="Convert to GIF" icon={<GifIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="convert-gif" />
            <Card title="Compress Video" icon={<FilmIcon style={{ width: 48, height: 48, color: 'var(--primary-color)' }} />} action="compress-video" />
          </>
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
