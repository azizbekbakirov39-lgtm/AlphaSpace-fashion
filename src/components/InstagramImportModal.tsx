import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Instagram, RefreshCw, Zap, ExternalLink, CheckCircle2 } from 'lucide-react';
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
    setIsImporting(true);
    try {
      const response = await fetch(`/api/instagram-fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: instagramLink })
      });

      const result = await response.json();
      console.log("DEBUG: Instagram API Response:", result);

      const data = result.data || result;
      if (!data) throw new Error("API'dan ma'lumot kelmadi");

      const video = data.video_url || data.video_link;
      const images = data.images || data.image_urls || [];
      const mediaUrls = video ? [video] : (Array.isArray(images) ? images : [images]);

      if (mediaUrls.length === 0) throw new Error("Media topilmadi");

      setImportPreview({
        outfitName: "Instagram mahsulot",
        price: "",
        description: data.caption || "",
        mediaUrls: mediaUrls,
        mediaType: video ? 'video' : 'carousel',
        instagramUrl: instagramLink
      });

      toast.success("Muvaffaqiyatli!");
    } catch (err) {
      toast.error("Xatolik: " + err);
    } finally {
      setIsImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || !user) return;
    setIsUploading(true);
    try {
      const postData = {
        ...importPreview,
        ownerUid: user.uid,
        seller: { id: shopData.id, name: shopData.name },
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'posts'), postData);
      toast.success("Platformaga qo'shildi!");
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white p-8 rounded-3xl">
            {!importPreview ? (
              <>
                <input 
                  value={instagramLink}
                  onChange={(e) => setInstagramLink(e.target.value)}
                  placeholder="Instagram link..."
                  className="w-full border p-4 rounded-xl mb-4"
                />
                <button 
                  onClick={handleInstagramImport}
                  disabled={isImporting}
                  className="w-full py-4 bg-pink-500 text-white rounded-xl"
                >
                  {isImporting ? "Yuklanmoqda..." : "Import"}
                </button>
              </>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm font-bold">{importPreview.description.substring(0, 50)}</p>
                    <button onClick={confirmImport} className="w-full py-4 bg-emerald-500 text-white rounded-xl">
                        {isUploading ? "Saqlanmoqda..." : "Taqdiqlash"}
                    </button>
                </div>
            )}
            <button onClick={onClose} className="mt-4 w-full text-gray-500">Yopish</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstagramImportModal;
