import React from 'react';
import { motion } from 'motion/react';
import { 
  Store, 
  Settings, 
  Phone, 
  Send, 
  MapPin, 
  Navigation, 
  Grid, 
  Sparkles, 
  Clock, 
  Play, 
  PlusCircle,
  Plus
} from 'lucide-react';
import { Map, Placemark } from '@pbe/react-yandex-maps';
import { isVideoUrl, getProxiedUrl } from '../../utils/mediaUtils';
import { Seller, PostData } from '../../types';
import { Language } from '../../translations';
import { ImageWithFallback } from '../ImageWithFallback';

interface MyShopTabProps {
  language: Language;
  shopData: Seller;
  localShopData: Seller;
  posts: PostData[];
  uploadProgress: number | null;
  activeProfileTab: 'Postlar' | 'Ma\'lumot';
  setActiveProfileTab: (tab: 'Postlar' | 'Ma\'lumot') => void;
  handleTabChange: (tab: string) => void;
  handlePhoneClick: () => void;
  setShowMap: (show: boolean) => void;
  setShowManualPostModal: (show: boolean) => void;
  setShowCreateStoryModal: (show: boolean) => void;
  onOpenReels?: (posts: PostData[], index: number) => void;
  setSelectedPostDetails: (post: PostData) => void;
  detectLocation: () => void;
  coverVideoRef: React.RefObject<HTMLVideoElement>;
}

export const MyShopTab = ({
  language,
  shopData,
  localShopData,
  posts,
  uploadProgress,
  activeProfileTab,
  setActiveProfileTab,
  handleTabChange,
  handlePhoneClick,
  setShowMap,
  setShowManualPostModal,
  setShowCreateStoryModal,
  onOpenReels,
  setSelectedPostDetails,
  detectLocation,
  coverVideoRef,
}: MyShopTabProps) => {
  return (
    <div className="h-full overflow-y-auto scrollbar-hide pb-16">
      {/* Hero Section */}

      <div className="relative h-[300px] w-full overflow-hidden bg-text-primary/5">
        {(() => {
          const latestPost = posts.find(p => {
            const postSellerId = p.seller?.id || (p as any).sellerId || (p as any).uid;
            const matchesSeller = String(postSellerId) === String(shopData.id);
            return matchesSeller && p.mediaUrls && p.mediaUrls.length > 0;
          });

          const mediaUrl = latestPost?.mediaUrls?.[0] || shopData.coverImage;
          const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;

          if (isVideo) {
            return (
              <video 
                ref={coverVideoRef}
                src={mediaUrl + '#t=0.1'}
                className="w-full h-full object-cover"
                muted
                playsInline
                loop
              />
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
                {localShopData.logo ? (
                  <img 
                    src={localShopData.logo || undefined} 
                    className="w-20 h-20 rounded-[20px] object-cover" 
                    alt="Logo" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-[20px] bg-white flex items-center justify-center text-accent-blue">
                    <Store size={40} strokeWidth={1.5} />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-bg-primary flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          
          <div className="flex-1 mb-1">
            <h1 className="text-2xl font-black text-text-primary tracking-tight leading-none mb-1 uppercase italic">
              {localShopData.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-border-primary">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-black text-text-primary">0</span>
            <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest">Obunachilar</span>
          </div>
          <div className="w-px h-6 bg-border-primary" />
          <div className="flex flex-col">
            <span className="text-lg font-black text-text-primary">{posts.length}</span>
            <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest">Postlar</span>
          </div>
        </div>
      </div>

      {/* Management Actions */}
      <div className="px-6 py-4 flex gap-3">
        <button 
          onClick={() => handleTabChange('Settings')}
          className="flex-1 py-4 bg-text-primary/5 rounded-[24px] border border-border-primary hover:bg-text-primary/10 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Settings size={16} className="text-text-primary/60" />
          <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">Sozlamalar</span>
        </button>
      </div>

      {/* Contact Links Grid */}
      <div className="px-6 py-2 grid grid-cols-1 gap-3">
        <button 
          onClick={handlePhoneClick}
          className="bg-text-primary/5 p-4 rounded-[28px] border border-border-primary flex flex-col items-center gap-2 transition-all active:scale-95 hover:bg-green-500/5 hover:border-green-500/20 group"
        >
          <div className="p-2.5 bg-green-500/10 text-green-500 rounded-2xl group-hover:bg-green-500 group-hover:text-white transition-colors">
            <Phone size={18} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Telefon</span>
        </button>
      </div>

      {/* Info Cards */}
      <div className="px-6 mb-8 space-y-4">
        {localShopData.location && (
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
                <Map 
                  state={{ center: [localShopData.location.lat, localShopData.location.lng], zoom: 15 }}
                  width="100%"
                  height="100%"
                  options={{ suppressMapOpenBlock: true }}
                >
                  <Placemark geometry={[localShopData.location.lat, localShopData.location.lng]} />
                </Map>
              </div>
            </div>
          </div>
        )}

        {localShopData.description && (
          <div className="relative overflow-hidden bg-white dark:bg-bg-primary rounded-[32px] border-2 border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-[14px] flex items-center justify-center border border-blue-100 dark:border-blue-500/20 shadow-sm">
                  <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Do'kon haqida</span>
              </div>
              <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed pl-4 relative z-10">
                {localShopData.description}
              </p>
            </div>
          </div>
        )}

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
                  <span className="text-[15px] font-black text-slate-800 dark:text-white tracking-tight">{localShopData.workingHours || '09:00 - 20:00'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Ochiq</span>
              </div>
            </div>
            
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
                const isActive = localShopData.workingDays?.includes(day.key) ?? !['Sat', 'Sun'].includes(day.key);
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

      {/* Tabs */}
      <div className="px-6 mb-6 flex justify-center">
        <div className="bg-text-primary/5 p-1 rounded-2xl flex items-center gap-1 border border-border-primary">
          <button
            onClick={() => setActiveProfileTab('Postlar')}
            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all rounded-xl relative ${
              activeProfileTab === 'Postlar' 
              ? 'text-bg-primary bg-text-primary shadow-lg' 
              : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Grid size={14} />
            Postlar
          </button>
        </div>
      </div>

      <div className="pb-16">
        {activeProfileTab === 'Postlar' && (
          <div className="flex flex-col gap-6">
            <div className="px-6 flex flex-col gap-3 w-full">
              <button 
                onClick={() => setShowManualPostModal(true)}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Qo'lda post yaratish
              </button>
              <button 
                onClick={() => setShowCreateStoryModal(true)}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Play size={18} />
                Story qo'shish
              </button>
            </div>

            {(posts.length > 0 || uploadProgress !== null) ? (
              <div className="grid grid-cols-2 gap-0">
                {uploadProgress !== null && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="aspect-[9/16] overflow-hidden relative flex items-center justify-center border border-border-primary"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] bg-[length:200%_200%] animate-[gradient_3s_ease_infinite] opacity-85"></div>
                    <div className="absolute inset-0 backdrop-blur-[2px] bg-white/10"></div>
                    <div className="relative z-10 bg-white/40 backdrop-blur-xl border border-white/50 px-5 py-3 rounded-2xl shadow-[0_8px_32px_rgba(0,122,255,0.3)] flex flex-col items-center justify-center">
                      <span className="bg-gradient-to-r from-[#007AFF] to-[#0056b3] bg-clip-text text-transparent font-black text-3xl drop-shadow-sm">{uploadProgress}%</span>
                      <span className="text-[#007AFF] font-bold text-[9px] uppercase tracking-widest mt-1">Yuklanmoqda</span>
                    </div>
                  </motion.div>
                )}
                {posts.map((post, index) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={post.id} 
                    className="aspect-[9/16] bg-text-primary/5 overflow-hidden relative group cursor-pointer"
                    onClick={() => onOpenReels?.(posts, index)}
                  >
                     {post.thumbnailUrl ? (
                      <ImageWithFallback 
                        originalSrc={post.thumbnailUrl}
                        className="w-full h-full object-cover"
                        alt={post.outfitName}
                        referrerPolicy="no-referrer"
                      />
                    ) : post.mediaType === 'video' || (post.mediaUrls?.[0] && post.mediaUrls[0].includes('.mp4')) ? (
                      <video 
                        src={`${post.mediaUrls?.[0]}#t=0.1`}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                      />
                    ) : (
                      <ImageWithFallback 
                        originalSrc={post.mediaUrls?.[0] || ''} 
                        className="w-full h-full object-cover" 
                        alt={post.outfitName} 
                        referrerPolicy="no-referrer" 
                      />
                    )}

                    <div className="absolute top-2 right-2 z-[50]">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPostDetails(post);
                        }}
                        className="w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Settings size={14} />
                      </button>
                    </div>

                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all flex justify-center items-center opacity-0 group-hover:opacity-100 z-[40] pointer-events-none">
                       <div className="bg-black/50 backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center text-white">
                          <Play size={20} fill="currentColor" />
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 flex flex-col items-center justify-center bg-white/5 rounded-3xl border-2 border-dashed border-border-primary">
                <PlusCircle size={48} className="text-text-primary/10 mb-4" />
                <p className="text-xs font-bold text-text-primary/40 uppercase tracking-widest">Hali postlar yo'q</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
