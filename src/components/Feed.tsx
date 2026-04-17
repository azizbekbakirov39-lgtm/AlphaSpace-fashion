import React, { useRef, useState, useEffect } from 'react';
import Post from './Post';
import StoryBar from './StoryBar';
import SearchOverlay from './SearchOverlay';
import { PostData, Story } from '../types';
import { Search, X } from 'lucide-react';
import { motion } from 'motion/react';

import { Language } from '../translations';

interface FeedProps {
  posts: PostData[];
  stories: Story[];
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onMarkStoryViewed: (storyId: string) => void;
  onOpenStories: (stories: Story[], index: number) => void;
  onOpenLive: (story: Story) => void;
  onOpenReels: (posts: PostData[], index: number) => void;
  onOpenShopProfile: (shopId: string) => void;
  onOpenPostDetails: (post: PostData) => void;
  onOpenPostComments: (post: PostData) => void;
  onSharePost: (post: PostData) => void;
  onToggleSubscribe: (sellerId: string) => void;
  onOpenChat?: (sellerId: string) => void;
  onRefresh: () => void;
  language: Language;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchActive: (active: boolean) => void;
  isSearchActive: boolean;
  globalMuted: boolean;
  setGlobalMuted: (muted: boolean) => void;
}

const Feed: React.FC<FeedProps> = ({ 
  posts, 
  stories, 
  onToggleLike, 
  onToggleSave, 
  onMarkStoryViewed, 
  onOpenStories,
  onOpenLive,
  onOpenReels,
  onOpenShopProfile,
  onOpenPostDetails,
  onOpenPostComments,
  onSharePost,
  onToggleSubscribe,
  onOpenChat,
  onRefresh,
  language,
  searchQuery,
  setSearchQuery,
  onSearchActive,
  isSearchActive,
  globalMuted,
  setGlobalMuted
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);

  const handleSearchActive = () => {
    onSearchActive(true);
  };

  const handleSearchClose = () => {
    onSearchActive(false);
  };

  const filteredPosts = React.useMemo(() => {
    if (!searchQuery) return posts;
    
    const matches = posts.filter(post => 
      post.outfitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.seller.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const nonMatches = posts.filter(post => 
      !post.outfitName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !post.seller.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // YouTube style: matches first, then random/other content
    return [...matches, ...nonMatches];
  }, [posts, searchQuery]);

  useEffect(() => {
    const handleScroll = () => {
      if (!feedRef.current) return;
      const currentScrollY = feedRef.current.scrollTop;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowSearch(false);
      } else {
        setShowSearch(true);
      }
      setLastScrollY(currentScrollY);
    };

    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll);
    }
    return () => feedElement?.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (feedRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (feedRef.current?.scrollTop === 0) {
      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.5, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 1500);
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveIndex(index);
          }
        });
      },
      { threshold: 0.5 }
    );

    const postElements = document.querySelectorAll('.post-item');
    postElements.forEach((post) => observer.observe(post));

    return () => observer.disconnect();
  }, [filteredPosts]);

  return (
    <div 
      ref={feedRef}
      className="h-full w-full overflow-y-auto scrollbar-hide bg-bg-primary pb-[calc(6rem+env(safe-area-inset-bottom))] relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <motion.div 
        animate={{ 
          height: isRefreshing ? 60 : pullDistance,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0
        }}
        className="flex items-center justify-center overflow-hidden bg-bg-primary"
      >
        <div className={`w-6 h-6 border-2 border-accent-blue/20 border-t-accent-blue rounded-full ${isRefreshing ? 'animate-spin' : ''}`} 
             style={{ transform: `rotate(${pullDistance * 3}deg)` }} />
      </motion.div>

      <div className="w-full bg-bg-primary z-40">
        <StoryBar 
          stories={stories} 
          onMarkStoryViewed={onMarkStoryViewed} 
          onOpenStories={onOpenStories}
          onOpenLive={onOpenLive}
          language={language} 
        />
      </div>

      {/* Search Bar - More subtle and integrated */}
      <motion.div 
        initial={false}
        animate={{ 
          y: showSearch ? 0 : -20,
          opacity: showSearch ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="px-4 py-4 bg-bg-primary"
      >
        <div 
          onClick={handleSearchActive}
          className="relative group transition-all duration-300 cursor-pointer"
        >
          <div className="w-full h-[44px] bg-text-primary/5 border border-border-primary/50 rounded-2xl pl-11 pr-11 text-sm text-text-primary/40 flex items-center transition-all hover:bg-text-primary/10">
            {searchQuery || (language === 'uz' ? 'Qidirish...' : 'Search...')}
          </div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-primary/30">
            <Search size={16} strokeWidth={2} />
          </div>
          {searchQuery && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-text-primary/5 rounded-full transition-colors"
            >
              <X size={14} strokeWidth={2} className="text-text-primary/30" />
            </button>
          )}
        </div>
      </motion.div>

      <SearchOverlay 
        isOpen={isSearchActive}
        onClose={handleSearchClose}
        onSearch={setSearchQuery}
        language={language}
        initialQuery={searchQuery}
      />

      {filteredPosts.map((post, index) => (
        <div key={post.id} className="post-item" data-index={index}>
          <Post 
            post={post} 
            isActive={index === activeIndex} 
            onToggleLike={() => onToggleLike(post.id)}
            onToggleSave={() => onToggleSave(post.id)}
            onOpenReels={() => onOpenReels(filteredPosts, index)}
            onOpenShopProfile={() => onOpenShopProfile(post.seller.id)}
            onOpenDetails={() => onOpenPostDetails(post)}
            onOpenComments={() => onOpenPostComments(post)}
            onOpenChat={() => onOpenChat && onOpenChat(post.seller.id)}
            onSharePost={() => onSharePost(post)}
            onToggleSubscribe={() => onToggleSubscribe(post.seller.id)}
            language={language}
            isMuted={globalMuted}
            onToggleMute={() => setGlobalMuted(!globalMuted)}
          />
        </div>
      ))}

      {filteredPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Search size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Hech narsa topilmadi</p>
        </div>
      )}
    </div>
  );
};

export default Feed;
