import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Heart, MessageCircle, Share2, Bookmark, 
  Zap, Plus, Send, Volume2, VolumeX, Check,
  ShoppingBag
} from 'lucide-react';
import { PostData, User } from '../types';
import CommentDrawer from './CommentDrawer';
import ProductDetails from './ProductDetails';
import ReelRightActions from './ReelRightActions';
import ReelBottomInfo from './ReelBottomInfo';
import { Language } from '../translations';
import { useShare, isVideoUrl, getProxiedUrl, safePlayVideo, refreshMediaUrl, getNextProxyIndex, isLastProxy, markUrlAsSuccessful } from '../utils/mediaUtils';
import { useMediaController } from '../hooks/useMediaController';
import { formatRelativeTime } from '../utils/timeUtils';

interface ReelsViewerProps {
  posts: PostData[];
  initialIndex: number;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onToggleSubscribe: (sellerId: string) => void;
  onOpenShopProfile?: (shopId: string) => void;
  onOpenChat?: (sellerId: string, product?: PostData) => void;
  onSharePost?: (post: PostData) => void;
  language: Language;
  globalMuted: boolean;
  setGlobalMuted: (muted: boolean) => void;
  allPosts?: PostData[];
  user: User | null;
}

const ReelImage: React.FC<{ url: string, shouldLoad: boolean, outfitName: string }> = ({ url, shouldLoad, outfitName }) => {
  const [proxyIndex, setProxyIndex] = useState(0);
  const proxiedUrl = getProxiedUrl(url, proxyIndex);

  return (
    <img
      src={shouldLoad ? proxiedUrl : undefined}
      className="h-full w-full object-cover pointer-events-none"
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

const ReelItem: React.FC<{
  post: PostData;
  isActive: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onToggleSubscribe: () => void;
  onOpenShopProfile?: (shopId: string) => void;
  onOpenChat?: (sellerId: string, product?: PostData) => void;
  onSharePost?: () => void;
  language: Language;
  isMuted: boolean;
  onToggleMute: () => void;
  shouldLoad?: boolean;
  allPosts?: PostData[];
  user: User | null;
}> = ({ post, isActive, onToggleLike, onToggleSave, onToggleSubscribe, onOpenShopProfile, onOpenChat, onSharePost, language, isMuted, onToggleMute, shouldLoad = true, allPosts = [], user }) => {
  const realPost = useMemo(() => allPosts.find(p => p.id === post.id) || post, [allPosts, post.id, post]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  const { shareContent } = useShare();
  const [isPaused, setIsPaused] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  const touchStartPos = useRef<{x: number, y: number} | null>(null);

  const { 
    proxiedUrl, 
    isLoading: isMediaLoading, 
    hasError: mediaError, 
    handleMediaSuccess, 
    handleMediaError, 
    handleRetry 
  } = useMediaController({
    url: realPost.mediaUrls?.[0] || '',
    post: realPost,
    mediaIndex: 0,
    isActive: isActive && !showComments && !showDetails && !isPaused && realPost.mediaType === 'video'
  });

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      touchStartPos.current = { x: e.clientX, y: e.clientY };
    }
    longPressTimeout.current = setTimeout(() => {
      setIsPaused(true);
      if (videoRef.current) videoRef.current.pause();
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartPos.current) return;
    
    let currentX, currentY;
    if ('touches' in e) {
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    } else {
      currentX = e.clientX;
      currentY = e.clientY;
    }

    const diffX = Math.abs(currentX - touchStartPos.current.x);
    const diffY = Math.abs(currentY - touchStartPos.current.y);

    if (diffX > 10 || diffY > 10) {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }
      if (isPaused) {
        setIsPaused(false);
        if (videoRef.current && !showComments && !showDetails && realPost.mediaType === 'video') {
          safePlayVideo(videoRef.current);
        }
      }
    }
  };

  const handlePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    
    if (isPaused) {
      setIsPaused(false);
      if (videoRef.current && !showComments && !showDetails && realPost.mediaType === 'video') {
        safePlayVideo(videoRef.current);
      }
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && !showComments && !showDetails && realPost.mediaType === 'video' && !isPaused) {
      safePlayVideo(video);
    } else {
      video.pause();
    }

    return () => {
      video.pause();
    };
  }, [isActive, showComments, showDetails, realPost.mediaType, isPaused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const p = (video.currentTime / video.duration) * 100;
      setProgress(p);
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, []);

  // Removed old aggressive cleanup `useEffect(() => { ... videoRef.current.src = "" ... })`
  // as it is handled by `useMediaController` now

  const handleMediaClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const { clientX, currentTarget } = e;
    const { width } = currentTarget.getBoundingClientRect();
    const isRightSide = clientX > width / 2;

    if (now - lastTap.current < 300) {
      // Double tap - Like
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }
      if (!realPost.isLiked) onToggleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    } else {
      // Single tap - Carousel navigation with delay to allow double tap
      tapTimeout.current = setTimeout(() => {
        if (realPost.mediaUrls.length > 1) {
          if (carouselRef.current) {
            const nextIndex = isRightSide 
              ? (currentMediaIndex + 1) % realPost.mediaUrls.length
              : (currentMediaIndex - 1 + realPost.mediaUrls.length) % realPost.mediaUrls.length;
            
            carouselRef.current.scrollTo({
              left: nextIndex * carouselRef.current.offsetWidth,
              behavior: 'smooth'
            });
          }
        }
        tapTimeout.current = null;
      }, 300);
    }
    lastTap.current = now;
  };

  const handleShopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenShopProfile) {
      onOpenShopProfile(post.seller.id);
    }
  };

  const handleInternalShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSharePost) {
      onSharePost();
    }
  };

  const handleExternalShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: realPost.seller.name,
      text: realPost.outfitName,
      url: `${window.location.origin}?post=${realPost.id}`,
    };
    await shareContent(shareData.title, shareData.text, shareData.url);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollPos / width);
      if (newIndex !== currentMediaIndex) {
        setCurrentMediaIndex(newIndex);
      }
    }
  };

  return (
    <div className="relative h-full w-full min-h-full min-w-full bg-black snap-start snap-always overflow-hidden flex-shrink-0">
      <div 
        ref={carouselRef}
        onScroll={handleScroll}
        onClick={handleMediaClick}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePressEnd}
        className="h-full w-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x touch-pan-y"
        style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      >
        {realPost.mediaUrls.map((url, idx) => (
          <div 
            key={idx} 
            className="min-w-full w-full h-full snap-center snap-always flex-shrink-0 relative"
          >
            {realPost.mediaType === 'video' && idx === 0 ? (
              <div className="h-full w-full relative bg-black">
                {/* Instagram Trick: HD Poster behind the video */}
                {realPost.thumbnailUrl && (
                  <img 
                    src={getProxiedUrl(realPost.thumbnailUrl, 0)}
                    alt="Video Thumbnail"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}

                {isMediaLoading && !mediaError && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin drop-shadow-md"></div>
                  </div>
                )}

                {mediaError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 z-20 p-4 text-center">
                    <VolumeX size={32} className="text-white/20 mb-2" />
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Video yuklanmadi</p>
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

                <video
                  ref={videoRef}
                  src={shouldLoad ? proxiedUrl : undefined}
                  className={`absolute inset-0 h-full w-full object-cover pointer-events-none z-10 transition-opacity duration-200 ease-out ${!isMediaLoading ? 'opacity-100' : 'opacity-0'}`}
                  loop
                  playsInline
                  muted={isMuted}
                  preload={isActive ? "auto" : "none"}
                  onLoadedData={(e) => {
                    if (shouldLoad) handleMediaSuccess(e.currentTarget);
                  }}
                  onError={(e) => handleMediaError(e.currentTarget)}
                />
              </div>
            ) : (
              <ReelImage 
                url={url} 
                shouldLoad={shouldLoad} 
                outfitName={realPost.outfitName} 
              />
            )}
          </div>
        ))}
      </div>

      {/* Right Side Actions - Glassmorphic Sidebar */}
      <ReelRightActions
        realPost={realPost}
        onToggleLike={onToggleLike}
        onToggleSharedLike={onToggleLike}
        onToggleSave={onToggleSave}
        onToggleComment={() => setShowComments(true)}
        onOpenChat={() => onOpenChat && onOpenChat(realPost.seller.id, realPost)}
        onExternalShare={handleExternalShare}
      />

      {/* Right Side Controls Layer */}
      <div className="absolute top-6 right-4 z-50 flex flex-col gap-3">
        {realPost.mediaType === 'video' && currentMediaIndex === 0 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white active:scale-90 transition-all shadow-2xl"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        )}
      </div>

      {/* Carousel Navigation Indicators */}
      {realPost.mediaUrls.length > 1 && (
        <div className="absolute top-20 left-4 right-4 flex gap-1 z-30">
          {realPost.mediaUrls.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-0.5 flex-1 rounded-full transition-all ${idx === currentMediaIndex ? 'bg-white' : 'bg-white/30'}`} 
            />
          ))}
        </div>
      )}

      {/* Bottom Info Section */}
      <ReelBottomInfo
        realPost={realPost}
        language={language}
        isDescriptionExpanded={isDescriptionExpanded}
        setIsDescriptionExpanded={setIsDescriptionExpanded}
        onShopClick={handleShopClick}
        onChatOpen={(e) => {
          e.stopPropagation();
          onOpenChat && onOpenChat(post.seller.id, post);
        }}
        onDetailsOpen={(e) => {
          e.stopPropagation();
          setShowDetails(true);
        }}
      />

      {/* Neon Progress Bar */}
      {post.mediaType === 'video' && currentMediaIndex === 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30">
          <motion.div 
            className="h-full bg-gradient-to-r from-accent-blue to-accent-light shadow-[0_0_10px_rgba(0,122,255,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-32 left-1/2 z-[12000] px-6 py-3 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl text-white text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl"
          >
            <Check size={16} className="text-green-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHeart && (
          <motion.div 
            initial={{ scale: 0, opacity: 0, rotate: -20 }} 
            animate={{ 
              scale: [0, 1.2, 1], 
              opacity: [0, 1, 1, 0],
              y: [0, -20, -40],
              rotate: [0, -10, 10]
            }} 
            transition={{ duration: 0.8, ease: "easeOut" }}
            exit={{ scale: 1.5, opacity: 0 }} 
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <Heart size={100} fill="#ef4444" className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
          </motion.div>
        )}
      </AnimatePresence>

      <CommentDrawer 
        isOpen={showComments} 
        onClose={() => setShowComments(false)} 
        postId={post.id}
        postTitle={post.seller.name} 
        user={user}
      />
      <AnimatePresence>
        {showDetails && (
          <ProductDetails 
            post={post} 
            onClose={() => setShowDetails(false)} 
            onOpenShopProfile={onOpenShopProfile}
            onMessage={onOpenChat}
            language={language} 
            allPosts={allPosts}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ReelsViewer: React.FC<ReelsViewerProps> = ({ 
  posts, 
  initialIndex, 
  onClose, 
  onToggleLike, 
  onToggleSave, 
  onToggleSubscribe, 
  onOpenShopProfile, 
  onOpenChat, 
  onSharePost, 
  language,
  globalMuted,
  setGlobalMuted,
  allPosts = [],
  user
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Immediate scroll to initial index
  useEffect(() => {
    const scrollToInitial = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight;
        if (height > 0) {
          containerRef.current.scrollTop = initialIndex * height;
        }
      }
    };

    scrollToInitial();
    // Small timeout to ensure layout is stable
    const timer = setTimeout(scrollToInitial, 50);
    return () => clearTimeout(timer);
  }, [initialIndex]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPos = containerRef.current.scrollTop;
    const height = containerRef.current.offsetHeight;
    if (height > 0) {
      const newIndex = Math.round(scrollPos / height);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < posts.length) {
        setActiveIndex(newIndex);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80000] bg-black"
    >
      {/* Close Button */}
      <motion.button 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
        className="absolute top-6 left-4 z-[10000] text-white p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full active:scale-90 transition-all shadow-2xl hover:bg-white/20"
      >
        <X size={16} strokeWidth={2.5} />
      </motion.button>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {posts.map((post, idx) => (
          <ReelItem
            key={post.id}
            post={post}
            isActive={idx === activeIndex}
            shouldLoad={idx >= activeIndex - 1 && idx <= activeIndex + 1}
            onToggleLike={() => onToggleLike(post.id)}
            onToggleSave={() => onToggleSave(post.id)}
            onToggleSubscribe={() => onToggleSubscribe(post.seller.id)}
            onOpenShopProfile={onOpenShopProfile}
            onOpenChat={onOpenChat}
            onSharePost={() => onSharePost && onSharePost(post)}
            language={language}
            isMuted={globalMuted}
            onToggleMute={() => setGlobalMuted(!globalMuted)}
            allPosts={allPosts}
            user={user}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default ReelsViewer;
