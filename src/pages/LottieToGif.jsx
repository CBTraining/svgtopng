import { useState, useRef, useEffect } from 'react';
import { ScissorsIcon as Scissors, CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download } from '@heroicons/react/24/solid';
import Dropzone from '../components/Dropzone';
import lottie from 'lottie-web';
import GIF from 'gif.js';
import { useProcessing } from '../contexts/ProcessingContext';

export default function LottieToGif() {
  const [lottieData, setLottieData] = useState(null);
  const containerRef = useRef(null);

  const { jobs, addJob, updateJob, removeJob } = useProcessing();
  const myJobId = 'lottie-to-gif';
  const myJob = jobs.find(j => j.id === myJobId);
  const isProcessing = myJob?.status === 'running';
  const resultUrl = myJob?.resultUrl;

  const handleConvert = async () => {
    if (!lottieData || isProcessing) return;
    
    addJob({ id: myJobId, title: 'Converting Lottie to GIF', type: 'lottie-to-gif' });

    // Create a temporary hidden container for canvas rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '300px';
    tempContainer.style.height = '300px';
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);

    const animItem = lottie.loadAnimation({
      container: tempContainer,
      renderer: 'canvas',
      loop: false,
      autoplay: false,
      animationData: lottieData,
    });

    await new Promise(resolve => animItem.addEventListener('DOMLoaded', resolve));

    const totalFrames = animItem.totalFrames;
    const frameRate = animItem.frameRate;
    const delay = 1000 / frameRate;

    const canvas = tempContainer.querySelector('canvas');
    
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: canvas.width,
      height: canvas.height,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
      transparent: 0x000000
    });

    gif.on('progress', p => {
      updateJob(myJobId, { progress: p * 100, log: `Rendering frame...` });
    });
    
    gif.on('finished', (blob) => {
      const rUrl = URL.createObjectURL(blob);
      updateJob(myJobId, { status: 'success', resultUrl: rUrl, downloadName: `lottie-${Date.now()}.gif` });
      animItem.destroy();
      document.body.removeChild(tempContainer);
    });

    for (let i = 0; i < totalFrames; i++) {
      animItem.goToAndStop(i, true);
      gif.addFrame(canvas, { copy: true, delay });
    }

    gif.render();
  };

  // Re-render preview if we return to the page
  useEffect(() => {
    if (lottieData && containerRef.current) {
      containerRef.current.innerHTML = '';
      lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: lottieData,
      });
    }
  }, [lottieData]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Scissors />
        <h1>Lottie to GIF</h1>
      </div>
      <p>Convert your JSON Lottie animations to high-quality GIFs.</p>

      <div className="grid-container">
        <div className="glass-panel controls">
          {!lottieData ? (
            <Dropzone 
              onDrop={(file) => {
                if (file && file.name.endsWith('.json')) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const json = JSON.parse(e.target.result);
                      setLottieData(json);
                      if (myJob) removeJob(myJobId);
                    } catch (err) {
                      alert("Invalid JSON file");
                    }
                  };
                  reader.readAsText(file);
                } else {
                  alert("Please upload a .json Lottie file");
                }
              }}
              accept=".json"
              title="Upload Lottie JSON"
              subtitle="Drag & drop or click to select"
              icon={<UploadCloud style={{width: 48, height: 48}}/>}
            />
          ) : (
            <div className="controls">
              <div className="glass-panel" style={{background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'center'}}>
                <div ref={containerRef} style={{ width: '200px', height: '200px' }}></div>
              </div>
              
              {!isProcessing && !resultUrl && (
                <button className="btn btn-primary" onClick={handleConvert} style={{marginTop: '1rem'}}>
                  Convert to GIF
                </button>
              )}
              
              {isProcessing && (
                <div style={{marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  Processing in background... You can safely navigate to other tools!
                </div>
              )}

              {resultUrl && (
                <div className="button-group" style={{justifyContent: 'center', marginTop: '1rem'}}>
                  <a className="btn btn-primary" href={resultUrl} download={`lottie-${Date.now()}.gif`}>
                    <Download style={{width: "18px", height: "18px"}} /> Download GIF
                  </a>
                  <button className="btn" onClick={() => {setLottieData(null); removeJob(myJobId);}}>
                    Convert Another
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
