import React, { useState, useEffect } from 'react';
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
  Grid,
  Video
} from 'lucide-react';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { Seller, PostData } from '../../types';
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
  showManualPostModal: boolean;
  setShowManualPostModal: (show: boolean) => void;
  handleManualPostUpload: (files: File[], data: { title: string, price: string, description: string }) => Promise<void>;
  showCreateStoryModal: boolean;
  setShowCreateStoryModal: (show: boolean) => void;
  isCreatingStory: boolean;
  handleCreateStory: (file: File, price?: string) => Promise<void>;
  handleCreateStoryFromPost: (post: PostData) => Promise<void>;
  posts: PostData[];
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
  showCreateStoryModal,
  setShowCreateStoryModal,
  isCreatingStory,
  handleCreateStory,
  handleCreateStoryFromPost,
  posts,
  instagramLink,
  setInstagramLink,
  isImporting,
  handleInstagramImport,
  importPreview,
  confirmImport,
  showManualPostModal,
  setShowManualPostModal,
  handleManualPostUpload,
  isUploading,
  selectedPostDetails,
  setSelectedPostDetails,
  postDetailsTab,
  setPostDetailsTab,
  handleUpdatePost,
  handleDeletePost
}) => {
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyVideoPreview, setStoryVideoPreview] = useState<string | null>(null);
  const [storyPrice, setStoryPrice] = useState('');
  const [storyTab, setStoryTab] = useState<'existing' | 'new'>('existing');

  // Manual Post States
  const [manualFiles, setManualFiles] = useState<File[]>([]);
  const [manualPreviews, setManualPreviews] = useState<string[]>([]);
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  const handleManualFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newPreviews = filesArray.map((file: File) => URL.createObjectURL(file as Blob));
      setManualFiles(prev => [...prev, ...filesArray]);
      setManualPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeManualFile = (index: number) => {
    setManualFiles(prev => prev.filter((_, i) => i !== index));
    setManualPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleManualPostSubmit = async () => {
    if (manualFiles.length === 0 || !manualTitle) return;
    await handleManualPostUpload(manualFiles, {
      title: manualTitle,
      price: manualPrice,
      description: manualDescription
    });
    // Reset after success is handled in ShopWorkspace if it closes, 
    // but we can preemptively clear here too if needed.
  };

  useEffect(() => {
    if (!showManualPostModal) {
      setManualFiles([]);
      setManualPreviews([]);
      setManualTitle('');
      setManualPrice('');
      setManualDescription('');
    }
  }, [showManualPostModal]);

  const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStoryFile(file);
      setStoryVideoPreview(URL.createObjectURL(file as Blob));
    }
  };

  const handleStorySubmit = async () => {
    if (!storyFile) return;
    await handleCreateStory(storyFile, storyPrice);
    setStoryFile(null);
    setStoryVideoPreview(null);
    setStoryPrice('');
  };

  useEffect(() => {
    if (!showCreateStoryModal) {
      setStoryFile(null);
      setStoryVideoPreview(null);
      setStoryPrice('');
    }
  }, [showCreateStoryModal]);

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
        {showManualPostModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[3000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-lg bg-bg-primary rounded-[40px] border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Plus size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-text-primary tracking-tight">Post yaratish</h3>
                      <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Galereyadan media tanlash</p>
                    </div>
                  </div>
                  <button onClick={() => setShowManualPostModal(false)} className="w-12 h-12 bg-text-primary/5 rounded-full flex items-center justify-center text-text-primary/40 hover:text-text-primary transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6 scrollbar-hide">
                {/* Media Selection */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-4">Media (Rasm yoki Video)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {manualPreviews.map((preview, index) => (
                      <div key={index} className="aspect-square rounded-2xl overflow-hidden relative group">
                        {manualFiles[index]?.type.startsWith('video') ? (
                          <video src={preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={preview} className="w-full h-full object-cover" />
                        )}
                        <button 
                          onClick={() => removeManualFile(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {manualFiles.length < 10 && (
                      <label className="aspect-square rounded-2xl border-2 border-dashed border-text-primary/10 flex flex-col items-center justify-center hover:bg-text-primary/5 transition-colors cursor-pointer">
                        <Plus size={24} className="text-text-primary/20" />
                        <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleManualFilesChange} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-4">Mahsulot nomi</label>
                    <input 
                      type="text" 
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Masalan: Erkaklar kostyumi" 
                      className="w-full bg-text-primary/5 border border-text-primary/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-4">Narxi</label>
                    <input 
                      type="text" 
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="Masalan: 120,000" 
                      className="w-full bg-text-primary/5 border border-text-primary/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-4">Tavsif (Optional)</label>
                    <textarea 
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      placeholder="Mahsulot haqida batafsil..." 
                      className="w-full bg-text-primary/5 border border-text-primary/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium min-h-[100px] resize-none" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-text-primary/5">
                <button 
                  onClick={handleManualPostSubmit}
                  disabled={isUploading || manualFiles.length === 0 || !manualTitle}
                  className="w-full py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <><RefreshCw size={18} className="animate-spin" /><span>Yuklanmoqda...</span></>
                  ) : (
                    <span>Post yaratish</span>
                  )}
                </button>
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
        {showCreateStoryModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[3000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-lg bg-bg-primary rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><Plus size={28} /></div>
                    <div><h3 className="text-2xl font-black text-text-primary tracking-tight">Story Qo'shish</h3><p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Yangi story yuklash</p></div>
                  </div>
                  <button onClick={() => setShowCreateStoryModal(false)} className="w-12 h-12 bg-text-primary/5 rounded-full flex items-center justify-center text-text-primary/40 hover:text-text-primary transition-colors"><X size={24} /></button>
                </div>

                <div className="flex gap-4 mb-6 border-b border-text-primary/10">
                  <button 
                    className={`pb-2 px-1 text-[12px] font-black uppercase tracking-widest ${storyTab === 'existing' ? 'text-text-primary border-b-2 border-text-primary' : 'text-text-primary/40 hover:text-text-primary'}`}
                    onClick={() => setStoryTab('existing')}
                  >Mavjud postlar</button>
                  <button 
                    className={`pb-2 px-1 text-[12px] font-black uppercase tracking-widest ${storyTab === 'new' ? 'text-text-primary border-b-2 border-text-primary' : 'text-text-primary/40 hover:text-text-primary'}`}
                    onClick={() => setStoryTab('new')}
                  >Yangi video</button>
                </div>

                {storyTab === 'existing' ? (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                    {posts.length === 0 ? (
                      <div className="py-8 text-center text-text-primary/40 text-[10px] font-black uppercase tracking-widest">
                        Qo'shilgan postlar yo'q
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {posts.map(post => (
                          <div 
                            key={post.id} 
                            onClick={() => !isCreatingStory && handleCreateStoryFromPost(post)}
                            className={`aspect-square rounded-2xl overflow-hidden relative cursor-pointer group bg-black ${isCreatingStory ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            {post.mediaType === 'video' ? (
                              <video src={post.mediaUrls[0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                              <img src={post.mediaUrls[0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-[8px] text-white font-bold truncate">{post.outfitName || 'Post'}</p>
                            </div>
                            {post.mediaType === 'video' && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-black/50 backdrop-blur pb-px rounded-full flex items-center justify-center text-[10px] text-white font-black"><Video size={10} /></div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {isCreatingStory && (
                      <div className="mt-4 flex items-center justify-center text-orange-500 font-bold text-xs gap-2">
                        <RefreshCw size={14} className="animate-spin" /> Yuklanmoqda...
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {!storyVideoPreview ? (
                      <div className="space-y-6">
                        <label className="flex flex-col items-center justify-center w-full h-48 bg-text-primary/5 border-2 border-dashed border-text-primary/20 rounded-2xl cursor-pointer hover:bg-text-primary/10 transition-colors">
                          <Plus size={32} className="text-text-primary/40 mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-text-primary/40">Video tanlang</span>
                          <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleStoryFileChange} />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide pr-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="aspect-[9/16] rounded-2xl overflow-hidden border border-text-primary/5 relative bg-black">
                            <video src={storyVideoPreview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-1"><label className="text-[8px] font-black uppercase tracking-widest text-text-primary/40">Narxi (Optional)</label><input type="text" value={storyPrice} onChange={(e) => setStoryPrice(e.target.value)} placeholder="Masalan: 150,000 so'm" className="w-full bg-text-primary/5 border border-text-primary/10 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-orange-500/50" /></div>
                            <button onClick={() => setStoryFile(null)} className="text-[10px] text-red-500 font-bold uppercase hover:underline">Boshqa video tanlash</button>
                          </div>
                        </div>
                        <button onClick={handleStorySubmit} disabled={isCreatingStory} className="w-full py-5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">{isCreatingStory ? <><RefreshCw size={18} className="animate-spin" /><span>Yuklanmoqda...</span></> : <span>Story qo'shish</span>}</button>
                      </div>
                    )}
                  </>
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
