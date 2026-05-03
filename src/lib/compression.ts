import imageCompression from 'browser-image-compression';

// Image compression options
const imageOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: false,
  initialQuality: 0.8,
};

export async function compressImage(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, imageOptions);
    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    return file; // Return original if fails
  }
}

export async function compressVideo(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<File> {
  // Bypass video compression in this environment as ffmpeg.wasm often hangs
  // without SharedArrayBuffer support (which is restricted in iframes).
  return file;
}
