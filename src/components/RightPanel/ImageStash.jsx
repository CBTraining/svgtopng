import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';

const STASH_KEY = 'webtools-image-stash';

export default function ImageStash() {
  const [images, setImages] = useState([]);

  useEffect(() => {
    get(STASH_KEY).then(val => {
      if (val && Array.isArray(val)) {
        const loaded = val.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          url: URL.createObjectURL(file)
        }));
        setImages(loaded);
      }
    });
  }, []);

  const saveToIDB = async (newImages) => {
    const files = newImages.map(img => img.file);
    await set(STASH_KEY, files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    
    const newImgs = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file)
    }));
    
    const updated = [...images, ...newImgs];
    setImages(updated);
    saveToIDB(updated);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeImage = (id) => {
    const updated = images.filter(img => img.id !== id);
    setImages(updated);
    saveToIDB(updated);
  };

  const handleDragStart = (e, file) => {
    if (e.dataTransfer.items) {
      e.dataTransfer.items.add(file);
    }
  };

  return (
    <div 
      onDrop={handleDrop} 
      onDragOver={handleDragOver}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem', 
        background: 'var(--bg-primary)', 
        padding: '1rem', 
        borderRadius: 'var(--border-radius)', 
        border: '1px dashed var(--border-color)',
        minHeight: '120px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
        <PhotoIcon width={20} />
        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Image Stash</h4>
      </div>
      
      {images.length === 0 ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
          Drag & Drop images here to save for later.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {images.map(img => (
            <div key={img.id} style={{ position: 'relative', paddingBottom: '100%', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
              <img 
                src={img.url} 
                alt="Stash" 
                draggable
                onDragStart={(e) => handleDragStart(e, img.file)}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'grab' }} 
              />
              <button 
                onClick={() => removeImage(img.id)}
                style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer', color: '#fff' }}
              >
                <TrashIcon width={12} height={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
