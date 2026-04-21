import { useState, useRef, useEffect, useCallback } from 'react';
import { getProxiedUrl, getNextProxyIndex, isLastProxy, refreshMediaUrl, markUrlAsSuccessful, safePlayVideo } from '../utils/mediaUtils';
import { db, updateDoc, doc } from '../firebase';
import { PostData } from '../types';

interface UseMediaControllerProps {
  url: string;
  post: PostData;
  mediaIndex?: number; 
  isActive?: boolean;
}

export const useMediaController = ({ url: initialUrl, post, mediaIndex = 0, isActive = false }: UseMediaControllerProps) => {
  const [proxyIndex, setProxyIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const triedRefresh = useRef(false);

  // Sync state if initialUrl changes completely 
  useEffect(() => {
    setCurrentUrl(initialUrl);
    setProxyIndex(0);
    setHasError(false);
    setIsLoading(true);
    triedRefresh.current = false;
  }, [initialUrl]);

  const proxiedUrl = getProxiedUrl(currentUrl, proxyIndex);

  const handleMediaSuccess = useCallback((mediaElement: HTMLVideoElement | HTMLImageElement | null) => {
    setIsLoading(false);
    setHasError(false);
    if (mediaElement?.src) {
      markUrlAsSuccessful(currentUrl, mediaElement.src);
    }
  }, [currentUrl]);

  const handleMediaError = useCallback(async (mediaElement: HTMLVideoElement | null) => {
    if (!isLastProxy(proxyIndex)) {
      setProxyIndex(prev => getNextProxyIndex(prev));
      if (mediaElement) {
        mediaElement.load();
        if (isActive) safePlayVideo(mediaElement);
      }
    } else if (post.instagramUrl && !triedRefresh.current) {
      triedRefresh.current = true;
      const newUrl = await refreshMediaUrl(post.instagramUrl);
      
      if (newUrl) {
        // Update Firestore if we got a new URL
        const newMediaUrls = [...(post.mediaUrls || [])];
        newMediaUrls[mediaIndex] = newUrl;
        
        try {
          await updateDoc(doc(db, 'posts', post.id), { mediaUrls: newMediaUrls });
        } catch (err) {
          console.error("Firestore update failed during refresh:", err);
        }

        // Reset state with new url
        setCurrentUrl(newUrl);
        setProxyIndex(0);
        setHasError(false);
        triedRefresh.current = false; // allow retry on new url if needed
        
        if (mediaElement) {
          mediaElement.src = getProxiedUrl(newUrl, 0);
          mediaElement.load();
          if (isActive) safePlayVideo(mediaElement);
        }
      } else {
        setIsLoading(false);
        setHasError(true);
      }
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }, [proxyIndex, post, mediaIndex, isActive]);

  const handleRetry = useCallback((mediaElement: HTMLVideoElement | null) => {
    setHasError(false);
    setIsLoading(true);
    setProxyIndex(0);
    triedRefresh.current = false;
    
    if (mediaElement) {
      mediaElement.src = getProxiedUrl(currentUrl, 0);
      mediaElement.load();
      if (isActive) safePlayVideo(mediaElement);
    }
  }, [currentUrl, isActive]);

  return {
    proxiedUrl,
    isLoading,
    setIsLoading,
    hasError,
    handleMediaSuccess,
    handleMediaError,
    handleRetry
  };
};
