import { useState, useRef, useEffect, useCallback } from 'react';
import { getProxiedUrl, getNextProxyIndex, isLastProxy, markUrlAsSuccessful, safePlayVideo } from '../utils/mediaUtils';
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

  // Sync state if initialUrl changes completely 
  useEffect(() => {
    setCurrentUrl(initialUrl);
    setProxyIndex(0);
    setHasError(false);
    setIsLoading(true);
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
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }, [proxyIndex, isActive]);

  const handleRetry = useCallback((mediaElement: HTMLVideoElement | null) => {
    setHasError(false);
    setIsLoading(true);
    setProxyIndex(0);
    
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
