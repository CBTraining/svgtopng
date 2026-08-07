import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          for (let r of regs) r.unregister();
        });
      }
      if (window.caches) {
        caches.keys().then(keys => {
          for (let k of keys) caches.delete(k);
        });
      }
    } catch (e) {}
    window.location.href = window.location.origin + window.location.pathname + '?reset=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: '#0a0a0a', color: '#f43f5e', zIndex: 999999, 
          padding: '2rem', overflow: 'auto', fontFamily: 'sans-serif',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid #f43f5e', padding: '2rem', borderRadius: '12px', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <h2 style={{ color: '#ffffff', marginTop: 0 }}>Application Notice</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
              An error or stale Service Worker cache issue was detected in {this.props.name || 'Component'}.
            </p>
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', textAlign: 'left', background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '6px', fontSize: '0.8rem', color: '#fda4af' }}>
              <summary style={{ cursor: 'pointer', color: '#ffffff', fontWeight: 'bold' }}>View Technical Error Log</summary>
              <div style={{ marginTop: '0.5rem' }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </div>
            </details>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button 
                onClick={this.handleReset}
                style={{ background: '#3b82f6', color: '#ffffff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Reset Cache & Reload App
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: null })} 
                style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}
              >
                Dismiss & Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
