import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Users, Play, Check, Search, X, Store, BadgeCheck } from 'lucide-react';
import { Story, Seller, SELLER_CATEGORIES, PostData } from '../types';
import SearchOverlay from './SearchOverlay';
import { isVideoUrl, safePlayVideo } from '../utils/mediaUtils';

const BrandVideo: React.FC<{ url: string }> = ({ url }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      safePlayVideo(videoRef.current);
    }
  }, [url]);

  return (
    <video
      ref={videoRef}
      src={url}
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      muted
      playsInline
      loop
    />
  );
};

import { Language, translations } from '../translations';

import Logo from './Logo';

interface BrandsProps {
  language: Language;
  stories: Story[];
  sellers: Seller[];
  posts: PostData[];
  onToggleSubscribe: (sellerId: string) => void;
  onMarkStoryViewed: (storyId: string) => void;
  onOpenStories: (stories: Story[], index: number) => void;
  onOpenLive: (story: Story) => void;
  onOpenShopProfile: (id: string) => void;
  onRefresh: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchActive: (active: boolean) => void;
  isSearchActive: boolean;
}

const Brands: React.FC<BrandsProps> = ({ 
  language, 
  stories = [], 
  sellers = [], 
  posts = [],
  onToggleSubscribe, 
  onMarkStoryViewed,
  onOpenStories,
  onOpenLive,
  onOpenShopProfile,
  onRefresh,
  searchQuery = '',
  setSearchQuery,
  onSearchActive,
  isSearchActive = false
}) => {
  const t = translations[language];
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isPulling, setIsPulling] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'all' | 'subscribed'>('all');

  const handleSearchActive = () => {
    onSearchActive(true);
  };

  const handleSearchClose = () => {
    onSearchActive(false);
  };

  const touchStartY = React.useRef(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || containerRef.current?.scrollTop !== 0) return;
    
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;
    
    if (distance > 0) {
      // Resistance logic
      const resistance = 0.4;
      const dampedDistance = Math.min(distance * resistance, 100);
      setPullDistance(dampedDistance);
      
      // Prevent default to stop native scroll when pulling
      if (distance > 10 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPulling(false);
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

  // Sort stories: live first, then unviewed, then viewed
  const sortedStories = React.useMemo(() => {
    return [...stories].sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isViewed === b.isViewed) return 0;
      return a.isViewed ? 1 : -1;
    });
  }, [stories]);

  const handleStoryClick = (sellerId: string) => {
    const storyIndex = sortedStories.findIndex(s => s.seller.id === sellerId);
    if (storyIndex !== -1) {
      const story = sortedStories[storyIndex];
      if (story.isLive) {
        onOpenLive(story);
      } else {
        onOpenStories(sortedStories, storyIndex);
      }
    }
  };

  const handleStoryIdxClick = (idx: number) => {
    const story = sortedStories[idx];
    if (story.isLive) {
      onOpenLive(story);
    } else {
      onOpenStories(sortedStories, idx);
    }
  };

  const filteredSellers = React.useMemo(() => {
    let baseSellers = sellers;
    if (viewMode === 'subscribed') {
      baseSellers = sellers.filter(s => s.isSubscribed);
    }

    return baseSellers.filter(s => {
      const matchesSearch = !searchQuery || 
        (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.categories || []).some(cat => (cat || '').toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !selectedCategory || (s.categories || []).includes(selectedCategory as any);
      
      return matchesSearch && matchesCategory;
    });
  }, [sellers, searchQuery, selectedCategory, viewMode]);

  return (
    <div 
      ref={containerRef}
      className="h-full w-full overflow-y-auto scrollbar-hide bg-bg-primary px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] relative"
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
        className="flex items-center justify-center overflow-hidden bg-bg-primary -mx-4"
      >
        <div className={`w-6 h-6 border-2 border-accent-blue/20 border-t-accent-blue rounded-full ${isRefreshing ? 'animate-spin' : ''}`} 
             style={{ transform: `rotate(${pullDistance * 3}deg)` }} />
      </motion.div>

      {/* Stories Section */}
      <div className="bg-bg-primary -mx-4 px-4 pt-4 pb-4 mb-4 border-b border-border-primary/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-widest bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent">
            {language === 'uz' ? "Jonli Storylar" : language === 'uz-cyrl' ? "Жонли Сторилар" : language === 'ru' ? "Живые Истории" : "Live Stories"}
          </h2>
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">LIVE</span>
          </div>
        </div>
        
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {sortedStories.map((story, idx) => (
            <motion.div
              key={story.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleStoryIdxClick(idx)}
              className={`relative flex-shrink-0 w-[96px] h-[96px] rounded-full p-[2px] cursor-pointer group transition-all duration-500 ${
                story.isLive 
                  ? 'bg-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                  : story.isViewed 
                    ? 'bg-text-primary/10' 
                    : 'bg-gradient-to-tr from-blue-500 via-blue-500 to-purple-600 shadow-lg shadow-purple-500/20'
              }`}
            >
              <div className="w-full h-full rounded-full bg-bg-primary p-[2px]">
                {story.seller.logo ? (
                  <img
                    src={story.seller.logo}
                    alt={story.seller.name}
                    className={`w-full h-full rounded-full object-cover transition-all ${
                      story.isLive 
                        ? 'opacity-100' 
                        : story.isViewed 
                          ? 'opacity-50 grayscale-[0.5]' 
                          : 'group-hover:scale-105'
                    }`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-full h-full rounded-full bg-white flex items-center justify-center text-accent-blue transition-all ${
                    story.isLive 
                      ? 'opacity-100' 
                      : story.isViewed 
                        ? 'opacity-50 grayscale-[0.5]' 
                        : 'group-hover:scale-105'
                  }`}>
                    <Store size={24} strokeWidth={1.5} />
                  </div>
                )}
              </div>
              {story.isLive ? (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest text-white border-2 border-bg-primary">
                  Live
                </div>
              ) : !story.isViewed && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-accent-blue to-accent-light rounded-full border-2 border-bg-primary flex items-center justify-center shadow-lg">
                  <Play size={10} fill="white" className="text-white ml-0.5" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Search Bar and Category Chips */}
      <div className="bg-bg-primary -mx-4 px-4 py-4 mb-4 space-y-4">
        <div 
          onClick={handleSearchActive}
          className="relative group transition-all duration-300 focus-within:scale-[1.01] cursor-pointer"
        >
          <div className="w-full h-[48px] bg-white/95 dark:bg-white/10 backdrop-blur-xl border-none rounded-full pl-12 pr-12 text-sm text-text-primary/40 flex items-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_20px_50px_rgba(255,255,255,0.05)] transition-all">
            {searchQuery || (language === 'uz' ? "Do'konlarni qidirish..." : language === 'uz-cyrl' ? "Дўконларни қидириш..." : language === 'ru' ? "Поиск магазинов..." : "Search shops...")}
          </div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            <Search size={18} strokeWidth={1.5} />
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
              <X size={16} strokeWidth={1.5} className="text-[#9CA3AF]" />
            </button>
          )}
        </div>

        <SearchOverlay 
          isOpen={isSearchActive}
          onClose={handleSearchClose}
          onSearch={setSearchQuery}
          language={language}
          initialQuery={searchQuery}
        />

        {/* Category Visual Cards */}
        <div className="relative -mx-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-4">
            {/* All Category */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(null)}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className={`w-16 h-16 rounded-2xl overflow-hidden relative transition-all duration-300 flex items-center justify-center ${
                !selectedCategory 
                  ? 'ring-2 ring-accent-blue ring-offset-2 ring-offset-bg-primary shadow-lg scale-105' 
                  : 'bg-accent-blue/5 group-hover:bg-accent-blue/10'
              }`}>
                {!selectedCategory ? (
                  <Logo width={40} height={40} showText={false} animated={true} />
                ) : (
                  <Logo width={40} height={40} showText={false} className="opacity-60 grayscale-[0.5]" />
                )}
                <div className="absolute inset-0 bg-black/5" />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-md border transition-all ${
                !selectedCategory
                  ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
                  : 'bg-text-primary/5 text-text-secondary border-transparent'
              }`}>
                {language === 'uz' ? "Barchasi" : language === 'ru' ? "Все" : "All"}
              </span>
            </motion.button>

            {SELLER_CATEGORIES.map((cat) => {
              const categoryImages: Record<string, string> = {
                'Erkaklar kiyinishi': 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&q=80&w=200',
                'Ayollar kiyinishi': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=200',
                'Aksessuarlar': 'https://images.unsplash.com/photo-1509319117193-57bab727e09d?auto=format&fit=crop&q=80&w=200',
                'Texnika': 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&q=80&w=200',
                'Go‘zallik': 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&q=80&w=200',
                'Xonadon': 'https://images.unsplash.com/photo-1581539250439-c96689b516dd?auto=format&fit=crop&q=80&w=200',
                'Xizmatlar': 'https://images.unsplash.com/photo-1454165833767-0274b27f28a0?auto=format&fit=crop&q=80&w=200',
                'Boshqa': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200'
              };

              return (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(cat)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                >
                  <div className={`w-16 h-16 rounded-2xl overflow-hidden relative transition-all duration-300 ${
                    selectedCategory === cat 
                      ? 'p-[2px] bg-gradient-to-tr from-blue-500 via-blue-500 to-purple-600 shadow-lg scale-105' 
                      : 'group-hover:scale-105'
                  }`}>
                    <div className="w-full h-full rounded-[14px] overflow-hidden">
                      <img 
                        src={categoryImages[cat]}
                        className="w-full h-full object-cover"
                        alt={cat}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className={`absolute inset-0 transition-opacity duration-300 ${
                      selectedCategory === cat ? 'bg-black/0' : 'bg-black/10'
                    }`} />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-md border transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-blue-500/10 via-blue-500/10 to-purple-600/10 text-transparent bg-clip-text border-transparent'
                      : 'bg-text-primary/5 text-text-secondary border-transparent'
                  }`}>
                    {cat}
                  </span>
                </motion.button>
              );
            })}
          </div>
          {/* Fade effect */}
          <div className="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-bg-primary to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-xl transition-all ${
              viewMode === 'all' 
                ? 'bg-gradient-to-r from-accent-blue to-accent-light shadow-lg shadow-accent-blue/20' 
                : 'bg-text-primary/5 text-text-secondary'
            }`}
          >
            <h2 className={`text-xl font-black uppercase tracking-tighter ${viewMode === 'all' ? 'text-white' : ''}`}>
              {t.brands}
            </h2>
          </button>
          
          <button 
            onClick={() => setViewMode('subscribed')}
            className={`px-4 py-2 rounded-xl transition-all ${
              viewMode === 'subscribed' 
                ? 'bg-black text-white shadow-lg shadow-black/20' 
                : 'bg-text-primary/5 text-text-secondary'
            }`}
          >
            <h2 className="text-xl font-black uppercase tracking-tighter">
              {language === 'uz' ? "Obunalar" : 
               language === 'uz-cyrl' ? "Обуналар" : 
               language === 'ru' ? "Подписки" : 
               "Subscriptions"}
            </h2>
          </button>
        </div>
        
        <p className="text-text-secondary text-[10px] mt-2 uppercase tracking-[0.2em] font-bold opacity-70">
          {viewMode === 'all' ? (
            language === 'uz' ? "Platformadagi eng mashhur do'konlar" :
            language === 'uz-cyrl' ? "Платформадаги энг машҳур дўконлар" :
            language === 'ru' ? "Самые популярные магазины на платформе" :
            "Most popular shops on the platform"
          ) : (
            language === 'uz' ? "Siz obuna bo'lgan do'konlar" :
            language === 'uz-cyrl' ? "Сиз обуна бўлган дўkonlar" :
            language === 'ru' ? "Магазины, на которые вы подписаны" :
            "Shops you are subscribed to"
          )}
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-2 gap-4">
        {filteredSellers.length > 0 ? (
          filteredSellers.map((seller, index) => {
            const isLarge = index % 5 === 0; // Every 5th item is large (full width)
            return (
              <motion.div
                key={seller.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onOpenShopProfile(seller.id)}
                className={`relative overflow-hidden rounded-3xl group cursor-pointer border border-border-primary/50 shadow-sm hover:shadow-xl transition-all duration-500 ${
                  isLarge ? 'col-span-2 h-48' : 'h-64'
                }`}
              >
                {/* Cover Image with Overlay */}
                <div className="absolute inset-0 bg-text-primary/10">
                  {(() => {
                    const latestPost = posts.find(p => {
                      const postSellerId = p.seller?.id || (p as any).sellerId || (p as any).uid;
                      const sellerId = seller.id;
                      const matchesId = postSellerId && String(postSellerId) === String(sellerId);
                      
                      const postSellerName = (p.seller?.name || (p as any).sellerName || '').toLowerCase().trim();
                      const sellerName = (seller.name || '').toLowerCase().trim();
                      const matchesName = sellerName && postSellerName === sellerName;

                      return (matchesId || matchesName) && p.mediaUrls && p.mediaUrls.length > 0;
                    });

                    const mediaUrl = latestPost?.mediaUrls?.[0] || seller.coverImage;
                    const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;

                    if (isVideo) {
                      return (
                        <BrandVideo url={mediaUrl + '#t=0.1'} />
                      );
                    }

                    return (
                      <img 
                        src={mediaUrl || `https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800`}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    );
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        seller.hasStory && handleStoryClick(seller.id);
                      }}
                      className={`p-[2px] rounded-full transition-all duration-500 hover:scale-110 active:scale-95 ${
                        seller.hasStory 
                          ? (stories.find(s => s.seller.id === seller.id)?.isViewed 
                              ? 'bg-white/20' 
                              : 'bg-gradient-to-tr from-accent-blue to-accent-light animate-gradient') 
                          : 'bg-white/20'
                      }`}
                    >
                      <div className="p-[2px] bg-black/20 backdrop-blur-md rounded-full">
                        {seller.logo ? (
                          <img 
                            src={seller.logo} 
                            alt={seller.name} 
                            className={`w-12 h-12 rounded-full object-cover border-2 border-white/10 ${stories.find(s => s.seller.id === seller.id)?.isViewed ? 'opacity-50' : ''}`}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-accent-blue">
                            <Store size={24} strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                    </div>

                    {seller.isVerified && (
                      <div className="bg-accent-blue/20 backdrop-blur-md p-1.5 rounded-full border border-accent-blue/30">
                        <BadgeCheck size={16} className="text-accent-blue fill-accent-blue/20" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="text-base font-black text-white truncate">
                          {seller.name}
                        </h3>
                        {seller.isVerified && <BadgeCheck size={14} className="text-accent-blue fill-accent-blue/20" />}
                      </div>
                      {seller.categories && seller.categories.length > 0 && (
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider truncate">
                          {seller.categories[0]}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-white/70">
                        <Users size={12} />
                        <span className="text-xs font-bold tracking-tight">
                          {(seller.followers || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSubscribe(seller.id);
                      }}
                      className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 backdrop-blur-md ${
                        seller.isSubscribed 
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'bg-white text-black shadow-lg shadow-white/10'
                      }`}
                    >
                      {seller.isSubscribed ? (
                        <>
                          <Check size={12} />
                          {language === 'uz' ? "Obuna bo'lindi" :
                           language === 'uz-cyrl' ? "Обуна бўлинди" :
                           language === 'ru' ? "Подписано" :
                           "Subscribed"}
                        </>
                      ) : (
                        language === 'uz' ? "Obuna bo'lish" :
                        language === 'uz-cyrl' ? "Обуна бўлиш" :
                        language === 'ru' ? "Подписаться" :
                        "Subscribe"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-2 py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-text-primary/5 flex items-center justify-center text-text-secondary/20 mb-6">
              <Search size={40} strokeWidth={1} />
            </div>
            <h3 className="text-lg font-black text-text-primary mb-2">
              {viewMode === 'subscribed' 
                ? (language === 'uz' ? "Obunalar mavjud emas" : "No subscriptions yet")
                : (language === 'uz' ? "Hech narsa topilmadi" : "No results found")}
            </h3>
            <p className="text-sm text-text-secondary font-medium max-w-[200px]">
              {viewMode === 'subscribed'
                ? (language === 'uz' ? "Yangi brendlarga obuna bo'ling va ularni shu yerda ko'ring" : "Subscribe to new brands and see them here")
                : (language === 'uz' ? "Boshqa kalit so'zlar yoki kategoriyalarni sinab ko'ring" : "Try different keywords or categories")}
            </p>
            {viewMode === 'subscribed' && (
              <button 
                onClick={() => setViewMode('all')}
                className="mt-8 px-6 py-3 bg-accent-blue text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-accent-blue/20 active:scale-95 transition-all"
              >
                {language === 'uz' ? "Brendlarni ko'rish" : "Explore Brands"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Brands;
