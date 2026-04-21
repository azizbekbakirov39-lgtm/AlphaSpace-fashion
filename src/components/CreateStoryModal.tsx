import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Play, CheckCircle2 } from 'lucide-react';
import { PostData, Seller } from '../types';
import { db, collection, addDoc, serverTimestamp, Timestamp } from '../firebase';
import { toast } from 'sonner';

interface CreateStoryModalProps {
  posts: PostData[];
  sellerId: string;
  ownerUid: string;
  shopData: Seller;
  onClose: () => void;
}

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ posts, sellerId, ownerUid, shopData, onClose }) => {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedPostId) return;
    setIsCreating(true);
    try {
      const selectedPost = posts.find(p => p.id === selectedPostId);
      if (!selectedPost || !selectedPost.mediaUrls || selectedPost.mediaUrls.length === 0) {
        toast.error("Postda rasm yoki video topilmadi");
        setIsCreating(false);
        return;
      }

      const newStoryData: any = {
        sellerId,
        ownerUid,
        seller: {
          id: shopData.id,
          name: shopData.name,
          logo: shopData.logo || null,
          region: shopData.region || 'Toshkent'
        },
        videoUrl: selectedPost.mediaUrls[0], // Use the first media from the post
        price: selectedPost.price || '',
        likes: 0,
        comments: 0,
        isLive: false,
        isViewed: false,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
      };

      // Clean undefined values
      Object.keys(newStoryData).forEach(key => newStoryData[key] === undefined && delete newStoryData[key]);
      
      await addDoc(collection(db, 'stories'), newStoryData);
      toast.success("Story muvaffaqiyatli yaratildi");
      onClose();
    } catch (error: any) {
      console.error("Error creating story:", error);
      const errorMsg = error.code === 'permission-denied' 
        ? "Ruxsat etilmadi. Sizda story qo'shish huquqi yo'q." 
        : (error.message || "Story yaratishda xatolik");
      toast.error(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-bg-primary rounded-[2.5rem] overflow-hidden shadow-2xl border border-border-primary flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-border-primary flex items-center justify-between bg-bg-primary/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-xl">
              <Play size={20} className="text-orange-500" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-text-primary">Story Yaratish</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-text-primary/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary/40">Qaysi postni story qilasiz?</h4>
            </div>
            <div className="grid grid-cols-2 gap-0">
              {posts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPostId(post.id)}
                  className={`aspect-[9/16] overflow-hidden border-2 transition-all relative cursor-pointer ${selectedPostId === post.id ? 'border-orange-500 scale-[0.98] z-10 shadow-xl' : 'border-transparent opacity-80 hover:opacity-100'}`}
                >
                  {post.mediaType === 'video' || (post.mediaUrls?.[0] && (post.mediaUrls[0].includes('.mp4') || post.mediaUrls[0].includes('video/upload'))) ? (
                    <video 
                      src={`${post.mediaUrls?.[0]}#t=0.1`}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                    />
                  ) : (
                    <img src={post.mediaUrls?.[0] || undefined} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  )}
                  {selectedPostId === post.id && (
                    <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                      <CheckCircle2 size={32} className="text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
              ))}
              {posts.length === 0 && (
                <div className="col-span-2 py-10 text-center text-text-primary/40 text-xs font-bold">
                  Hali postlar yo'q
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-bg-primary border-t border-border-primary">
          <button 
            onClick={handleCreate}
            disabled={!selectedPostId || isCreating}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isCreating ? "Yaratilmoqda..." : "Storyni Saqlash"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateStoryModal;
