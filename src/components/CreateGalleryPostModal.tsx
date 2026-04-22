import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, CheckCircle2, RefreshCw, XCircle, ImageIcon, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Seller, User } from '../types';
import { db, storage, ref, uploadBytes, getDownloadURL, addDoc, collection, serverTimestamp } from '../firebase';

interface CreateGalleryPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFiles: File[];
  shopData: Seller;
  user: User | null;
}

const CreateGalleryPostModal: React.FC<CreateGalleryPostModalProps> = ({ isOpen, onClose, initialFiles, shopData, user }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{url: string, type: string}[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen && initialFiles.length > 0) {
      setFiles(initialFiles);
      const newPreviews = initialFiles.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      }));
      setPreviews(newPreviews);
    } else {
      setFiles([]);
      setPreviews([]);
      setOutfitName('');
      setPrice('');
      setDescription('');
    }
  }, [isOpen, initialFiles]);

  const handleRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user) return;
    if (files.length === 0) {
      toast.error("Iltimos, kamida bitta rasm yoki video tanlang");
      return;
    }

    setIsUploading(true);
    try {
      const mediaUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extension = file.name.split('.').pop() || 'tmp';
        const storageRef = ref(storage, `shops/${shopData.id}/posts/${Date.now()}-${i}.${extension}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        mediaUrls.push(downloadUrl);
      }

      const hasVideo = files.some(f => f.type.startsWith('video/'));
      const mediaType = (hasVideo && files.length === 1) ? 'video' : 'carousel';

      const postData = {
        outfitName: outfitName || "Yangi mahsulot",
        price: price || "",
        description: description || "",
        mediaUrls: mediaUrls,
        category: "Kiyim",
        sizes: [],
        colors: [],
        mediaType: mediaType,
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

      await addDoc(collection(db, 'posts'), postData);
      toast.success("Post muvaffaqiyatli saqlandi!");
      onClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Xatolik yuz berdi: " + error.message);
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
            className="w-full max-w-lg bg-bg-primary rounded-[2.5rem] overflow-hidden shadow-2xl border border-border-primary flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-border-primary flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-blue/10 rounded-2xl flex items-center justify-center text-accent-blue">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary tracking-tight">Galareyadan Qo'shish</h3>
                  <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">{files.length} ta fayl tanlandi</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-text-primary/5 rounded-xl text-text-primary/40 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto scrollbar-hide flex flex-col gap-6">
              {/* Previews */}
              {previews.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide items-center">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative w-24 h-32 flex-shrink-0 rounded-2xl overflow-hidden border border-border-primary shadow-sm group">
                      {preview.type === 'video' ? (
                        <video src={preview.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={preview.url} className="w-full h-full object-cover" alt="preview" />
                      )}
                      <div className="absolute top-1 left-1 bg-black/50 backdrop-blur-md rounded-full p-1 text-white">
                        {preview.type === 'video' ? <Video size={10} /> : <ImageIcon size={10} />}
                      </div>
                      <button 
                        onClick={() => handleRemove(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {files.length < 10 && (
                    <label className="w-24 h-32 flex-shrink-0 rounded-2xl border-2 border-dashed border-border-primary flex flex-col items-center justify-center text-text-primary/40 hover:text-accent-blue hover:border-accent-blue/50 transition-colors cursor-pointer bg-text-primary/5">
                      <Upload size={20} className="mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Qo'shish</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        multiple 
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || []);
                          const totalFiles = [...files, ...newFiles].slice(0, 10);
                          setFiles(totalFiles);
                          setPreviews(totalFiles.map(file => ({
                            url: URL.createObjectURL(file),
                            type: file.type.startsWith('video/') ? 'video' : 'image'
                          })));
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Form Inputs */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-primary/50 uppercase tracking-widest ml-1">Mahsulot Nomi</label>
                  <input 
                    type="text"
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    placeholder="Masalan: Yozgi ko'ylak"
                    className="w-full bg-text-primary/5 border border-border-primary rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent-blue/50 transition-colors"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-primary/50 uppercase tracking-widest ml-1">Narxi</label>
                  <input 
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Masalan: 120,000 so'm"
                    className="w-full bg-text-primary/5 border border-border-primary rounded-2xl px-5 py-4 text-sm font-bold text-accent-blue outline-none focus:border-accent-blue/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-primary/50 uppercase tracking-widest ml-1">Izoh / Tavsif</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mahsulot haqida batafsil ma'lumot qoldiring..."
                    rows={4}
                    className="w-full bg-text-primary/5 border border-border-primary rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent-blue/50 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border-primary bg-white/5 flex gap-3">
              <button 
                onClick={onClose} 
                className="flex-1 py-4 bg-text-primary/5 text-text-primary/60 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-primary transition-colors hover:bg-text-primary/10"
              >
                Bekor qilish
              </button>
              <button 
                onClick={handleUpload} 
                disabled={isUploading || files.length === 0} 
                className="flex-[2] py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-accent-blue/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isUploading ? 'Yuklanmoqda...' : 'Platformaga joylash'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateGalleryPostModal;
