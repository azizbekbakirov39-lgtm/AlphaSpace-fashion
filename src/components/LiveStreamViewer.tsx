import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageSquare, Send, Users, MoreVertical, Volume2, VolumeX, Share2, ShoppingBag } from 'lucide-react';
import { Story, PostData } from '../types';
import { toast } from 'sonner';
import { safePlayVideo } from '../utils/mediaUtils';

interface LiveStreamViewerProps {
  story: Story;
  onClose: () => void;
  onOpenShopProfile: (shopId: string) => void;
  onProductClick?: (product: PostData) => void;
}

const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({ story, onClose, onOpenShopProfile, onProductClick }) => {
  const [comments, setComments] = useState<{ id: string, user: string, text: string }[]>([
    { id: '1', user: 'Azizbek', text: 'Narxi qancha?' },
    { id: '2', user: 'Sardor', text: 'Materiali nima?' },
    { id: '3', user: 'Malika', text: 'Dostavka bormi?' },
  ]);
  const [newComment, setNewComment] = useState('');
  const [viewers, setViewers] = useState(124);
  const [isMuted, setIsMuted] = useState(true);
  const [hearts, setHearts] = useState<{ id: number, x: number }[]>([]);
  const [showProducts, setShowProducts] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      safePlayVideo(videoRef.current);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, { id: Date.now().toString(), user: 'Siz', text: newComment }]);
    setNewComment('');
  };

  const handleLike = () => {
    const id = Date.now();
    const x = Math.random() * 100 - 50; // Random horizontal offset
    setHearts(prev => [...prev, { id, x }]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== id));
    }, 2000);
  };

  const handleShare = () => {
    const url = `${window.location.origin}?shop=${story.seller.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Havola nusxalandi!", {
      description: "Jonli efir havolasini do'stlaringizga yuborishingiz mumkin.",
      duration: 2000,
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 z-[10000] bg-black flex flex-col overflow-hidden"
    >
      {/* Video Background (Mock) */}
      <div className="absolute inset-0 bg-neutral-900">
        <video 
          ref={videoRef}
          src={story.videoUrl} 
          loop 
          muted={isMuted}
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-80"
          onError={(e) => {
            const video = e.currentTarget;
            if (!video.dataset.triedProxy) {
              video.dataset.triedProxy = 'true';
              video.src = `https://api.allorigins.win/raw?url=${encodeURIComponent(story.videoUrl)}`;
              video.load();
              safePlayVideo(video);
            }
          }}
        />
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* Flying Hearts Container */}
      <div className="absolute right-4 bottom-24 w-20 h-64 pointer-events-none z-20">
        <AnimatePresence>
          {hearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 0, scale: 0, y: 0, x: 0 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.8], y: -300, x: heart.x }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 text-red-500"
            >
              <Heart size={24} fill="currentColor" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onOpenShopProfile(story.seller.id)}>
          <div className="p-[2px] bg-red-600 rounded-full animate-pulse">
            <img src={story.seller.logo} className="w-10 h-10 rounded-full border border-black/20" alt="logo" referrerPolicy="no-referrer" />
          </div>
          <div>
            <p className="text-white font-bold text-sm drop-shadow-md">{story.seller.name}</p>
            <div className="flex items-center gap-2">
              <span className="bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest text-white">Live</span>
              <div className="flex items-center gap-1 text-white/80 text-[10px] font-bold">
                <Users size={10} />
                <span>{viewers}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-white/80 hover:text-white bg-black/20 rounded-full backdrop-blur-md"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button 
            onClick={handleShare}
            className="p-2 text-white/80 hover:text-white bg-black/20 rounded-full backdrop-blur-md"
          >
            <Share2 size={20} />
          </button>
          <button 
            onClick={() => toast.info("Qo'shimcha sozlamalar tez orada qo'shiladi")}
            className="p-2 text-white/80 hover:text-white bg-black/20 rounded-full backdrop-blur-md"
          >
            <MoreVertical size={20} />
          </button>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white bg-black/20 rounded-full backdrop-blur-md">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-4 pb-24">
        <div className="flex flex-col gap-2 max-h-[40%] overflow-y-auto scrollbar-hide mb-4 mask-fade-top">
          {comments.map(comment => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={comment.id} 
              className="flex items-start gap-2 bg-black/20 backdrop-blur-sm p-2 rounded-xl w-fit max-w-[80%]"
            >
              <span className="text-accent-blue font-bold text-xs">{comment.user}</span>
              <span className="text-white text-xs">{comment.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowProducts(!showProducts)}
            className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20 shadow-xl relative"
          >
            <ShoppingBag size={24} />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black flex items-center justify-center">3</div>
          </button>
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3 flex items-center gap-2 shadow-xl">
            <input 
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
              placeholder="Savol yozing..."
              className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/40"
            />
            <button onClick={handleSendComment} className="text-white/60 hover:text-accent-blue transition-colors">
              <Send size={18} />
            </button>
          </div>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={handleLike}
            className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20 shadow-xl"
          >
            <Heart size={24} className="hover:fill-red-500 hover:text-red-500 transition-colors" />
          </motion.button>
        </div>
      </div>

      {/* Featured Products Drawer */}
      <AnimatePresence>
        {showProducts && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProducts(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-0 left-0 right-0 bg-bg-primary rounded-t-[2.5rem] z-50 p-6 pb-10"
            >
              <div className="w-12 h-1.5 bg-text-primary/10 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-black italic uppercase tracking-tighter mb-4">Efirda ko'rsatilayotgan mahsulotlar</h3>
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 bg-text-primary/5 rounded-2xl border border-border-primary active:scale-[0.98] transition-all"
                    onClick={() => {
                      if (onProductClick) {
                        // Mock product
                        onProductClick({
                          id: `p-${i}`,
                          seller: story.seller,
                          mediaType: 'carousel',
                          mediaUrls: [story.seller.logo || ''],
                          outfitName: `Mahsulot #${i}`,
                          price: `${150 + i * 50} 000 so'm`,
                          items: [],
                          likes: 0,
                          comments: 0
                        });
                      }
                      setShowProducts(false);
                    }}
                  >
                    <img src={story.seller.logo || undefined} className="w-16 h-16 rounded-xl object-cover" alt="product" />
                    <div className="flex-1">
                      <p className="text-sm font-black uppercase tracking-tight">Mahsulot #{i}</p>
                      <p className="text-xs font-bold text-accent-blue">{150 + i * 50} 000 so'm</p>
                    </div>
                    <button className="px-4 py-2 bg-text-primary text-bg-primary rounded-xl text-[10px] font-black uppercase tracking-widest">
                      Ko'rish
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .mask-fade-top {
          mask-image: linear-gradient(to top, black 80%, transparent 100%);
        }
      `}</style>
    </motion.div>
  );
};

export default LiveStreamViewer;
