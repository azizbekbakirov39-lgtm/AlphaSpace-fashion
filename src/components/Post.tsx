import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Bookmark, Share2, ChevronLeft, ChevronRight, Send, Volume2, VolumeX, Store } from 'lucide-react';
import { PostData } from '../types';
import CommentDrawer from './CommentDrawer';
import ProductDetails from './ProductDetails';

import { Language, translations } from '../translations';
import { isVideoUrl, getProxiedUrl, useShare, safePlayVideo, refreshMediaUrl } from '../utils/mediaUtils';
import { db, updateDoc, doc } from '../firebase';
import { formatRelativeTime } from '../utils/timeUtils';

interface PostProps {
  post: PostData;
  isActive: boolean;
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

const CarouselVideo: React.FC<{ url: string, isActive: boolean, poster?: string, post: PostData, index: number }> = ({ url, isActive, poster, post, index }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        safePlayVideo(videoRef.current);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  return (
    <video 
      ref={videoRef}
      src={url}
      poster={poster}
      className="w-full h-full object-cover"
      loop
      muted
      playsInline
      preload="metadata"
      onError={async (e) => {
        const video = e.currentTarget;
        if (!video.dataset.triedProxy) {
          video.dataset.triedProxy = 'true';
          video.src = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          video.load();
          if (isActive) safePlayVideo(video);
        } else if (post.instagramUrl && !video.dataset.triedRefresh) {
          video.dataset.triedRefresh = 'true';
          const newUrl = await refreshMediaUrl(post.instagramUrl);
          if (newUrl) {
            const newMediaUrls = [...post.mediaUrls];
            newMediaUrls[index] = newUrl;
            try {
              await updateDoc(doc(db, 'posts', post.id), {
                mediaUrls: newMediaUrls
              });
            } catch (err) {
              console.error("Firestore update failed during refresh:", err);
            }
            video.src = newUrl;
            video.load();
            if (isActive) safePlayVideo(video);
          }
        }
      }}
    />
  );
};

const Post: React.FC<PostProps> = ({ 
  post, 
  isActive, 
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
  isMuted = true,
  onToggleMute
}) => {
  const t = translations[language];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const touchStartTime = useRef<number>(0);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const { shareContent } = useShare();

  const handleMediaClick = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartPos.current.x);
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartPos.current.y);
    const duration = Date.now() - touchStartTime.current;
    
    // If movement is very small AND it was a quick touch AND we are not scrolling
    // This ensures that swiping doesn't trigger Reels
    if (deltaX < 15 && deltaY < 15 && duration < 300 && !isScrolling.current) {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      
      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        // Double tap detected
        if (tapTimeout.current) clearTimeout(tapTimeout.current);
        if (!post.isLiked && onToggleLike) {
          onToggleLike();
          setShowHeart(true);
          setTimeout(() => setShowHeart(false), 1000);
        }
      } else {
        // Single tap - wait for potential second tap
        if (tapTimeout.current) clearTimeout(tapTimeout.current);
        tapTimeout.current = setTimeout(() => {
          if (onOpenReels) onOpenReels();
        }, DOUBLE_TAP_DELAY);
      }
      lastTap.current = now;
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

  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        setVideoError(false);
        safePlayVideo(videoRef.current);
      } else {
        videoRef.current.pause();
        // Removed currentTime = 0 to prevent flickering when scrolling slightly
      }
    }
  }, [isActive]);

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
      <div className="mx-4 mt-4 mb-3 flex items-center justify-between group">
        <div 
          className="flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity flex-1"
          onClick={handleShopClick}
        >
          <div className={`flex-shrink-0 p-[2px] rounded-full ${post.seller.hasStory ? 'bg-accent-light shadow-sm shadow-accent-light/20' : 'bg-text-primary/10'}`}>
            <div className="p-[1.5px] bg-bg-primary rounded-full">
              {post.seller.logo ? (
                <img 
                  src={post.seller.logo} 
                  alt={post.seller.name} 
                  className="w-9 h-9 rounded-full object-cover aspect-square"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-accent-blue">
                  <Store size={18} strokeWidth={1.5} />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-text-primary font-black text-[13px] tracking-tight uppercase leading-none">{post.seller.name}</span>
              {post.seller.followers > 1000 && (
                <div className="bg-accent-blue/10 text-accent-blue text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-widest">
                  Top
                </div>
              )}
            </div>
            <span className="text-text-secondary text-[9px] font-bold uppercase tracking-wider opacity-50 mt-0.5">
              {post.seller.categories?.[0] || "Do'kon"} • {(post.seller.followers || 0).toLocaleString()} {language === 'uz' ? 'obunachi' : 'followers'} • {formatRelativeTime(post.createdAt)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            className={`px-5 py-1.5 text-[10px] font-black rounded-full uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center border ${
              post.seller.isSubscribed 
                ? 'bg-text-primary/5 text-text-primary/60 border-border-primary' 
                : 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 backdrop-blur-xl border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleSubscribe) onToggleSubscribe();
            }}
          >
            {post.seller.isSubscribed ? (
              language === 'uz' ? "Kuzatilyapti" : "Following"
            ) : (
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {language === 'uz' ? "Kuzatish" : "Follow"}
              </span>
            )}
          </button>
        </div>
      </div>

      <div 
        className="relative w-full aspect-[4/5] bg-neutral-900 flex items-center justify-center overflow-hidden touch-pan-y"
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
            onClick={handleMediaClick}
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
                    setVideoError(false);
                    setVideoLoading(true);
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
              src={post.mediaUrls?.[0]}
              poster={post.thumbnailUrl || (post.mediaType === 'image' ? post.mediaUrls[0] : undefined)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${videoLoading ? 'opacity-0' : 'opacity-100'}`}
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              onLoadedData={() => setVideoLoading(false)}
              onWaiting={() => setVideoLoading(true)}
              onPlaying={() => setVideoLoading(false)}
              onError={async (e) => {
                const video = e.currentTarget;
                const originalUrl = post.mediaUrls[0];

                if (!video.dataset.triedProxy) {
                  video.dataset.triedProxy = 'true';
                  video.src = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
                  video.load();
                  if (isActive) safePlayVideo(video);
                } else if (post.instagramUrl && !video.dataset.triedRefresh) {
                   video.dataset.triedRefresh = 'true';
                   const newUrl = await refreshMediaUrl(post.instagramUrl);
                   if (newUrl) {
                      try {
                        await updateDoc(doc(db, 'posts', post.id), {
                          mediaUrls: [newUrl]
                        });
                      } catch (err) {
                        console.error("Firestore update failed during refresh:", err);
                      }
                      video.src = newUrl;
                      video.load();
                      if (isActive) safePlayVideo(video);
                   } else {
                      setVideoLoading(false);
                      setVideoError(true);
                   }
                } else {
                  setVideoLoading(false);
                  setVideoError(true);
                }
              }}
            />
            
            {/* Mute/Unmute Toggle */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleMute) onToggleMute();
              }}
              className="absolute bottom-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white z-10 hover:bg-black/60 transition-all active:scale-90"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <div 
              ref={carouselRef}
              onScroll={handleScroll}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={handleMediaClick}
              className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x touch-pan-y"
              style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            >
              {post.mediaUrls?.map((url, idx) => {
                const isVideo = isVideoUrl(url);
                const proxiedUrl = getProxiedUrl(url);
                return (
                  <div 
                    key={idx} 
                    className="min-w-full h-full snap-center snap-always flex-shrink-0 bg-neutral-900"
                    style={{ scrollSnapStop: 'always' }}
                  >
                    {isVideo ? (
                      <div className="w-full h-full relative bg-black/10">
                        <CarouselVideo 
                          url={url} 
                          isActive={isActive && idx === currentImageIndex}
                          poster={post.thumbnailUrl || (idx === 0 ? url : undefined)}
                          post={post}
                          index={idx}
                        />
                      </div>
                    ) : (
                      <img
                        src={proxiedUrl}
                        alt={`${post.outfitName} - ${idx + 1}`}
                        className="w-full h-full object-cover block"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const proxy1 = `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
                          const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                          
                          if (!target.dataset.triedProxy1) {
                            target.dataset.triedProxy1 = 'true';
                            target.src = proxy1;
                          } else if (!target.dataset.triedProxy2) {
                            target.dataset.triedProxy2 = 'true';
                            target.src = proxy2;
                          } else {
                            // If image fails, try to hide the broken icon and show a placeholder
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.style.backgroundColor = '#171717';
                              const placeholder = document.createElement('div');
                              placeholder.className = 'absolute inset-0 flex items-center justify-center text-white/20 text-[10px] font-black uppercase';
                              placeholder.innerText = 'Rasm yuklanmadi';
                              parent.appendChild(placeholder);
                            }
                          }
                        }}
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
      <div className="px-3 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleLike) onToggleLike();
            }}
            className={`transition-colors duration-300 ${post.isLiked ? 'text-[#ef4444]' : 'text-text-primary'}`}
          >
            <Heart size={28} fill={post.isLiked ? '#ef4444' : 'none'} strokeWidth={1.5} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            className="text-text-primary"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenComments) onOpenComments();
            }}
          >
            <MessageCircle size={28} strokeWidth={1.5} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            className="text-text-primary"
            onClick={handleInternalShare}
          >
            <Send size={28} strokeWidth={1.5} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            className="text-text-primary"
            onClick={handleExternalShare}
          >
            <Share2 size={28} strokeWidth={1.5} />
          </motion.button>
        </div>
        
        {/* Glassmorphic Price Tag */}
        <div className="flex-1 flex items-center justify-center mx-2">
          {post.price ? (
            <div className="px-5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/5 to-purple-500/5 backdrop-blur-xl border border-indigo-500/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-center">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-black text-[15px] tracking-tight">
                {post.price}
              </span>
            </div>
          ) : (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenChat) onOpenChat();
              }}
              className="px-5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/5 to-purple-500/5 backdrop-blur-xl border border-indigo-500/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-all flex items-center justify-center"
            >
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-black text-[11px] uppercase tracking-widest">
                {post.priceMessage || "Narxi?"}
              </span>
            </button>
          )}
        </div>

        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSave) onToggleSave();
          }}
          className={`transition-colors duration-300 ${post.isSaved ? 'text-accent-blue' : 'text-text-primary'}`}
        >
          <Bookmark size={28} fill={post.isSaved ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </motion.button>
      </div>

      {/* Post Info */}
      <div className="px-4 flex flex-col gap-0.5">
        <p className="text-text-primary text-xs font-bold">
          {(post.likes || 0).toLocaleString()} {t.likes}
        </p>
        <div className="flex flex-col gap-0.5 mb-0.5">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-black text-[14px] font-black tracking-tight">{post.seller.name}</span>
            <span className="text-black/80 text-[13px] font-bold">
              {!post.outfitName.toLowerCase().includes("instagram") ? post.outfitName : ""}
            </span>
          </div>
          {post.description && (
            <div className="relative">
              <p className={`text-black text-[13px] font-bold leading-snug transition-all ${isDescriptionExpanded ? '' : 'line-clamp-1'}`}>
                {post.description}
              </p>
              {!isDescriptionExpanded && post.description.length > 40 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDescriptionExpanded(true);
                  }}
                  className="text-text-secondary text-[12px] font-black mt-0.5 hover:text-accent-blue transition-colors"
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
                  className="text-text-secondary text-[12px] font-black mt-1 hover:text-accent-blue transition-colors"
                >
                  yashirish
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenChat) onOpenChat();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 backdrop-blur-xl border border-indigo-500/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-black text-[11px] uppercase tracking-widest">
              {language === 'uz' ? "Xabar yuborish" : "Message"}
            </span>
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenDetails) onOpenDetails();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 backdrop-blur-xl border border-cyan-500/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent font-black text-[11px] uppercase tracking-widest">
              {language === 'uz' ? "Batafsil" : "Details"}
            </span>
          </button>
        </div>
      </div>
      {/* Comment Drawer and Product Details moved to global level in App.tsx */}
    </div>
  );
};

export default Post;
