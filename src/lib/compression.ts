import imageCompression from 'browser-image-compression';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

let ffmpeg: FFmpeg | null = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export async function compressVideo(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<File> {
  // Bypass video compression in this environment as ffmpeg.wasm often hangs
  // without SharedArrayBuffer support (which is restricted in iframes).
  return file;
}
