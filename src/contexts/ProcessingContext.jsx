import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';

const ProcessingContext = createContext();

export function ProcessingProvider({ children }) {
  // Array of { id, title, type, progress, log, status: 'running'|'success'|'error', resultUrl, resultBlob, error, downloadName }
  const [jobs, setJobs] = useState([]); 
  const [isFfmpegLoaded, setIsFfmpegLoaded] = useState(false);
  const ffmpegRef = useRef(null);

  useEffect(() => {
    const loadFfmpeg = async () => {
      if (ffmpegRef.current) return;
      ffmpegRef.current = new FFmpeg();
      try {
        const baseURL = `${import.meta.env.BASE_URL}ffmpeg`;
        await ffmpegRef.current.load({
          coreURL: `${baseURL}/ffmpeg-core.js?v=2`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm?v=2`,
        });
        setIsFfmpegLoaded(true);
      } catch (err) {
        console.error("FFmpeg failed to load globally:", err);
      }
    };
    loadFfmpeg();
  }, []);

  const addJob = (job) => {
    setJobs((prev) => [...prev, { ...job, progress: 0, status: 'running', log: 'Starting...' }]);
  };

  const updateJob = (id, updates) => {
    setJobs((prev) => prev.map(job => job.id === id ? { ...job, ...updates } : job));
  };

  const removeJob = (id) => {
    setJobs((prev) => {
      const job = prev.find(j => j.id === id);
      if (job && job.resultUrl) {
        URL.revokeObjectURL(job.resultUrl);
      }
      return prev.filter(j => j.id !== id);
    });
  };

  return (
    <ProcessingContext.Provider value={{ jobs, addJob, updateJob, removeJob, ffmpeg: ffmpegRef.current, isFfmpegLoaded }}>
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  return useContext(ProcessingContext);
}
