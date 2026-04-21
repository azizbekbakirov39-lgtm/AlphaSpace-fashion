import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Instagram, RefreshCw, Zap, Info, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Seller, User } from '../types';
import { db, addDoc, collection, serverTimestamp } from '../firebase';
import { getProxiedUrl } from '../utils/mediaUtils';

interface InstagramImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopData: Seller;
  user: User | null;
}

const InstagramImportModal: React.FC<InstagramImportModalProps> = ({ isOpen, onClose, shopData, user }) => {
  const [instagramLink, setInstagramLink] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleInstagramImport = async () => {
    if (!instagramLink) {
      toast.error("Iltimos, Instagram linkini kiriting");
      return;
    }
    setIsImporting(true);
    try {
      const shortcodeMatch = instagramLink.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
      const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

      if (!shortcode) {
        throw new Error("Noto'g'ri Instagram linki. Iltimos, to'g'ri link kiriting");
      }

      const cleanUrl = `https://www.instagram.com/p/${shortcode}/`;

      const response = await fetch(`/api/fetch-instagram-post`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl })
      });

      if (!response.ok) throw new Error(`API Xatosi (${response.status})`);

      const result = await response.json();
      let mediaUrls: string[] = [];
      let mediaType: 'video' | 'carousel' = 'carousel';
      let description = "";

      if (Array.isArray(result) && result.length > 0) {
        mediaUrls = result.map((item: any) => item.urls?.[0]?.url || item.pictureUrl || item.display_url).filter(Boolean);
        description = result[0].caption || result[0].text || "";
        const hasVideo = result.some((item: any) => item.urls?.some((u: any) => u.extension === 'mp4' || u.url?.includes('.mp4')));
        mediaType = (hasVideo && mediaUrls.length === 1) ? 'video' : 'carousel';
      } else if (result.urls && Array.isArray(result.urls)) {
        mediaUrls = [result.urls[0].url].filter(Boolean);
        description = result.caption || result.text || "";
        mediaType = result.urls.some((u: any) => u.extension === 'mp4') ? 'video' : 'carousel';
      }

      if (mediaUrls.length === 0) throw new Error("Media topilmadi");

      setImportPreview({
        outfitName: "Instagramdan mahsulot",
        price: "",
        description: description,
        mediaUrls: mediaUrls,
        category: "Kiyim",
        sizes: [],
        colors: [],
        mediaType: mediaType,
        instagramUrl: cleanUrl,
        items: [{ id: '1', type: 'shirt', name: description.substring(0, 50), price: '', store: shopData.name }]
      });
      toast.success("Ma'lumotlar olindi!");
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi");
    } finally {
      setIsImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || !user) return;
    try {
      setIsUploading(true);
      const postData: any = {
        ...importPreview,
        ownerUid: user.uid,
        seller: {
          id: shopData.id,
          name: shopData.name,
          logo: shopData.logo || null,
          region: shopData.region || 'Toshkent'
        },
        likes: 0,
        views: 0,
        createdAt: serverTimestamp()
      };

      if (postData.mediaUrls && postData.mediaUrls.length > 0) {
        const updatedUrls = [...postData.mediaUrls];
        for (let i = 0; i < updatedUrls.length; i++) {
          const url = updatedUrls[i];
          if (url.includes('.mp4') || postData.mediaType === 'video') {
            const res = await fetch('/api/import-to-r2', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoUrl: url, fileName: `videos/shop-${shopData.id}/${Date.now()}-${i}.mp4` })
            });
            if (res.ok) {
              const { publicUrl } = await res.json();
              updatedUrls[i] = publicUrl;
            }
          }
        }
        postData.mediaUrls = updatedUrls;
      }

      await addDoc(collection(db, 'posts'), postData);
      toast.success("Muvaffaqiyatli import qilindi!");
      onClose();
      setImportPreview(null);
      setInstagramLink('');
    } catch (error: any) {
      toast.error(error.message || "Saqlashda xatolik");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-bg-primary rounded-[2.5rem] overflow-hidden shadow-2xl border border-border-primary"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                    <Instagram size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-text-primary tracking-tight">Instagram Import</h3>
                    <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Link orqali post qo'shish</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-3 bg-text-primary/5 rounded-2xl text-text-primary/40 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {!importPreview ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest ml-1">Instagram Post Linki</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={instagramLink}
                        onChange={(e) => setInstagramLink(e.target.value)}
                        placeholder="https://www.instagram.com/p/..."
                        className="w-full bg-text-primary/5 border border-border-primary rounded-2xl px-6 py-4 text-sm font-bold text-text-primary outline-none focus:border-pink-500/50 transition-colors"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-500">
                        <ExternalLink size={18} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-text-primary/40 leading-relaxed bg-pink-500/5 p-4 rounded-2xl border border-pink-500/10">
                    <Info size={14} className="inline mr-2 text-pink-500" />
                    Post linkini kiriting va tizim avtomatik ravishda rasm va tavsifni ajratib oladi. 
                  </p>
                  <button 
                    onClick={handleInstagramImport}
                    disabled={isImporting || !instagramLink}
                    className="w-full py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-pink-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isImporting ? <RefreshCw size={18} className="animate-spin text-white" /> : <Zap size={18} />}
                    {isImporting ? "Ma'lumotlar olinmoqda..." : "Ma'lumotlarni olish"}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex gap-4 p-4 bg-text-primary/5 rounded-3xl border border-border-primary">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                      {importPreview.mediaType === 'video' ? (
                        <video src={getProxiedUrl(importPreview.mediaUrls[0])} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={getProxiedUrl(importPreview.mediaUrls[0])} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text"
                        value={importPreview.outfitName}
                        onChange={(e) => setImportPreview({...importPreview, outfitName: e.target.value})}
                        className="w-full bg-transparent border-none outline-none text-sm font-black text-text-primary mb-1"
                        placeholder="Mahsulot nomi"
                      />
                      <input 
                        type="text"
                        value={importPreview.price}
                        onChange={(e) => setImportPreview({...importPreview, price: e.target.value})}
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-accent-blue mb-2"
                        placeholder="Narxi"
                      />
                      <textarea 
                        value={importPreview.description}
                        onChange={(e) => setImportPreview({...importPreview, description: e.target.value})}
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-black leading-tight resize-none h-16"
                        placeholder="Tavsif"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setImportPreview(null)} className="flex-1 py-4 bg-text-primary/5 text-text-primary/60 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-primary">Bekor qilish</button>
                    <button onClick={confirmImport} disabled={isUploading} className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                      {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Platformaga qo'shish
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstagramImportModal;
