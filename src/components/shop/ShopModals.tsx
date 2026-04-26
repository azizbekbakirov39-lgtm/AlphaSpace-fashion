import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Store, 
  MapPin, 
  Navigation, 
  Instagram, 
  RefreshCw,
  LogOut,
  Trash2,
  Trash,
  Check,
  Package,
  Settings,
  ChevronRight,
  Eye,
  Heart,
  Share2,
  Bookmark,
  Plus,
  Grid
} from 'lucide-react';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { Seller } from '../../types';
import { Language } from '../../translations';

interface ShopModalsProps {
  language: Language;
  showMap: boolean;
  setShowMap: (show: boolean) => void;
  localShopData: Seller;
  showFreezeModal: boolean;
  setShowFreezeModal: (show: boolean) => void;
  isFreezing: boolean;
  handleFreezeShop: () => void;
  showDeleteModal: boolean;
  setShowDeleteModal: (show: boolean) => void;
  deleteCode: string;
  setDeleteCode: (code: string) => void;
  isDeleting: boolean;
  handleDeleteShop: () => void;
  showInstagramImportModal: boolean;
  setShowInstagramImportModal: (show: boolean) => void;
  instagramLink: string;
  setInstagramLink: (link: string) => void;
  isImporting: boolean;
  handleInstagramImport: () => void;
  importPreview: any;
  confirmImport: () => void;
  isUploading: boolean;
  selectedPostDetails: any;
  setSelectedPostDetails: (post: any) => void;
  postDetailsTab: 'stats' | 'settings';
  setPostDetailsTab: (tab: 'stats' | 'settings') => void;
  handleUpdatePost: () => void;
  handleDeletePost: (id: string) => void;
}

export const ShopModals: React.FC<ShopModalsProps> = ({
  language,
  showMap,
  setShowMap,
  localShopData,
  showFreezeModal,
  setShowFreezeModal,
  isFreezing,
  handleFreezeShop,
  showDeleteModal,
  setShowDeleteModal,
  deleteCode,
  setDeleteCode,
  isDeleting,
  handleDeleteShop,
  showInstagramImportModal,
  setShowInstagramImportModal,
  instagramLink,
  setInstagramLink,
  isImporting,
  handleInstagramImport,
  importPreview,
  confirmImport,
  isUploading,
  selectedPostDetails,
  setSelectedPostDetails,
  postDetailsTab,
  setPostDetailsTab,
  handleUpdatePost,
  handleDeletePost
}) => {
  return (
    <>
      <AnimatePresence>
        {showMap && localShopData.location && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[5000] bg-black/80 backdrop-blur-xl flex flex-col p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black uppercase tracking-widest">Ma'lumot</h3>
              <button onClick={() => setShowMap(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"><X size={24} /></button>
            </div>
            <div className="flex-1 rounded-3xl overflow-hidden border border-white/10">
              <YMaps query={{ lang: language === 'ru' ? 'ru_RU' : 'en_US' }}>
                <Map state={{ center: [localShopData.location.lat, localShopData.location.lng], zoom: 16 }} width="100%" height="100%">
                  <Placemark geometry={[localShopData.location.lat, localShopData.location.lng]} />
                </Map>
              </YMaps>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFreezeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[5000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-bg-primary p-8 rounded-[40px] border border-white/10 max-w-sm w-full text-center">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-6"><LogOut size={40} /></div>
              <h3 className="text-2xl font-black text-text-primary mb-2">Muzlatish?</h3>
              <p className="text-sm text-text-primary/60 mb-8 px-4">Do'koningizni vaqtinchalik muzlatmoqchimisiz? Uni istalgan vaqtda qayta faollashtirishingiz mumkin.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleFreezeShop} disabled={isFreezing} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">{isFreezing ? "Muzlatilmoqda..." : "Ha, muzlatish"}</button>
                <button onClick={() => setShowFreezeModal(false)} className="w-full py-4 bg-text-primary/5 text-text-primary rounded-2xl font-black uppercase tracking-widest">Bekor qilish</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[5000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-bg-primary p-8 rounded-[40px] border border-red-500/20 max-w-sm w-full text-center">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><Trash2 size={40} /></div>
              <h3 className="text-2xl font-black text-text-primary mb-2 text-red-500">O'chirish?</h3>
              <p className="text-sm text-text-primary/60 mb-6 px-4">Diqqat! Bu amalni bekor qilib bo'lmaydi. Tasdiqlash uchun '123456' kodini kiriting.</p>
              <input type="text" value={deleteCode} onChange={(e) => setDeleteCode(e.target.value)} placeholder="000000" className="w-full bg-white/5 border border-red-500/20 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-[0.5em] focus:outline-none mb-6" />
              <div className="flex flex-col gap-3">
                <button onClick={handleDeleteShop} disabled={isDeleting} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-600/20">{isDeleting ? "O'chirilmoqda..." : "Ha, butunlay o'chirish"}</button>
                <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 bg-text-primary/5 text-text-primary rounded-2xl font-black uppercase tracking-widest">Bekor qilish</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstagramImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[3000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-lg bg-bg-primary rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Instagram size={28} /></div>
                    <div><h3 className="text-2xl font-black text-text-primary tracking-tight">Instagram Import</h3><p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Link orqali post qo'shish</p></div>
                  </div>
                  <button onClick={() => { setShowInstagramImportModal(false); setInstagramLink(''); }} className="w-12 h-12 bg-text-primary/5 rounded-full flex items-center justify-center text-text-primary/40 hover:text-text-primary transition-colors"><X size={24} /></button>
                </div>
                {!importPreview ? (
                  <div className="space-y-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-4">Instagram Post Linki</label><input type="text" value={instagramLink} onChange={(e) => setInstagramLink(e.target.value)} placeholder="https://www.instagram.com/p/..." className="w-full bg-text-primary/5 border border-text-primary/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-pink-500/50 transition-all font-medium" /></div>
                    <button onClick={handleInstagramImport} disabled={isImporting} className="w-full py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">{isImporting ? <><RefreshCw size={18} className="animate-spin" /><span>Ma'lumotlar olinmoqda...</span></> : <span>Ma'lumotlarni olish</span>}</button>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide pr-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="aspect-[9/16] rounded-2xl overflow-hidden border border-text-primary/5 relative">
                        {importPreview.mediaType === 'video' ? <video src={importPreview.mediaUrls[0]} className="w-full h-full object-cover" /> : <img src={importPreview.mediaUrls[0]} className="w-full h-full object-cover" />}
                        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">{importPreview.mediaUrls.length > 1 ? `+${importPreview.mediaUrls.length}` : (importPreview.mediaType === 'video' ? 'Video' : 'Rasm')}</div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase tracking-widest text-text-primary/40">Nomi</label><input type="text" value={importPreview.outfitName} onChange={(e) => {}} className="w-full bg-text-primary/5 border-none rounded-xl px-3 py-2 text-xs font-bold" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase tracking-widest text-text-primary/40">Narxi (Optional)</label><input type="text" placeholder="Masalan: 150,000" className="w-full bg-text-primary/5 border-none rounded-xl px-3 py-2 text-xs font-bold" /></div>
                      </div>
                    </div>
                    <button onClick={confirmImport} disabled={isUploading} className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">{isUploading ? <><RefreshCw size={18} className="animate-spin" /><span>Yuklanmoqda...</span></> : <span>Do'konga qo'shish</span>}</button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPostDetails && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-bg-primary w-full max-w-md rounded-[40px] overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-border-primary bg-text-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-text-primary/60"><Grid size={24} /></div><div><h3 className="text-xl font-black text-text-primary uppercase tracking-tighter">Post boshqaruvi</h3><p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">{selectedPostDetails.outfitName}</p></div></div>
                <button onClick={() => setSelectedPostDetails(null)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-text-primary/40 hover:text-text-primary transition-all"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-text-primary/5 rounded-[32px] p-5 border border-border-primary"><div className="flex items-center gap-2 mb-3 text-text-primary/40"><Eye size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Ko'rilgan</span></div><div className="flex items-end gap-1"><span className="text-3xl font-black text-text-primary leading-none">{selectedPostDetails.views || 0}</span><span className="text-[10px] font-black text-emerald-500 mb-0.5">+0%</span></div></div>
                  <div className="bg-text-primary/5 rounded-[32px] p-5 border border-border-primary"><div className="flex items-center gap-2 mb-3 text-text-primary/40"><Heart size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Yoqtirishgan</span></div><div className="flex items-end gap-1"><span className="text-3xl font-black text-text-primary leading-none">{selectedPostDetails.likes || 0}</span><span className="text-[10px] font-black text-pink-500 mb-0.5">+0%</span></div></div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-4">Harakatlar</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={handleUpdatePost} className="w-full py-4 bg-accent-blue text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-accent-blue/10 flex items-center justify-center gap-2">Yangilash</button>
                    <button onClick={() => handleDeletePost(selectedPostDetails.id)} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"><Trash size={14} />O'chirish</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
