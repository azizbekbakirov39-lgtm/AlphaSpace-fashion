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

export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  
  // Typical video extensions
  if (lowerUrl.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp|flv|wmv|m3u8)($|\?|&)/)) {
    return true;
  }
  
  // Common video hosting patterns
  if (
    lowerUrl.includes('video') || 
    lowerUrl.includes('reel') || 
    lowerUrl.includes('clip') ||
    lowerUrl.includes('stream') ||
    lowerUrl.includes('blob') ||
    lowerUrl.includes('upload') ||
    (lowerUrl.includes('fbcdn.net') && lowerUrl.includes('mp4')) || // Only if it also says mp4
    lowerUrl.includes('instagram.com/reels') ||
    lowerUrl.includes('instagram.com/reel')
  ) {
    // Ensure it's not an image with these keywords in URL
    const isLikelyImage = lowerUrl.match(/\.(jpg|jpeg|png|webp|gif|heic|bmp|tiff)($|\?|&)/);
    if (isLikelyImage) return false;
    return true;
  }
  
  return false;
};

// Instagram vaqtinchalik havolalarini yangilash uchun xizmat
export const refreshMediaUrl = async (instagramUrl: string): Promise<string | null> => {
  if (!instagramUrl) return null;
  
  try {
    const urlMatch = instagramUrl.match(/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    const type = urlMatch ? urlMatch[1] : 'p';
    const shortcode = urlMatch ? urlMatch[2] : null;
    if (!shortcode) return null;

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    const response = await fetch(`${API_BASE}/api/refresh-instagram-url`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ shortcode, type })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error body");
      // console.error(`API Error (${response.status}):`, errorText); // Silent for cleaner UX
      return null;
    }
    const result = await response.json();
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0].urls?.[0]?.url || result[0].pictureUrl || result[0].display_url;
    } else if (result.urls && Array.isArray(result.urls)) {
      return result.urls[0].url;
    } else if (result.pictureUrl || result.display_url || result.thumbnail_url) {
      return result.pictureUrl || result.display_url || result.thumbnail_url;
    }
    return null;
  } catch (error: any) {
    // console.error("Link refresh network error:", error.message, error); // Silent for cleaner UX
    return null;
  }
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
    localStorage.setItem(URL_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Cache write error:', e);
  }
};

// Available robust proxies
const PROXY_POOL = [
  (url: string) => url, // Direct (often works with no-referrer)
  (url: string) => `https://wsrv.nl/?url=${encodeURIComponent(url)}`, // WeServ
  (url: string) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}`, // Variant of WeServ
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, // AllOrigins
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`, // CorsProxy.io
  (url: string) => `https://proxy.cors.sh/${url}`, // Proxy.cors.sh (fallback)
  (url: string) => `/api/proxy-video?url=${encodeURIComponent(url)}`, // Internal fallback
];

export const getProxiedUrl = (url: string, proxyIndex: number = 0): string => {
  if (!url) return url;
  
  // Directly return trusted non-instagram URLs
  if (
    url.includes('firebasestorage.googleapis.com') || 
    url.includes('i.ibb.co') || 
    url.includes('r2.dev') || // Cloudflare R2 default domain
    url.includes('pub-') || // Cloudflare R2 public bucket prefix often starts with pub-
    url.includes(import.meta.env.VITE_R2_PUBLIC_DOMAIN || 'alpha-space-storage') ||
    url.includes('scontent') === false && !url.includes('instagram.com')
  ) {
    return url;
  }
  
  // Try hit cache first if index 0
  if (proxyIndex === 0) {
    const cache = getCache();
    if (cache[url]) return cache[url];
  }
  
  console.log('getProxiedUrl', { url, proxyIndex });

  const isVid = isVideoUrl(url) || url.includes('.mp4');

  // Video specific proxy sequencing
  if (isVid) {
    // 0: Direct, 1: Internal fallback, 2: CorsProxy, 3: Proxy.cors.sh, 4: AllOrigins, 5+: Direct
    if (proxyIndex === 0) return url;
    if (proxyIndex === 1) return PROXY_POOL[6](url); // internal proxy
    if (proxyIndex === 2) return PROXY_POOL[4](url); // corsproxy.io
    if (proxyIndex === 3) return PROXY_POOL[5](url); // proxy.cors.sh
    if (proxyIndex === 4) return PROXY_POOL[3](url); // allorigins
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
    return index >= 4; 
  }
  // For images try all in pool
  return index >= PROXY_POOL.length - 1;
};

/**
 * Returns the best available thumbnail for a post.
 * Prefers explicitly defined thumbnailUrl, then the first image from mediaUrls.
 */
export const getPostThumbnailUrl = (post: { thumbnailUrl?: string, mediaUrls: string[] }): string => {
  if (post.thumbnailUrl) return post.thumbnailUrl;
  
  if (post.mediaUrls && post.mediaUrls.length > 0) {
    // Find first true image URL if possible
    const firstImage = post.mediaUrls.find(url => !isVideoUrl(url));
    return firstImage || post.mediaUrls[0];
  }
  
  return '';
};
