import { safeJsonStringify } from './jsonUtils';

export const useShare = () => {
  const shareContent = async (title: string, text: string, url: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        });
      } else {
        // Fallback for browsers that don't support navigator.share
        await navigator.clipboard.writeText(url);
        alert('Havola nusxalandi');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && !error.message?.includes('canceled')) {
        console.error('Error sharing:', error);
      }
    }
  };

  return { shareContent };
};

export const safePlayVideo = async (video: HTMLVideoElement | null) => {
  if (!video) return;

  // Don't play if there's no source yet
  if (!video.src && !video.currentSrc && (!video.srcObject)) {
    return;
  }

  // If already playing or about to play, or has error, skip
  if (!video.paused || video.error) return;

  try {
    // Ensure video is muted for autoplay compliance if it's meant to be silent
    // Note: most of our use cases are for silent autoplay or background videos
    if (video.hasAttribute('autoplay') || video.dataset.autoplay === 'true') {
      video.muted = true;
    }
    
    const playPromise = video.play();
    if (playPromise !== undefined) {
      await playPromise;
    }
  } catch (error) {
    // Silently handle autoplay prevention or other common playback issues
    // We don't log "Autoplay prevented" to avoid polluting console as requested
  }
};

export const isMediaUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Fix double protocol
  url = url.replace(/^https?:\/\/https?:\/\//, 'https://');
  
  const lowerUrl = url.toLowerCase();
  
  // Typical media extensions
  if (lowerUrl.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp|flv|wmv|m3u8|mp3|wav|ogg|m4a|aac)($|\?|&)/)) {
    return true;
  }
  
  // Common media patterns
  if (
    lowerUrl.includes('video') || 
    lowerUrl.includes('reel') || 
    lowerUrl.includes('clip') ||
    lowerUrl.includes('blob') ||
    lowerUrl.includes('upload') ||
    lowerUrl.includes('audio') ||
    lowerUrl.includes('voice')
  ) {
    // Ensure it's not an image 
    const isLikelyImage = lowerUrl.match(/\.(jpg|jpeg|png|webp|gif|heic|bmp|tiff)($|\?|&)/);
    if (isLikelyImage) return false;
    return true;
  }
  
  return false;
};

export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp|flv|wmv|m3u8)($|\?|&)/)) return true;
  if (lowerUrl.includes('video') || lowerUrl.includes('reel') || lowerUrl.includes('clip')) return true;
  return false;
};

// Key used for local caching of successful proxy URLs
const URL_CACHE_KEY = 'media_url_cache';

// Simple in-memory and localStorage cache
const getCache = (): Record<string, string> => {
  try {
    const cached = localStorage.getItem(URL_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const setCache = (originalUrl: string, proxiedUrl: string) => {
  try {
    const cache = getCache();
    cache[originalUrl] = proxiedUrl;
    // Limit cache size
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      delete cache[keys[0]];
    }
    localStorage.setItem(URL_CACHE_KEY, safeJsonStringify(cache));
  } catch (e) {
    console.error('Cache write error:', e);
  }
};

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // If we are on one of our known ais-dev or ais-pre domains, use relative paths
    if (window.location.hostname.includes('asia-east1.run.app')) {
      return '';
    }
    
    if (window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Return backend deployed URL when running natively via Capacitor or local dev
      // Use the pre-production URL which matches the user's metadata
      return 'https://ais-pre-36ab24ncun33qp6nccdmm4-294424582679.asia-east1.run.app';
    }
  }
  return '';
};

// Available robust proxies
const PROXY_POOL = [
  (url: string) => url, // Direct (often works with no-referrer)
  (url: string) => `https://wsrv.nl/?url=${encodeURIComponent(url)}`, // WeServ
  (url: string) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}`, // Variant of WeServ
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, // AllOrigins
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`, // CorsProxy.io
  (url: string) => `https://proxy.cors.sh/${url}`, // Proxy.cors.sh (fallback)
  (url: string) => `${getApiBaseUrl()}/api/proxy-video?url=${encodeURIComponent(url)}`, // Internal fallback
];

export const getProxiedUrl = (url: string, proxyIndex: number = 0): string => {
  if (!url) return url;

  const isNative = typeof window !== 'undefined' && 
    (window.location.protocol === 'capacitor:' || 
     window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1');

  // APK (Capacitor) da videoni backend proxy orqali o'tkazish
  const isMedia = isMediaUrl(url);
  
  if (isNative && isMedia) {
    return `${getApiBaseUrl()}/api/proxy-video?url=${encodeURIComponent(url)}`;
  }
  
  // Fix double protocol from malformed database strings
  url = url.replace(/^https?:\/\/https?:\/\//, 'https://');

  // Try hit cache first if index 0
  if (proxyIndex === 0) {
    const cache = getCache();
    if (cache[url]) return cache[url];
  }

  // By default, try to load R2/S3 URLs directly if they are on a public domain.
  // Private endpoints (like r2.cloudflarestorage.com) MUST be proxied due to missing SigV4 auth here.
  if (
    url.includes('r2.dev') || 
    url.includes('pub-') || 
    url.includes('r2.cloudflarestorage.com') || 
    url.includes('amazonaws.com') || 
    (import.meta.env.VITE_R2_PUBLIC_DOMAIN && url.includes(import.meta.env.VITE_R2_PUBLIC_DOMAIN))
  ) {
    // Always proxy private AWS/CF endpoint URLs
    if (url.includes('r2.cloudflarestorage.com') || url.includes('amazonaws.com')) {
      return `${getApiBaseUrl()}/api/proxy-video?url=${encodeURIComponent(url)}`;
    }
    
    if (proxyIndex === 0) {
      return url;
    }
    // Fallback to internal proxy if direct public access fails (e.g. CORS not configured on bucket)
    return `${getApiBaseUrl()}/api/proxy-video?url=${encodeURIComponent(url)}`;
  }

  // Directly return trusted URLs when proxyIndex is 0
  if (proxyIndex === 0 && url.includes('firebasestorage.googleapis.com')) {
    return url;
  }
  
  // Audio/Video specific proxy sequencing
  if (isMedia) {
    if (proxyIndex === 0) return url;
    if (proxyIndex === 1) return `${getApiBaseUrl()}/api/proxy-video?url=${encodeURIComponent(url)}`;
    return url; 
  }

  // Use specified proxy for images
  const safeIndex = proxyIndex % PROXY_POOL.length;
  return PROXY_POOL[safeIndex](url);
};

export const markUrlAsSuccessful = (originalUrl: string, proxiedUrl: string) => {
  setCache(originalUrl, proxiedUrl);
};

export const getNextProxyIndex = (currentIndex: number): number => {
  return currentIndex + 1;
};

export const isLastProxy = (index: number, url: string): boolean => {
  if (isVideoUrl(url) || url.includes('.mp4')) {
    // try up to internal fallback
    return index >= 1; 
  }
  // For images try all in pool
  return index >= PROXY_POOL.length - 1;
};

/**
 * Returns the best available thumbnail for a post.
 * Prefers explicitly defined thumbnailUrl, then the first image from mediaUrls.
 */
export const getPostThumbnailUrl = (post: { thumbnailUrl?: string, mediaUrls: string[] }): string => {
  let url = '';
  
  if (post.thumbnailUrl) {
    url = post.thumbnailUrl;
  } else if (post.mediaUrls && post.mediaUrls.length > 0) {
    // Find first true image URL if possible
    const firstImage = post.mediaUrls.find(u => !isVideoUrl(u));
    url = firstImage || post.mediaUrls[0];
  }
  
  if (url) {
    url = url.replace(/^https?:\/\/https?:\/\//, 'https://');
  }
  
  return url;
};
