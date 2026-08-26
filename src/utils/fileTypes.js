export function isVideoFile(file) {
  if (!file) return false;
  if (file.type && (file.type.startsWith('video/') || file.type.includes('quicktime'))) return true;
  const name = file.name || '';
  const ext = name.split('.').pop().toLowerCase();
  return ['mov', 'mp4', 'webm', 'mkv', 'avi', 'ogv', '3gp', 'm4v', 'flv', 'quicktime'].includes(ext);
}

export function isImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  const name = file.name || '';
  const ext = name.split('.').pop().toLowerCase();
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif', 'heic', 'tiff'].includes(ext);
}

export function getOriginalGoogleAssetUrl(url) {
  if (!url) return url;
  if (/googleusercontent\.com/i.test(url)) {
    if (/=[swh]\d+/i.test(url)) {
      return url.replace(/=[swh]\d+.*$/i, '=s0');
    }
    if (!url.includes('=')) {
      return `${url}=s0`;
    }
  }
  return url;
}

export async function extractDroppedFiles(e) {
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    return Array.from(e.dataTransfer.files);
  }

  // Handle Google Chat / Slack / Google Slides / Browser Tab Image Drag & Drop
  const html = e.dataTransfer.getData('text/html');
  let src = '';
  if (html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    if (img && img.src) src = img.src;
  }
  if (!src) {
    src = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
  }

  if (src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:'))) {
    const targetUrl = getOriginalGoogleAssetUrl(src);
    try {
      const resp = await fetch(targetUrl);
      if (!resp.ok) throw new Error("Fetch failed");
      const blob = await resp.blob();
      
      // Check magic bytes for GIF
      let isGif = blob.type === 'image/gif';
      if (!isGif && blob.size >= 6) {
        try {
          const buf = await blob.slice(0, 6).arrayBuffer();
          const head = new TextDecoder().decode(buf);
          if (head.startsWith('GIF8')) isGif = true;
        } catch {}
      }

      const ext = isGif ? 'gif' : (blob.type.split('/')[1] || 'png');
      const filename = `image-${Date.now()}.${ext}`;
      return [new File([blob], filename, { type: isGif ? 'image/gif' : (blob.type || 'image/png') })];
    } catch {
      // Fallback via Image object to handle CORS images
      const file = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => {
            if (b) {
              resolve(new File([b], `image-${Date.now()}.png`, { type: 'image/png' }));
            } else {
              resolve(null);
            }
          }, 'image/png');
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });
      if (file) return [file];
    }
  }

  return [];
}

export async function compressImageUnder20MB(file) {
  const MAX_BYTES = 20 * 1024 * 1024; // 20MB limit

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // 1. Try lossless PNG first (preserves transparency and pixel perfection)
      const pngCanvas = document.createElement('canvas');
      pngCanvas.width = width;
      pngCanvas.height = height;
      const pngCtx = pngCanvas.getContext('2d');
      pngCtx.drawImage(img, 0, 0, width, height);

      const getBlob = (canvas, type, quality) => {
        return new Promise((res) => {
          canvas.toBlob((b) => res(b), type, quality);
        });
      };

      const pngBlob = await getBlob(pngCanvas, 'image/png');
      const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : 'image';

      if (pngBlob && pngBlob.size <= MAX_BYTES) {
        const downloadName = `compressed-${baseName}.png`;
        const blobUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = downloadName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        resolve({
          format: 'PNG',
          sizeMB: (pngBlob.size / (1024 * 1024)).toFixed(2),
          originalSizeMB: (file.size / (1024 * 1024)).toFixed(2),
          width,
          height,
          downloadName
        });
        return;
      }

      // 2. PNG exceeds 20MB. Compress to JPEG to fit under 20MB while preserving 100% resolution!
      const jpegCanvas = document.createElement('canvas');
      jpegCanvas.width = width;
      jpegCanvas.height = height;
      const jCtx = jpegCanvas.getContext('2d');
      // Fill with white background to cleanly handle any transparent alpha channels
      jCtx.fillStyle = '#ffffff';
      jCtx.fillRect(0, 0, width, height);
      jCtx.drawImage(img, 0, 0, width, height);

      const qualitySteps = [0.96, 0.92, 0.88, 0.84, 0.80, 0.75, 0.70, 0.60, 0.50, 0.40, 0.30];
      let bestBlob = null;

      for (const q of qualitySteps) {
        const b = await getBlob(jpegCanvas, 'image/jpeg', q);
        if (b && b.size <= MAX_BYTES) {
          bestBlob = b;
          break;
        }
      }

      if (!bestBlob) {
        bestBlob = await getBlob(jpegCanvas, 'image/jpeg', 0.25);
      }

      if (bestBlob) {
        const downloadName = `compressed-${baseName}.jpg`;
        const blobUrl = URL.createObjectURL(bestBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = downloadName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        resolve({
          format: 'JPEG',
          sizeMB: (bestBlob.size / (1024 * 1024)).toFixed(2),
          originalSizeMB: (file.size / (1024 * 1024)).toFixed(2),
          width,
          height,
          downloadName
        });
      } else {
        reject(new Error("Unable to compress image below 20MB"));
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}
