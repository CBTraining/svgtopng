import { useState, useEffect, useRef } from 'react';
import { PlayIcon, PauseIcon, StopIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/solid';

const ALARMS_KEY = 'webtools-alarms';

export default function Alarms() {
  const [alarms, setAlarms] = useState([]);
  const [newMin, setNewMin] = useState(5);
  const audioCtxRef = useRef(null);

  // Initialization
  useEffect(() => {
    const saved = localStorage.getItem(ALARMS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Reset running state on load so they don't unexpectedly continue from hours ago
        const safe = parsed.map(a => ({ ...a, isRunning: false }));
        setAlarms(safe);
      } catch (e) {
        setAlarms(getDefaultAlarms());
      }
    } else {
      setAlarms(getDefaultAlarms());
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (alarms.length > 0) {
      localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
    }
  }, [alarms]);

  // Tick logic
  useEffect(() => {
    const interval = setInterval(() => {
      setAlarms(current => {
        let dirty = false;
        const updated = current.map(alarm => {
          if (alarm.isRunning && alarm.remainingSeconds > 0) {
            dirty = true;
            const next = alarm.remainingSeconds - 1;
            if (next === 0) {
              playBeep();
              return { ...alarm, remainingSeconds: 0, isRunning: false };
            }
            return { ...alarm, remainingSeconds: next };
          }
          return alarm;
        });
        return dirty ? updated : current;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getDefaultAlarms = () => [
    { id: '30m', title: '30 Min', totalSeconds: 30 * 60, remainingSeconds: 30 * 60, isRunning: false },
    { id: '60m', title: '1 Hour', totalSeconds: 60 * 60, remainingSeconds: 60 * 60, isRunning: false }
  ];

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playBeep = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    
    // Play 3 beeps
    for (let i = 0; i < 3; i++) {
      const time = ctx.currentTime + (i * 0.5);
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, time);
      
      // Gentle envelope
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.5, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.4);
    }
  };

  const addAlarm = () => {
    if (!newMin || newMin <= 0) return;
    const sec = newMin * 60;
    const newAlarm = {
      id: Math.random().toString(36).substr(2, 9),
      title: `${newMin} Min`,
      totalSeconds: sec,
      remainingSeconds: sec,
      isRunning: false
    };
    setAlarms([...alarms, newAlarm]);
  };

  const deleteAlarm = (id) => {
    setAlarms(alarms.filter(a => a.id !== id));
  };

  const toggleAlarm = (id) => {
    initAudio(); // Required to unlock audio context on user interaction
    setAlarms(alarms.map(a => {
      if (a.id === id) {
        if (a.remainingSeconds === 0) {
          return { ...a, remainingSeconds: a.totalSeconds, isRunning: true };
        }
        return { ...a, isRunning: !a.isRunning };
      }
      return a;
    }));
  };

  const stopAlarm = (id) => {
    setAlarms(alarms.map(a => {
      if (a.id === id) {
        return { ...a, remainingSeconds: a.totalSeconds, isRunning: false };
      }
      return a;
    }));
  };

  const formatTime = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // calculate progress 0-100
  const getProgress = (alarm) => {
    if (alarm.totalSeconds === 0) return 0;
    return 100 - ((alarm.remainingSeconds / alarm.totalSeconds) * 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
        <ClockIcon width={20} />
        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Timers</h4>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input 
          type="number" 
          value={newMin} 
          onChange={(e) => setNewMin(parseInt(e.target.value))} 
          style={{ width: '80px', padding: '0.4rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} 
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>min</span>
        <button onClick={addAlarm} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginLeft: 'auto' }}>Add Timer</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        {alarms.map(alarm => (
          <div key={alarm.id} style={{ position: 'relative', background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', padding: '0.5rem 0.75rem', overflow: 'hidden' }}>
            
            {/* Progress Bar background */}
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${getProgress(alarm)}%`, background: alarm.remainingSeconds === 0 ? 'var(--accent-transparent)' : 'rgba(255, 255, 255, 0.05)', transition: 'width 1s linear', zIndex: 1 }} />
            
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{alarm.title}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: alarm.remainingSeconds === 0 ? 'var(--accent-color)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(alarm.remainingSeconds)}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  onClick={() => toggleAlarm(alarm.id)} 
                  style={{ background: 'transparent', border: 'none', color: alarm.isRunning ? 'var(--text-secondary)' : 'var(--accent-color)', cursor: 'pointer', padding: '4px' }}
                  title={alarm.isRunning ? "Pause" : "Start"}
                >
                  {alarm.isRunning ? <PauseIcon width={20} /> : <PlayIcon width={20} />}
                </button>
                <button 
                  onClick={() => stopAlarm(alarm.id)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                  title="Reset"
                >
                  <StopIcon width={20} />
                </button>
                <button 
                  onClick={() => deleteAlarm(alarm.id)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '4px', marginLeft: '4px' }}
                  title="Delete"
                >
                  <TrashIcon width={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {alarms.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No timers.</div>
        )}
      </div>
    </div>
  );
}
