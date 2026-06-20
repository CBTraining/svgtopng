import { useState, useEffect } from 'react';

export default function SidebarClock({ onClick }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time (12-hour with seconds)
  const timeStr = time.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  
  // Format date
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Get raw values for binary clock
  let hours = time.getHours();
  // Convert to 12-hour format for binary display (1-12)
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Convert to binary arrays (true/false)
  // Hours (max 12) needs 4 bits
  const hoursBin = hours.toString(2).padStart(4, '0').split('').map(b => b === '1');
  // Minutes and Seconds (max 59) need 6 bits
  const minutesBin = minutes.toString(2).padStart(6, '0').split('').map(b => b === '1');
  const secondsBin = seconds.toString(2).padStart(6, '0').split('').map(b => b === '1');

  const allBits = [...hoursBin, ...minutesBin, ...secondsBin];

  return (
    <div className="sidebar-clock hidden-on-mobile" onClick={onClick} style={{
      padding: '0 1rem 1.5rem 1rem',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '0.75rem',
      borderBottom: '1px solid var(--border-color)',
      marginBottom: '1rem',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'opacity 0.2s',
    }}
    onMouseEnter={(e) => { if(onClick) e.currentTarget.style.opacity = '0.7'; }}
    onMouseLeave={(e) => { if(onClick) e.currentTarget.style.opacity = '1'; }}
    title={onClick ? "Enter Clock Mode" : undefined}
    >
      {/* Binary Clock Widget - 16 dots in a circle */}
      <div 
        style={{ position: 'relative', width: '48px', height: '48px', opacity: 0.9, flexShrink: 0 }} 
        title="Binary Clock (H, M, S)"
      >
        {allBits.map((active, i) => {
          // Calculate position on a circle (start at top, go clockwise)
          const angle = (i / 16) * Math.PI * 2 - (Math.PI / 2);
          const radius = 20; // Distance from center
          const x = Math.cos(angle) * radius + 24 - 3; // 24 is center, 3 is half dot width
          const y = Math.sin(angle) * radius + 24 - 3;
          
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: active ? 'var(--accent-color)' : 'var(--border-color)',
                boxShadow: active ? '0 0 6px var(--accent-glow)' : 'none',
                transition: 'all 0.2s ease'
              }}
            />
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ 
          fontSize: '1.25rem', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap'
        }}>
          {timeStr}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {dateStr}
        </div>
      </div>
    </div>
  );
}
