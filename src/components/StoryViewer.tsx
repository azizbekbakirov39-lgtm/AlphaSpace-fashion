import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, Check, ChevronLeft, ChevronRight, ShoppingBag, Send } from 'lucide-react';
import { Story, PostData, User } from '../types';
import { isVideoUrl, useShare, safePlayVideo, getProxiedUrl, getNextProxyIndex, isLastProxy, markUrlAsSuccessful } from '../utils/mediaUtils';
import { formatRelativeTime } from '../utils/timeUtils';
import ProductDetails from './ProductDetails';
import CommentDrawer from './CommentDrawer';
import { Language } from '../translations';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onMarkViewed: (storyId: string) => void;
  onToggleLike: (storyId: string, type: 'post' | 'story') => void;
  onOpenShopProfile?: (shopId: string) => void;
  onOpenChat?: (sellerId: string, product?: PostData) => void;
  language: Language;
  allPosts?: PostData[];
  allStories?: Story[];
  user: User | null;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ 
  stories, 
  initialIndex, 
  onClose, 
  onMarkViewed, 
  onToggleLike, 
  onOpenShopProfile,
  onOpenChat,
  language,
  allPosts = [],
  allStories = [],
  user
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { shareContent } = useShare();
  const currentStory = allStories.find(s => s.id === stories[currentIndex]?.id) || stories[currentIndex];
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      showToast(language === 'uz' ? 'Xabar yuborildi!' : 'Message sent!');
      setReplyText('');
    }
  };

  const handleVote = (storyId: string, optionIdx: number) => {
    if (userVotes[storyId] !== undefined) return;
    setUserVotes(prev => ({ ...prev, [storyId]: optionIdx }));
  };
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const isClosing = useRef(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [proxyIndex, setProxyIndex] = useState(0);

  // Pause/Resume video when details or comments are open
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (showProductDetails || showComments) {
      video.pause();
    } else {
      setMediaError(false);
      safePlayVideo(video);
    }
  }, [showProductDetails, showComments]);

  // Mark as viewed and reset state for new story
  useEffect(() => {
    if (currentStory) {
      onMarkViewed(currentStory.id);
      setProgress(0);
      setIsMediaLoading(true);
      setMediaError(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        setProxyIndex(0);
        if (!showProductDetails && !showComments) {
          safePlayVideo(videoRef.current);
        }
      }
    }
  }, [currentIndex, currentStory?.id, onMarkViewed]);

  const [isPaused, setIsPaused] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Handle video progress and image auto-advance
  useEffect(() => {
    const video = videoRef.current;
    if (video && isVideoUrl(currentStory?.videoUrl || '')) {
      const updateProgress = () => {
        if (video.duration) {
          const p = (video.currentTime / video.duration) * 100;
          setProgress(p);
        }
      };
      video.addEventListener('timeupdate', updateProgress);
      return () => video.removeEventListener('timeupdate', updateProgress);
    } else if (currentStory && !isVideoUrl(currentStory.videoUrl)) {
      // For images, auto-advance after 5 seconds and animate progress
      let startTime = Date.now();
      let animationFrame: number;
      
      const updateImageProgress = () => {
        if (isPaused || showProductDetails || showComments) {
          startTime += 16; // Roughly maintain time if paused
        } else {
          const elapsed = Date.now() - startTime;
          const p = Math.min((elapsed / 5000) * 100, 100);
          setProgress(p);
          
          if (p >= 100) {
            handleNext();
            return;
          }
        }
        animationFrame = requestAnimationFrame(updateImageProgress);
      };
      
      animationFrame = requestAnimationFrame(updateImageProgress);
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [currentIndex, currentStory, isPaused, showProductDetails, showComments, handleNext]);

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    longPressTimeout.current = setTimeout(() => {
      setIsPaused(true);
      if (videoRef.current) videoRef.current.pause();
    }, 200);
  };

  const handlePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    
    if (isPaused) {
      setIsPaused(false);
      if (videoRef.current && !showProductDetails && !showComments) {
        safePlayVideo(videoRef.current);
      }
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    if (isPaused) return;
    
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
      if (!currentStory.isLiked) {
        onToggleLike(currentStory.id, 'story');
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 800);
      }
    } else {
      // Single tap - Navigation with delay
      tapTimeout.current = setTimeout(() => {
        if (isRightSide) {
          handleNext();
        } else {
          handlePrev();
        }
        tapTimeout.current = null;
      }, 300);
    }
    lastTap.current = now;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: currentStory.seller.name,
      text: "Check out this story on AlphaSpace",
      url: `${window.location.origin}?shop=${currentStory.sellerId}`,
    };
    await shareContent(shareData.title, shareData.text, shareData.url);
  };

  if (!currentStory) return null;

  const mockPost: PostData = {
    id: `story-post-${currentStory.id}`,
    seller: currentStory.seller,
    mediaUrls: [currentStory.videoUrl],
    mediaType: 'video',
    price: currentStory.price || '',
    outfitName: "Story Product",
    likes: currentStory.likes,
    comments: currentStory.comments,
    isLiked: currentStory.isLiked || false,
    isSaved: false
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="fixed inset-0 z-[30000] bg-black flex items-center justify-center overflow-hidden"
    >
      {isVideoUrl(currentStory.videoUrl) ? (
        <div className="w-full h-full relative bg-neutral-900 flex items-center justify-center">
          {/* Instagram Trick: HD Poster behind the video */}
          {(currentStory.imageUrl || currentStory.thumbnailUrl) && (
            <img 
              src={getProxiedUrl(currentStory.imageUrl || currentStory.thumbnailUrl || '', 0)}
              alt="Story Thumbnail"
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
                  setMediaError(false);
                  setIsMediaLoading(true);
                  if (videoRef.current) videoRef.current.load();
                }}
                className="mt-3 px-4 py-1.5 bg-white/10 rounded-full text-white text-[9px] font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-transform"
              >
                Qayta yuklash
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            src={getProxiedUrl(currentStory.videoUrl, proxyIndex)}
            className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-200 ease-out ${!isMediaLoading ? 'opacity-100' : 'opacity-0'}`}
            onEnded={handleNext}
            playsInline
            muted={isMuted}
            onClick={handleTap}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            preload="auto"
            onLoadedData={() => {
              setIsMediaLoading(false); // Immediate show when data loaded
              markUrlAsSuccessful(currentStory.videoUrl, videoRef.current?.src || '');
            }}
            onPlaying={() => setIsMediaLoading(false)}
            onWaiting={() => setIsMediaLoading(true)}
            onError={(e) => {
              const video = e.currentTarget;
              if (!isLastProxy(proxyIndex)) {
                setProxyIndex(prev => getNextProxyIndex(prev));
                video.load();
                if (videoRef.current && !showProductDetails && !showComments) {
                  safePlayVideo(videoRef.current);
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
          src={currentStory.videoUrl}
          className="w-full h-full object-cover"
          onClick={handleTap}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          alt="Story"
        />
      )}

      {/* Navigation Areas - Visual Feedback */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="w-1/3 h-full flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity">
          <div className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white">
            <ChevronLeft size={24} />
          </div>
        </div>
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity">
          <div className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white">
            <ChevronRight size={24} />
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="absolute top-3 left-2 right-2 flex gap-1 z-50">
        {stories.map((_, idx) => (
          <div key={idx} className="h-[2px] flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className={`h-full bg-white transition-all ${idx === currentIndex ? 'duration-100 ease-linear' : 'duration-0'}`}
              style={{ 
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header Controls */}
      <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-end gap-2 z-50">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
          }}
          className="text-white p-2.5 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 active:scale-90 transition-all shadow-lg"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button onClick={onClose} className="text-white p-2.5 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 active:scale-90 transition-all shadow-lg">
          <X size={20} />
        </button>
      </div>

      {/* Vertical Interaction Sidebar */}
      <div className="absolute right-3 bottom-[260px] flex flex-col gap-6 items-center z-50 px-1">
        {/* Like */}
        <div className="flex flex-col items-center gap-1.5">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(currentStory.id, 'story');
              if (!currentStory.isLiked) {
                setShowHeartAnimation(true);
                setTimeout(() => setShowHeartAnimation(false), 800);
              }
            }} 
            className={`w-9 h-9 flex items-center justify-center transition-all ${currentStory.isLiked ? 'text-red-500' : 'text-white'}`}
          >
            <Heart size={28} fill={currentStory.isLiked ? 'currentColor' : 'none'} strokeWidth={2.5} className="drop-shadow-lg" />
          </motion.button>
          <span className="text-white text-[10px] font-black uppercase drop-shadow-md tracking-tight leading-none h-3">{currentStory.likes || 0}</span>
        </div>

        {/* Comments */}
        <div className="flex flex-col items-center gap-1.5">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }} 
            className="w-9 h-9 flex items-center justify-center text-white"
          >
            <MessageCircle size={28} strokeWidth={2.5} className="drop-shadow-lg" />
          </motion.button>
          <span className="text-white text-[10px] font-black uppercase drop-shadow-md tracking-tight leading-none h-3">{currentStory.comments || 0}</span>
        </div>

        {/* Share */}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            const shareData = {
              title: currentStory.seller.name,
              text: 'Ajoyib storyni ko\'ring!',
              url: `${window.location.origin}?story=${currentStory.id}`,
            };
            shareContent(shareData.title, shareData.text, shareData.url);
          }} 
          className="w-9 h-9 flex items-center justify-center text-white"
        >
          <Share2 size={28} strokeWidth={2.5} className="drop-shadow-lg" />
        </motion.button>
      </div>

      {/* Interactive Poll Sticker */}
      {currentStory.poll && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 z-40">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-5 shadow-2xl border border-white/20"
          >
            <h4 className="text-sm font-black text-center text-neutral-900 mb-4 leading-tight">
              {currentStory.poll.question}
            </h4>
            <div className="space-y-2">
              {currentStory.poll.options.map((option, idx) => {
                const hasVoted = userVotes[currentStory.id] !== undefined;
                const isSelected = userVotes[currentStory.id] === idx;
                const totalVotes = currentStory.poll!.votes.reduce((a, b) => a + b, 0) + (hasVoted ? 1 : 0);
                const optionVotes = currentStory.poll!.votes[idx] + (isSelected ? 1 : 0);
                const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;

                return (
                  <button
                    key={idx}
                    disabled={hasVoted}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(currentStory.id, idx);
                    }}
                    className="w-full relative h-12 rounded-2xl overflow-hidden border border-neutral-200 group active:scale-95 transition-all"
                  >
                    {hasVoted && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`absolute inset-0 ${isSelected ? 'bg-accent-blue/20' : 'bg-neutral-100'}`}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      <span className={`text-xs font-black ${hasVoted ? 'text-neutral-900' : 'text-neutral-700'}`}>
                        {option}
                      </span>
                      {hasVoted && (
                        <span className="text-xs font-black text-accent-blue">
                          {percentage}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Info Section - Consistent with Reels */}
      <div className="absolute bottom-10 left-4 right-4 z-50 flex flex-col gap-4 pr-14">
        {/* Row 1 (Top): Shop Identity & Price */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div 
            className="flex items-center gap-2 cursor-pointer active:opacity-70 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onOpenShopProfile && onOpenShopProfile(currentStory.sellerId);
            }}
          >
            <img 
              src={currentStory.seller.logo} 
              className="w-8 h-8 rounded-full border border-white/20 object-cover shadow-lg" 
              referrerPolicy="no-referrer" 
            />
            <div className="flex flex-col">
              <span className="text-white font-black text-sm drop-shadow-md tracking-tight leading-none">{currentStory.seller.name}</span>
              <span className="text-white/40 text-[8px] font-black uppercase tracking-widest mt-0.5">
                {currentStory.isLive ? (
                  <span className="text-accent-blue animate-pulse">● LIVE</span>
                ) : formatRelativeTime(currentStory.createdAt)}
              </span>
            </div>
          </div>
          
          <span className="text-white font-black text-lg drop-shadow-lg tracking-tight">
            {currentStory.price && currentStory.price.trim() !== "" 
              ? currentStory.price 
              : (language === 'uz' ? 'Narxi?' : 'Price?')}
          </span>
        </div>

        {/* Row 2 (Middle): Message & Batafsil */}
        <div className="flex items-center gap-3">
          <form 
            onSubmit={handleReply}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-between bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 h-10 shadow-lg cursor-pointer active:opacity-70 transition-opacity"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={language === 'uz' ? 'Xabar yuborish...' : 'Send message...'}
              className="flex-1 bg-transparent border-none outline-none text-white text-[10px] font-black uppercase tracking-widest placeholder:text-white/40"
            />
            <button type="submit" className="text-white/40 hover:text-white transition-colors">
              <Send size={14} />
            </button>
          </form>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowProductDetails(true);
            }}
            className="h-10 px-4 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-[0.2em] hover:text-white/80 active:scale-95 transition-all"
          >
            Batafsil
          </button>
        </div>

        {/* Row 3 (Bottom): Description (if available) */}
        {currentStory.seller.description && (
          <div className="px-1 opacity-60">
            <p className="text-white text-[11px] font-medium leading-snug line-clamp-1 drop-shadow-md">
              {currentStory.seller.description}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showProductDetails && (
          <ProductDetails 
            post={mockPost} 
            onClose={() => setShowProductDetails(false)} 
            onOpenShopProfile={onOpenShopProfile}
            onMessage={onOpenChat}
            language={language} 
            allPosts={allPosts}
          />
        )}
      </AnimatePresence>

      <CommentDrawer 
        isOpen={showComments} 
        onClose={() => setShowComments(false)} 
        postId={currentStory.id}
        postTitle={currentStory.seller.name} 
        user={user}
      />

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

      {/* Heart Animation */}
      <AnimatePresence>
        {showHeartAnimation && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }} 
            animate={{ scale: [0, 1.2, 1], opacity: [1, 1, 0] }} 
            exit={{ scale: 1.5, opacity: 0 }} 
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-[6000]"
          >
            <Heart size={100} fill="#ef4444" className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StoryViewer;
