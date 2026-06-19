import React from 'react';
import { useProcessing } from '../contexts/ProcessingContext';
import { XMarkIcon, ArrowDownTrayIcon, PlayCircleIcon } from '@heroicons/react/24/solid';

export default function BackgroundJobsWidget() {
  const { jobs, removeJob } = useProcessing();

  if (jobs.length === 0) return null;

  const handleDownload = (job) => {
    if (job.resultUrl) {
      const a = document.createElement('a');
      a.href = job.resultUrl;
      a.download = job.downloadName || 'download';
      a.click();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '320px',
      maxHeight: '400px',
      overflowY: 'auto',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {jobs.map(job => (
        <div key={job.id} className="glass-panel animate-fade-in" style={{ padding: '15px', position: 'relative' }}>
          <button 
            onClick={() => removeJob(job.id)}
            style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
          
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem', paddingRight: '20px' }}>
            {job.title}
          </div>
          
          {job.status === 'running' && (
            <>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}></div>
              </div>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {job.log}
              </p>
            </>
          )}

          {job.status === 'error' && (
            <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: '5px' }}>
              Error: {job.error}
            </p>
          )}

          {job.status === 'success' && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-primary" onClick={() => handleDownload(job)} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
                <ArrowDownTrayIcon style={{ width: 14, height: 14, marginRight: '4px', display: 'inline' }} /> Download
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
