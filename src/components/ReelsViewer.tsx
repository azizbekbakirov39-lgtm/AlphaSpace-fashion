import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Heart, MessageCircle, Share2, Bookmark, 
  Zap, Plus, Send, Volume2, VolumeX, Check 
} from 'lucide-react';
import { PostData, User } from '../types';
import CommentDrawer from './CommentDrawer';
import ProductDetails from './ProductDetails';
import { Language } from '../translations';
import { useShare, isVideoUrl, getProxiedUrl, safePlayVideo } from '../utils/mediaUtils';
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
  allPosts?: PostData[];
  user: User | null;
}> = ({ post, isActive, onToggleLike, onToggleSave, onToggleSubscribe, onOpenShopProfile, onOpenChat, onSharePost, language, isMuted, onToggleMute, allPosts = [], user }) => {
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

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && !showComments && !showDetails && realPost.mediaType === 'video') {
      setMediaError(false);
      safePlayVideo(video);
    } else {
      video.pause();
      // Removed automatic currentTime = 0 to prevent flickering
    }

    return () => {
      video.pause();
    };
  }, [isActive, showComments, showDetails, realPost.mediaType]);

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
        className="h-full w-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x touch-pan-y"
        style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      >
        {realPost.mediaUrls.map((url, idx) => (
          <div 
            key={idx} 
            className="min-w-full w-full h-full snap-center snap-always flex-shrink-0 relative"
          >
            {realPost.mediaType === 'video' && idx === 0 ? (
              <div className="h-full w-full relative bg-black/10">
                {isMediaLoading && !mediaError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                    <div className="w-8 h-8 border-3 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin"></div>
                  </div>
                )}

                {mediaError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 z-10 p-4 text-center">
                    <VolumeX size={32} className="text-white/20 mb-2" />
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Video yuklanmadi</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setMediaError(false);
                        setIsMediaLoading(true);
                        if (videoRef.current) videoRef.current.load();
                      }}
                      className="mt-3 px-4 py-1.5 bg-white/10 rounded-full text-white text-[9px] font-black uppercase tracking-widest border border-white/10"
                    >
                      Qayta yuklash
                    </button>
                  </div>
                )}

                <video
                  ref={videoRef}
                  src={url}
                  poster={realPost.thumbnailUrl || undefined}
                  className={`h-full w-full object-cover pointer-events-none transition-opacity duration-300 ${isMediaLoading ? 'opacity-0' : 'opacity-100'}`}
                  loop
                  playsInline
                  muted={isMuted}
                  preload="auto"
                  onLoadedData={() => setIsMediaLoading(false)}
                  onWaiting={() => setIsMediaLoading(true)}
                  onPlaying={() => setIsMediaLoading(false)}
                  onError={(e) => {
                    const video = e.currentTarget;
                    if (!video.dataset.triedProxy) {
                      video.dataset.triedProxy = 'true';
                      video.src = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                      video.load();
                      if (isActive && !showComments && !showDetails && realPost.mediaType === 'video') {
                        safePlayVideo(video);
                      }
                    } else {
                      setIsMediaLoading(false);
                      setMediaError(true);
                    }
                  }}
                />
              </div>
            ) : (
              <img
                src={url}
                className="h-full w-full object-cover pointer-events-none"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        ))}
      </div>

      {/* Right Side Actions - Glassmorphic Sidebar */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-20">
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }} 
            className={`w-9 h-9 flex items-center justify-center transition-all ${realPost.isLiked ? 'text-red-500' : 'text-white drop-shadow-lg'}`}
          >
            <Heart size={28} fill={realPost.isLiked ? 'currentColor' : 'none'} strokeWidth={2.5} />
          </motion.button>
          <span className="text-white text-[11px] font-bold drop-shadow-lg">{realPost.likes}</span>
        </div>

        {/* Comments */}
        <div className="flex flex-col items-center gap-1">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }} 
            className="w-9 h-9 flex items-center justify-center text-white drop-shadow-lg"
          >
            <MessageCircle size={28} strokeWidth={2.5} />
          </motion.button>
          <span className="text-white text-[11px] font-bold drop-shadow-lg">{realPost.comments}</span>
        </div>

        {/* Save */}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }} 
          className={`w-9 h-9 flex items-center justify-center transition-all ${realPost.isSaved ? 'text-accent-blue' : 'text-white drop-shadow-lg'}`}
        >
          <Bookmark size={28} fill={realPost.isSaved ? 'currentColor' : 'none'} strokeWidth={2.5} />
        </motion.button>

        {/* Internal Share */}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.8 }}
          onClick={handleInternalShare} 
          className="w-9 h-9 flex items-center justify-center text-white drop-shadow-lg"
        >
          <Send size={28} strokeWidth={2.5} />
        </motion.button>

        {/* External Share */}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.8 }}
          onClick={handleExternalShare} 
          className="w-9 h-9 flex items-center justify-center text-white drop-shadow-lg"
        >
          <Share2 size={28} strokeWidth={2.5} />
        </motion.button>
      </div>

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
      <div className="absolute bottom-6 left-4 right-4 z-20 flex items-end justify-between gap-4">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-1 flex flex-col gap-2"
        >
          {/* Shop Identity at the bottom left - 2x Larger */}
          <div className="flex items-center gap-4 mb-2">
            <div 
              className="relative cursor-pointer active:scale-95 transition-transform"
              onClick={handleShopClick}
            >
              <img 
                src={realPost.seller.logo} 
                className="w-16 h-16 rounded-full border-2 border-white/50 object-cover shadow-2xl" 
                referrerPolicy="no-referrer" 
              />
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSubscribe();
                }}
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-colors ${realPost.seller.isSubscribed ? 'bg-accent-blue text-white' : 'bg-red-500 text-white'}`}
              >
                {realPost.seller.isSubscribed ? <Zap size={12} fill="currentColor" /> : <Plus size={14} strokeWidth={4} />}
              </motion.button>
            </div>
            <div className="flex flex-col">
              {/* Price above shop name - Purple gradient, smaller */}
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md inline-block">
                  <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent font-black text-sm drop-shadow-lg">
                    {realPost.price && realPost.price.trim() !== "" 
                      ? realPost.price 
                      : (realPost.priceMessage || (language === 'uz' ? 'Narx qancha?' : language === 'ru' ? 'Какая цена?' : 'What is the price?'))}
                  </span>
                </div>
                {/* Send Message - Purple gradient, glassmorphism */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenChat) onOpenChat(post.seller.id, post);
                  }}
                  className="bg-gradient-to-r from-purple-500/30 to-purple-600/30 backdrop-blur-md px-3 py-1 rounded-lg text-purple-100 text-[10px] font-black uppercase tracking-wider hover:from-purple-500/40 hover:to-purple-600/40 transition-colors drop-shadow-lg"
                >
                  {language === 'uz' ? 'Xabar yuborish' : language === 'ru' ? 'Отправить сообщение' : 'Send Message'}
                </motion.button>
              </div>

              <div className="flex items-center gap-3">
                <span 
                  className="text-white font-black text-xl drop-shadow-2xl cursor-pointer hover:underline tracking-tight"
                  onClick={handleShopClick}
                >
                  {realPost.seller.name}
                </span>
                <span className="text-white/60 text-[10px] font-black uppercase tracking-widest drop-shadow-lg">
                  • {formatRelativeTime(realPost.createdAt)}
                </span>
                {/* Details Button - Blue, glassmorphism, next to shop name */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(true);
                  }}
                  className="bg-accent-blue/20 backdrop-blur-md px-3 py-1 rounded-lg text-accent-light text-[10px] font-black uppercase tracking-widest hover:bg-accent-blue/30 transition-colors drop-shadow-lg"
                >
                  {language === 'uz' ? 'Batafsil' : language === 'ru' ? 'Подробнее' : 'Details'}
                </motion.button>
              </div>
              {realPost.seller.isSubscribed && (
                <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest drop-shadow-lg">Obuna bo'lingan</span>
              )}
            </div>
          </div>

          {!realPost.outfitName.toLowerCase().includes("instagram") && (
            <h2 className="text-white text-sm font-black leading-tight drop-shadow-2xl tracking-tight line-clamp-1">
              {realPost.outfitName}
            </h2>
          )}

          {realPost.description && (
            <div className="relative">
              <p className={`text-white/90 text-xs font-medium leading-snug drop-shadow-md transition-all ${isDescriptionExpanded ? '' : 'line-clamp-1'}`}>
                {realPost.description}
              </p>
              {!isDescriptionExpanded && realPost.description.length > 40 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDescriptionExpanded(true);
                  }}
                  className="text-white/60 text-[11px] font-bold mt-0.5 hover:text-white transition-colors drop-shadow-md"
                >
                  ...davomi
                </button>
              )}
              {isDescriptionExpanded && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDescriptionExpanded(false);
                  }}
                  className="text-white/60 text-[11px] font-bold mt-1 hover:text-white transition-colors drop-shadow-md"
                >
                  yashirish
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>

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
            className="absolute z-50 pointer-events-none"
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
      className="fixed inset-0 z-[30000] bg-black"
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
