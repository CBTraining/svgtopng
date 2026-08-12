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
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif', 'heic'].includes(ext);
}
