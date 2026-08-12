import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FilmIcon, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download, XMarkIcon as XMark, ClipboardDocumentIcon, CheckIcon as Check, PlayIcon, PauseIcon, ForwardIcon, BackwardIcon } from '@heroicons/react/24/solid';
import { isVideoFile } from '../utils/fileTypes';

function extractYouTubeVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

const fetchYouTubeVideoStream = async (youtubeUrl, videoId) => {
  // Strategy 1: Try Cobalt API
  try {
    const res = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: youtubeUrl,
        videoQuality: '1080'
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (e) {
    console.warn("Cobalt API failed", e);
  }

  // Strategy 2: Try Piped API
  try {
    const res = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.videoStreams && data.videoStreams.length > 0) {
        const mp4Streams = data.videoStreams.filter(s => s.mimeType?.includes('mp4') || s.format === 'v1080p' || s.format === 'v720p');
        const bestStream = mp4Streams[0] || data.videoStreams[0];
        if (bestStream?.url) return bestStream.url;
      }
    }
  } catch (e) {
    console.warn("Piped API failed", e);
  }

  // Strategy 3: Try Invidious API instances
  const invidiousInstances = ['https://invidious.drgns.space', 'https://inv.privacydev.net'];
  for (const instance of invidiousInstances) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.formatStreams && data.formatStreams.length > 0) {
          const mp4 = data.formatStreams.find(s => s.container === 'mp4') || data.formatStreams[0];
          if (mp4?.url) return mp4.url;
        }
      }
    } catch (e) {
      console.warn(`Invidious instance ${instance} failed`, e);
    }
  }

  throw new Error("Unable to resolve direct video stream for this YouTube link. Please ensure the video is public.");
};

export default function VideoFrameExtractor() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [ytLoadingText, setYtLoadingText] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const location = useLocation();
  const initFromState = useRef(false);

  // Handle incoming file from drag-drop overlay
  useEffect(() => {
    if (location.state?.videoFile && !initFromState.current) {
      const file = location.state.videoFile;
      initFromState.current = true;
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setIsLoading(true);
      
      // Clear state so it doesn't trigger again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Clean up object URL when unmounting or changing file
  useEffect(() => {
    return () => {
      if (videoUrl && !videoUrl.startsWith('http')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && isVideoFile(file)) {
      setVideoFile(file);
      if (videoUrl && !videoUrl.startsWith('http')) {
        URL.revokeObjectURL(videoUrl);
      }
      setVideoUrl(URL.createObjectURL(file));
      setExternalUrl('');
      setIsLoading(true);
      setLoadingProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && isVideoFile(file)) {
      handleFileChange({ target: { files: [file] } });
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleUrlLoad = async () => {
    let url = externalUrl.trim();
    if (!url) return;

    // Check if YouTube URL
    const ytVideoId = extractYouTubeVideoId(url);
    if (ytVideoId) {
      setIsLoading(true);
      setLoadingProgress(10);
      setYtLoadingText('Resolving YouTube video stream...');
      try {
        const streamUrl = await fetchYouTubeVideoStream(url, ytVideoId);
        setYtLoadingText('Loading video stream...');
        setVideoFile({ name: `youtube_${ytVideoId}.mp4` });
        if (videoUrl && !videoUrl.startsWith('http')) {
          URL.revokeObjectURL(videoUrl);
        }
        setVideoUrl(streamUrl);
      } catch (err) {
        alert("YouTube Error: " + err.message);
        setIsLoading(false);
      } finally {
        setYtLoadingText('');
      }
      return;
    }

    // Parse Google Drive links
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);
    if (match && match[1]) {
      url = `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }

    setVideoFile(null);
    if (videoUrl && !videoUrl.startsWith('http')) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(url);
    setIsLoading(true);
    setLoadingProgress(0);
  };

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0 && videoRef.current.duration) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const duration = videoRef.current.duration;
      setLoadingProgress(Math.round((bufferedEnd / duration) * 100));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const stepFrame = (forward = true) => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      // Assume 30fps for stepping (~0.0333 seconds per frame)
      const frameDuration = 1 / 30; 
      videoRef.current.currentTime += forward ? frameDuration : -frameDuration;
    }
  };

  const captureFrame = (callback) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Set canvas dimensions to match video videoWidth and videoHeight
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw the current video frame onto the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to Blob
    canvas.toBlob(callback, 'image/png');
  };

  const handleDownload = () => {
    captureFrame((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = videoFile ? videoFile.name.replace(/\.[^/.]+$/, "") : 'extracted_frame';
      const timeStamp = currentTime.toFixed(2).replace('.', '_');
      a.download = `${baseName}_frame_${timeStamp}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleCopy = () => {
    captureFrame(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error("Clipboard copy failed", err);
        alert("Failed to copy to clipboard. Ensure your browser supports this feature.");
      }
    });
  };

  const formatTime = (timeInSeconds) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    const ms = Math.floor((timeInSeconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '0' }}>
        <FilmIcon />
        <h1>Video Frame Extractor</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {!videoUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* File Upload Dropzone */}
            <div 
              className="dropzone" 
              onDrop={handleDrop} 
              onDragOver={handleDragOver}
            >
              <input 
                type="file" 
                accept="video/*,.mov,.mp4,.webm,.mkv,.avi,.quicktime"
                onChange={handleFileChange}
              />
              <UploadCloud style={{ width: '48px', height: '48px' }} />
              <h3>Drag & Drop Video (.MOV, .MP4) Here</h3>
              <p>or click to browse</p>
            </div>
            
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>— OR —</div>
            
            {/* External / YouTube URL Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '550px', margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Paste YouTube link or direct video URL (.mp4)..." 
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUrlLoad(); }}
                />
                <button className="btn btn-primary" onClick={handleUrlLoad} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Load Video'}
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Supports YouTube videos (<code style={{ fontSize: '0.7rem' }}>youtube.com/watch?v=...</code>, <code style={{ fontSize: '0.7rem' }}>youtu.be/...</code>, Shorts), Google Drive, and MP4 links.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => { setVideoUrl(''); setVideoFile(null); setExternalUrl(''); }} style={{ padding: '0.5rem 1rem' }}>
                <XMark style={{ width: '16px', height: '16px' }} /> Clear Video
              </button>
            </div>
            
            <div className="checkerboard-bg" style={{ 
              borderRadius: '8px', 
              overflow: 'hidden', 
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '800px',
              backgroundColor: '#000',
              position: 'relative'
            }}>
              {isLoading && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: 'white' }}>
                   <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{ytLoadingText || 'Loading Video...'}</div>
                   <div style={{ width: '80%', maxWidth: '300px', height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${loadingProgress}%`, background: 'var(--accent-color)', transition: 'width 0.2s ease-out' }}></div>
                   </div>
                   <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{loadingProgress}%</div>
                </div>
              )}
              <video 
                ref={videoRef}
                src={videoUrl} 
                crossOrigin="anonymous" /* Important for extracting frames from external URLs if CORS is supported */
                onLoadedMetadata={handleLoadedMetadata}
                onLoadedData={handleLoadedData}
                onProgress={handleProgress}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', opacity: isLoading ? 0.3 : 1, transition: 'opacity 0.3s ease' }}
                onClick={togglePlay}
              />
            </div>
            
            {/* Custom Controls */}
            <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', minWidth: '60px' }}>{formatTime(currentTime)}</span>
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 100} 
                  step="0.001" 
                  value={currentTime} 
                  onChange={handleSeek}
                  style={{ flex: 1, accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', minWidth: '60px' }}>{formatTime(duration)}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <button className="btn" onClick={() => stepFrame(false)} title="Previous Frame (-1/30s)">
                  <BackwardIcon style={{width: '20px', height: '20px'}} />
                </button>
                <button className="btn btn-primary" onClick={togglePlay} style={{ padding: '0.75rem', borderRadius: '50%' }}>
                  {isPlaying ? <PauseIcon style={{width: '24px', height: '24px'}} /> : <PlayIcon style={{width: '24px', height: '24px', marginLeft: '4px'}} />}
                </button>
                <button className="btn" onClick={() => stepFrame(true)} title="Next Frame (+1/30s)">
                  <ForwardIcon style={{width: '20px', height: '20px'}} />
                </button>
              </div>
              
            </div>

            {/* Export Options */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
                <Download style={{width: '20px', height: '20px'}} />
                Download PNG Frame
              </button>
              <button className="btn" onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
                {copySuccess ? <Check style={{width: '20px', height: '20px'}} /> : <ClipboardDocumentIcon style={{width: '20px', height: '20px'}} />}
                {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            
            {/* Invisible Canvas for extraction */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}
      </div>
    </div>
  );
}
