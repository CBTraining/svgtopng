import { useState, useEffect } from 'react';

export default function ClockModeOverlay({ onClose }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  let hours = time.getHours();
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hoursBin = hours.toString(2).padStart(4, '0').split('').map(b => b === '1');
  const minutesBin = minutes.toString(2).padStart(6, '0').split('').map(b => b === '1');
  const secondsBin = seconds.toString(2).padStart(6, '0').split('').map(b => b === '1');
  const allBits = [...hoursBin, ...minutesBin, ...secondsBin];

  return (
    <div 
      className="clock-mode-overlay animate-fade-in hidden-on-mobile"
      onClick={onClose}
      style={{
        '--u': 'min(0.55vw, 1.3vh)',
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'var(--bg-primary)',
        zIndex: 900, // Below drag drop (z-index 999/1000 usually)
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: '10vw',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
    >
      {/* Creative Background: Huge pulsing background dots */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100vw',
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        alignItems: 'center',
        justifyItems: 'center',
        opacity: 0.08,
        pointerEvents: 'none',
        gap: '2vmax',
        padding: '5vmax'
      }}>
        {allBits.map((active, i) => (
           <div key={i} style={{
             width: '18vmax',
             height: '18vmax',
             borderRadius: '50%',
             backgroundColor: active ? 'var(--accent-color)' : 'transparent',
             border: active ? 'none' : '2px solid var(--text-muted)',
             filter: active ? 'blur(40px)' : 'none',
             transition: 'all 1s ease-in-out',
             transform: active ? 'scale(1.2)' : 'scale(1)'
           }} />
        ))}
      </div>

      {/* Main Content: Scaled using dynamic unit --u */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10 * var(--u))', zIndex: 10 }}>
        {/* Binary Clock Widget - 16 dots in a circle */}
        <div 
          style={{ position: 'relative', width: 'calc(60 * var(--u))', height: 'calc(60 * var(--u))', opacity: 0.9, flexShrink: 0 }} 
        >
          {allBits.map((active, i) => {
            const angle = (i / 16) * Math.PI * 2 - (Math.PI / 2);
            const radius = 24; 
            const cx = 30;
            const cy = 30;
            const halfDot = 2.5;
            
            const x = Math.cos(angle) * radius + cx - halfDot;
            const y = Math.sin(angle) * radius + cy - halfDot;
            
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `calc(${x} * var(--u))`,
                  top: `calc(${y} * var(--u))`,
                  width: 'calc(5 * var(--u))',
                  height: 'calc(5 * var(--u))',
                  borderRadius: '50%',
                  backgroundColor: active ? 'var(--accent-color)' : 'var(--border-color)',
                  boxShadow: active ? '0 0 calc(6 * var(--u)) var(--accent-glow)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ 
            fontSize: 'calc(28 * var(--u))', 
            fontWeight: 'bold', 
            color: 'var(--text-primary)',
            letterSpacing: 'calc(0.5 * var(--u))',
            lineHeight: 1,
            whiteSpace: 'nowrap'
          }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 'calc(8 * var(--u))', color: 'var(--text-muted)', marginTop: 'calc(4 * var(--u))', whiteSpace: 'nowrap' }}>
            {dateStr}
          </div>
        </div>
      </div>
    </div>
  );
}
