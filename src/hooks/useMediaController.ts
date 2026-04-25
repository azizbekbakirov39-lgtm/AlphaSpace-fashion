import { useState, useRef, useEffect, useCallback } from 'react';
import { getProxiedUrl, getNextProxyIndex, isLastProxy, refreshMediaUrl, markUrlAsSuccessful, safePlayVideo, isVideoUrl } from '../utils/mediaUtils';
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
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const proxiedUrl = getProxiedUrl(currentUrl, proxyIndex);

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const handleMediaSuccess = useCallback((mediaElement: HTMLVideoElement | HTMLImageElement | null) => {
    clearLoadingTimeout();
    setIsLoading(false);
    setHasError(false);
    if (mediaElement?.src) {
      markUrlAsSuccessful(currentUrl, mediaElement.src);
    }
  }, [currentUrl, clearLoadingTimeout]);

  const handleMediaError = useCallback(async (mediaElement: HTMLVideoElement | null) => {
    clearLoadingTimeout();
    
    // For videos, since we don't really have many working proxies besides direct and maybe corsproxy,
    // we should trigger refresh logic faster if it's an Instagram URL
    const isVideo = isVideoUrl(currentUrl) || currentUrl.includes('.mp4');
    const shouldJumpToRefresh = isVideo && proxyIndex >= 1;

    if (!isLastProxy(proxyIndex) && !shouldJumpToRefresh) {
      setProxyIndex(prev => getNextProxyIndex(prev));
      setIsLoading(true);
      if (mediaElement) {
        mediaElement.load();
        if (isActive) safePlayVideo(mediaElement);
      }
    } else if (post.instagramUrl && !triedRefresh.current) {
      triedRefresh.current = true;
      setIsLoading(true);
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
  }, [proxyIndex, post, mediaIndex, isActive, currentUrl, clearLoadingTimeout]);

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

  // Set timeout whenever trying to load
  useEffect(() => {
    if (isLoading && !hasError && isActive) {
      clearLoadingTimeout();
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn("Media loading timeout reached for:", currentUrl);
        // We only trigger error if we're still loading
        if (isLoading) {
          handleMediaError(null);
        }
      }, 12000); // 12 second timeout for video loading
    }
    return () => clearLoadingTimeout();
  }, [isLoading, hasError, isActive, currentUrl, handleMediaError, clearLoadingTimeout]);

  // Sync state if initialUrl changes completely 
  useEffect(() => {
    setCurrentUrl(initialUrl);
    setProxyIndex(0);
    setHasError(false);
    setIsLoading(true);
    triedRefresh.current = false;
    clearLoadingTimeout();
  }, [initialUrl, clearLoadingTimeout]);

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
