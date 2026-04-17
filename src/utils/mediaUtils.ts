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
    } catch (error) {
      console.error('Error sharing:', error);
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
  if (lowerUrl.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp|flv|wmv)($|\?|&)/)) {
    return true;
  }
  
  // Common video hosting patterns
  if (
    lowerUrl.includes('video') || 
    lowerUrl.includes('reel') || 
    lowerUrl.includes('clip') ||
    lowerUrl.includes('stream') ||
    lowerUrl.includes('blob') ||
    lowerUrl.includes('upload')
  ) {
    // Ensure it's not an image with these keywords in URL
    const isLikelyImage = lowerUrl.match(/\.(jpg|jpeg|png|webp|gif|heic|bmp|tiff)($|\?|&)/);
    if (isLikelyImage) return false;
    return true;
  }
  
  return false;
};

// Instagram vaqtinchalik havolalarini yangilash uchun xizmat
const RAPIDAPI_KEY = (import.meta as any).env.VITE_RAPIDAPI_KEY;

export const refreshMediaUrl = async (instagramUrl: string): Promise<string | null> => {
  if (!instagramUrl || !RAPIDAPI_KEY) return null;
  
  try {
    const shortcodeMatch = instagramUrl.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;
    if (!shortcode) return null;

    const response = await fetch(`https://instagram120.p.rapidapi.com/api/instagram/links`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rapidapi-host': 'instagram120.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY
      },
      body: JSON.stringify({ url: `https://www.instagram.com/p/${shortcode}/` })
    });

    if (!response.ok) return null;
    const result = await response.json();
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0].urls?.[0]?.url || result[0].pictureUrl || result[0].display_url;
    } else if (result.urls && Array.isArray(result.urls)) {
      return result.urls[0].url;
    } else if (result.pictureUrl || result.display_url || result.thumbnail_url) {
      return result.pictureUrl || result.display_url || result.thumbnail_url;
    }
    return null;
  } catch (error) {
    console.error("Link refresh error:", error);
    return null;
  }
};

export const getProxiedUrl = (url: string): string => {
  // Proxy serverlar Instagram tomonidan bloklanayotgani uchun (403 Forbidden),
  // rasmlarni ham xuddi videolar kabi to'g'ridan-to'g'ri qaytaramiz.
  // HTML dagi referrerPolicy="no-referrer" qoidasi CORS ni chetlab o'tishga yordam beradi.
  return url;
};
