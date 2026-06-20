import React, { useState, useEffect } from 'react';
import { ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const TIMEZONES = [
  { id: 'eastern', name: 'Eastern Time', tz: 'America/New_York', abbr: 'ET' },
  { id: 'central', name: 'Central Time', tz: 'America/Chicago', abbr: 'CT' },
  { id: 'mountain', name: 'Mountain Time', tz: 'America/Denver', abbr: 'MT' },
  { id: 'pacific', name: 'Pacific Time', tz: 'America/Los_Angeles', abbr: 'PT' },
  { id: 'alaska', name: 'Alaska Time', tz: 'America/Anchorage', abbr: 'AKT' },
  { id: 'hawaii', name: 'Hawaii Time', tz: 'Pacific/Honolulu', abbr: 'HT' }
];

export default function TimezoneConverter() {
  const [now, setNow] = useState(new Date());
  
  // The master synchronized time used for the converter boxes.
  // We initialize it to exactly the start of the current hour for a cleaner UX.
  const [syncedTime, setSyncedTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.getTime();
  });

  // Ticking live clocks
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Format a date to local string in a specific timezone
  const formatLiveTime = (date, tz) => {
    return date.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  };
  
  const formatLiveDate = (date, tz) => {
    return date.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Helper to format syncedTime to YYYY-MM-DDTHH:mm for datetime-local inputs
  const toInputString = (timestamp, tz) => {
    const d = new Date(timestamp);
    // Format to parts in the target timezone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d);
    
    const p = {};
    parts.forEach(part => { p[part.type] = part.value; });
    
    // YYYY-MM-DDTHH:mm
    if (!p.year) return '';
    return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
  };

  // When a user changes the datetime-local input for a specific timezone, 
  // we need to calculate what that exact absolute UTC time is.
  const handleTimeChange = (tz, valueString) => {
    if (!valueString) return;
    
    const [datePart, timePart] = valueString.split('T');
    const [year, month, day] = datePart.split('-');
    const [hour, min] = timePart.split(':');
    
    // To get the timestamp, we can format a known timestamp in that TZ, find the offset, and apply it.
    // Let's guess the timestamp using the system's local parser
    const guessDate = new Date(year, month - 1, day, hour, min);
    
    // What is the offset of `tz` at `guessDate`?
    const tzStr = guessDate.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
    // tzStr will contain something like "GMT-4" or "GMT-7" or "GMT"
    const offsetMatch = tzStr.match(/GMT([+-]\d+)(?::(\d+))?/);
    
    let offsetMinutes = 0;
    if (offsetMatch) {
      const hrs = parseInt(offsetMatch[1], 10);
      const mins = offsetMatch[2] ? parseInt(offsetMatch[2], 10) : 0;
      offsetMinutes = hrs * 60 + (hrs < 0 ? -mins : mins);
    }
    
    // Now we can construct the precise ISO string
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const absOffsetMinutes = Math.abs(offsetMinutes);
    const offsetStr = `${offsetSign}${String(Math.floor(absOffsetMinutes / 60)).padStart(2, '0')}:${String(absOffsetMinutes % 60).padStart(2, '0')}`;
    
    const isoString = `${year}-${month}-${day}T${hour}:${min}:00${offsetStr}`;
    const finalAbsoluteTime = new Date(isoString).getTime();
    
    if (!isNaN(finalAbsoluteTime)) {
      setSyncedTime(finalAbsoluteTime);
    }
  };

  // Helper to calculate hour offset from user's local timezone
  const getRelativeOffset = (tz) => {
    const localNow = new Date();
    
    const localParts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZoneName: 'shortOffset' }).formatToParts(localNow);
    const targetParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23', timeZoneName: 'shortOffset' }).formatToParts(localNow);
    
    const parseOffset = (parts) => {
      const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
      const match = tzPart.match(/GMT([+-]\d+)?(?::(\d+))?/);
      if (!match || !match[1]) return 0; // GMT
      return parseInt(match[1], 10);
    };
    
    const localOffset = parseOffset(localParts);
    const targetOffset = parseOffset(targetParts);
    
    const diff = targetOffset - localOffset;
    if (diff === 0) return 'Same as local';
    return diff > 0 ? `+${diff} hr` : `${diff} hr`;
  };

  return (
    <div className="tool-page animate-fade-in">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <div className="tool-icon-wrapper">
            <ClockIcon className="tool-icon" />
          </div>
          <h1 style={{ margin: 0 }}>Timezone Converter</h1>
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Synchronized multi-window USA timezone translation.</p>
      </header>

      {/* Live Clocks Banner */}
      <section className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="live-dot" style={{ width: '10px', height: '10px', backgroundColor: 'var(--danger-color)', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px var(--danger-color)' }}></span>
          Live Time
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {TIMEZONES.map(zone => (
            <div key={zone.id} style={{ flex: '1 1 min(150px, 100%)', backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--accent-color)' }}>{zone.abbr}</div>
              <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', marginBottom: '0.25rem' }}>
                {formatLiveTime(now, zone.tz)}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {formatLiveDate(now, zone.tz)}
              </div>
              <div style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', display: 'inline-block' }}>
                {getRelativeOffset(zone.tz)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Synchronized Converter Grid */}
      <section>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowPathIcon style={{ width: 24, height: 24, color: 'var(--accent-color)' }} />
          Synchronized Converter
        </h3>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          Change the time in any timezone box below, and all other timezones will instantly update to match it.
        </p>
        
        <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {TIMEZONES.map(zone => (
            <div key={zone.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontWeight: 'bold' }}>
                <span>{zone.name}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{zone.abbr}</span>
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={toInputString(syncedTime, zone.tz)}
                onChange={(e) => handleTimeChange(zone.tz, e.target.value)}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '1rem', padding: '1rem' }}
              />
            </div>
          ))}
        </div>
      </section>
      
    </div>
  );
}
