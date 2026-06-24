import React, { useState, useRef, useEffect } from 'react';

export default function GradientEditor({ stops, onChange }) {
  const trackRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isDragging = useRef(false);
  const dragIndex = useRef(null);

  // Ensure stops are valid and sorted for the background
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const bgGradient = `linear-gradient(to right, ${sortedStops.map(s => `${s.color} ${s.position * 100}%`).join(', ')})`;

  const handlePointerDown = (e, index) => {
    e.stopPropagation(); // prevent triggering track click
    setSelectedIndex(index);
    e.currentTarget.focus(); // Focus the node so it can receive keyboard events
    isDragging.current = true;
    dragIndex.current = index;
    
    // Add global listeners
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || dragIndex.current === null || !trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    let newPos = (e.clientX - rect.left) / rect.width;
    newPos = Math.max(0, Math.min(1, newPos));
    
    const newStops = [...stops];
    newStops[dragIndex.current] = { ...newStops[dragIndex.current], position: newPos };
    onChange(newStops);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    dragIndex.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const handleTrackClick = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let newPos = (e.clientX - rect.left) / rect.width;
    newPos = Math.max(0, Math.min(1, newPos));
    
    let closestColor = stops[0]?.color || '#ffffff';
    let minDist = 1;
    stops.forEach(s => {
      const dist = Math.abs(s.position - newPos);
      if (dist < minDist) {
        minDist = dist;
        closestColor = s.color;
      }
    });

    const newStop = { color: closestColor, position: newPos };
    const newStops = [...stops, newStop];
    onChange(newStops);
    setSelectedIndex(newStops.length - 1);
  };

  const deleteNode = (index) => {
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== index);
    onChange(newStops);
    setSelectedIndex(Math.max(0, index - 1));
  };

  const moveNode = (index, delta) => {
    const newStops = [...stops];
    let newPos = newStops[index].position + delta;
    newPos = Math.max(0, Math.min(1, newPos));
    newStops[index] = { ...newStops[index], position: newPos };
    onChange(newStops);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveNode(index, -0.01);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveNode(index, 0.01);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      deleteNode(index);
    }
  };

  const handleWheel = (e, index) => {
    // Only scroll if we are focused on the node to prevent accidental scrolling
    if (document.activeElement === e.currentTarget) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.02 : -0.02; // Scrolling down moves right, up moves left
      moveNode(index, delta);
    }
  };

  const updateSelectedColor = (newColor) => {
    if (selectedIndex >= 0 && selectedIndex < stops.length) {
      const newStops = [...stops];
      newStops[selectedIndex] = { ...newStops[selectedIndex], color: newColor };
      onChange(newStops);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* Top action bar: Selected color and delete button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem' }}>Node Color:</label>
          {stops[selectedIndex] ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="color" 
                value={stops[selectedIndex].color} 
                onChange={e => updateSelectedColor(e.target.value)} 
                style={{ width: '40px', height: '32px', padding: '0', cursor: 'pointer', background: 'none', border: 'none' }} 
              />
              <input 
                type="text" 
                value={stops[selectedIndex].color} 
                onChange={e => updateSelectedColor(e.target.value)} 
                className="text-input" 
                style={{ width: '90px', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }} 
              />
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>None selected</span>
          )}
        </div>
        
        <button 
          className="primary-btn outline" 
          onClick={() => deleteNode(selectedIndex)}
          disabled={stops.length <= 2 || !stops[selectedIndex]}
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', borderColor: 'var(--error-color)', color: 'var(--error-color)' }}
        >
          Delete Node
        </button>
      </div>

      {/* Gradient Track */}
      <div 
        ref={trackRef}
        onClick={handleTrackClick}
        style={{
          position: 'relative',
          height: '24px',
          borderRadius: '12px',
          background: bgGradient,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
          cursor: 'crosshair',
          margin: '0 8px' // margin to allow handles to overflow without clipping
        }}
      >
        {stops.map((stop, index) => (
          <div
            key={index}
            tabIndex={0} // Make focusable for keyboard events
            onPointerDown={(e) => handlePointerDown(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onWheel={(e) => handleWheel(e, index)}
            style={{
              position: 'absolute',
              top: '50%',
              left: `${stop.position * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: stop.color,
              border: index === selectedIndex ? '3px solid white' : '2px solid rgba(255,255,255,0.7)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
              cursor: 'grab',
              zIndex: index === selectedIndex ? 10 : 1,
              outline: 'none' // Remove default browser focus outline since we have our own border highlight
            }}
          />
        ))}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Click track to add node • Drag, use arrow keys, or mouse wheel to move
      </div>
    </div>
  );
}
