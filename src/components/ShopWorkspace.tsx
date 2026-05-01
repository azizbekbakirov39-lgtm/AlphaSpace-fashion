import { RealisticBlueMessageIcon } from './CustomIcons';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, 
  MessageSquare, 
  Settings as SettingsIcon, 
  Grid,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { Seller, PostData, User } from '../types';
import { Language } from '../translations';
import { db, storage } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  setDoc, 
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Modular components
import { MyShopTab } from './shop/MyShopTab';
import { ChatsTab } from './shop/ChatsTab';
import { SettingsTab } from './shop/SettingsTab';
import { ShopModals } from './shop/ShopModals';

interface ShopWorkspaceProps {
  language: Language;
  shopData: Seller;
  user: User | null;
  posts: PostData[];
  onBackToMarketplace: () => void;
  onUpdateShop: (shop: Seller) => void;
}

const ShopWorkspace: React.FC<ShopWorkspaceProps> = ({
  language,
  shopData,
  user,
  posts,
  onBackToMarketplace,
  onUpdateShop
}) => {
  // Navigation States
  const [activeTab, setActiveTab] = useState('MyShop');
  const [activeProfileTab, setActiveProfileTab] = useState<'Postlar' | 'Ma\'lumot'>('Postlar');

  // Shop Data States
  const [localShopData, setLocalShopData] = useState<Seller>(shopData);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  // Chat States
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{[key: string]: number}>({});

  // Media Capture States
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  // Modal States
  const [showMap, setShowMap] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [showInstagramImportModal, setShowInstagramImportModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [instagramLink, setInstagramLink] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [selectedPostDetails, setSelectedPostDetails] = useState<PostData | null>(null);
  const [postDetailsTab, setPostDetailsTab] = useState<'stats' | 'settings'>('stats');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverVideoRef = useRef<HTMLVideoElement>(null);

  // Sync shop data
  useEffect(() => {
    setLocalShopData(shopData);
  }, [shopData]);

  // Listen for chats
  useEffect(() => {
    if (!shopData.id) return;
    const q = query(
      collection(db, 'chats'),
      where('shopId', '==', shopData.id),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        messages: [] // Messages will be loaded per chat
      }));
      setChats(chatList);
    });
    return () => unsubscribe();
  }, [shopData.id]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChatId) return;
    const q = query(
      collection(db, `chats/${activeChatId}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: msgs } : c));
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => unsubscribe();
  }, [activeChatId]);

  // Handlers
  const handleTabChange = (tab: string) => setActiveTab(tab);
  
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Logic for logo upload...
  };

  const handleCreateStory = async (file: File, price?: string) => {
    if (!user) return;
    setIsCreatingStory(true);
    try {
      const extension = file.name.split('.').pop();
      const fileName = `stories/${shopData.id}_${Date.now()}.${extension}`;
      const fileRef = ref(storage, fileName);
      
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const storyData = {
        ownerUid: user.uid,
        sellerId: shopData.id,
        seller: {
          id: shopData.id,
          name: shopData.name,
          logo: shopData.logo,
          hasStory: true,
          followers: shopData.followers || 0,
          categories: shopData.categories || []
        },
        videoUrl: url,
        price: price || '',
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
      };

      await addDoc(collection(db, 'stories'), storyData);
      
      // Update shop hasStory property
      await updateDoc(doc(db, 'shops', shopData.id), { hasStory: true });
      
      setShowCreateStoryModal(false);
      toast.success("Story muvaffaqiyatli qo'shildi!");
      onUpdateShop({ ...localShopData, hasStory: true });
    } catch (error) {
      console.error("Story creation error:", error);
      toast.error("Story yuklashda xatolik yuz berdi");
    } finally {
      setIsCreatingStory(false);
    }
  };

  const handleCreateStoryFromPost = async (post: PostData) => {
    if (!user) return;
    setIsCreatingStory(true);
    try {
      const isVideo = post.mediaType === 'video';
      const storyData = {
        ownerUid: user.uid,
        sellerId: shopData.id,
        seller: {
          id: shopData.id,
          name: shopData.name,
          logo: shopData.logo,
          hasStory: true,
          followers: shopData.followers || 0,
          categories: shopData.categories || []
        },
        videoUrl: isVideo ? post.mediaUrls[0] : '',
        imageUrl: isVideo ? '' : post.mediaUrls[0],
        price: post.price || '',
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        sourcePostId: post.id // optional tracking
      };

      await addDoc(collection(db, 'stories'), storyData);
      await updateDoc(doc(db, 'shops', shopData.id), { hasStory: true });
      
      setShowCreateStoryModal(false);
      toast.success("Story muvaffaqiyatli yaratildi!");
      onUpdateShop({ ...localShopData, hasStory: true });
    } catch (error) {
      console.error("Story creation error:", error);
      toast.error("Story yaratishda xatolik yuz berdi");
    } finally {
      setIsCreatingStory(false);
    }
  };

  const handleSaveShopInfo = async () => {
    try {
      await updateDoc(doc(db, 'shops', shopData.id), { ...localShopData });
      toast.success("Ma'lumotlar saqlandi");
      onUpdateShop(localShopData);
    } catch (error) {
      toast.error("Saqlashda xatolik");
    }
  };

  const handleInstagramImport = async () => {
    if (!instagramLink) return toast.error("Iltimos, post linkini kiriting");
    setIsImporting(true);
    
    try {
      const urlMatch = instagramLink.match(/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
      if (!urlMatch) {
         toast.error("Noto'g'ri Instagram linki");
         setIsImporting(false);
         return;
      }

      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE}/api/refresh-instagram-url`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shortcode: urlMatch[2], type: urlMatch[1] })
      });

      if (!response.ok) throw new Error("API xatosi yuz berdi");
      
      const result = await response.json();
      
      let mediaUrls: string[] = [];
      let isVideo = false;

      if (result.urls && Array.isArray(result.urls)) {
        mediaUrls = result.urls.map((u: any) => u.url);
        // Oddiy tekshiruv
        if (mediaUrls[0] && (mediaUrls[0].includes('mp4') || instagramLink.includes('reel'))) {
          isVideo = true;
        }
      } else {
        const singleUrl = result.pictureUrl || result.display_url || result.thumbnail_url;
        if (singleUrl) mediaUrls = [singleUrl];
      }

      if (mediaUrls.length === 0) {
        throw new Error("Media ma'lumotlari topilmadi");
      }

      setImportPreview({
        mediaType: isVideo ? 'video' : 'image',
        mediaUrls: mediaUrls,
        outfitName: 'Instagram Post',
        price: '',
        instagramUrl: instagramLink
      });

    } catch (error) {
      console.error(error);
      toast.error("Xatolik: Post topilmadi yoki yopiq (Private)");
    } finally {
      setIsImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || !user) return;
    setIsUploading(true);
    
    try {
      let finalMediaUrls = [...importPreview.mediaUrls];
      
      // Agar Video bo'lsa uni backend orqali Cloudflare R2 ga siqib yuklaymiz
      if (importPreview.mediaType === 'video' && finalMediaUrls[0]) {
        toast.message("Video yuklanmoqda va siqilmoqda (bu biroz vaqt olishi mumkin)...");
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const uploadRes = await fetch(`${API_BASE}/api/import-to-r2`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ videoUrl: finalMediaUrls[0] })
        });
        
        if (!uploadRes.ok) throw new Error("R2 siqish va yuklashda xatolik");
        
        const r2Data = await uploadRes.json();
        if (r2Data.publicUrl) {
          finalMediaUrls[0] = r2Data.publicUrl; // Update with R2 URL
        }
      }

      const postData = {
        ownerUid: user.uid,
        sellerId: shopData.id,
        seller: {
          id: shopData.id,
          name: shopData.name,
          logo: shopData.logo,
          hasStory: shopData.hasStory || false,
          followers: shopData.followers || 0,
          categories: shopData.categories || [],
          isSubscribed: false
        },
        outfitName: importPreview.outfitName,
        price: importPreview.price || '',
        priceMessage: importPreview.price ? '' : 'Narxini bilish',
        description: '',
        mediaUrls: finalMediaUrls,
        mediaType: importPreview.mediaType,
        likes: 0,
        comments: 0,
        isLiked: false,
        isSaved: false,
        createdAt: serverTimestamp(),
        instagramUrl: importPreview.instagramUrl
      };

      await addDoc(collection(db, 'posts'), postData);
      
      toast.success("Post Cloudflare R2 orqali muvaffaqiyatli saqlandi!");
      setShowInstagramImportModal(false);
      setInstagramLink('');
      setImportPreview(null);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Saqlashda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePost = async () => {};
  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
      toast.success("Post muvaffaqiyatli o'chirildi!");
      setSelectedPostDetails(null);
    } catch (error) {
      console.error("O'chirishda xatolik:", error);
      toast.error("O'chirishda xatolik yuz berdi");
    }
  };

  const handleSendMessage = async (type: string, url?: string) => {
    // Logic for message sending...
  };

  const handleOpenChat = (id: string) => setActiveChatId(id);
  const handleCloseChat = () => setActiveChatId(null);

  return (
    <div className="fixed inset-0 bg-bg-primary z-[1000] flex flex-col overflow-hidden">
      <div className="absolute top-4 left-4 z-[2000]">
        <button 
          onClick={onBackToMarketplace}
          className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg border border-white/20 hover:bg-black/60 active:scale-95 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'MyShop' && (
            <motion.div key="myshop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <MyShopTab 
                language={language}
                shopData={shopData}
                localShopData={localShopData}
                posts={posts}
                uploadProgress={uploadProgress}
                activeProfileTab={activeProfileTab}
                setActiveProfileTab={setActiveProfileTab}
                handleTabChange={handleTabChange}
                handlePhoneClick={() => window.open(`tel:${localShopData.phone}`)}
                handleTelegramClick={() => window.open(`https://t.me/${localShopData.telegram?.replace('@', '')}`)}
                handleInstagramClick={() => window.open(`https://instagram.com/${localShopData.instagram?.replace('@', '')}`)}
                setShowMap={setShowMap}
                setShowInstagramImportModal={setShowInstagramImportModal}
                setShowCreateStoryModal={setShowCreateStoryModal}
                setSelectedPostDetails={setSelectedPostDetails}
                detectLocation={() => {}}
                coverVideoRef={coverVideoRef}
              />
            </motion.div>
          )}

          {activeTab === 'Chats' && (
            <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ChatsTab 
                chats={chats}
                activeChatId={activeChatId}
                chatSearchQuery={chatSearchQuery}
                setChatSearchQuery={setChatSearchQuery}
                handleOpenChat={handleOpenChat}
                handleCloseChat={handleCloseChat}
                handleDeleteChat={() => {}}
                setSelectedMessageId={setSelectedMessageId}
                selectedMessageId={selectedMessageId}
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                handleSendMessage={handleSendMessage}
                isUploading={isUploading}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                showAttachmentMenu={showAttachmentMenu}
                setShowAttachmentMenu={setShowAttachmentMenu}
                handleFileUpload={() => {}}
                handleLocationShare={() => {}}
                stagedImage={null}
                setStagedImage={() => {}}
                stagedVideo={null}
                setStagedVideo={() => {}}
                stagedLocation={null}
                setStagedLocation={() => {}}
                setStagedFile={() => {}}
                playingMessageId={playingMessageId}
                handlePlayAudio={() => {}}
                audioProgress={audioProgress}
                handleReaction={() => {}}
                handleDeleteMessage={() => {}}
                messagesEndRef={messagesEndRef}
                videoPreviewRef={videoPreviewRef}
                isFrontCamera={isFrontCamera}
                toggleCamera={() => setIsFrontCamera(!isFrontCamera)}
                isVideoRecording={isVideoRecording}
                isRecording={isRecording}
                recordingDuration={recordingDuration}
                dragX={dragX}
                formatDuration={(s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`}
                startVideoMessage={() => {}}
                stopVideoMessage={() => {}}
                startRecording={() => {}}
                stopRecording={() => {}}
                setDragX={setDragX}
                dragStartRef={{current: 0} as any}
              />
            </motion.div>
          )}

          {activeTab === 'Settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <SettingsTab 
                language={language}
                localShopData={localShopData}
                setLocalShopData={setLocalShopData}
                logoInputRef={logoInputRef}
                handleLogoUpload={handleLogoUpload}
                detectLocation={() => {}}
                handleSaveShopInfo={handleSaveShopInfo}
                handleTabChange={handleTabChange}
                setShowFreezeModal={setShowFreezeModal}
                setShowDeleteModal={setShowDeleteModal}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white/80 dark:bg-bg-primary/80 backdrop-blur-xl border-t border-border-primary px-6 safe-area-bottom pb-2">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => handleTabChange('MyShop')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'MyShop' ? 'text-accent-blue scale-110' : 'text-text-primary/30'}`}>
             <Store size={22} strokeWidth={activeTab === 'MyShop' ? 2.5 : 2} />
             <span className="text-[10px] font-black uppercase tracking-tighter">Do'kon</span>
          </button>

          <button onClick={() => handleTabChange('Chats')} className="relative group">
            <div className={`p-4 rounded-full transition-all duration-500 ${activeTab === 'Chats' ? 'bg-accent-blue text-white shadow-xl shadow-blue-500/30 -translate-y-4' : 'bg-text-primary/5 text-text-primary/30'}`}>
              <RealisticBlueMessageIcon size={24} active={activeTab === 'Chats'} />
            </div>
            {chats.some(c => c.status === 'new') && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full border-2 border-bg-primary flex items-center justify-center text-[10px] font-bold text-white shadow-lg">!</div>
            )}
          </button>

          <button onClick={() => handleTabChange('Settings')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'Settings' ? 'text-accent-blue scale-110' : 'text-text-primary/30'}`}>
             <SettingsIcon size={22} strokeWidth={activeTab === 'Settings' ? 2.5 : 2} />
             <span className="text-[10px] font-black uppercase tracking-tighter">Sozlamalar</span>
          </button>
        </div>
      </div>

      <ShopModals 
        language={language}
        showMap={showMap}
        setShowMap={setShowMap}
        localShopData={localShopData}
        showFreezeModal={showFreezeModal}
        setShowFreezeModal={setShowFreezeModal}
        isFreezing={false}
        handleFreezeShop={() => {}}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        deleteCode={deleteCode}
        setDeleteCode={setDeleteCode}
        isDeleting={false}
        handleDeleteShop={() => {}}
        showInstagramImportModal={showInstagramImportModal}
        setShowInstagramImportModal={setShowInstagramImportModal}
        showCreateStoryModal={showCreateStoryModal}
        setShowCreateStoryModal={setShowCreateStoryModal}
        isCreatingStory={isCreatingStory}
        handleCreateStory={handleCreateStory}
        handleCreateStoryFromPost={handleCreateStoryFromPost}
        posts={posts}
        instagramLink={instagramLink}
        setInstagramLink={setInstagramLink}
        isImporting={isImporting}
        handleInstagramImport={handleInstagramImport}
        importPreview={importPreview}
        confirmImport={confirmImport}
        isUploading={isUploading}
        selectedPostDetails={selectedPostDetails}
        setSelectedPostDetails={setSelectedPostDetails}
        postDetailsTab={postDetailsTab}
        setPostDetailsTab={setPostDetailsTab}
        handleUpdatePost={handleUpdatePost}
        handleDeletePost={handleDeletePost}
      />
    </div>
  );
};

export default ShopWorkspace;
