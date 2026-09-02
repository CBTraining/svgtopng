import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessing } from '../contexts/ProcessingContext';
import { 
  SparklesIcon, 
  PhotoIcon, 
  ArrowDownTrayIcon, 
  FilmIcon, 
  GifIcon, 
  DocumentArrowDownIcon, 
  CodeBracketIcon, 
  Square3Stack3DIcon, 
  CubeIcon,
  ArrowsPointingInIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

import { isVideoFile, isImageFile, extractDroppedFiles, compressImageUnder20MB } from '../utils/fileTypes';

export default function DragDropOverlay({ onDropImageToModal, onDirectDownload, onCompressImage }) {
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
        const types = Array.from(e.dataTransfer.types || []);
        
        let detected = 'unknown';

        if (items && items.length > 0) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const type = (item.type || '').toLowerCase();
            
            if (type === 'application/pdf') {
              detected = 'pdf';
              break;
            } else if (
              type.includes('presentation') || 
              type.includes('powerpoint') || 
              type.includes('word') || 
              type.includes('zip') || 
              type.includes('officedocument') || 
              type.includes('opendocument')
            ) {
              detected = 'doc';
              break;
            } else if (type === 'image/svg+xml') {
              detected = 'svg';
              break;
            } else if (type === 'application/json' || type === 'text/json') {
              detected = 'json';
              break;
            } else if (type.startsWith('video/') || type.includes('quicktime')) {
              detected = 'video';
              break;
            } else if (type.startsWith('image/')) {
              detected = 'image';
              break;
            }
          }
        }

        // Fallback for HTML/URI drops (e.g. Google Chat, Slack, Web Images)
        if (detected === 'unknown') {
          if (types.includes('text/html') || types.includes('text/uri-list') || types.includes('image/png')) {
            detected = 'image';
          } else if (types.includes('Files')) {
            // Check if any item might indicate type
            detected = 'image';
          }
        }

        setDragType(detected);
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

    // Extract real File objects (handles Desktop files + Google Chat / Slack web image drag)
    const files = await extractDroppedFiles(e);

    if (action === 'create-collage') {
      const imgFiles = files.filter(f => isImageFile(f) || f.type.startsWith('image/'));
      if (imgFiles.length > 0) {
        navigate('/collage-maker', { state: { droppedFiles: imgFiles } });
      } else {
        navigate('/collage-maker');
      }
      return;
    }
    
    const file = files[0];
    if (!file) return;

    if (dragType === 'json' || file.name.endsWith('.json')) {
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

    if (dragType === 'svg' || file.name.endsWith('.svg')) {
      if (action === 'svg-convert' || action === 'svg-3d') {
        const text = await file.text();
        navigate('/svg-converter', { state: { svgText: text } });
        return;
      }
    }
    
    if ((dragType === 'doc' || dragType === 'pdf' || file.name.match(/\.(pdf|pptx|docx|xlsx|zip|key|odp|odt)$/i)) && (action === 'pdf-extract' || action === 'content-extract')) {
      navigate('/content-extractor', { state: { file } });
      return;
    }

    if (dragType === 'video' || isVideoFile(file)) {
      if (action === 'convert-gif') {
        addSlot('video-to-gif', { id: crypto.randomUUID(), videoFile: file, previewUrl: URL.createObjectURL(file) });
        navigate('/video-to-gif');
      } else if (action === 'compress-video') {
        addSlot('video-compressor', { id: crypto.randomUUID(), videoFile: file, previewUrl: URL.createObjectURL(file) });
        navigate('/video-compressor');
      } else if (action === 'extract-frame') {
        navigate('/video-frame-extractor', { state: { videoFile: file } });
      }
      return;
    }

    // Default: Image Actions
    if (action === 'compress-image') {
      if (onCompressImage) {
        onCompressImage(file);
      } else {
        compressImageUnder20MB(file);
      }
    } else if (action === 'download-png') {
      onDirectDownload(file, 'png');
    } else if (action === 'rename-png') {
      onDropImageToModal(file);
    } else if (action === 'edit-image') {
      navigate('/image-tools', { state: { imageFile: file, previewUrl: URL.createObjectURL(file) } });
    } else if (action === 'remove-bg') {
      addSlot('bg-remove', { id: crypto.randomUUID(), imageFile: file, previewUrl: URL.createObjectURL(file) });
      navigate('/bg-remover');
    } else if (action === 'upscale') {
      addSlot('ai-upscaler', { id: crypto.randomUUID(), imageFile: file, previewUrl: URL.createObjectURL(file) });
      navigate('/image-upscaler');
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

  const Card = ({ title, subtitle, icon, action }) => (
    <div 
      className="dropzone"
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
      onDragLeave={(e) => { e.currentTarget.classList.remove('active'); }}
      onDrop={(e) => { e.currentTarget.classList.remove('active'); handleZoneDrop(e, action); }}
      style={{
        minHeight: '230px',
        padding: '2.5rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '0.75rem',
        cursor: 'pointer'
      }}
    >
      {icon}
      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>{title}</h3>
      {subtitle && (
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '280px' }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div style={overlayStyle} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}>
      <div style={{ width: '100%', maxWidth: '950px', display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {dragType === 'image' && (
          <>
            <Card title="Create Photo Collage" icon={<Square3Stack3DIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="create-collage" />
            <Card title="Remove background" icon={<SparklesIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="remove-bg" />
            <Card title="Upscale" icon={<PhotoIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="upscale" />
            <Card title="Download as PNG" icon={<ArrowDownTrayIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="download-png" />
            <Card title="Compress (<20MB)" icon={<ArrowsPointingInIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="compress-image" />
            <Card title="Image Editor" icon={<AdjustmentsHorizontalIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="edit-image" />
          </>
        )}
        {dragType === 'video' && (
          <>
            <Card title="Extract Frame" icon={<FilmIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="extract-frame" />
            <Card title="Convert to GIF" icon={<GifIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="convert-gif" />
            <Card title="Compress Video" icon={<FilmIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="compress-video" />
          </>
        )}
        {dragType === 'pdf' && (
          <Card 
            title="Content Extractor (PDF)" 
            subtitle="Extract all embedded images, diagrams, and figures across all PDF pages"
            icon={<DocumentArrowDownIcon style={{ width: 52, height: 52, color: 'var(--primary-color)' }} />} 
            action="content-extract" 
          />
        )}
        {dragType === 'doc' && (
          <Card 
            title="Content Extractor (PPTX / DOCX / ZIP)" 
            subtitle="Extract all embedded raw animated GIFs, images, videos, and audio clips"
            icon={<DocumentArrowDownIcon style={{ width: 52, height: 52, color: 'var(--primary-color)' }} />} 
            action="content-extract" 
          />
        )}
        {dragType === 'svg' && (
          <Card title="SVG Converter" subtitle="Scale vector graphics, apply color fills, and export PNGs" icon={<CodeBracketIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="svg-convert" />
        )}
        {dragType === 'json' && (
          <>
            <Card title="Format & Save JSON" icon={<CodeBracketIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="json-editor" />
            <Card title="Convert Lottie to GIF" icon={<GifIcon style={{ width: 44, height: 44, color: 'var(--primary-color)' }} />} action="lottie-convert" />
          </>
        )}
        {dragType === 'unknown' && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Unsupported file type. Drop anywhere to cancel.</div>
        )}
      </div>
    </div>
  );
}
