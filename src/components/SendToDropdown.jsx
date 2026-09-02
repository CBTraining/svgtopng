import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessing } from '../contexts/ProcessingContext';
import { 
  PaperAirplaneIcon,
  SparklesIcon, 
  PhotoIcon, 
  CubeIcon, 
  QrCodeIcon, 
  Square3Stack3DIcon, 
  CodeBracketIcon, 
  FilmIcon, 
  GifIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

export default function SendToDropdown({ 
  file, 
  imageUrl, 
  svgText, 
  videoFile, 
  mediaType = 'image', // 'image', 'svg', 'video'
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { addSlot } = useProcessing();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (target) => {
    setIsOpen(false);

    // Resolve an image file if needed
    let activeImageFile = file;
    if (!activeImageFile && imageUrl) {
      try {
        const resp = await fetch(imageUrl);
        const blob = await resp.blob();
        activeImageFile = new File([blob], `exported-image-${Date.now()}.png`, { type: 'image/png' });
      } catch (e) {
        console.error("Could not convert imageUrl to File:", e);
      }
    }

    if (target === 'image-editor') {
      navigate('/image-tools', { state: { imageFile: activeImageFile, imageUrl: imageUrl || (activeImageFile ? URL.createObjectURL(activeImageFile) : '') } });
    } else if (target === 'bg-remover') {
      if (activeImageFile) {
        addSlot('bg-remove', { id: crypto.randomUUID(), imageFile: activeImageFile, previewUrl: URL.createObjectURL(activeImageFile) });
      }
      navigate('/bg-remover');
    } else if (target === 'image-upscaler') {
      if (activeImageFile) {
        addSlot('ai-upscaler', { id: crypto.randomUUID(), imageFile: activeImageFile, previewUrl: URL.createObjectURL(activeImageFile) });
      }
      navigate('/image-upscaler');
    } else if (target === 'collage-maker') {
      if (activeImageFile) {
        navigate('/collage-maker', { state: { droppedFiles: [activeImageFile] } });
      } else {
        navigate('/collage-maker');
      }
    } else if (target === 'qr-generator') {
      if (svgText) {
        const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        navigate('/qr-generator', { state: { logoUrl: url, logoFileName: 'vector-logo.svg' } });
      } else if (imageUrl || activeImageFile) {
        const url = imageUrl || (activeImageFile ? URL.createObjectURL(activeImageFile) : '');
        navigate('/qr-generator', { state: { logoUrl: url, logoFileName: activeImageFile?.name || 'logo.png' } });
      } else {
        navigate('/qr-generator');
      }
    } else if (target === 'svg-converter') {
      navigate('/svg-converter', { state: { svgText: svgText || '' } });
    } else if (target === 'video-to-gif') {
      const activeVideo = videoFile || file;
      if (activeVideo) {
        addSlot('video-to-gif', { id: crypto.randomUUID(), videoFile: activeVideo, previewUrl: URL.createObjectURL(activeVideo) });
      }
      navigate('/video-to-gif');
    } else if (target === 'video-compressor') {
      const activeVideo = videoFile || file;
      if (activeVideo) {
        addSlot('video-compressor', { id: crypto.randomUUID(), videoFile: activeVideo, previewUrl: URL.createObjectURL(activeVideo) });
      }
      navigate('/video-compressor');
    } else if (target === 'video-frame-extractor') {
      const activeVideo = videoFile || file;
      navigate('/video-frame-extractor', { state: { videoFile: activeVideo } });
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button 
        type="button" 
        className="btn" 
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          fontSize: '0.85rem',
          padding: '0.45rem 0.85rem'
        }}
        title="Send this result directly to another tool"
      >
        <PaperAirplaneIcon style={{ width: 16, height: 16, color: 'var(--accent-color)', transform: 'rotate(-45deg)' }} />
        Send To...
        <ChevronDownIcon style={{ width: 14, height: 14, opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div 
          className="animate-pop-in"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            minWidth: '210px',
            padding: '0.4rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem'
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.3rem 0.6rem', letterSpacing: '0.5px' }}>
            Pipeline to Tool:
          </div>

          {(mediaType === 'image' || mediaType === 'svg') && (
            <>
              {mediaType === 'image' && (
                <>
                  <button 
                    className="btn" 
                    onClick={() => handleAction('image-editor')}
                    style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                  >
                    <AdjustmentsHorizontalIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} /> Image Editor
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleAction('bg-remover')}
                    style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                  >
                    <SparklesIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} /> Background Remover
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleAction('image-upscaler')}
                    style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                  >
                    <PhotoIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} /> AI Image Upscaler
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleAction('collage-maker')}
                    style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                  >
                    <Square3Stack3DIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} /> Photo Collage Maker
                  </button>
                </>
              )}

              {mediaType === 'svg' && (
                <button 
                  className="btn" 
                  onClick={() => handleAction('svg-converter')}
                  style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                >
                  <CodeBracketIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} /> SVG Converter
                </button>
              )}

              <button 
                className="btn" 
                onClick={() => handleAction('qr-generator')}
                style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
              >
                <QrCodeIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} /> QR Code Center Logo
              </button>
            </>
          )}

          {mediaType === 'video' && (
            <>
              <button 
                className="btn" 
                onClick={() => handleAction('video-to-gif')}
                style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
              >
                <GifIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} /> Video to GIF & Trimmer
              </button>
              <button 
                className="btn" 
                onClick={() => handleAction('video-compressor')}
                style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
              >
                <FilmIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} /> Video Compressor
              </button>
              <button 
                className="btn" 
                onClick={() => handleAction('video-frame-extractor')}
                style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
              >
                <FilmIcon style={{ width: 16, height: 16, color: 'var(--accent-color)' }} /> Extract Frames
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
