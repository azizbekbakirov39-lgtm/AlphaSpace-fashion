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
import { uploadFile } from '../services/uploadService';
import { 
  db, 
  storage,
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
  Timestamp,
  ref, 
  uploadBytes, 
  getDownloadURL, 
  uploadBytesResumable
} from '../firebase';

// Modular components
import { MyShopTab } from './shop/MyShopTab';
import { ChatsTab } from './shop/ChatsTab';
import { SettingsTab } from './shop/SettingsTab';
import { ShopModals } from './shop/ShopModals';
import { compressImage } from '../lib/compression';

interface ShopWorkspaceProps {
  language: Language;
  shopData: Seller;
  user: User | null;
  posts: PostData[];
  onBackToMarketplace: () => void;
  onUpdateShop: (shop: Seller) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  onOpenReels: (postsList: any[], index: number) => void;
}

const ShopWorkspace: React.FC<ShopWorkspaceProps> = ({
  language,
  shopData,
  user,
  posts,
  onBackToMarketplace,
  onUpdateShop,
  activeTab,
  setActiveTab,
  activeChatId,
  setActiveChatId,
  onOpenReels
}) => {
  // Navigation States
  const [activeProfileTab, setActiveProfileTab] = useState<'Postlar' | 'Ma\'lumot'>('Postlar');

  // Shop Data States
  const [localShopData, setLocalShopData] = useState<Seller>(shopData);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  // Chat States
  const [chats, setChats] = useState<any[]>([]);
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
  const [showManualPostModal, setShowManualPostModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
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
      let url = '';
      
      try {
        let fileToUpload: File | Blob = file;
        const isVid = file.type.startsWith('video/');
        if (!isVid) {
           fileToUpload = await compressImage(file);
        }

        let targetUrl = '';
        if (isVid) {
             const res = await fetch('/api/get-stream-upload-url', { method: 'POST', headers: {'Content-Type': 'application/json'} });
             if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Yuklash uchun link olishda xato (Stream)");
             }
             const data = await res.json();
             targetUrl = data.uploadUrl;
             url = `https://iframe.videodelivery.net/${data.uid}`; 
        } else {
             const res = await fetch('/api/get-r2-upload-url', { 
               method: 'POST', 
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({ fileName: file.name, fileType: fileToUpload.type })
             });
             if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Yuklash uchun link olishda xato (R2)");
             }
             const data = await res.json();
             targetUrl = data.uploadUrl;
             url = data.publicUrl;
        }

        await new Promise((resolve, reject) => {
           const xhr = new XMLHttpRequest();
           xhr.open(isVid ? 'POST' : 'PUT', targetUrl);
           xhr.onload = () => {
             if (xhr.status >= 200 && xhr.status < 300) {
               resolve(true);
             } else {
               reject(new Error(`Upload failed: ${xhr.status}`));
             }
           };
           xhr.onerror = () => reject(new Error("Tarmoq xatosi yuz berdi."));
           if (isVid) {
              const fd = new FormData();
              fd.append('file', fileToUpload);
              xhr.send(fd);
           } else {
              xhr.setRequestHeader('Content-Type', fileToUpload.type);
              xhr.send(fileToUpload);
           }
        });
      } catch (err: any) {
        if (err?.message && err.message.includes("R2 sozlanmagan")) {
           throw err;
        }
        
        console.error("R2 upload error, retrying...", err);
        url = await uploadFile(file);
      }

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
    } catch (error: any) {
      console.error("Story creation error:", error?.message || error);
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
      // Manually pick fields to avoid circularity and ensure only clean data goes to Firestore
      const cleanData = {
        name: localShopData.name || "",
        logo: localShopData.logo || "",
        description: localShopData.description || "",
        workingHours: localShopData.workingHours || "",
        workingDays: localShopData.workingDays || [],
        categories: localShopData.categories || [],
        phone: localShopData.phone || "",
        location: localShopData.location ? {
          lat: Number(localShopData.location.lat),
          lng: Number(localShopData.location.lng)
        } : { lat: 41.311081, lng: 69.240562 },
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'shops', shopData.id), cleanData);
      
      toast.success("Ma'lumotlar saqlandi");
      onUpdateShop(localShopData);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error("Save shop info error:", errorMessage);
      toast.error("Saqlashda xatolik");
    }
  };

  const handleManualPostUpload = async (files: File[], data: { title: string, price: string, description: string }) => {
    if (!user || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    setShowManualPostModal(false); // Close immediately
    const toastId = toast.loading("Media yuklanmoqda...");

    try {
      let mediaUrls: string[] = [];
      let isVideo = false;

      // Try client-side direct uploads to bypass 413 limits
      try {
        for (const file of files) {
          const isVid = file.type.startsWith('video/');
          let fileToUpload: File | Blob = file;
          if (!isVid) {
            fileToUpload = await compressImage(file);
          }
          const fileName = file.name;

          let targetUrl = '';
          let publicMediaUrl = '';

          // 1. Get presigned URL
          if (isVid) {
             const res = await fetch('/api/get-stream-upload-url', { method: 'POST', headers: {'Content-Type': 'application/json'} });
             if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Yuklash uchun link olishda xato (Stream)");
             }
             const data = await res.json();
             targetUrl = data.uploadUrl;
             publicMediaUrl = `https://iframe.videodelivery.net/${data.uid}`; 
          } else {
             const res = await fetch('/api/get-r2-upload-url', { 
               method: 'POST', 
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({ fileName, fileType: fileToUpload.type })
             });
             if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Yuklash uchun link olishda xato (R2)");
             }
             const data = await res.json();
             targetUrl = data.uploadUrl;
             publicMediaUrl = data.publicUrl;
          }

          // 2. Upload file directly
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(isVid ? 'POST' : 'PUT', targetUrl);
            
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
                if (percentComplete === 100) {
                  toast.loading("Media saqlanmoqda...", { id: toastId });
                }
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(true);
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            };
            
            xhr.onerror = () => reject(new Error(`Tarmoq xatosi yuz berdi (${isVid ? 'Stream' : 'R2'})`));

            if (isVid) {
               const fd = new FormData();
               fd.append('file', fileToUpload);
               xhr.send(fd);
            } else {
               xhr.setRequestHeader('Content-Type', fileToUpload.type);
               xhr.send(fileToUpload);
            }
          });

          mediaUrls.push(publicMediaUrl);
          if (isVid) isVideo = true;
        }
      } catch (fallbackErr: any) {
        if (fallbackErr?.message && fallbackErr.message.includes("R2 sozlanmagan")) {
          throw fallbackErr;
        }

        console.error("R2/Stream collection upload error:", fallbackErr);
        throw fallbackErr;
      }

      if (mediaUrls.length === 0) throw new Error("Fayllarni yuklash imkoni bo'lmadi");

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
        outfitName: data.title,
        price: data.price || '',
        priceMessage: data.price ? '' : 'Narxini bilish',
        description: data.description || '',
        mediaUrls: mediaUrls,
        mediaType: isVideo ? 'video' : 'image',
        likes: 0,
        comments: 0,
        isLiked: false,
        isSaved: false,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'posts'), postData);
      
      toast.success("Post muvaffaqiyatli yaratildi!", { id: toastId });
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error("Manual post error:", errorMessage);
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleUpdatePost = async () => {};
  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
      toast.success("Post muvaffaqiyatli o'chirildi!");
      setSelectedPostDetails(null);
    } catch (error: any) {
      console.error("O'chirishda xatolik:", error?.message || error);
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
      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/10 z-[3000]">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
      
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
                setShowMap={setShowMap}
                setShowManualPostModal={setShowManualPostModal}
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
        showManualPostModal={showManualPostModal}
        setShowManualPostModal={setShowManualPostModal}
        handleManualPostUpload={handleManualPostUpload}
        showCreateStoryModal={showCreateStoryModal}
        setShowCreateStoryModal={setShowCreateStoryModal}
        isCreatingStory={isCreatingStory}
        handleCreateStory={handleCreateStory}
        handleCreateStoryFromPost={handleCreateStoryFromPost}
        posts={posts}
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
