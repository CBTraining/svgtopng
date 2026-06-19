import { NavLink } from 'react-router-dom';
import { 
  PhotoIcon, 
  FilmIcon,
  GifIcon,
  ScissorsIcon, 
  CodeBracketSquareIcon, 
  SparklesIcon, 
  CommandLineIcon, 
  Square3Stack3DIcon,
  EyeDropperIcon,
  QrCodeIcon,
  ClipboardDocumentIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/solid';
import { useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose, onManualPaste }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleError = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    };
    window.addEventListener('paste-error', handleError);
    return () => window.removeEventListener('paste-error', handleError);
  }, []);

  // Handle Drag Events for Passive Side-bar Drops
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processDroppedFile = async (file) => {
    if (file.type.startsWith('image/')) {
      // Passive Image to PNG converter
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
          a.download = 'pngconvert.png';
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      // Passive Video to GIF converter
      // (Will implement full FFmpeg.wasm logic later, placeholder for now)
      alert('Passive Video to GIF conversion via ffmpeg.wasm will trigger here!');
    } else {
      alert('Unsupported file type for passive conversion.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      window.dispatchEvent(new CustomEvent('burst', { detail: { type: 'vertical', x: 0 } }));
      const file = e.dataTransfer.files[0];
      processDroppedFile(file);
    }
  };

  const navCategories = [
    {
      title: 'General',
      items: [
        { to: '/', icon: Square3Stack3DIcon, label: 'Home' }
      ]
    },
    {
      title: 'Graphics',
      items: [
        { to: '/image-tools', icon: PhotoIcon, label: 'Image Tools' },
        { to: '/bg-remover', icon: SparklesIcon, label: 'Background Remover' },
        { to: '/color-picker', icon: EyeDropperIcon, label: 'Color Picker' },
        { to: '/svg-converter', icon: CommandLineIcon, label: 'SVG Converter' }
      ]
    },
    {
      title: 'Video & Animation',
      items: [
        { to: '/video-compressor', icon: FilmIcon, label: 'Video Compressor' },
        { to: '/video-to-gif', icon: GifIcon, label: 'Video to GIF' },
        { to: '/lottie-to-gif', icon: ScissorsIcon, label: 'Lottie to GIF' }
      ]
    },
    {
      title: 'Web & Dev',
      items: [
        { to: '/qr-generator', icon: QrCodeIcon, label: 'QR Generator' },
        { to: '/json-saver', icon: CodeBracketSquareIcon, label: 'JSON Saver' }
      ]
    }
  ];

  return (
    <aside 
      className={`sidebar glass-panel ${isDragging ? 'drag-active' : ''} ${isOpen ? 'open' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="sidebar-header">
        <div className="logo-container" style={{ alignItems: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="WebTools Logo" width="28" height="28" style={{ marginRight: '4px' }} />
          <h2>Web<span className="text-gradient">Tools</span></h2>
          <span className="version">v3.01</span>
        </div>
        {isDragging && (
          <div className="drop-overlay animate-fade-in">
            <p>Drop to Convert!</p>
          </div>
        )}
      </div>

        <nav className="sidebar-nav">
          {navCategories.map((category, idx) => (
            <div key={idx} className="nav-category">
              {category.title !== 'General' && (
                <h4 className="nav-category-title">{category.title}</h4>
              )}
              {category.items.map((item) => (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <item.icon style={{width: '20px', height: '20px'}} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

      <div style={{ padding: '1.5rem', marginTop: 'auto', borderTop: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="btn"
            style={{ padding: '0.5rem', flexShrink: 0 }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <SunIcon style={{width: 20, height: 20}} /> : <MoonIcon style={{width: 20, height: 20}} />}
          </button>
          <button 
            onClick={onManualPaste}
            className={`btn btn-primary ${isShaking ? 'shake-error' : ''}`}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 'bold' }}
          >
            <ClipboardDocumentIcon style={{width: '20px', height: '20px'}} />
            Paste to PNG
          </button>
        </div>
      </div>
    </aside>
  );
}
