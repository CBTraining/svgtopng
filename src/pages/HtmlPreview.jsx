import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import beautify from 'js-beautify';
import { SparklesIcon, WindowIcon, DevicePhoneMobileIcon, DeviceTabletIcon, ComputerDesktopIcon, EyeSlashIcon, EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', backgroundColor: '#111' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error.toString()}</pre>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #f0f4f8;
      color: #333;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    h1 { color: #0284c7; }
    .card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello, World!</h1>
    <p>This is a live HTML preview tool.</p>
  </div>
</body>
</html>`;

export default function HtmlPreviewWrapper() {
  return (
    <ErrorBoundary>
      <HtmlPreview />
    </ErrorBoundary>
  );
}

function HtmlPreview() {
  const [htmlCode, setHtmlCode] = useState(() => {
    return localStorage.getItem('html-preview-code') || defaultHtml;
  });
  const [debouncedHtmlCode, setDebouncedHtmlCode] = useState(htmlCode);
  const [refreshKey, setRefreshKey] = useState(0);
  const [device, setDevice] = useState('desktop'); // desktop, tablet, mobile
  const [showCode, setShowCode] = useState(true);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem('html-preview-code', htmlCode);
    
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedHtmlCode(htmlCode);
    }, 500); // 500ms debounce
    
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [htmlCode]);

  const handleForceRefresh = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setDebouncedHtmlCode(htmlCode);
    setRefreshKey(prev => prev + 1);
  };

  const handleCleanUp = () => {
    const formatted = beautify.html(htmlCode, {
      indent_size: 2,
      preserve_newlines: true,
      max_preserve_newlines: 2,
      wrap_line_length: 0,
      end_with_newline: true
    });
    setHtmlCode(formatted);
  };

  let previewWidth = '100%';
  if (device === 'tablet') previewWidth = '768px';
  if (device === 'mobile') previewWidth = '375px';

  // Inject meta tags and a baseline white background into the preview HTML.
  // This prevents Chrome Auto Dark Mode or extensions from making the blank canvas black,
  // but since it's at the top of the head, the user's custom CSS will easily override it.
  let previewHtml = debouncedHtmlCode;
  const antiDarkMeta = '<meta name="color-scheme" content="only light"><meta name="darkreader-lock"><style>html, body { background-color: #ffffff; color: #000000; }</style>';
  
  if (previewHtml.includes('<head>')) {
    previewHtml = previewHtml.replace('<head>', '<head>' + antiDarkMeta);
  } else if (previewHtml.toLowerCase().includes('<html>')) {
    previewHtml = previewHtml.replace(/<html[^>]*>/i, (match) => match + '<head>' + antiDarkMeta + '</head>');
  } else {
    previewHtml = '<head>' + antiDarkMeta + '</head>' + previewHtml;
  }

  return (
    <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0, overflow: 'hidden' }}>
      {/* Header Toolbar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '1rem',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn" onClick={() => setShowCode(!showCode)} title="Toggle Code Editor">
            {showCode ? <EyeSlashIcon width={20} /> : <EyeIcon width={20} />}
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
          
          {showCode && (
            <>
              <button className="btn" onClick={handleForceRefresh} title="Force Refresh Preview">
                <ArrowPathIcon width={20} />
                Refresh
              </button>
              <button className="btn btn-primary" onClick={handleCleanUp}>
                <SparklesIcon width={20} />
                Clean Up
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--border-radius-sm)' }}>
          <button 
            className="btn" 
            style={{ 
              background: device === 'desktop' ? 'var(--accent-color)' : 'transparent',
              color: device === 'desktop' ? '#fff' : 'var(--text-secondary)'
            }}
            onClick={() => setDevice('desktop')}
            title="Desktop View"
          >
            <ComputerDesktopIcon width={20} />
          </button>
          <button 
            className="btn" 
            style={{ 
              background: device === 'tablet' ? 'var(--accent-color)' : 'transparent',
              color: device === 'tablet' ? '#fff' : 'var(--text-secondary)'
            }}
            onClick={() => setDevice('tablet')}
            title="Tablet View"
          >
            <DeviceTabletIcon width={20} />
          </button>
          <button 
            className="btn" 
            style={{ 
              background: device === 'mobile' ? 'var(--accent-color)' : 'transparent',
              color: device === 'mobile' ? '#fff' : 'var(--text-secondary)'
            }}
            onClick={() => setDevice('mobile')}
            title="Mobile View"
          >
            <DevicePhoneMobileIcon width={20} />
          </button>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="html-preview-split">
        {/* Code Editor Side */}
        <div 
          className={`html-preview-code-side ${showCode ? 'is-visible' : 'is-hidden'}`}
          style={{ 
            width: showCode ? '50%' : '0%', 
            minWidth: showCode ? '300px' : '0px',
            opacity: showCode ? 1 : 0,
            borderRight: showCode ? '1px solid var(--border-color)' : 'none'
          }}
        >
          <div style={{ 
            flex: 1, 
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Editor
              height="100%"
              defaultLanguage="html"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={htmlCode}
              onChange={value => setHtmlCode(value || '')}
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                formatOnPaste: true,
                fontSize: 14,
                fontFamily: '"Fira Code", "Consolas", monospace'
              }}
            />
          </div>
        </div>

        {/* Preview Side */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'var(--bg-tertiary)', // Adaptive backdrop to emphasize the preview area
          overflow: device === 'desktop' ? 'hidden' : 'auto',
          padding: device === 'desktop' ? '0' : '2rem',
          transition: 'padding 0.3s ease'
        }} className="custom-scrollbar">
          <div 
            className="preview-iframe-wrapper"
            data-darkreader-inline-bgcolor
            style={{
            width: previewWidth,
            height: device === 'desktop' ? '100%' : 'auto',
            aspectRatio: device === 'mobile' ? '9/19.5' : device === 'tablet' ? '3/4' : 'auto',
            maxHeight: device === 'desktop' ? '100%' : 'none',
            backgroundColor: '#ffffff', // Browsers default to white background
            borderRadius: device === 'desktop' ? '0px' : '24px',
            boxShadow: device === 'desktop' ? 'none' : 'var(--panel-shadow)',
            border: device === 'desktop' ? 'none' : '12px solid var(--border-color)',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <iframe
              key={refreshKey}
              srcDoc={previewHtml}
              title="HTML Preview"
              data-darkreader-inline-bgcolor
              style={{
                width: '100%',
                flex: 1,
                border: 'none',
                backgroundColor: '#ffffff',
                colorScheme: 'light'
              }}
              sandbox="allow-scripts allow-modals allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
