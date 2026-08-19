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

export async function extractDroppedFiles(e) {
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    return Array.from(e.dataTransfer.files);
  }

  // Handle Google Chat / Slack / Browser Tab Image Drag & Drop
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
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const filename = `image-${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
      return [new File([blob], filename, { type: blob.type || 'image/png' })];
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
