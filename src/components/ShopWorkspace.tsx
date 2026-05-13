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
import { getProxiedUrl } from '../utils/mediaUtils';
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
  getDocs,
  writeBatch,
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
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState<{[key: string]: number}>({});
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const handlePlayAudio = (messageId: string, url?: string, initialProgress?: number) => {
    if (!url) {
      console.warn('handlePlayAudio: No URL provided for message', messageId);
      return;
    }

    if (playingMessageId === messageId && audioRef.current) {
      if (audioRef.current.paused) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => setIsAudioPlaying(true)).catch(e => console.error("Play error:", e));
        }
      } else {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; 
      audioRef.current = null;
    }

    try {
      const proxiedUrl = getProxiedUrl(url, 1);
      const audio = new Audio(proxiedUrl);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      const setInitialTime = () => {
        if (initialProgress !== undefined && !isNaN(audio.duration) && isFinite(audio.duration)) {
          audio.currentTime = (initialProgress / 100) * audio.duration;
          setAudioProgress(prev => ({ ...prev, [messageId]: initialProgress }));
        }
      };

      if (audio.readyState >= 1) {
        setInitialTime();
      } else {
        audio.addEventListener('loadedmetadata', setInitialTime, { once: true });
        audio.addEventListener('canplay', setInitialTime, { once: true });
      }

      audio.ontimeupdate = () => {
        if (audio.duration) {
          const progress = (audio.currentTime / audio.duration) * 100;
          setAudioProgress(prev => ({ ...prev, [messageId]: progress }));
        }
      };

      audio.onended = () => {
        setIsAudioPlaying(false);
        setPlayingMessageId(null);
        setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));

        // Sequential playback for shop owner side
        const activeChat = chats.find(c => c.id === activeChatId);
        if (activeChat) {
          const currentIndex = activeChat.messages.findIndex(m => m.id === messageId);
          const nextVoiceMsg = activeChat.messages.slice(currentIndex + 1).find(m => m.type === 'voice' || m.mediaUrl?.includes('audio') || (m as any).audio);
          if (nextVoiceMsg) {
            setTimeout(() => {
              handlePlayAudio(nextVoiceMsg.id, nextVoiceMsg.mediaUrl || (nextVoiceMsg as any).audio);
            }, 500);
          }
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setPlayingMessageId(messageId);
          setIsAudioPlaying(true);
        }).catch(e => {
          if (e.name !== 'AbortError') {
            console.error('Audio play error:', e);
            toast.error("Ovozli xabarni o'qi bo'lmadi");
            setPlayingMessageId(null);
            setIsAudioPlaying(false);
            setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
          }
        });
      } else {
        setPlayingMessageId(messageId);
        setIsAudioPlaying(true);
      }
    } catch (err) {
      console.error('Audio setup error:', err);
      toast.error("Audio pleyerda xatolik");
    }
  };

  const handleClearChat = async () => {
    if (!activeChatId) return;
    if (!window.confirm("Haqiqatdan ham ushbu chat tarixini tozalamoqchimisiz?")) return;

    try {
      const messagesRef = collection(db, `chats/${activeChatId}/messages`);
      const snapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();

      const chatRef = doc(db, 'chats', activeChatId);
      await updateDoc(chatRef, {
        lastMessage: "Tarix tozalandi",
        updatedAt: serverTimestamp()
      });

      toast.success("Tarix tozalandi");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChatId) return;
    try {
      await deleteDoc(doc(db, `chats/${activeChatId}/messages`, messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Xabarni o'chirib bo'lmadi");
    }
  };

  const togglePlaybackSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeekAudio = (messageId: string, progress: number, audioData?: string) => {
    const safeProgress = Math.max(0, Math.min(100, progress));
    setAudioProgress(prev => ({ ...prev, [messageId]: safeProgress }));
    
    if (playingMessageId === messageId && audioRef.current) {
      if (!isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
        audioRef.current.currentTime = (safeProgress / 100) * audioRef.current.duration;
      } else {
        const onMetadata = () => {
          if (!isNaN(audioRef.current!.duration) && isFinite(audioRef.current!.duration)) {
            audioRef.current!.currentTime = (safeProgress / 100) * audioRef.current!.duration;
          }
        };
        audioRef.current.addEventListener('loadedmetadata', onMetadata, { once: true });
        audioRef.current.addEventListener('canplay', onMetadata, { once: true });
      }
      return;
    }

    if (audioData) {
      handlePlayAudio(messageId, audioData, safeProgress);
    }
  };

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
    const toastId = toast.loading(file.type.startsWith('video/') ? "Video optimallashmoqda..." : "Rasm tayyorlanmoqda...");
    try {
      const url = await uploadFile(file);
      toast.loading("Story saqlanmoqda...", { id: toastId });

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
      toast.success("Story muvaffaqiyatli qo'shildi!", { id: toastId });
      onUpdateShop({ ...localShopData, hasStory: true });
    } catch (error: any) {
      console.error("Story creation error:", error?.message || error);
      toast.error("Story yuklashda xatolik yuz berdi", { id: toastId });
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

      // Parallel upload all media files for maximum speed
      const uploadPromises = files.map(async (file) => {
        const isVid = file.type.startsWith('video/');
        if (isVid) {
          toast.loading(`Video optimallashmoqda... (${file.name})`, { id: toastId });
        }
        const url = await uploadFile(file);
        if (isVid) isVideo = true;
        return url;
      });

      mediaUrls = await Promise.all(uploadPromises);
      toast.loading("Media saqlanmoqda...", { id: toastId });

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

  const handleSendMessage = async (type: string, payload?: any) => {
    if (!activeChatId) return;

    try {
      const chatRef = doc(db, 'chats', activeChatId);
      
      // IF EDITING
      if (editingMessage && type === 'text') {
        const messageText = messageInput.trim();
        if (!messageText) return;

        const msgDocRef = doc(db, `chats/${activeChatId}/messages`, editingMessage.id);
        await updateDoc(msgDocRef, {
          text: messageText,
          isEdited: true,
          updatedAt: serverTimestamp()
        });

        await updateDoc(chatRef, {
          lastMessage: messageText,
          updatedAt: serverTimestamp()
        });

        setMessageInput('');
        setEditingMessage(null);
        return;
      }

      const msgData: any = {
        sender: 'shop',
        senderUid: user.uid,
        type,
        timestamp: serverTimestamp(),
        ...payload
      };

      if (type === 'text') {
        if (!messageInput.trim()) return;
        msgData.text = messageInput;
      }
      if (replyingTo) msgData.replyTo = replyingTo.id;

      await addDoc(collection(db, `chats/${activeChatId}/messages`), msgData);
      
      await updateDoc(chatRef, {
        lastMessage: type === 'text' ? messageInput : (type === 'voice' ? 'Ovozli xabar' : `[${type}]`),
        updatedAt: serverTimestamp(),
        status: 'replied',
        lastSender: user.uid
      });

      // Send push notification to customer
      try {
        const chatSnap = await getDoc(chatRef);
        const chatData = chatSnap.data();
        const customerId = chatData?.customerId || activeChatId.split('_').find(id => id !== user.uid);
        
        if (customerId) {
          const customerDoc = await getDoc(doc(db, 'users', customerId));
          if (customerDoc.exists() && customerDoc.data().fcmToken) {
            const { sendPushNotification } = await import('../utils/notifications');
            const pushText = type === 'text' ? messageInput : `[${type}]`;
            await sendPushNotification(customerDoc.data().fcmToken, `${shopData.name}dan xabar`, pushText, { chatId: activeChatId });
          }
        }
      } catch (e) {
        console.error("Customer push notification error:", e);
      }

      setMessageInput('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Xabar yuborishda xatolik');
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Brauzeringiz audio yozishni qo'llab-quvvatlamaydi.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        setIsUploading(true);
        try {
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([blob], `audio_${Date.now()}.${extension}`, { type: mimeType });
          const url = await uploadFile(file, `chats/${activeChatId}/audio`);
          await handleSendMessage('voice', { mediaUrl: url });
        } catch (error) {
          console.error("Audio recording upload error:", error);
          toast.error("Ovozli xabarni yuborib bo'lmadi");
        } finally {
          setIsUploading(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Mikrofonga ruxsat berilmadi");
    }
  };

  const stopRecording = (cancelled: boolean = false) => {
    if (!mediaRecorderRef.current) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (cancelled) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setDragX(0);
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (!activeChatId) return;
    setIsUploading(true);
    try {
      const url = await uploadFile(file, `chats/${activeChatId}`);
      await handleSendMessage(type, { mediaUrl: url });
    } catch (error: any) {
      console.error("Chat file upload error:", error);
      toast.error("Fayl yuklashda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
    }
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
                editingMessage={editingMessage}
                setEditingMessage={setEditingMessage}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                handleSendMessage={handleSendMessage}
                handleDeleteMessage={handleDeleteMessage}
                handleClearChat={handleClearChat}
                isUploading={isUploading}
                showAttachmentMenu={showAttachmentMenu}
                setShowAttachmentMenu={setShowAttachmentMenu}
                handleFileUpload={(type: 'image' | 'video') => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = type === 'image' ? 'image/*' : 'video/*';
                  input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file, type);
                  };
                  input.click();
                }}
                handleLocationShare={() => {}}
                stagedImage={null}
                setStagedImage={() => {}}
                stagedVideo={null}
                setStagedVideo={() => {}}
                stagedLocation={null}
                setStagedLocation={() => {}}
                setStagedFile={() => {}}
                playingMessageId={playingMessageId}
                isAudioPlaying={isAudioPlaying}
                playbackSpeed={playbackSpeed}
                togglePlaybackSpeed={togglePlaybackSpeed}
                handlePlayAudio={handlePlayAudio}
                handleSeekAudio={handleSeekAudio}
                audioProgress={audioProgress}
                handleReaction={() => {}}
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
                startRecording={startRecording}
                stopRecording={stopRecording}
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
