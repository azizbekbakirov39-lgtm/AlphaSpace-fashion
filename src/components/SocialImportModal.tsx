import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Globe, Youtube, Facebook, Instagram, Share2, Search, Link2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { db, collection, addDoc, serverTimestamp } from '../firebase';
import { Seller, User } from '../types';

interface SocialImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopData: Seller;
  user: User | null;
}

const SocialImportModal: React.FC<SocialImportModalProps> = ({
  isOpen,
  onClose,
  shopData,
  user
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const platforms = [
    { name: 'Instagram', icon: <Instagram size={18} />, color: 'from-pink-500 to-purple-600' },
    { name: 'TikTok', icon: <div className="text-sm font-bold">TT</div>, color: 'from-black to-gray-800' },
    { name: 'YouTube', icon: <Youtube size={18} />, color: 'from-red-600 to-red-700' },
    { name: 'Facebook', icon: <Facebook size={18} />, color: 'from-blue-600 to-blue-700' },
  ];

  const handleFetch = async () => {
    if (!url) return toast.error('Linkni kiriting');
    
    setLoading(true);
    setPreview(null);
    
    try {
      const response = await fetch('/api/social-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Ma\'lumotlarni olib bo\'lmadi');
      }

      // Universal mapping (API response parsing)
      // Note: This needs adjustment based on actual API response structure
      let result: any = {};
      
      if (url.includes('youtube')) {
        const item = data.contents?.[0];
        result = {
          title: item?.title || 'YouTube Video',
          description: item?.description || '',
          mediaUrl: item?.videos?.[0]?.url || item?.thumbnailUrl,
          type: 'video',
          thumbnail: item?.thumbnailUrl
        };
      } else {
        // TikTok, Facebook, Instagram usually share similar structure in this API
        result = {
          title: data.title || data.description?.substring(0, 50) || 'Ijtimoiy tarmoq posti',
          description: data.description || '',
          mediaUrl: data.videos?.[0]?.url || data.images?.[0]?.url,
          type: data.videos?.length > 0 ? 'video' : 'image',
          thumbnail: data.thumbnail || data.images?.[0]?.url
        };
      }

      if (!result.mediaUrl) {
         throw new Error('Video yoki rasm topilmadi. Linkni tekshiring.');
      }

      setPreview(result);
      toast.success('Ma\'lumotlar yuklandi!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !user) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        sellerId: shopData.id,
        ownerUid: user.uid,
        title: preview.title,
        description: preview.description,
        price: "Kelishiladi",
        mediaUrl: preview.mediaUrl,
        type: preview.type,
        createdAt: serverTimestamp(),
        likes: 0,
        views: 0,
        currency: "UZS"
      });
      
      toast.success('Post muvaffaqiyatli qo\'shildi!');
      onClose();
      setUrl('');
      setPreview(null);
    } catch (error: any) {
      toast.error('Saqlashda xatolik: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-bg-secondary rounded-[32px] border border-white/10 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Globe className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Universal Import</h3>
                  <p className="text-xs text-text-secondary">Har qanday linkdan post yarating</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-secondary"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Platforms Chips */}
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <div 
                    key={p.name}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${p.color} text-white text-[10px] font-bold uppercase tracking-wider shadow-sm`}
                  >
                    {p.icon}
                    {p.name}
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                    <Link2 size={18} />
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Linkni bu yerga qo'ying..."
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                  />
                </div>
                
                <button
                  onClick={handleFetch}
                  disabled={loading || !url}
                  className="w-full py-4 bg-white text-black font-bold rounded-2xl shadow-xl shadow-white/10 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Search size={20} />
                      Ma'lumotlarni olish
                    </>
                  )}
                </button>
              </div>

              {/* Preview Area */}
              <AnimatePresence>
                {preview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-4"
                  >
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex gap-4">
                      <div className="w-24 h-24 rounded-xl bg-black overflow-hidden flex-shrink-0 border border-white/5">
                        {preview.type === 'video' ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
                            <img src={preview.thumbnail} alt="thumbnail" className="w-full h-full object-cover opacity-50" />
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                              <RefreshCw size={24} className="opacity-80" />
                            </div>
                          </div>
                        ) : (
                          <img src={preview.mediaUrl} alt="preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-text-primary truncate">{preview.title}</h4>
                        <p className="text-xs text-text-secondary line-clamp-3 mt-1 leading-relaxed">
                          {preview.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                           <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase">
                             {preview.type}
                           </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleImport}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : (
                        <>
                          <CheckCircle2 size={20} />
                          Do'konga qo'shish
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Instructions */}
              {!preview && !loading && (
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex gap-3">
                  <div className="text-blue-400 flex-shrink-0 mt-0.5">
                    <AlertCircle size={18} />
                  </div>
                  <p className="text-xs text-blue-100/70 leading-relaxed">
                    Instagram Reels, TikTok videolari, YouTube Shorts yoki Facebook postlari linkini nusxalab bu yerga tashlang. Tizim avtomatik ravishda barcha ma'lumotlarni o'zi to'ldiradi.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SocialImportModal;
