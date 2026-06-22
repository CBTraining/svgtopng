import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, WrenchScrewdriverIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid';
import Calculator from './Calculator';
import AspectRatioCalc from './AspectRatioCalc';
import ImageStash from './ImageStash';
import Alarms from './Alarms';
import './RightPanel.css';

export default function RightPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [scratchpad, setScratchpad] = useState('');

  // Load scratchpad from localstorage
  useEffect(() => {
    const saved = localStorage.getItem('webtools-scratchpad');
    if (saved) setScratchpad(saved);
  }, []);

  const handleScratchpadChange = (e) => {
    const val = e.target.value;
    setScratchpad(val);
    localStorage.setItem('webtools-scratchpad', val);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div className={`right-panel ${isOpen ? 'open' : 'closed'}`}>
        <button 
          className="right-panel-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title="Toggle Quick Tools"
        >
          {isOpen ? <ChevronRightIcon width={24} strokeWidth={2} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <WrenchScrewdriverIcon width={20} />
              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 'normal', letterSpacing: '1px', fontSize: '0.85rem' }}>Tools (t)</div>
            </div>
          )}
        </button>

        <div className="right-panel-content glass-panel" style={{ borderRadius: 'var(--border-radius) 0 0 var(--border-radius)', borderRight: 'none', height: '100%', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            <WrenchScrewdriverIcon width={24} style={{ color: 'var(--accent-color)' }} />
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Quick Tools</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. Calculator */}
            <Calculator />

            {/* 2. Aspect Ratio Calc */}
            <AspectRatioCalc />

            {/* 3. Alarms/Timers */}
            <Alarms />

            {/* 4. Image Stash */}
            <ImageStash />

            {/* 5. Scratchpad */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scratchpad</h4>
              <textarea 
                value={scratchpad}
                onChange={handleScratchpadChange}
                placeholder="Type quick notes here..."
                style={{ 
                  width: '100%', 
                  minHeight: '120px', 
                  background: 'var(--bg-primary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--border-radius-sm)', 
                  padding: '0.75rem',
                  color: 'var(--text-primary)',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
