import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Bookmark, Share2, ChevronLeft, ChevronRight, Send, Volume2, VolumeX, Store } from 'lucide-react';
import { PostData } from '../types';
import CommentDrawer from './CommentDrawer';
import ProductDetails from './ProductDetails';
import PostHeader from './PostHeader';
import PostInteractions from './PostInteractions';
import PostInfo from './PostInfo';

import { Language, translations } from '../translations';
import { isVideoUrl, getProxiedUrl, useShare, safePlayVideo, getNextProxyIndex, isLastProxy, markUrlAsSuccessful } from '../utils/mediaUtils';
import { db, updateDoc, doc } from '../firebase';
import { formatRelativeTime } from '../utils/timeUtils';
import { useMediaController } from '../hooks/useMediaController';

interface PostProps {
  post: PostData;
  isActive: boolean;
  isNext?: boolean;
  isUpcoming?: boolean;
  shouldLoad?: boolean;
  onToggleLike?: () => void;
  onToggleSave?: () => void;
  onOpenReels?: () => void;
  onOpenShopProfile?: (shopId: string) => void;
  onOpenDetails?: () => void;
  onOpenComments?: () => void;
  onOpenChat?: () => void;
  onSharePost?: () => void;
  onToggleSubscribe?: () => void;
  language: Language;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

const CarouselVideo: React.FC<{ url: string, isActive: boolean, isNext?: boolean, isUpcoming?: boolean, shouldLoad?: boolean, poster?: string, post: PostData, index: number, isGlobalPaused: boolean, isMuted: boolean }> = ({ url, isActive, isNext, isUpcoming, shouldLoad = true, poster, post, index, isGlobalPaused, isMuted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // Global audio unlocker for Carousel
  useEffect(() => {
    const unlock = () => {
      setIsAudioUnlocked(true);
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);
  
  const { proxiedUrl, handleMediaSuccess, handleMediaError } = useMediaController({
    url,
    post,
    mediaIndex: index,
    isActive: isActive && !isGlobalPaused
  });

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      if (isActive && !isGlobalPaused) {
        // Respect the isMuted prop
        video.muted = isMuted;
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Browser blocked autoplay with sound, fall back to muted
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, isGlobalPaused, isMuted, isAudioUnlocked]);

  // Aggressive cleanup to focus bandwidth on active video
  useEffect(() => {
    if (!shouldLoad && videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.load(); // Forces browser to drop connections immediately
      setIsPlaying(false);
    }
  }, [shouldLoad]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Instagram Trick: HD Poster behind the video */}
      {poster && !poster.includes('.mp4') && (
        <img 
          src={getProxiedUrl(poster, 0)}
          alt="Video Thumbnail"
          className="absolute inset-0 w-full h-full object-cover z-0"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <video 
        ref={videoRef}
        src={shouldLoad ? proxiedUrl : undefined}
        className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-200 ease-out ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
        loop
        muted={isMuted}
        autoPlay={isActive && !isGlobalPaused}
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        preload={isActive ? "auto" : (isNext || isUpcoming ? "metadata" : "none")}
        crossOrigin="anonymous"
        onPlaying={() => setIsPlaying(true)}
        onWaiting={() => setIsPlaying(false)}
        onLoadedData={(e) => {
          setIsPlaying(true); // Trigger faster than onPlaying
          if (shouldLoad) {
            handleMediaSuccess(e.currentTarget);
            // Playback logic moved to useEffect for consistency
          }
        }}
        onError={(e) => handleMediaError(e.currentTarget)}
      />
    </div>
  );
};

const CarouselImage: React.FC<{ url: string, shouldLoad: boolean, outfitName: string, index: number }> = ({ url, shouldLoad, outfitName, index }) => {
  const [proxyIndex, setProxyIndex] = useState(0);
  const proxiedUrl = getProxiedUrl(url, proxyIndex);

  return (
    <img
      src={shouldLoad ? proxiedUrl : undefined}
      alt={`${outfitName} - ${index + 1}`}
      className="w-full h-full object-cover block"
      referrerPolicy="no-referrer"
      loading="lazy"
      onLoad={() => {
        if (shouldLoad) markUrlAsSuccessful(url, proxiedUrl);
      }}
      onError={(e) => {
        if (!isLastProxy(proxyIndex)) {
          setProxyIndex(prev => getNextProxyIndex(prev));
        } else {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.style.backgroundColor = '#171717';
            if (!parent.querySelector('.error-placeholder')) {
              const placeholder = document.createElement('div');
              placeholder.className = 'error-placeholder absolute inset-0 flex items-center justify-center text-white/20 text-[10px] font-black uppercase';
              placeholder.innerText = 'Rasm yuklanmadi';
              parent.appendChild(placeholder);
            }
          }
        }
      }}
    />
  );
};

const Post: React.FC<PostProps> = ({ 
  post, 
  isActive, 
  isNext = false,
  isUpcoming = false,
  onToggleLike, 
  onToggleSave, 
  onOpenReels, 
  onOpenShopProfile, 
  onOpenDetails,
  onOpenComments,
  onOpenChat,
  onSharePost,
  onToggleSubscribe,
  language,
  shouldLoad = true,
  isMuted = true,
  onToggleMute
}) => {
  const t = translations[language];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    isLongPressed.current = false;
    longPressTimeout.current = setTimeout(() => {
      setIsPaused(true);
      isLongPressed.current = true;
      if (videoRef.current) videoRef.current.pause();
    }, 500);
  };

  const handlePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    
    if (isPaused) {
      setIsPaused(false);
      if (videoRef.current && isActive) {
        safePlayVideo(videoRef.current);
      }
    }
  };
  const carouselRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef<number>(0);
  const lastClickTimestamp = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const touchStartTime = useRef<number>(0);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const isLongPressed = useRef(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // Global audio unlocker
  useEffect(() => {
    const unlock = () => {
      setIsAudioUnlocked(true);
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const { shareContent } = useShare();
  
  const { 
    proxiedUrl, 
    isLoading: videoLoading, 
    hasError: videoError, 
    handleMediaSuccess, 
    handleMediaError, 
    handleRetry 
  } = useMediaController({
    url: post.mediaUrls?.[0] || '',
    post,
    mediaIndex: 0,
    isActive: isActive && !isPaused
  });

  const handleMediaClick = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastClickTimestamp.current < 100) return;
    lastClickTimestamp.current = now;

    if (isLongPressed.current) {
      isLongPressed.current = false;
      return;
    }

    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      if (onToggleLike) {
        if (!post.isLiked) {
          onToggleLike();
        }
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
      }
    } else {
      // Single tap - wait for potential second tap
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      tapTimeout.current = setTimeout(() => {
        if (onOpenReels) onOpenReels();
      }, DOUBLE_TAP_DELAY);
    }
    lastTap.current = now;
  };

  const handleShopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenShopProfile) {
      onOpenShopProfile(post.seller.id);
    }
  };

  const handleTouchStartCustom = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchStartTime.current = Date.now();
    handlePressStart(e);
    
    // "Wake up" audio on user interaction
    if (videoRef.current && isActive && !isMuted && !isPaused) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTouchMoveCustom = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }
      if (isPaused) {
        setIsPaused(false);
        isLongPressed.current = false;
        if (videoRef.current && isActive && shouldLoad) {
          safePlayVideo(videoRef.current);
        }
      }
    }
  };

  const handleTouchEndCustom = (e: React.TouchEvent) => {
    handlePressEnd(e);
    if (!touchStartPos.current) return;
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartPos.current.x);
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartPos.current.y);
    const duration = Date.now() - touchStartTime.current;
    
    // If movement is very small AND it was a quick touch AND we are not scrolling
    // and NOT a long press
    if (deltaX < 15 && deltaY < 15 && duration < 300 && !isScrolling.current && !isPaused) {
      // Don't trigger media click if touching a button
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      
      handleMediaClick(e);
    }
    touchStartPos.current = null;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
    }, 150);

    const scrollPos = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollPos / width);
      if (newIndex !== currentImageIndex) {
        setCurrentImageIndex(newIndex);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
    };
  }, []);

  // Handle active state changes for main video
  useEffect(() => {
    if (post.mediaType === 'video' && videoRef.current) {
      const video = videoRef.current;
      if (isActive && !isPaused) {
        // If audio is unlocked and we want sound, try unmuted
        // Otherwise, if first play, try unmuted but catch it
        video.muted = isMuted || !isActive;
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (error.name === 'NotAllowedError') {
              // Try muted play as fallback
              video.muted = true;
              video.play().catch(() => {});
            }
          });
        }
      } else {
        video.pause();
      }
    }
  }, [isActive, isPaused, isMuted, post.mediaType, isAudioUnlocked]);

  // Removed old manual video Loading/Error and useEffect cleanup for shouldLoad/isActive here
  // handled gracefully inside `useMediaController`

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (carouselRef.current && currentImageIndex < post.mediaUrls.length - 1) {
      const nextIndex = currentImageIndex + 1;
      carouselRef.current.scrollTo({
        left: nextIndex * carouselRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (carouselRef.current && currentImageIndex > 0) {
      const prevIndex = currentImageIndex - 1;
      carouselRef.current.scrollTo({
        left: prevIndex * carouselRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  // Removed handleDragEnd as we use native scroll

  const handleInternalShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSharePost) {
      onSharePost();
    }
  };

  const handleExternalShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: post.seller.name,
      text: post.outfitName,
      url: `${window.location.origin}?post=${post.id}`,
    };
    await shareContent(shareData.title, shareData.text, shareData.url);
  };

  return (
    <div className="w-full bg-bg-primary flex flex-col border-b border-border-primary/30 pb-2">
      {/* Top Header - Premium Shop Card Style */}
      <PostHeader
        post={post}
        language={language}
        onShopClick={handleShopClick}
        onToggleSubscribe={onToggleSubscribe}
      />

      <div 
        className="relative w-full aspect-[4/5] bg-neutral-900 flex items-center justify-center overflow-hidden touch-pan-y"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handleTouchStartCustom}
        onTouchMove={handleTouchMoveCustom}
        onTouchEnd={handleTouchEndCustom}
        onClick={handleMediaClick}
      >
      {/* Heart Animation on Double Tap */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -15 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1], rotate: [-15, 0, 0] }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4, ease: "backOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <Heart size={100} fill="#ef4444" className="text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]" />
          </motion.div>
        )}
      </AnimatePresence>

        {post.mediaType === 'video' ? (
          <div 
            className="w-full h-full cursor-pointer relative bg-black/10"
          >
            {/* Loading Indicator */}
            {videoLoading && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
                <div className="w-8 h-8 border-3 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Error Indicator */}
            {videoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 z-10 p-4 text-center">
                <VolumeX size={32} className="text-white/20 mb-2" />
                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">{language === 'uz' ? 'Video yuklanmadi' : 'Video not loaded'}</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetry(videoRef.current);
                  }}
                  className="mt-3 px-4 py-1.5 bg-white/10 rounded-full text-white text-[9px] font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
                >
                  Qayta yuklash
                </button>
              </div>
            )}

            {/* Instagram Trick: HD Poster behind the video */}
            {post.thumbnailUrl && (
              <img 
                src={getProxiedUrl(post.thumbnailUrl, 0)}
                alt="Video Thumbnail"
                className="absolute inset-0 w-full h-full object-cover z-0"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}

            <video
              ref={videoRef}
              src={shouldLoad ? proxiedUrl : undefined}
              className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-200 ease-out ${!videoLoading ? 'opacity-100' : 'opacity-0'}`}
              loop
              muted={isMuted || !isActive} // Force mute if not active to prevent sound overlap
              autoPlay={isActive && !isPaused}
              playsInline
              onContextMenu={(e) => e.preventDefault()}
              preload={isActive ? "auto" : (isNext || isUpcoming ? "metadata" : "none")}
              onLoadedData={(e) => {
                if (shouldLoad) {
                  handleMediaSuccess(e.currentTarget);
                  // Playback logic moved to useEffect for consistency
                }
              }}
              onError={(e) => handleMediaError(e.currentTarget)}
            />
            
            {/* Mute/Unmute Toggle */}
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleMute) onToggleMute();
              }}
              className="absolute bottom-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white z-10 hover:bg-black/60 transition-all active:scale-95 shadow-lg border border-white/10"
            >
              {isMuted ? <VolumeX size={18} strokeWidth={2.5} /> : <Volume2 size={18} strokeWidth={2.5} />}
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <div 
              ref={carouselRef}
              onScroll={handleScroll}
              className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x touch-pan-y"
              style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            >
              {post.mediaUrls?.map((url, idx) => {
                const isVideo = isVideoUrl(url);
                return (
                  <div 
                    key={idx} 
                    className="min-w-full h-full snap-center snap-always flex-shrink-0 bg-neutral-900 overflow-hidden relative"
                    style={{ scrollSnapStop: 'always' }}
                  >
                    {isVideo ? (
                      <div className="w-full h-full relative bg-black/10">
                        <CarouselVideo 
                          url={url} 
                          isActive={isActive && idx === currentImageIndex}
                          isNext={isActive && idx === currentImageIndex + 1}
                          isUpcoming={isActive && idx === currentImageIndex + 2}
                          shouldLoad={shouldLoad}
                          poster={post.thumbnailUrl || (idx === 0 ? url : undefined)}
                          post={post}
                          index={idx}
                          isGlobalPaused={isPaused}
                          isMuted={isMuted}
                        />
                      </div>
                    ) : (
                      <CarouselImage 
                        url={url} 
                        shouldLoad={shouldLoad} 
                        outfitName={post.outfitName} 
                        index={idx} 
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Carousel Controls */}
            {(post.mediaUrls?.length || 0) > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <button 
                    onClick={handlePrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white z-10"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {currentImageIndex < (post.mediaUrls?.length || 0) - 1 && (
                  <button 
                    onClick={handleNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white z-10"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
                
                {/* Carousel Dots Overlay */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {post.mediaUrls.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`rounded-full transition-all duration-300 shadow-sm ${idx === currentImageIndex ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Interaction Buttons - Below Media */}
      <PostInteractions
        post={post}
        onToggleLike={(e) => {
          e.stopPropagation();
          if (onToggleLike) onToggleLike();
        }}
        onOpenComments={(e) => {
          e.stopPropagation();
          if (onOpenComments) onOpenComments();
        }}
        onInternalShare={handleInternalShare}
        onExternalShare={handleExternalShare}
        onToggleSave={(e) => {
          e.stopPropagation();
          if (onToggleSave) onToggleSave();
        }}
        onOpenChat={(e) => {
          e.stopPropagation();
          if (onOpenChat) onOpenChat();
        }}
      />

      {/* Post Info */}
      <PostInfo
        post={post}
        language={language}
        isDescriptionExpanded={isDescriptionExpanded}
        setIsDescriptionExpanded={setIsDescriptionExpanded}
        onOpenChat={() => onOpenChat && onOpenChat()}
        onOpenDetails={() => onOpenDetails && onOpenDetails()}
      />
      {/* Comment Drawer and Product Details moved to global level in App.tsx */}
    </div>
  );
};

export default Post;
