import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Phone, Send, MapPin, Clock, Users, Grid, Play, 
  MessageCircle, Navigation, Store, Sparkles, Zap, Award, 
  ChevronRight, Star, Check
} from 'lucide-react';
import { Seller, PostData } from '../types';
import { Language, translations } from '../translations';
import { isVideoUrl, useShare, safePlayVideo, getProxiedUrl, getPostThumbnailUrl } from '../utils/mediaUtils';
import { ImageWithFallback } from './ImageWithFallback';

const ShopCoverVideo: React.FC<{ url: string }> = ({ url }) => {
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
      className="w-full h-full object-cover"
      muted
      playsInline
      webkit-playsinline="true"
      x5-playsinline="true"
      x5-video-player-type="h5"
      x5-video-player-fullscreen="false"
      loop
    />
  );
};
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';

interface ShopProfileProps {
  seller: Seller;
  posts: PostData[];
  isOpen: boolean;
  onClose: () => void;
  onToggleSubscribe: (sellerId: string) => void;
  onOpenChat: (sellerId: string) => void;
  onOpenPostDetails: (posts: PostData[], index: number) => void;
  language: Language;
  allPosts?: PostData[];
  lastViewedPostId?: string | null;
}

const ShopProfile: React.FC<ShopProfileProps> = ({ 
  seller, 
  posts, 
  isOpen, 
  onClose, 
  onToggleSubscribe,
  onOpenChat,
  onOpenPostDetails,
  language,
  allPosts = [],
  lastViewedPostId = null
}) => {
  const t = translations[language];
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts'>('posts');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { shareContent } = useShare();

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isOpen) return null;

  const handlePhoneClick = () => {
    if (seller.phone) {
      window.location.href = `tel:${seller.phone}`;
    }
  };

  const handleMessageClick = () => {
    onOpenChat(seller.id);
  };

  // Mock Lookbooks (Obrazlar)
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-[60000] bg-bg-primary flex flex-col"
    >
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between pointer-events-none">
        <button 
          onClick={onClose}
          className="p-2 bg-black/20 backdrop-blur-md text-white hover:bg-black/40 rounded-full transition-colors pointer-events-auto"
        >
          <X size={24} />
        </button>
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={async () => {
              const shareData = {
                title: seller.name,
                text: seller.description,
                url: `${window.location.origin}?shop=${seller.id}`,
              };
              await shareContent(shareData.title, shareData.text, shareData.url);
            }}
            className="p-2 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero Section */}
        <div className="relative h-[300px] w-full overflow-hidden bg-text-primary/5">
          {(() => {
            const latestPost = posts.find(p => p.mediaUrls && p.mediaUrls.length > 0);
            const mediaUrl = latestPost?.mediaUrls?.[0] || seller.coverImage;
            const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;

            if (isVideo) {
              return (
                <ShopCoverVideo url={mediaUrl + '#t=0.1'} />
              );
            }

            return (
              <img 
                src={mediaUrl || `https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800`}
                alt="Cover"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            );
          })()}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/20 to-transparent" />
          
          {/* Shop Identity Overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex items-end gap-4">
            <div className="relative">
              <div className="p-[3px] bg-gradient-to-br from-accent-blue to-accent-light rounded-3xl shadow-2xl">
                <div className="p-[2px] bg-bg-primary rounded-[22px]">
                  {seller.logo ? (
                    <img 
                      src={seller.logo} 
                      alt={seller.name} 
                      className="w-20 h-20 rounded-[20px] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-[20px] bg-white flex items-center justify-center text-accent-blue">
                      <Store size={40} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              </div>
              {seller.isVerified && (
                <div className="absolute -top-1 -right-1 bg-accent-blue text-white p-1 rounded-full border-2 border-bg-primary shadow-lg">
                  <Award size={12} fill="currentColor" />
                </div>
              )}
            </div>
            
              <div className="flex-1 mb-1">
                <h1 className="text-2xl font-black text-text-primary tracking-tight leading-none mb-1">
                  {seller.name}
                </h1>
              </div>
          </div>
        </div>

        {/* Style Match & Stats Bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-border-primary">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-lg font-black text-text-primary">{(seller.followers || 0).toLocaleString()}</span>
              <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest">{t.followers}</span>
            </div>
            <div className="w-px h-6 bg-border-primary" />
            <div className="flex flex-col">
              <span className="text-lg font-black text-text-primary">{posts.length}</span>
              <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest">Postlar</span>
            </div>
          </div>
        </div>

        {/* Action Buttons & Quick Contacts */}
        <div className="px-6 py-6 space-y-4">
          <div className="flex gap-3">
            <button 
              onClick={() => onToggleSubscribe(seller.id)}
              className={`flex-[2] py-4 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 ${
                seller.isSubscribed 
                ? 'bg-text-primary/5 text-text-primary border border-border-primary' 
                : 'bg-text-primary text-bg-primary shadow-xl shadow-text-primary/10'
              }`}
            >
              {seller.isSubscribed ? <Users size={14} /> : <Zap size={14} fill="currentColor" />}
              {seller.isSubscribed ? t.subscribed : t.subscribe}
            </button>
            
            <button 
              onClick={handleMessageClick}
              className="flex-1 py-4 bg-gradient-to-br from-accent-blue to-accent-light text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-accent-blue/20 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <MessageCircle size={18} className="relative z-10" />
            </button>
          </div>

          {/* Contact Links Grid */}
          <div className="grid grid-cols-1 gap-3">
            {/* Phone */}
            {seller.phone && (
              <button 
                onClick={handlePhoneClick}
                className="bg-text-primary/5 p-4 rounded-[28px] border border-border-primary flex flex-col items-center gap-2 transition-all active:scale-95 hover:bg-green-500/5 hover:border-green-500/20 group"
              >
                <div className="p-2.5 bg-green-500/10 text-green-500 rounded-2xl group-hover:bg-green-500 group-hover:text-white transition-colors">
                  <Phone size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Telefon</span>
              </button>
            )}
          </div>

          {/* Display Phone Number Clearly */}
          {seller.phone && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-black text-text-primary tracking-wider">{seller.phone}</span>
            </div>
          )}
        </div>

        {/* Enhanced Shop Info Section */}
        <div className="px-6 mb-8 space-y-4">
          {/* Map Card */}
          {seller.location && (
            <div className="relative overflow-hidden bg-red-500/5 backdrop-blur-xl p-5 rounded-[32px] border border-white/10 shadow-xl">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20">
                      <MapPin size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-600/60">Manzil</span>
                      <span className="text-xs font-black text-text-primary">Xaritada ko'rish</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowMap(true)}
                    className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-600"
                  >
                    <Navigation size={20} />
                  </button>
                </div>
                <div 
                  className="h-32 rounded-2xl overflow-hidden border border-white/10 cursor-pointer"
                  onClick={() => setShowMap(true)}
                >
                  <YMaps query={{ lang: language === 'ru' ? 'ru_RU' : 'en_US' }}>
                    <Map 
                      state={{ center: [seller.location.lat, seller.location.lng], zoom: 15 }}
                      width="100%"
                      height="100%"
                      options={{ suppressMapOpenBlock: true }}
                    >
                      <Placemark geometry={[seller.location.lat, seller.location.lng]} />
                    </Map>
                  </YMaps>
                </div>
              </div>
            </div>
          )}

          {/* Prominent Description Card */}
          {seller.description && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden bg-white dark:bg-bg-primary rounded-[32px] border-2 border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none p-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-[14px] flex items-center justify-center border border-blue-100 dark:border-blue-500/20 shadow-sm">
                    <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Do'kon haqida</span>
                </div>
                <div className="relative">
                  <svg className="absolute -top-3 -left-2 w-8 h-8 text-blue-500/10 dark:text-blue-400/10 transform -scale-x-100" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                  </svg>
                  <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed pl-4 relative z-10">
                    {seller.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Working Schedule Card - Glassmorphism */}
            <div className="relative overflow-hidden bg-white dark:bg-bg-primary rounded-[32px] border-2 border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none p-6">
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 rounded-[14px] flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                      <Clock size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-0.5">Ish tartibi</span>
                      <span className="text-[15px] font-black text-slate-800 dark:text-white tracking-tight">{seller.workingHours || '09:00 - 20:00'}</span>
                    </div>
                  </div>
                  
                  {/* Active Pulse Indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Ochiq</span>
                  </div>
                </div>
                
                {/* Continuous Pill Track for Days */}
                <div className="relative bg-slate-50 dark:bg-white/5 rounded-2xl p-1.5 flex justify-between items-center border border-slate-100 dark:border-white/5">
                  {[
                    { key: 'Mon', label: 'Du' },
                    { key: 'Tue', label: 'Se' },
                    { key: 'Wed', label: 'Ch' },
                    { key: 'Thu', label: 'Pa' },
                    { key: 'Fri', label: 'Ju' },
                    { key: 'Sat', label: 'Sh' },
                    { key: 'Sun', label: 'Ya' }
                  ].map((day) => {
                    const isActive = seller.workingDays?.includes(day.key) ?? !['Sat', 'Sun'].includes(day.key);
                    return (
                      <div key={day.key} className="relative z-10 flex-1 flex justify-center">
                        <div className={`w-full mx-0.5 py-2 rounded-xl flex items-center justify-center text-[11px] font-black transition-all duration-300 ${
                          isActive 
                          ? 'bg-white dark:bg-[#2A2B2E] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-white/5 transform scale-105' 
                          : 'bg-transparent text-slate-400 dark:text-slate-500'
                        }`}>
                          {day.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Centered and Styled */}
        <div className="px-6 mb-6 flex justify-center">
          <div className="bg-text-primary/5 p-1 rounded-2xl flex items-center gap-1 border border-border-primary">
            <button
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all rounded-xl relative text-bg-primary bg-text-primary shadow-lg"
            >
              <Grid size={14} />
              Postlar
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-24">
          {activeTab === 'posts' && (
            <div className="grid grid-cols-2 gap-0">
              {posts.map((post, index) => {
                const isViewed = lastViewedPostId === post.id;
                return (
                <motion.div
                  key={post.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenPostDetails(posts, index)}
                  className={`aspect-[9/16] relative group overflow-hidden bg-neutral-900 shadow-sm transition-all duration-500 ease-out ${isViewed ? 'ring-2 ring-inset ring-white/50 opacity-50 z-10' : ''}`}
                >
                  {isVideoUrl(getPostThumbnailUrl(post)) ? (
                    <video 
                      src={`${getProxiedUrl(getPostThumbnailUrl(post), 0)}#t=0.1`}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isViewed ? 'scale-105' : ''}`}
                      preload="metadata"
                      muted
                      playsInline
                      webkit-playsinline="true"
                      x5-playsinline="true"
                      x5-video-player-type="h5"
                      x5-video-player-fullscreen="false"
                    />
                  ) : (
                    <ImageWithFallback 
                      originalSrc={getPostThumbnailUrl(post)} 
                      alt={post.outfitName}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isViewed ? 'scale-105' : ''}`}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className={`absolute inset-0 transition-colors pointer-events-none ${isViewed ? 'bg-black/40' : 'bg-black/0 group-hover:bg-black/20'}`} />
                </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Location Modal */}
      <AnimatePresence>
        {showMap && seller.location && (
          <div className="absolute inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-bg-primary rounded-3xl overflow-hidden shadow-2xl border border-border-primary flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-border-primary flex items-center justify-between bg-bg-primary/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-accent-blue" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-text-primary">Do'kon Joylashuvi</h3>
                </div>
                <button 
                  onClick={() => setShowMap(false)}
                  className="p-2 hover:bg-text-primary/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div 
                className="flex-1 relative min-h-[300px] cursor-pointer group"
                onClick={() => window.open(`https://yandex.com/maps/?pt=${seller.location!.lng},${seller.location!.lat}&z=16&l=map`, '_blank')}
              >
                <YMaps query={{ lang: language === 'ru' ? 'ru_RU' : 'en_US' }}>
                  <Map 
                    state={{ center: [seller.location.lat, seller.location.lng], zoom: 15 }}
                    width="100%"
                    height="100%"
                    options={{ suppressMapOpenBlock: true }}
                  >
                    <Placemark 
                      geometry={[seller.location.lat, seller.location.lng]} 
                      properties={{
                        iconContent: `
                          <div style="position: relative; width: 50px; height: 50px;">
                            <div class="pulse-ring" style="position: absolute; top: 50%; left: 50%; width: 60px; height: 60px; border-radius: 50%; background: rgba(0, 149, 255, 0.4); z-index: 1;"></div>
                            <div style="position: relative; z-index: 2; width: 50px; height: 50px; background: white; border-radius: 50%; border: 3px solid #0095FF; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                              <img src="${seller.logo || `https://ui-avatars.com/api/?name=${seller.name}&background=random`}" style="width: 100%; height: 100%; object-fit: cover;" referrerpolicy="no-referrer" />
                            </div>
                            <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #0095FF; z-index: 1;"></div>
                          </div>
                        `
                      }}
                      options={{
                        iconLayout: 'default#imageWithContent',
                        iconImageHref: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                        iconImageSize: [1, 1],
                        iconImageOffset: [-25, -25],
                        iconContentOffset: [-25, -25],
                      }}
                    />
                  </Map>
                </YMaps>
              </div>

              <div className="p-4 bg-bg-primary border-t border-border-primary">
                <button 
                  onClick={() => window.open(`https://yandex.com/maps/?pt=${seller.location!.lng},${seller.location!.lat}&z=16&l=map`, '_blank')}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  <Navigation size={18} />
                  Yandex Maps orqali ochish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Custom Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="absolute bottom-32 left-1/2 z-[12000] px-6 py-3 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl text-white text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl"
          >
            <Check size={16} className="text-green-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ShopProfile;
