import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Phone, Instagram, Send, MapPin, Clock, Users, Grid, Play, 
  MessageCircle, Navigation, Store, Sparkles, Zap, Award, 
  ChevronRight, Star, Check
} from 'lucide-react';
import { Seller, PostData } from '../types';
import { Language, translations } from '../translations';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';

interface ShopProfileProps {
  seller: Seller;
  posts: PostData[];
  isOpen: boolean;
  onClose: () => void;
  onToggleSubscribe: (sellerId: string) => void;
  onOpenChat: (sellerId: string) => void;
  onOpenPostDetails: (post: PostData) => void;
  language: Language;
  allPosts?: PostData[];
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
  allPosts = []
}) => {
  const t = translations[language];
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'lookbooks'>('posts');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isOpen) return null;

  const handleInstagramClick = () => {
    if (seller.instagram) {
      window.open(seller.instagram, '_blank');
    }
  };

  const handleTelegramClick = () => {
    if (seller.telegram) {
      window.open(seller.telegram, '_blank');
    }
  };

  const handlePhoneClick = () => {
    if (seller.phone) {
      window.location.href = `tel:${seller.phone}`;
    }
  };

  const handleMessageClick = () => {
    onOpenChat(seller.id);
  };

  // Mock Lookbooks (Obrazlar)
  const lookbooks = [
    { id: 1, name: 'Summer Breeze', items: 4, image: posts[0]?.mediaUrls[0] || '' },
    { id: 2, name: 'Urban Night', items: 3, image: posts[1]?.mediaUrls[0] || '' },
    { id: 3, name: 'Classic Office', items: 5, image: posts[2]?.mediaUrls[0] || '' },
  ];

  // Mock Style Match Score
  const styleMatchScore = 85;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[10000] bg-bg-primary flex flex-col"
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
                url: window.location.href,
              };
              try {
                if (navigator.share) {
                  await navigator.share(shareData);
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  showToast(language === 'uz' ? 'Do\'kon havolasi nusxalandi!' : 'Shop link copied!');
                }
              } catch (err: any) {
                if (err.name !== 'AbortError') {
                  await navigator.clipboard.writeText(window.location.href);
                  showToast(language === 'uz' ? 'Do\'kon havolasi nusxalandi!' : 'Shop link copied!');
                }
              }
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
          {seller.coverImage && (
            <img 
              src={seller.coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-blue/10 rounded-full border border-accent-blue/20">
                  <Star size={10} className="text-accent-blue" fill="currentColor" />
                  <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">4.9 {t.top_rated}</span>
                </div>
              </div>
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

          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-accent-blue/5 to-accent-light/5 rounded-2xl border border-accent-blue/10">
            <div className="relative w-10 h-10">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-text-primary/5"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="url(#matchGradient)"
                  strokeWidth="3"
                  strokeDasharray={113}
                  strokeDashoffset={113 - (113 * styleMatchScore) / 100}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-accent-blue)" />
                    <stop offset="100%" stopColor="var(--color-accent-light)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-accent-blue">{styleMatchScore}%</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-text-primary uppercase tracking-widest">{t.style_match}</span>
              <span className="text-[8px] text-text-secondary uppercase font-bold tracking-tighter">Sizga mos keladi</span>
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
          <div className="grid grid-cols-3 gap-3">
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

            {/* Telegram */}
            {seller.telegram && (
              <button 
                onClick={handleTelegramClick}
                className="bg-text-primary/5 p-4 rounded-[28px] border border-border-primary flex flex-col items-center gap-2 transition-all active:scale-95 hover:bg-[#0088cc]/5 hover:border-[#0088cc]/20 group"
              >
                <div className="p-2.5 bg-[#0088cc]/10 text-[#0088cc] rounded-2xl group-hover:bg-[#0088cc] group-hover:text-white transition-colors">
                  <Send size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Telegram</span>
              </button>
            )}

            {/* Instagram */}
            {seller.instagram && (
              <button 
                onClick={handleInstagramClick}
                className="bg-text-primary/5 p-4 rounded-[28px] border border-border-primary flex flex-col items-center gap-2 transition-all active:scale-95 hover:bg-[#E4405F]/5 hover:border-[#E4405F]/20 group"
              >
                <div className="p-2.5 bg-[#E4405F]/10 text-[#E4405F] rounded-2xl group-hover:bg-[#E4405F] group-hover:text-white transition-colors">
                  <Instagram size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Instagram</span>
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
              className="relative overflow-hidden bg-gradient-to-br from-accent-blue/5 to-accent-light/5 p-6 rounded-[32px] border border-accent-blue/10"
            >
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent-blue/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-accent-blue text-white rounded-xl flex items-center justify-center shadow-lg shadow-accent-blue/20">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue">Do'kon haqida</span>
                </div>
                <p className="text-sm font-medium text-text-primary leading-relaxed">
                  {seller.description}
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Working Schedule Card - Glassmorphism */}
            <div className="relative overflow-hidden bg-accent-blue/5 backdrop-blur-xl p-5 rounded-[32px] border border-white/10 shadow-xl">
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-accent-blue/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent-blue text-white rounded-2xl shadow-lg shadow-accent-blue/20">
                      <Clock size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-accent-blue/60">Ish tartibi</span>
                      <span className="text-xs font-black text-text-primary">{seller.workingHours || '09:00 - 20:00'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Visual Day Indicator */}
                <div className="flex justify-between items-center px-1">
                  {[
                    { key: 'Mon', label: 'D' },
                    { key: 'Tue', label: 'S' },
                    { key: 'Wed', label: 'Ch' },
                    { key: 'Thu', label: 'P' },
                    { key: 'Fri', label: 'J' },
                    { key: 'Sat', label: 'Sh' },
                    { key: 'Sun', label: 'Y' }
                  ].map((day) => {
                    const isActive = seller.workingDays?.includes(day.key);
                    return (
                      <div key={day.key} className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                          isActive 
                          ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20 scale-110' 
                          : 'bg-white/10 text-text-secondary border border-white/5'
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
            {[
              { id: 'posts', label: 'Postlar', icon: <Grid size={14} /> },
              { id: 'lookbooks', label: 'Obrazlar', icon: <Sparkles size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all rounded-xl relative ${
                  activeTab === tab.id 
                  ? 'text-bg-primary bg-text-primary shadow-lg' 
                  : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 pb-24">
          {activeTab === 'posts' && (
            <div className="grid grid-cols-3 gap-1.5">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenPostDetails(post)}
                  className="aspect-square relative group overflow-hidden bg-neutral-900 rounded-2xl border border-border-primary shadow-sm"
                >
                  <img 
                    src={post.mediaUrls[0]} 
                    alt={post.outfitName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  {post.mediaType === 'video' && (
                    <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white">
                      <Play size={10} fill="currentColor" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'lookbooks' && (
            <div className="space-y-4">
              {lookbooks.map((lb) => (
                <div key={lb.id} className="relative h-48 rounded-3xl overflow-hidden group">
                  <img 
                    src={lb.image} 
                    alt={lb.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                    <div>
                      <h4 className="text-white font-black uppercase tracking-widest text-lg mb-1">{lb.name}</h4>
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{lb.items} Mahsulotlar</p>
                    </div>
                    <button className="p-3 bg-white text-black rounded-2xl shadow-xl active:scale-90 transition-all">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Location Modal */}
      <AnimatePresence>
        {showMap && seller.location && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                    <Placemark geometry={[seller.location.lat, seller.location.lng]} />
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
            className="fixed bottom-32 left-1/2 z-[12000] px-6 py-3 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl text-white text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl"
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
