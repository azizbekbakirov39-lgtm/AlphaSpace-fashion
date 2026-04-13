import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Phone, Send, Instagram, MessageCircle, Clock, MapPin, 
  Navigation, Sparkles, Share2, ShoppingBag, ChevronRight, ChevronLeft,
  ShieldCheck, Truck, Star, Heart, ArrowLeft, Plus, Volume2, VolumeX, Check
} from 'lucide-react';
import { PostData } from '../types';
import { Language, translations } from '../translations';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { isVideoUrl, getProxiedUrl } from '../utils/mediaUtils';

interface ProductDetailsProps {
  post: PostData;
  onClose: () => void;
  onOpenShopProfile?: (shopId: string) => void;
  onMessage?: (sellerId: string, product?: PostData) => void;
  onAskAI?: (product: PostData) => void;
  onSharePost?: (post: PostData) => void;
  language: Language;
  allPosts?: PostData[];
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ post, onClose, onOpenShopProfile, onMessage, onAskAI, onSharePost, language, allPosts = [] }) => {
  const t = translations[language];
  const seller = post.seller;
  const [showMap, setShowMap] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(post.sizes?.[0] || null);
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string } | null>(post.colors?.[0] || null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShopClick = () => {
    if (onOpenShopProfile) {
      onOpenShopProfile(seller.id);
    }
  };

  const handleSocialClick = (platform: 'phone' | 'telegram' | 'instagram') => {
    switch (platform) {
      case 'phone':
        window.open(`tel:${seller.phone || '+998901234567'}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/${seller.telegram?.replace('@', '') || 'shop_username'}`, '_blank');
        break;
      case 'instagram':
        window.open(`https://instagram.com/${seller.instagram?.replace('@', '') || 'shop_username'}`, '_blank');
        break;
    }
  };

  // Filter related posts for "Complete the Look"
  const relatedPosts = allPosts.filter(p => p.id !== post.id && p.seller.id === seller.id).slice(0, 4);
  if (relatedPosts.length === 0) {
    relatedPosts.push(...allPosts.filter(p => p.id !== post.id).slice(0, 4));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      className="fixed inset-0 z-[10000] bg-bg-primary overflow-y-auto scrollbar-hide"
    >
      {/* Floating Glassmorphic Header */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between pointer-events-none">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onClose} 
          className="p-3 bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl text-white pointer-events-auto shadow-2xl"
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </motion.button>
        <div className="flex items-center gap-3 pointer-events-auto">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsLiked(!isLiked)}
            className={`p-3 bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`}
          >
            <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2.5} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => onSharePost?.(post)}
            className="p-3 bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl text-white shadow-2xl pointer-events-auto"
          >
            <Send size={22} strokeWidth={2.5} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={async () => {
              const shareData = {
                title: post.seller.name,
                text: post.outfitName,
                url: window.location.href,
              };
              try {
                if (navigator.share) {
                  await navigator.share(shareData);
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  showToast(language === 'uz' ? 'Havola nusxalandi!' : 'Link copied!');
                }
              } catch (err: any) {
                if (err.name !== 'AbortError') {
                  console.error('Share failed:', err);
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    showToast(language === 'uz' ? 'Havola nusxalandi!' : 'Link copied!');
                  } catch (clipErr) {
                    console.error('Clipboard fallback failed:', clipErr);
                  }
                }
              }
            }}
            className="p-3 bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl text-white shadow-2xl pointer-events-auto"
          >
            <Share2 size={22} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>

      <div className="pb-40">
        {/* Immersive Media Gallery with Carousel */}
        <div className="w-full h-[75vh] bg-neutral-900 relative overflow-hidden">
          <div 
            className="w-full h-full cursor-pointer relative"
            onClick={(e) => {
              const { clientX, currentTarget } = e;
              const { width } = currentTarget.getBoundingClientRect();
              if (clientX > width / 2) {
                setCurrentMediaIndex((prev) => (prev + 1) % post.mediaUrls.length);
              } else {
                setCurrentMediaIndex((prev) => (prev - 1 + post.mediaUrls.length) % post.mediaUrls.length);
              }
            }}
          >
            {(() => {
              const url = post.mediaUrls[currentMediaIndex];
              const isVideo = isVideoUrl(url);
              const proxiedUrl = getProxiedUrl(url);
              
              if (isVideo) {
                return (
                  <div className="w-full h-full relative bg-neutral-900">
                    <video
                      key={currentMediaIndex}
                      src={url}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(!isMuted);
                      }}
                      className="absolute bottom-24 right-4 z-20 p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white shadow-xl active:scale-90 transition-all border border-white/20"
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                  </div>
                );
              } else {
                return (
                  <div className="w-full h-full relative bg-neutral-900">
                    <motion.img
                      key={currentMediaIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      src={proxiedUrl}
                      alt={post.outfitName}
                      className="w-full h-full object-cover"
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
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'absolute inset-0 flex items-center justify-center text-white/20 text-xs font-black uppercase';
                            placeholder.innerText = 'Rasm yuklanmadi';
                            parent.appendChild(placeholder);
                          }
                        }
                      }}
                    />
                  </div>
                );
              }
            })()}

            {/* Gallery Arrows */}
            {post.mediaUrls.length > 1 && (
              <>
                <button 
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/20 backdrop-blur-md rounded-full text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMediaIndex((prev) => (prev - 1 + post.mediaUrls.length) % post.mediaUrls.length);
                  }}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/20 backdrop-blur-md rounded-full text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMediaIndex((prev) => (prev + 1) % post.mediaUrls.length);
                  }}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
          
          {/* Bottom Gradient Transition - Removed for full clarity */}
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          
          {/* Media Indicators */}
          {post.mediaUrls.length > 1 && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {post.mediaUrls.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1 rounded-full transition-all ${idx === currentMediaIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40'}`} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Content Container */}
        <div className="relative z-10 -mt-6 px-4">
          {/* Shop Card - More Compact to reduce overlap */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleShopClick}
            className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl border border-border-primary p-3 rounded-[2rem] shadow-2xl mb-6 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`p-0.5 rounded-full bg-gradient-to-tr ${seller.hasStory ? 'from-accent-blue to-accent-light' : 'from-border-primary to-border-primary'}`}>
                  <img 
                    src={seller.logo} 
                    alt={seller.name} 
                    className="w-10 h-10 rounded-full object-cover border-2 border-bg-primary"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary leading-tight">{seller.name}</h3>
                <span className="text-[9px] text-accent-blue font-black uppercase tracking-widest">Aktiv</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-accent-blue/5 flex items-center justify-center text-accent-blue">
              <ChevronRight size={18} strokeWidth={3} />
            </div>
          </motion.div>

          {/* Product Title & Price with AI Widget */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-6 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-accent-blue/10 text-accent-blue text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-accent-blue/20">
                    Premium Collection
                  </span>
                </div>
                <h1 className="text-2xl font-black text-text-primary tracking-tight leading-tight mb-2">{post.outfitName}</h1>
                <div className="flex items-baseline gap-2">
                  <span className="bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent font-black text-4xl tracking-tighter">
                    {post.price}
                  </span>
                </div>
                
                {/* Rating & Reviews Summary */}
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-black text-yellow-500">{post.rating || '4.8'}</span>
                  </div>
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                    {post.reviewsCount || '124'} {language === 'uz' ? 'sharhlar' : 'reviews'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-black text-[15px] leading-relaxed font-bold mb-6">
              {post.description || "Ushbu mahsulot yuqori sifatli materiallardan tayyorlangan va zamonaviy dizaynga ega. Har qanday vaziyat uchun mukammal tanlov."}
            </p>

            {/* SmartSeller AI Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onAskAI && onAskAI(post)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-accent-blue/10 to-blue-500/10 border border-accent-blue/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-accent-blue flex items-center justify-center shadow-lg shadow-accent-blue/20">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black text-text-primary">SmartSeller dan so'rang</h4>
                  <p className="text-[10px] font-bold text-text-secondary">AI yordamchi barcha savollarga javob beradi</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-accent-blue" />
            </motion.button>
          </div>

          {/* Stock Status, Size & Color Selectors */}
          <div className="mb-8 space-y-6">
            {/* Stock Status */}
            <div className="flex items-center gap-2 px-2">
              <div className={`w-2 h-2 rounded-full ${post.inStock !== false ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${post.inStock !== false ? 'text-green-500' : 'text-red-500'}`}>
                {post.inStock !== false 
                  ? (language === 'uz' ? 'Omborda mavjud' : 'In Stock') 
                  : (language === 'uz' ? 'Tugagan' : 'Out of Stock')}
              </span>
            </div>

            {/* Size Selector */}
            {post.sizes && post.sizes.length > 0 && (
              <div className="px-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-3">O'lchamni tanlang</h4>
                <div className="flex flex-wrap gap-2">
                  {post.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[48px] h-12 rounded-xl border-2 font-black text-xs transition-all active:scale-95 ${
                        selectedSize === size 
                          ? 'border-transparent bg-gradient-to-r from-accent-blue to-accent-light text-white shadow-lg shadow-accent-blue/20' 
                          : 'border-border-primary bg-text-primary/5 text-text-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {post.colors && post.colors.length > 0 && (
              <div className="px-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-3">Rangni tanlang</h4>
                <div className="flex flex-wrap gap-3">
                  {post.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={`group relative w-10 h-10 rounded-full border-2 transition-all active:scale-90 ${
                        selectedColor?.name === color.name ? 'border-accent-blue scale-110' : 'border-transparent'
                      }`}
                    >
                      <div 
                        className="w-full h-full rounded-full border border-black/10 shadow-inner"
                        style={{ backgroundColor: color.hex }}
                      />
                      {selectedColor?.name === color.name && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-blue rounded-full flex items-center justify-center text-white border-2 border-bg-primary">
                          <Check size={8} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Working Hours */}
          <div className="mb-6 px-2">
            <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Ish vaqti</p>
                <p className="text-base font-black text-text-primary">{seller.workingHours || '10:00 - 20:00'}</p>
              </div>
            </div>
          </div>

          {/* Interactive Map Section */}
          {seller.location && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-text-primary/40 flex items-center gap-2">
                  <MapPin size={14} /> Do'kon manzili
                </h4>
              </div>
              <div className="w-full h-56 rounded-[2.5rem] overflow-hidden border border-border-primary relative group shadow-xl">
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
                <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                <button 
                  onClick={() => setShowMap(true)}
                  className="absolute top-4 right-4 z-10 p-3 bg-white/90 backdrop-blur-md rounded-2xl text-accent-blue shadow-xl active:scale-90 transition-all border border-white/50"
                >
                  <Navigation size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

          {/* Contact Section */}
          <div className="mb-10 space-y-4">
            <div className="p-6 bg-text-primary/5 rounded-[2.5rem] border border-border-primary">
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Bog'lanish uchun</p>
                <h3 className="text-2xl font-black text-text-primary tracking-tight">{seller.phone || '+998 90 123 45 67'}</h3>
              </div>
              
              <div className="flex justify-center gap-4">
                {seller.phone && (
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSocialClick('phone')}
                    className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 shadow-lg flex items-center justify-center text-accent-blue border border-border-primary"
                  >
                    <Phone size={24} />
                  </motion.button>
                )}
                {seller.telegram && (
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSocialClick('telegram')}
                    className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 shadow-lg flex items-center justify-center text-[#0088cc] border border-border-primary"
                  >
                    <Send size={24} />
                  </motion.button>
                )}
                {seller.instagram && (
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSocialClick('instagram')}
                    className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 shadow-lg flex items-center justify-center text-[#e4405f] border border-border-primary"
                  >
                    <Instagram size={24} />
                  </motion.button>
                )}
              </div>
            </div>

            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={() => onMessage?.(seller.id, post)}
              className="w-full py-5 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-accent-blue/20 flex items-center justify-center gap-3 border border-white/20"
            >
              <MessageCircle size={22} strokeWidth={2.5} />
              Xabar yozish
            </motion.button>
          </div>

          {/* Reviews Section */}
          {post.reviews && post.reviews.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6 px-2">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-text-primary/40">Mijozlar fikri</h4>
                <button className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Hammasi</button>
              </div>
              <div className="space-y-4">
                {post.reviews.map((review) => (
                  <div key={review.id} className="p-5 bg-text-primary/5 rounded-3xl border border-border-primary">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue text-[10px] font-black">
                          {review.user.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-text-primary">{review.user}</p>
                          <p className="text-[9px] text-text-secondary font-bold">{review.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={10} 
                            className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300'} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-text-primary/80 leading-relaxed font-medium">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Products Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6 px-2">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-text-primary/40">O'xshash mahsulotlar</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {relatedPosts.map((relatedPost) => (
                <motion.div 
                  key={relatedPost.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    // In a real app, this would navigate to the new post
                    // For now, we'll just show a toast
                    showToast(language === 'uz' ? 'Yangi mahsulot yuklanmoqda...' : 'Loading product...');
                  }}
                  className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden border border-border-primary shadow-sm"
                >
                  <div className="aspect-[3/4] relative">
                    <img 
                      src={relatedPost.mediaUrls[0]} 
                      alt={relatedPost.outfitName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-3 left-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-xl text-white">
                      <p className="text-[10px] font-black truncate">{relatedPost.outfitName}</p>
                      <p className="text-[12px] font-black text-accent-light">{relatedPost.price}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
                    options={{
                      suppressMapOpenBlock: true,
                    }}
                  >
                    <Placemark geometry={[seller.location.lat, seller.location.lng]} />
                  </Map>
                </YMaps>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="px-4 py-2 bg-bg-primary/90 backdrop-blur-md rounded-xl border border-border-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    Yandex Maps-da ochish
                  </div>
                </div>
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
    </motion.div>
  );
};

export default ProductDetails;
