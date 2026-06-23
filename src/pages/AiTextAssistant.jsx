import React, { useState, useEffect, useRef } from 'react';
import { ClipboardDocumentCheckIcon, DocumentTextIcon, CheckBadgeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { playDing } from '../utils/audio';
import aiTextWorkerUrl from '../workers/aiTextWorker.js?worker&url';

export default function AiTextAssistant() {
  const [activeTab, setActiveTab] = useState('summarize');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressLog, setProgressLog] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [modelStatus, setModelStatus] = useState({ summarize: 'unloaded', grammar: 'unloaded' });
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(aiTextWorkerUrl, { type: 'module' });

    workerRef.current.onmessage = (e) => {
      const { status, log, progressData, result, error, type } = e.data;

      if (status === 'init') {
        setProgressLog(log);
      } else if (status === 'progress') {
        if (progressData.status === 'downloading') {
          setProgressLog(`Downloading AI model: ${progressData.name} - ${progressData.file}`);
        } else if (progressData.status === 'progress') {
          setDownloadProgress(Math.round(progressData.progress));
        } else if (progressData.status === 'done') {
          setDownloadProgress(100);
          setProgressLog(`Finished loading ${progressData.file}`);
        }
      } else if (status === 'ready') {
        setModelStatus(prev => ({ ...prev, [type]: 'ready' }));
        setIsProcessing(false);
        setProgressLog('');
        setDownloadProgress(0);
        playDing();
      } else if (status === 'processing') {
        setProgressLog(log);
        setDownloadProgress(0);
      } else if (status === 'success') {
        setOutputText(result);
        setIsProcessing(false);
        setProgressLog('');
        setDownloadProgress(0);
        playDing();
      } else if (status === 'error') {
        setErrorMsg(error);
        setIsProcessing(false);
        setProgressLog('');
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const handleLoadModel = () => {
    setErrorMsg('');
    setIsProcessing(true);
    setProgressLog('Starting download...');
    setDownloadProgress(0);
    workerRef.current.postMessage({
      jobId: Date.now(),
      action: 'load',
      type: activeTab
    });
  };

  const handleProcess = () => {
    if (!inputText.trim()) {
      setErrorMsg("Please enter some text first.");
      return;
    }
    setErrorMsg('');
    setOutputText('');
    setIsProcessing(true);
    setProgressLog('Starting task...');
    
    workerRef.current.postMessage({
      jobId: Date.now(),
      action: 'generate',
      type: activeTab,
      text: inputText,
      options: {
         maxLength: 150,
         minLength: 30
      }
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      alert("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>AI Text Assistant</h1>
      </div>
      <p>Fully local, offline AI for summarizing long text and correcting grammar.</p>

      {errorMsg && (
        <div className="glass-panel" style={{ backgroundColor: 'var(--danger-color)', color: 'white', marginBottom: '1rem', padding: '1rem', borderRadius: '8px' }}>
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'summarize' ? 'primary' : ''}`}
          onClick={() => { setActiveTab('summarize'); setOutputText(''); setErrorMsg(''); }}
          style={activeTab !== 'summarize' ? { background: 'var(--bg-tertiary)' } : {}}
        >
          <DocumentTextIcon style={{ width: 18, height: 18, marginRight: 8 }} />
          Summarizer
        </button>
        <button 
          className={`btn ${activeTab === 'grammar' ? 'primary' : ''}`}
          onClick={() => { setActiveTab('grammar'); setOutputText(''); setErrorMsg(''); }}
          style={activeTab !== 'grammar' ? { background: 'var(--bg-tertiary)' } : {}}
        >
          <CheckBadgeIcon style={{ width: 18, height: 18, marginRight: 8 }} />
          Grammar Fixer
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Input Pane */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3>{activeTab === 'summarize' ? 'Original Text' : 'Text to Fix'}</h3>
          <textarea
            className="text-input"
            style={{ flex: 1, minHeight: '300px', resize: 'vertical', marginTop: '1rem', padding: '1rem', fontSize: '1rem' }}
            placeholder={activeTab === 'summarize' ? "Paste a long article or document here..." : "Type or paste your drafted text here..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {modelStatus[activeTab] === 'unloaded' ? (
            <button 
              className="btn" 
              style={{ marginTop: '1rem', alignSelf: 'flex-start', background: 'var(--primary-color)', color: 'white' }}
              onClick={handleLoadModel}
              disabled={isProcessing}
            >
              <ArrowDownTrayIcon style={{ width: 18, height: 18, marginRight: 8 }} />
              {isProcessing ? 'Downloading...' : 'Download AI Model (~240MB)'}
            </button>
          ) : (
            <button 
              className="btn primary" 
              style={{ marginTop: '1rem', alignSelf: 'flex-start' }}
              onClick={handleProcess}
              disabled={isProcessing || !inputText.trim()}
            >
              <SparklesIcon style={{ width: 18, height: 18, marginRight: 8 }} />
              {isProcessing ? 'Processing...' : (activeTab === 'summarize' ? 'Generate Summary' : 'Fix Grammar')}
            </button>
          )}
        </div>

        {/* Output Pane */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Result</h3>
            {outputText && (
              <button className="btn" onClick={copyToClipboard} style={{ background: 'var(--bg-tertiary)', padding: '0.4rem 0.8rem' }}>
                <ClipboardDocumentCheckIcon style={{ width: 16, height: 16, marginRight: 6 }} />
                Copy
              </button>
            )}
          </div>

          <div 
            style={{ 
              flex: 1, 
              minHeight: '300px', 
              marginTop: '1rem', 
              background: 'var(--bg-primary)', 
              borderRadius: 'var(--border-radius)', 
              padding: '1rem',
              color: outputText ? 'var(--text-primary)' : 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              overflowY: 'auto'
            }}
          >
            {outputText || "AI output will appear here..."}
          </div>

          {/* Progress Overlay */}
          {isProcessing && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(var(--bg-secondary-rgb), 0.8)',
              backdropFilter: 'blur(4px)',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '2rem', textAlign: 'center'
            }}>
              <div className="spinner" style={{ marginBottom: '1rem' }}></div>
              <p style={{ fontWeight: 'bold' }}>{progressLog}</p>
              {downloadProgress > 0 && downloadProgress < 100 && (
                <div className="progress-bar-bg" style={{ width: '80%', marginTop: '1rem' }}>
                  <div className="progress-bar-fill" style={{ width: `${downloadProgress}%` }}></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
