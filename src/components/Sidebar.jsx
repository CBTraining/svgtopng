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
  MoonIcon,
  ClockIcon,
  ArrowsPointingOutIcon,
  WindowIcon,
  HomeIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  RectangleGroupIcon,
  PaintBrushIcon
} from '@heroicons/react/24/solid';
import { ChevronDownIcon as ChevronDownOutline } from '@heroicons/react/24/outline';
import BackgroundJobsWidget from './BackgroundJobsWidget';
import SidebarClock from './SidebarClock';
import { useState, useEffect, useRef } from 'react';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose, onManualPaste, onClockClick, showDiagnostics, onToggleDiagnostics }) {
  const [isShaking, setIsShaking] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const navRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const checkScroll = () => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      // Show arrow if we can scroll down (allow 2px margin for rounding errors)
      setCanScrollDown(Math.ceil(scrollTop + clientHeight) < scrollHeight - 2);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  useEffect(() => {
    const handleError = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    };
    window.addEventListener('paste-error', handleError);
    return () => window.removeEventListener('paste-error', handleError);
  }, []);


  const navCategories = [
    {
      title: 'Graphics',
      items: [
        { to: '/image-tools', icon: PhotoIcon, label: 'Image Converter' },
        { to: '/bg-remover', icon: SparklesIcon, label: 'Background Remover' },
        { to: '/image-upscaler', icon: SparklesIcon, label: 'Image Upscaler' },
        { to: '/color-picker', icon: PaintBrushIcon, label: 'Color Picker' },
        { to: '/pdf-image-extractor', icon: DocumentArrowDownIcon, label: 'PDF Image Extractor' },
        { to: '/shape-generator', icon: RectangleGroupIcon, label: 'Shape Generator' },
        { to: '/svg-converter', icon: CommandLineIcon, label: 'SVG Converter' }
      ]
    },
    {
      title: 'Video & Animation',
      items: [
        { to: '/video-compressor', icon: FilmIcon, label: 'Video Compressor' },
        { to: '/video-to-gif', icon: GifIcon, label: 'Video to GIF' },
        { to: '/video-frame-extractor', icon: FilmIcon, label: 'Video Frame Extractor' },
        { to: '/lottie-to-gif', icon: ScissorsIcon, label: 'Lottie to GIF' }
      ]
    },
    {
      title: 'Web & Dev',
      items: [
        { to: '/qr-generator', icon: QrCodeIcon, label: 'QR Generator' },
        { to: '/json-saver', icon: CodeBracketSquareIcon, label: 'JSON Saver' },
        { to: '/timezone-converter', icon: ClockIcon, label: 'Timezone Converter' },
        { to: '/html-preview', icon: WindowIcon, label: 'HTML Preview' },
        { to: '/component-generator', icon: CodeBracketSquareIcon, label: 'Component Generator' }
      ]
    }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-overlay animate-fade-in" 
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            display: window.innerWidth <= 768 ? 'block' : 'none'
          }}
        />
      )}
      <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container" style={{ alignItems: 'center' }}>
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="WebTools Logo" width="28" height="28" style={{ marginLeft: '6px', marginRight: '-2px' }} />
            <h2>Web<span className="text-gradient">Tools</span></h2>
            <span className="version">v3.09</span>
          </div>

        </div>
        
        <SidebarClock onClick={onClockClick} />

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <nav className="sidebar-nav" ref={navRef} onScroll={checkScroll}>
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
            {canScrollDown && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40px',
                background: 'linear-gradient(to top, var(--bg-secondary) 20%, transparent 100%)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                pointerEvents: 'none',
                paddingBottom: '8px',
                zIndex: 10
              }}>
                <ChevronDownOutline style={{ width: 24, height: 24, color: 'var(--accent-color)', animation: 'bounce 1.5s infinite', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} strokeWidth={4} />
              </div>
            )}
          </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-buttons">
            <NavLink 
              to="/"
              className="btn"
              style={{ padding: '0.25rem 0.5rem', flexShrink: 0, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Home"
              onClick={onClose}
            >
              <HomeIcon style={{width: 20, height: 20}} />
            </NavLink>
            <button 
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="btn"
              style={{ padding: '0.25rem 0.5rem', flexShrink: 0, border: '1px solid var(--border-color)' }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <SunIcon style={{width: 20, height: 20}} /> : <MoonIcon style={{width: 20, height: 20}} />}
            </button>
            <button 
              onClick={onToggleDiagnostics}
              className={`btn ${showDiagnostics ? 'btn-primary' : ''}`}
              style={{ padding: '0.25rem 0.5rem', flexShrink: 0, border: '1px solid var(--border-color)' }}
              title="Toggle Diagnostics Overlay"
            >
              <ChartBarIcon style={{width: 20, height: 20}} />
            </button>
            <button 
              onClick={onManualPaste}
              className={`btn ${isShaking ? 'shake-error' : ''}`}
              style={{ padding: '0.25rem 0.5rem', flexShrink: 0, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Click to paste your clipboard and convert to PNG"
            >
              <ClipboardDocumentIcon style={{width: 20, height: 20}} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
