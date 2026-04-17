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

export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.mp4') || 
         lowerUrl.includes('.mov') || 
         lowerUrl.includes('.webm') ||
         (lowerUrl.includes('video') && !lowerUrl.includes('.jpg') && !lowerUrl.includes('.png') && !lowerUrl.includes('.webp') && !lowerUrl.includes('.heic'));
};

export const getProxiedUrl = (url: string): string => {
  // Proxy serverlar Instagram tomonidan bloklanayotgani uchun (403 Forbidden),
  // rasmlarni ham xuddi videolar kabi to'g'ridan-to'g'ri qaytaramiz.
  // HTML dagi referrerPolicy="no-referrer" qoidasi CORS ni chetlab o'tishga yordam beradi.
  return url;
};
