import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CodeBracketSquareIcon as FileJson, ArrowDownTrayIcon as Download, CheckIcon as Check, ExclamationCircleIcon as AlertCircle } from '@heroicons/react/24/solid';
import lottie from 'lottie-web';
import GIF from 'gif.js';

function LottiePreview({ animationData, isPlaying, onTogglePlay }) {
  const containerRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (animationData && containerRef.current) {
      containerRef.current.innerHTML = '';
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: isPlaying,
        animationData: animationData,
      });
    }
    return () => {
      if (animRef.current) {
        animRef.current.destroy();
      }
    };
  }, [animationData]);

  useEffect(() => {
    if (animRef.current) {
      if (isPlaying) {
        animRef.current.play();
      } else {
        animRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <div className="glass-panel" style={{ background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'center', position: 'relative', minHeight: '300px', alignItems: 'center' }}>
      <div ref={containerRef} style={{ width: '250px', height: '250px' }}></div>
      <button 
        className="btn" 
        onClick={onTogglePlay} 
        style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem' }}
      >
        {isPlaying ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{width: 16, height: 16}}>
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
            </svg>
            Pause
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{width: 16, height: 16}}>
              <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
            </svg>
            Play
          </>
        )}
      </button>
    </div>
  );
}

export default function JsonSaver() {
  const [jsonText, setJsonText] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Lottie and GIF state
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const [parsedLottieData, setParsedLottieData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [gifJob, setGifJob] = useState({ status: 'idle', progress: 0, log: '', resultUrl: '', error: '' });

  const location = useLocation();

  // Load state if navigated with state (e.g., from drag and drop overlay)
  useEffect(() => {
    if (location.state?.jsonText) {
      setJsonText(location.state.jsonText);
    }
  }, [location.state]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  useEffect(() => {
    return () => {
      if (gifJob.resultUrl) {
        URL.revokeObjectURL(gifJob.resultUrl);
      }
    };
  }, [gifJob.resultUrl]);

  // Check if pasted JSON is Lottie animation whenever JSON text changes
  useEffect(() => {
    if (!jsonText.trim()) {
      setParsedLottieData(null);
      setActiveTab('editor');
      return;
    }
    try {
      const parsed = JSON.parse(jsonText);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.v === 'string' &&
        typeof parsed.fr === 'number' &&
        typeof parsed.ip === 'number' &&
        typeof parsed.op === 'number' &&
        Array.isArray(parsed.layers)
      ) {
        setParsedLottieData(parsed);
      } else {
        setParsedLottieData(null);
        setActiveTab('editor');
      }
    } catch (e) {
      setParsedLottieData(null);
      setActiveTab('editor');
    }
  }, [jsonText]);

  const handleFormat = () => {
    try {
      if (!jsonText.trim()) return;
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSave = () => {
    try {
      if (!jsonText.trim()) return;
      JSON.parse(jsonText); // Validate before saving
      setError(null);
      
      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError('Cannot save invalid JSON: ' + e.message);
    }
  };

  const handleConvertToGif = async () => {
    if (!parsedLottieData || gifJob.status === 'running') return;

    setGifJob({ status: 'running', progress: 0, log: 'Starting conversion...', resultUrl: '', error: '' });

    // Create a temporary hidden container for canvas rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '300px';
    tempContainer.style.height = '300px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);

    let animItem = null;
    try {
      animItem = lottie.loadAnimation({
        container: tempContainer,
        renderer: 'canvas',
        loop: false,
        autoplay: false,
        animationData: parsedLottieData,
      });

      await new Promise(resolve => animItem.addEventListener('DOMLoaded', resolve));

      const totalFrames = animItem.totalFrames;
      const frameRate = animItem.frameRate;
      const delay = 1000 / frameRate;

      const canvas = tempContainer.querySelector('canvas');
      if (!canvas) throw new Error("Could not locate canvas element in lottie-web player.");

      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: canvas.width,
        height: canvas.height,
        workerScript: `${import.meta.env.BASE_URL}gif.worker.js`,
        transparent: 0x000000
      });

      gif.on('progress', p => {
        setGifJob(prev => ({ ...prev, progress: p * 100, log: `Rendering GIF: ${Math.round(p * 100)}%` }));
      });

      gif.on('finished', (blob) => {
        const rUrl = URL.createObjectURL(blob);
        setGifJob({ status: 'success', progress: 100, log: 'Ready!', resultUrl: rUrl, error: '' });
        animItem.destroy();
        document.body.removeChild(tempContainer);
      });

      gif.on('error', (err) => {
        console.error(err);
        setGifJob({ status: 'error', progress: 0, log: '', resultUrl: '', error: err?.message || 'Failed to render GIF.' });
        if (animItem) animItem.destroy();
        if (tempContainer.parentNode) document.body.removeChild(tempContainer);
      });

      gif.on('abort', () => {
        setGifJob({ status: 'error', progress: 0, log: '', resultUrl: '', error: 'GIF rendering aborted.' });
        if (animItem) animItem.destroy();
        if (tempContainer.parentNode) document.body.removeChild(tempContainer);
      });

      for (let i = 0; i < totalFrames; i++) {
        animItem.goToAndStop(i, true);
        gif.addFrame(canvas, { copy: true, delay });
      }

      gif.render();
    } catch (err) {
      console.error(err);
      setGifJob({ status: 'error', progress: 0, log: '', resultUrl: '', error: err?.message || 'Failed to initialize player.' });
      if (animItem) animItem.destroy();
      if (tempContainer.parentNode) document.body.removeChild(tempContainer);
    }
  };

  const handleDiscardGif = () => {
    if (gifJob.resultUrl) URL.revokeObjectURL(gifJob.resultUrl);
    setGifJob({ status: 'idle', progress: 0, log: '', resultUrl: '', error: '' });
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <FileJson />
        <h1>JSON File Saver</h1>
      </div>
      <p>Format, validate, and download your JSON data effortlessly.</p>

      {parsedLottieData && (
        <div 
          className="glass-panel" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1rem', 
            padding: '0.75rem 1.25rem', 
            background: 'var(--accent-transparent)', 
            borderColor: 'var(--accent-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ animation: 'pulse 2s infinite', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-color)' }}></span>
            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
              Lottie Animation detected in JSON!
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={`btn ${activeTab === 'editor' ? 'btn-primary' : ''}`} 
              onClick={() => setActiveTab('editor')}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              JSON Editor
            </button>
            <button 
              className={`btn ${activeTab === 'preview' ? 'btn-primary' : ''}`} 
              onClick={() => setActiveTab('preview')}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              Animation Preview
            </button>
          </div>
        </div>
      )}

      {activeTab === 'editor' ? (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>JSON Content:</label>
            {error && <span style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><AlertCircle style={{width: "16px", height: "16px"}}/> {error}</span>}
            {success && <span style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><Check style={{width: "16px", height: "16px"}}/> Saved Successfully!</span>}
          </div>
          
          <textarea 
            className="input-field" 
            style={{ minHeight: '400px', fontFamily: 'monospace', resize: 'vertical' }}
            value={jsonText}
            onChange={(e) => {setJsonText(e.target.value); setError(null);}}
            placeholder='{"key": "value"}'
            spellCheck="false"
          />

          <div className="button-group">
            <button className="btn" onClick={handleFormat}>
              Format JSON
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Download style={{width: "18px", height: "18px"}} /> Download .json
            </button>
            {parsedLottieData && (
              <button 
                className="btn" 
                onClick={() => { setActiveTab('preview'); handleConvertToGif(); }} 
                style={{ 
                  background: 'var(--accent-gradient)', 
                  color: 'white', 
                  boxShadow: '0 0 15px var(--accent-glow)' 
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 18, height: 18, marginRight: 6, display: 'inline-block', verticalAlign: 'middle'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Convert Lottie to GIF
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--accent-color)' }}>Animation Preview</h3>
            <LottiePreview 
              animationData={parsedLottieData} 
              isPlaying={isPlaying} 
              onTogglePlay={() => setIsPlaying(!isPlaying)} 
            />
          </div>

          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Lottie Export Controls</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Convert this Lottie animation into a high-quality GIF directly from your editor data.</p>
            
            {gifJob.status === 'idle' && (
              <button className="btn btn-primary" onClick={handleConvertToGif} style={{ width: '100%', padding: '1rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 20, height: 20, marginRight: 8, display: 'inline-block', verticalAlign: 'middle'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Convert to GIF
              </button>
            )}

            {gifJob.status === 'running' && (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{gifJob.log}</div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${gifJob.progress}%`, height: '100%', background: 'var(--accent-gradient)', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            {gifJob.status === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                  <AlertCircle style={{width: 20, height: 20}}/> Conversion Failed
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--danger-color)', textAlign: 'center' }}>{gifJob.error}</p>
                <button className="btn btn-primary" onClick={handleConvertToGif} style={{ width: '100%' }}>
                  Retry Conversion
                </button>
              </div>
            )}

            {gifJob.status === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="glass-panel" style={{ background: 'var(--bg-primary)', display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                  <img src={gifJob.resultUrl} alt="Generated GIF" style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'contain' }} />
                </div>
                <div className="button-group" style={{ width: '100%', gap: '0.5rem' }}>
                  <a href={gifJob.resultUrl} download={`lottie-export-${Date.now()}.gif`} className="btn btn-primary" style={{ flex: 1 }}>
                    <Download style={{width: "18px", height: "18px"}} /> Download GIF
                  </a>
                  <button className="btn" onClick={handleDiscardGif}>
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
