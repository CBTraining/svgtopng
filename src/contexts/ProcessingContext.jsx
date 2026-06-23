import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { get, set } from 'idb-keyval';

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

  const addJob = useCallback((job) => {
    setJobs((prev) => [...prev, { ...job, progress: 0, status: 'running', log: 'Starting...', startedAt: Date.now() }]);
  }, []);

  const updateJob = useCallback((id, updates) => {
    setJobs((prev) => prev.map(job => {
      if (job.id === id) {
        // Revoke old resultUrl if it's being replaced or cleared
        if ('resultUrl' in updates && job.resultUrl && updates.resultUrl !== job.resultUrl) {
          URL.revokeObjectURL(job.resultUrl);
        }
        return { ...job, ...updates };
      }
      return job;
    }));
  }, []);

  const createFfmpegInstance = async () => {
    const instance = new FFmpeg();
    try {
      const baseURL = `${import.meta.env.BASE_URL}ffmpeg`;
      await instance.load({
        coreURL: `${baseURL}/ffmpeg-core.js?v=2`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm?v=2`,
      });
      return instance;
    } catch (err) {
      console.error("FFmpeg failed to spawn:", err);
      throw err;
    }
  };

  const removeJob = useCallback((id) => {
    setJobs((prev) => {
      const job = prev.find(j => j.id === id);
      if (job && job.resultUrl) {
        URL.revokeObjectURL(job.resultUrl);
      }
      return prev.filter(j => j.id !== id);
    });
  }, []);

  const [workspaces, setWorkspaces] = useState({});
  const [isWorkspacesLoaded, setIsWorkspacesLoaded] = useState(false);

  useEffect(() => {
    get('webtools-workspaces').then(restored => {
      if (restored) {
        // Regenerate Blob URLs for Files since they expire on page reload
        for (const toolId in restored) {
          restored[toolId] = restored[toolId].map(slot => {
            let file = slot.imageFile || slot.videoFile || slot.lottieFile || slot.file;
            if (file && slot.previewUrl) {
               slot.previewUrl = URL.createObjectURL(file);
            }
            // Reset any running jobs to error since background processes can't be restored
            if (slot.isProbing) slot.isProbing = false;
            return slot;
          });
        }
        setWorkspaces(restored);
      }
      setIsWorkspacesLoaded(true);
    }).catch(err => {
      console.error("Failed to restore workspaces from IndexedDB:", err);
      setIsWorkspacesLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isWorkspacesLoaded) {
      set('webtools-workspaces', workspaces).catch(err => {
        console.error("Failed to save workspaces to IndexedDB:", err);
      });
    }
  }, [workspaces, isWorkspacesLoaded]);

  const addSlot = (toolId, slotData) => {
    setWorkspaces(prev => ({
      ...prev,
      [toolId]: [...(prev[toolId] || []), slotData]
    }));
  };

  const updateSlot = (toolId, slotId, updates) => {
    setWorkspaces(prev => ({
      ...prev,
      [toolId]: (prev[toolId] || []).map(slot => {
        if (slot.id === slotId) {
          // Revoke old previewUrl if it's being replaced or cleared
          if ('previewUrl' in updates && slot.previewUrl && updates.previewUrl !== slot.previewUrl) {
            URL.revokeObjectURL(slot.previewUrl);
          }
          return { ...slot, ...updates };
        }
        return slot;
      })
    }));
  };

  const removeSlot = (toolId, slotId) => {
    setWorkspaces(prev => {
      const toolSlots = prev[toolId] || [];
      const slot = toolSlots.find(s => s.id === slotId);
      if (slot && slot.previewUrl) {
        URL.revokeObjectURL(slot.previewUrl);
      }
      return {
        ...prev,
        [toolId]: toolSlots.filter(s => s.id !== slotId)
      };
    });
    // Optional: remove job if it was running for this slot
    removeJob(slotId);
  };

  return (
    <ProcessingContext.Provider value={{ 
      jobs, addJob, updateJob, removeJob, 
      ffmpeg: ffmpegRef.current, isFfmpegLoaded, createFfmpegInstance,
      workspaces, addSlot, updateSlot, removeSlot
    }}>
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  return useContext(ProcessingContext);
}
