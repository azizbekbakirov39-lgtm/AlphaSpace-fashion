import { useState, useRef, useEffect, useCallback } from 'react';
import { getProxiedUrl, getNextProxyIndex, isLastProxy, markUrlAsSuccessful, safePlayVideo, isVideoUrl } from '../utils/mediaUtils';
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
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const proxiedUrl = getProxiedUrl(currentUrl, proxyIndex);

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const handleMediaError = useCallback(async (mediaElement: HTMLVideoElement | null) => {
    clearLoadingTimeout();
    
    // Try remaining proxies as last resort
    if (!isLastProxy(proxyIndex, currentUrl)) {
      setProxyIndex(prev => getNextProxyIndex(prev));
      setIsLoading(true);
      if (mediaElement) {
        mediaElement.load();
        if (isActive) safePlayVideo(mediaElement);
      }
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }, [proxyIndex, currentUrl, clearLoadingTimeout, isActive]);

  const handleMediaSuccess = useCallback((mediaElement: HTMLVideoElement | HTMLImageElement | null) => {
    // Basic validation that video actually has content
    if (mediaElement instanceof HTMLVideoElement) {
       if (mediaElement.readyState >= 2 && (mediaElement.videoWidth === 0 || mediaElement.videoHeight === 0)) {
         console.warn("Video success called but dimensions are 0. Treating as error.");
         handleMediaError(mediaElement);
         return;
       }
    }

    clearLoadingTimeout();
    setIsLoading(false);
    setHasError(false);
    if (mediaElement?.src) {
      markUrlAsSuccessful(currentUrl, mediaElement.src);
    }
  }, [currentUrl, clearLoadingTimeout, handleMediaError]);

  const handleRetry = useCallback((mediaElement: HTMLVideoElement | null) => {
    setHasError(false);
    setIsLoading(true);
    setProxyIndex(0);
    
    // We let React update the src state first, then load
    if (mediaElement) {
      setTimeout(() => {
        mediaElement.load();
        if (isActive) safePlayVideo(mediaElement);
      }, 50);
    }
  }, [isActive]);

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
