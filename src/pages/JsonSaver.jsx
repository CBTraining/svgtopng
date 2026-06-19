import { useState, useEffect } from 'react';
import { CodeBracketSquareIcon as FileJson, ArrowDownTrayIcon as Download, CheckIcon as Check, ExclamationCircleIcon as AlertCircle } from '@heroicons/react/24/solid';

export default function JsonSaver() {
  const [jsonText, setJsonText] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleFormat = () => {
    try {
      if (!jsonText.trim()) return;
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSave = () => {
    try {
      if (!jsonText.trim()) return;
      JSON.parse(jsonText); // Validate before saving
      setError(null);
      
      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError('Cannot save invalid JSON: ' + e.message);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <FileJson />
        <h1>JSON File Saver</h1>
      </div>
      <p>Format, validate, and download your JSON data effortlessly.</p>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>JSON Content:</label>
          {error && <span style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><AlertCircle style={{width: "16px", height: "16px"}}/> {error}</span>}
          {success && <span style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><Check style={{width: "16px", height: "16px"}}/> Saved Successfully!</span>}
        </div>
        
        <textarea 
          className="input-field" 
          style={{ minHeight: '400px', fontFamily: 'monospace', resize: 'vertical' }}
          value={jsonText}
          onChange={(e) => {setJsonText(e.target.value); setError(null);}}
          placeholder='{"key": "value"}'
          spellCheck="false"
        />

        <div className="button-group">
          <button className="btn" onClick={handleFormat}>
            Format JSON
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Download style={{width: "18px", height: "18px"}} /> Download .json
          </button>
        </div>
      </div>
    </div>
  );
}
