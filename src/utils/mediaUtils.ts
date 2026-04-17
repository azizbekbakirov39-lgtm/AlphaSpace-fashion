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
  try {
    // Ensure video is muted for autoplay compliance
    if (video.autoplay && !video.muted) {
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

export const getProxiedUrl = (url: string): string => {
  // Proxy serverlar Instagram tomonidan bloklanayotgani uchun (403 Forbidden),
  // rasmlarni ham xuddi videolar kabi to'g'ridan-to'g'ri qaytaramiz.
  // HTML dagi referrerPolicy="no-referrer" qoidasi CORS ni chetlab o'tishga yordam beradi.
  return url;
};
