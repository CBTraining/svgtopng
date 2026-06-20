import { useState, useEffect } from 'react';

export default function SidebarClock() {
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

  const renderDot = (active, key) => (
    <div
      key={key}
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: active ? 'var(--accent-color)' : 'var(--border-color)',
        boxShadow: active ? '0 0 5px var(--accent-glow)' : 'none',
        transition: 'all 0.2s ease'
      }}
    />
  );

  return (
    <div className="sidebar-clock hidden-on-mobile" style={{
      padding: '0 1.5rem 1.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
      borderBottom: '1px solid var(--border-color)',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ 
          fontSize: '1.25rem', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)',
          letterSpacing: '1px'
        }}>
          {timeStr}
        </div>
        
        {/* Binary Clock Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end', opacity: 0.8 }} title="Binary Clock (H, M, S)">
          {/* Hours: 4 bits right-aligned */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {hoursBin.map((active, i) => renderDot(active, `h-${i}`))}
          </div>
          {/* Minutes: 6 bits */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {minutesBin.map((active, i) => renderDot(active, `m-${i}`))}
          </div>
          {/* Seconds: 6 bits */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {secondsBin.map((active, i) => renderDot(active, `s-${i}`))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {dateStr}
      </div>
    </div>
  );
}
