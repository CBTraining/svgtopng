import { useState, useRef } from 'react';
import '../index.css';
import { extractDroppedFiles } from '../utils/fileTypes';

export default function Dropzone({ onDrop, accept = "*", title = "Upload File", subtitle = "Click or drag a file here", icon }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef(null);
  const dropzoneRef = useRef(null);

  const triggerBurst = () => {
    if (dropzoneRef.current) {
      const rect = dropzoneRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      window.dispatchEvent(new CustomEvent('burst', { detail: { type: 'radial', x, y } }));
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDropEvent = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    // Extract files (supports Desktop files + Google Chat / Slack / web browser image drag)
    const files = await extractDroppedFiles(e);
    if (files.length > 0) {
      triggerBurst();
      onDrop(files);
    }
  };

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      triggerBurst();
      onDrop(Array.from(e.target.files));
    }
  };

  return (
    <div 
      ref={dropzoneRef}
      className={`dropzone ${isDragActive ? 'active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDropEvent}
      onClick={handleClick}
    >
      {icon}
      <h3>{title}</h3>
      <p>{subtitle}</p>
      <input 
        ref={inputRef}
        type="file" 
        accept={accept} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        title=""
      />
    </div>
  );
}
