import { useState, useRef, useEffect } from 'react';
import { PhotoIcon as ImageIcon, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/solid';
import Dropzone from '../components/Dropzone';
import './ImageTools.css'; // Will create

export default function ImageTools() {
  const [imageFile, setImageFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [width, setWidth] = useState(800);
  const [radius, setRadius] = useState(0);
  const [quality, setQuality] = useState(0.8);
  const canvasRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      
      const img = new Image();
      img.onload = () => {
        setWidth(img.width);
      };
      img.src = url;
    }
  };

  useEffect(() => {
    if (!imageSrc) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Calculate new height to maintain aspect ratio
      const aspectRatio = img.height / img.width;
      const newHeight = width * aspectRatio;
      
      canvas.width = width;
      canvas.height = newHeight;
      
      // Apply rounded corners if radius > 0
      if (radius > 0) {
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(width - radius, 0);
        ctx.quadraticCurveTo(width, 0, width, radius);
        ctx.lineTo(width, newHeight - radius);
        ctx.quadraticCurveTo(width, newHeight, width - radius, newHeight);
        ctx.lineTo(radius, newHeight);
        ctx.quadraticCurveTo(0, newHeight, 0, newHeight - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
      }
      
      ctx.drawImage(img, 0, 0, width, newHeight);
    };
    img.src = imageSrc;
  }, [imageSrc, width, radius]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webtools-image-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png', parseFloat(quality)); // Note: PNG doesn't use quality param in all browsers, maybe we should export as JPEG/WEBP if quality < 1
  };

  const handleDownloadJPEG = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webtools-image-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', parseFloat(quality));
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <ImageIcon />
        <h1>Image Tools</h1>
      </div>
      <p>Resize, round corners, and compress your images directly in the browser.</p>

      <div className="grid-container">
        <div className="glass-panel tool-controls">
          {!imageSrc ? (
            <Dropzone 
              onDrop={(file) => {
                if (file && file.type.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onload = (e) => setImageSrc(e.target.result);
                  reader.readAsDataURL(file);
                }
              }}
              title="Upload Image"
              subtitle="Click or drag an image here"
              icon={<UploadCloud style={{width: 48, height: 48}}/>}
            />
          ) : (
            <div className="controls">
              <div className="control-group">
                <label>Width: {width}px</label>
                <input 
                  type="range" 
                  min="100" max="4000" 
                  value={width} 
                  onChange={(e) => setWidth(parseInt(e.target.value))} 
                />
              </div>
              <div className="control-group">
                <label>Corner Radius: {radius}px</label>
                <input 
                  type="range" 
                  min="0" max="500" 
                  value={radius} 
                  onChange={(e) => setRadius(parseInt(e.target.value))} 
                />
              </div>
              <div className="control-group">
                <label>JPEG Compression Quality: {Math.round(quality * 100)}%</label>
                <input 
                  type="range" 
                  min="0.1" max="1" step="0.1" 
                  value={quality} 
                  onChange={(e) => setQuality(parseFloat(e.target.value))} 
                />
              </div>
              
              <div className="button-group">
                <button className="btn btn-primary" onClick={handleDownload}>
                  <Download style={{width: "18px", height: "18px"}} /> Download PNG
                </button>
                <button className="btn" onClick={handleDownloadJPEG}>
                  <Download style={{width: "18px", height: "18px"}} /> Download JPEG
                </button>
                <button className="btn" onClick={() => {setImageSrc(null); setImageFile(null);}}>
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {imageSrc && (
          <div className="glass-panel preview-panel">
            <h3>Preview</h3>
            <div className="canvas-container">
              <canvas ref={canvasRef} className="preview-canvas" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
