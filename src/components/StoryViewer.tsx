import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, Check, ChevronLeft, ChevronRight, ShoppingBag, Send } from 'lucide-react';
import { Story, PostData, User } from '../types';
import { isVideoUrl, useShare, safePlayVideo } from '../utils/mediaUtils';
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
    price: currentStory.price,
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
            src={currentStory.videoUrl}
            className={`w-full h-full object-cover transition-opacity duration-300 ${isMediaLoading ? 'opacity-0' : 'opacity-100'}`}
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
            onLoadedData={() => setIsMediaLoading(false)}
            onPlaying={() => setIsMediaLoading(false)}
            onWaiting={() => setIsMediaLoading(true)}
            onError={(e) => {
              const video = e.currentTarget;
              if (!video.dataset.triedProxy) {
                video.dataset.triedProxy = 'true';
                video.src = `https://api.allorigins.win/raw?url=${encodeURIComponent(currentStory.videoUrl)}`;
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

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="p-[2px] rounded-full bg-gradient-to-br from-accent-blue to-accent-light shadow-lg">
            <img src={currentStory.seller.logo} className="w-10 h-10 rounded-full border-2 border-black bg-black object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-sm drop-shadow-md tracking-tight">{currentStory.seller.name}</span>
            <div className="flex items-center gap-1">
              {currentStory.isLive && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Live</span>
                </div>
              )}
              <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Hozir</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="text-white p-2.5 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 active:scale-90 transition-all"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button onClick={onClose} className="text-white p-2.5 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 active:scale-90 transition-all">
            <X size={20} />
          </button>
        </div>
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

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-50">
        <div className="flex items-center gap-3 mb-6">
          <form 
            onSubmit={handleReply} 
            className="flex-1 relative group"
            onClick={(e) => e.stopPropagation()}
          >
            <input 
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={language === 'uz' ? "Javob yozish..." : "Reply..."}
              className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full pl-6 pr-14 py-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 transition-all shadow-2xl"
            />
            <button 
              type="submit"
              disabled={!replyText.trim()}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${replyText.trim() ? 'bg-accent-blue text-white scale-100 opacity-100' : 'bg-white/10 text-white/20 scale-90 opacity-0 pointer-events-none'}`}
            >
              <Send size={18} strokeWidth={2.5} />
            </button>
          </form>

          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(currentStory.id, 'story');
              }}
              className={`w-12 h-12 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center transition-all active:scale-90 ${currentStory.isLiked ? 'text-red-500' : 'text-white'}`}
            >
              <Heart size={22} fill={currentStory.isLiked ? 'currentColor' : 'none'} />
            </button>
            <button 
              onClick={handleShare}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center text-white active:scale-90 transition-all"
            >
              <Share2 size={22} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Mahsulot narxi</span>
            <span className="text-2xl font-black text-white drop-shadow-lg tracking-tight">{currentStory.price}</span>
          </div>
          
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowProductDetails(true);
            }}
            className="flex items-center gap-3 bg-white px-6 py-3.5 rounded-2xl shadow-2xl group active:scale-95 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
              <ShoppingBag size={18} strokeWidth={2.5} />
            </div>
            <span className="text-neutral-900 font-black uppercase tracking-widest text-[10px]">Batafsil</span>
            <ChevronRight size={14} className="text-neutral-400 group-hover:text-neutral-900 transition-colors" />
          </motion.button>
        </div>
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
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute z-[6000] pointer-events-none">
            <Heart size={100} fill="#ef4444" className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StoryViewer;
