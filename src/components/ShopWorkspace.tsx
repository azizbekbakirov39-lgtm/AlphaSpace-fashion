import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, 
  MessageSquare, 
  Zap, 
  Settings, 
  Users, 
  Phone, 
  Send,
  PlusCircle,
  Instagram,
  MapPin,
  Trash2,
  Image as ImageIcon,
  Video,
  ChevronLeft,
  X,
  Camera,
  Navigation,
  Grid,
  Search,
  RefreshCw,
  CheckCircle2,
  Edit,
  LogOut,
  Sparkles,
  Plus,
  Play,
  Pause,
  Trash,
  Download,
  Maximize2,
  Reply,
  Smile,
  Star,
  Link2,
  Clock,
  FlipHorizontal,
  Mic,
  ExternalLink,
  Info,
  FileUp,
  Package,
  ChevronRight,
  Bookmark,
  Share2,
  Eye,
  Heart
} from 'lucide-react';
import { isVideoUrl, getProxiedUrl, safePlayVideo } from '../utils/mediaUtils';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { Language, translations } from '../translations';
import { useKeyboard } from '../hooks/useKeyboard';
import { showChatNotification } from '../utils/notifications';
import { toast } from 'sonner';
import { Seller, PostData, SellerCategory, SELLER_CATEGORIES, User } from '../types';
import { uploadImageToImgBB } from '../services/imgbb';
import { db, storage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, addDoc, collection, serverTimestamp, Timestamp, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, setDoc, getDoc } from '../firebase';
import { compressImage, compressVideo } from '../lib/compression';
import TelegramLinkManager from './TelegramLinkManager';

interface Message {
  id: string;
  text?: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'location' | 'post' | 'videoMessage';
  mediaUrl?: string;
  sender: 'shop' | 'customer';
  timestamp: string;
  location?: { lat: number; lng: number };
  post?: PostData;
  replyTo?: string;
  reactions?: string[];
}

interface Chat {
  id: string;
  customerName: string;
  customerAvatar: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
  status: 'new' | 'in-progress' | 'completed';
  pinnedProduct?: {
    name: string;
    price: string;
    image: string;
  };
}

const DAYS_OF_WEEK = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];

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
  setActiveChatId: (chatId: string | null) => void;
  onOpenReels?: (posts: PostData[], index: number) => void;
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
  const { isKeyboardOpen } = useKeyboard();
  const [localShopData, setLocalShopData] = useState<Seller>(shopData);
  const [showMap, setShowMap] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  
  // 1. Listen for chats list
  useEffect(() => {
    if (!shopData.id) return;

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', shopData.id));
    
    // Store reference to avoid closure staleness in active state checking
    let initComplete = false;

    const unsubChats = onSnapshot(q, (snapshot) => {
      // Notification Logic
      if (initComplete) {
        snapshot.docChanges().forEach(change => {
           if (change.type === 'modified') {
             const data = change.doc.data();
             // If last sender is NOT the shop, it means customer sent a message
             if (data.lastSender && data.lastSender !== shopData.id) {
               // Show notification only if we're not actively conversing in this specific chat
               if (document.hidden || activeChatId !== change.doc.id) {
                  showChatNotification("Yangi xabar", data.lastMessage || "Mijoz xabar yubordi");
               }
             }
           }
        });
      }
      initComplete = true;

      const chatsData = snapshot.docs.map(chatDoc => {
        const chatId = chatDoc.id;
        const customerUid = chatId.replace(shopData.id, '').replace('_', '');
        
        return {
          id: chatId,
          customerUid,
          customerName: "Yuklanmoqda...",
          customerAvatar: `https://ui-avatars.com/api/?name=Mijoz&background=random`,
          lastMessage: chatDoc.data().lastMessage || "Xabar yo'q",
          timestamp: chatDoc.data().updatedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: [],
          status: chatDoc.data().status || 'new'
        } as Chat & { customerUid: string };
      });
      
      setChats(prev => {
        // Preserve existing messages and customer info if already loaded
        return chatsData.map(newChat => {
          const existing = prev.find(p => p.id === newChat.id);
          return existing ? { ...newChat, messages: existing.messages, customerName: existing.customerName, customerAvatar: existing.customerAvatar } : newChat;
        });
      });

      // 2. Fetch customer info for each chat (only once or when needed)
      chatsData.forEach(chat => {
        const customerUid = chat.customerUid;
        getDoc(doc(db, 'users', customerUid)).then(userDoc => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setChats(prev => prev.map(c => c.id === chat.id ? {
              ...c,
              customerName: userData.displayName || "Mijoz",
              customerAvatar: userData.photoURL || c.customerAvatar
            } : c));
          }
        });
      });
    });

    return () => unsubChats();
  }, [shopData.id]);

  // 3. Listen for messages of the ACTIVE chat only
  useEffect(() => {
    if (!activeChatId) return;

    const msgQ = query(collection(db, `chats/${activeChatId}/messages`), orderBy('timestamp', 'asc'));
    const unsubMessages = onSnapshot(msgQ, (msgSnapshot) => {
      const msgs = msgSnapshot.docs.map(doc => {
        const data = doc.data();
        let finalType = data.type;
        let finalMediaUrl = data.mediaUrl;
        
        // Polyfill for messages sent by older clients or Profile.tsx that lack 'type'
        if (!finalType) {
            if (data.post) finalType = 'post';
            else if (data.location) finalType = 'location';
            else if (data.videoMessage) { finalType = 'videoMessage'; finalMediaUrl = data.videoMessage; }
            else if (data.video) { finalType = 'video'; finalMediaUrl = data.video; }
            else if (data.image) { finalType = 'image'; finalMediaUrl = data.image; }
            else if (data.audio) { finalType = 'voice'; finalMediaUrl = data.audio; }
            else finalType = 'text';
        }

        return {
          id: doc.id,
          ...data,
          type: finalType,
          mediaUrl: finalMediaUrl,
          sender: data.senderUid === shopData.id ? 'shop' : 'customer',
          timestamp: data.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }) as Message[];

      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: msgs } : c));
    });

    return () => unsubMessages();
  }, [activeChatId, shopData.id]);

  const [messageInput, setMessageInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordType, setRecordType] = useState<'voice' | 'video'>('voice');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'pending' | 'completed'>('all');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isCancelAreaHovered, setIsCancelAreaHovered] = useState(false);
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [stagedVideo, setStagedVideo] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedLocation, setStagedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{[key: string]: number}>({});
  
  // Post Details view
  const [selectedPostDetails, setSelectedPostDetails] = useState<PostData | null>(null);
  const [postDetailsTab, setPostDetailsTab] = useState<'stats' | 'settings'>('stats');

  const dragStartRef = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const isCancelAreaHoveredRef = useRef(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const coverVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const QUICK_REPLIES = [
    "Assalomu alaykum! Ha, bu mahsulotimiz sotuvda bor.",
    "Narxi: 250,000 so'm. Yetkazib berish bepul.",
    "Manzilimiz: Toshkent sh., Chilonzor tumani, 5-mavze.",
    "To'lovni Click yoki Payme orqali amalga oshirishingiz mumkin.",
    "Rahmat! Buyurtmangiz qabul qilindi."
  ];
  
  // Post management states
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<PostData | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'Postlar' | 'Ma\'lumot'>('Postlar');
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showInstagramImportModal, setShowInstagramImportModal] = useState(false);
  const [instagramLink, setInstagramLink] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<any>(null);
  
  const activeChat = chats.find(c => c.id === activeChatId);
  useEffect(() => {
    if (coverVideoRef.current) {
      safePlayVideo(coverVideoRef.current);
    }
  }, [activeTab]); // Retry when tab changes

  const t = translations[language];

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    window.history.pushState({ type: 'shopWorkspaceTab', tab, workspace: 'Shop' }, '');
  };

  const handleOpenChat = (chatId: string) => {
    setActiveChatId(chatId);
    window.history.pushState({ type: 'shopWorkspaceChat', chatId, workspace: 'Shop' }, '');
  };

  const handleCloseChat = () => {
    setActiveChatId(null);
    if (window.history.state?.type === 'shopWorkspaceChat') {
      window.history.back();
    } else {
      setActiveChatId(null);
    }
  };

  const handleSaveShopInfo = async () => {
    if (!user) {
      toast.error("Iltimos, avval tizimga kiring");
      return;
    }

    // Check if user is the owner
    if (shopData.ownerUid !== user.uid && shopData.ownerUid !== 'system') {
      console.error("Ownership mismatch:", { shopOwner: shopData.ownerUid, currentUser: user.uid });
      toast.error("Sizda ushbu do'kon ma'lumotlarini o'zgartirish huquqi yo'q");
      return;
    }

    try {
      toast.loading("Ma'lumotlar saqlanmoqda...", { id: 'save-shop' });
      
      const shopRef = doc(db, 'shops', shopData.id);
      const updateData = {
        name: localShopData.name || '',
        logo: localShopData.logo || '',
        description: localShopData.description || '',
        phone: localShopData.phone || '',
        telegram: localShopData.telegram || '',
        instagram: localShopData.instagram || '',
        workingDays: localShopData.workingDays || [],
        location: localShopData.location || { lat: 41.311081, lng: 69.240562 },
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(shopRef, updateData);
      
      if (localShopData.logo !== shopData.logo) {
        toast.loading("Postlardagi logo yangilanmoqda...", { id: 'save-shop' });
        const shopPosts = posts.filter(p => p.seller.id === shopData.id);
        for (const post of shopPosts) {
          await updateDoc(doc(db, 'posts', post.id), {
            'seller.logo': localShopData.logo
          });
        }
      }
      
      onUpdateShop(localShopData);
      toast.success("Ma'lumotlar saqlandi", { id: 'save-shop' });
      handleTabChange('MyShop');
    } catch (error: any) {
      console.error("Error saving shop info:", error);
      let errorMsg = "Xatolik yuz berdi";
      
      if (error.code === 'permission-denied') {
        errorMsg = "Ruxsat etilmadi (Permission Denied). Siz ushbu do'kon egasi emassiz yoki qoidalar ruxsat bermayapti.";
      } else if (error.message) {
        errorMsg = `Xatolik: ${error.message}`;
      }
      
      toast.error(errorMsg, { id: 'save-shop' });
    }
  };

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocalShopData(prev => ({
            ...prev,
            location: { lat: latitude, lng: longitude }
          }));
        },
        (error) => {
          console.error("Error detecting location:", error);
        }
      );
    }
  };

  const handleInstagramImport = async () => {
    if (!instagramLink) {
      toast.error("Iltimos, Instagram linkini kiriting");
      return;
    }
    setIsImporting(true);
    try {
      // Extract shortcode from Instagram URL to ensure it's a valid post link
      const shortcodeMatch = instagramLink.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
      const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

      if (!shortcode) {
        throw new Error("Noto'g'ri Instagram linki. Iltimos, to'g'ri link kiriting (masalan: https://www.instagram.com/p/...)");
      }

      const apiKey = (import.meta as any).env.VITE_RAPIDAPI_KEY;
      if (!apiKey) {
         throw new Error("API kalit topilmadi. Iltimos VITE_RAPIDAPI_KEY ni sozlamalarga qo'shing.");
      }

      // Clean URL for the API
      const cleanUrl = `https://www.instagram.com/p/${shortcode}/`;

      const response = await fetch(`https://instagram120.p.rapidapi.com/api/instagram/links`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-host': 'instagram120.p.rapidapi.com',
          'x-rapidapi-key': apiKey
        },
        body: JSON.stringify({ url: cleanUrl })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("API Error Response:", errText);
        if (response.status === 403) {
           throw new Error("API ga obuna bo'lmagansiz (403). Iltimos RapidAPI da obuna bo'ling.");
        }
        throw new Error(`API Xatosi (${response.status}): Iltimos qayta urinib ko'ring.`);
      }

      const result = await response.json();

      // Parse the response based on common structures for this API
      let mediaUrls: string[] = [];
      let mediaType: 'video' | 'carousel' = 'carousel';
      let description = "";

      if (Array.isArray(result) && result.length > 0) {
        // If it's an array, it's a carousel (multiple slides)
        mediaUrls = result.map((item: any) => {
          if (item.urls && Array.isArray(item.urls) && item.urls.length > 0) {
            // Pick the first URL which is usually the highest quality/primary one
            return item.urls[0].url;
          } else if (item.pictureUrl) {
            return item.pictureUrl;
          } else if (item.display_url) {
            return item.display_url;
          } else if (item.thumbnail_url) {
            return item.thumbnail_url;
          }
          return null;
        }).filter(Boolean) as string[];

        // Try to find the best description
        const firstItem = result[0];
        description = firstItem.caption || firstItem.text || (firstItem.meta && firstItem.meta.title) || "";
        
        // Check if any item is a video
        const hasVideo = result.some((item: any) => 
          item.urls?.some((u: any) => u.extension === 'mp4' || u.url?.includes('.mp4') || u.url?.includes('video'))
        );
        
        if (hasVideo && mediaUrls.length === 1) {
          mediaType = 'video';
        } else {
          mediaType = 'carousel';
        }
      } else if (result.urls && Array.isArray(result.urls)) {
        // Single post with multiple resolutions/formats
        // If it's a single post, we only want the primary media URL
        mediaUrls = [result.urls[0].url].filter(Boolean);
        description = result.caption || result.text || (result.meta && result.meta.title) || "";
        
        const hasVideo = result.urls.some((u: any) => u.extension === 'mp4' || u.url?.includes('.mp4') || u.url?.includes('video'));
        mediaType = hasVideo ? 'video' : 'carousel';
      } else if (result.pictureUrl || result.display_url || result.thumbnail_url) {
        mediaUrls = [result.pictureUrl || result.display_url || result.thumbnail_url].filter(Boolean);
        description = result.caption || result.text || (result.meta && result.meta.title) || "";
        mediaType = 'carousel';
      }

      if (mediaUrls.length === 0) {
        throw new Error("Postda rasm yoki video topilmadi. API tuzilmasi o'zgargan bo'lishi mumkin.");
      }

      const newPreview = {
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
      };
      
      setImportPreview(newPreview);
      toast.success("Ma'lumotlar muvaffaqiyatli olindi!");
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Instagramdan ma'lumot olishda xatolik");
    } finally {
      setIsImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || !user) return;
    try {
      setIsUploading(true);
      
      // Handle default price message if price is empty
      let finalPriceMessage = importPreview.priceMessage;
      if (!importPreview.price && !finalPriceMessage) {
        finalPriceMessage = "Narxi qancha?";
      }

      // Sync price to items and ensure name/outfitName consistency
      const syncedItems = (importPreview.items || []).map((item: any) => ({
        ...item,
        price: importPreview.price || item.price || ''
      }));

      const postData: any = {
        ...importPreview,
        name: importPreview.outfitName || '',
        items: syncedItems,
        priceMessage: finalPriceMessage || '',
        ownerUid: user.uid,
        seller: {
          id: shopData.id,
          name: shopData.name,
          logo: shopData.logo || null,
          region: shopData.region || 'Toshkent'
        },
        likes: 0,
        views: 0,
        shares: 0,
        comments: 0,
        createdAt: serverTimestamp()
      };

      // Clean undefined values
      Object.keys(postData).forEach(key => postData[key] === undefined && delete postData[key]);
      
      await addDoc(collection(db, 'posts'), postData);
      toast.success("Mahsulot muvaffaqiyatli import qilindi!");
      setShowInstagramImportModal(false);
      setImportPreview(null);
      setInstagramLink('');
    } catch (error: any) {
      console.error("Save error:", error);
      const errorMsg = error.code === 'permission-denied' 
        ? "Ruxsat etilmadi. Sizda ushbu do'konga maxsulot qo'shish huquqi yo'q." 
        : (error.message || "Saqlashda xatolik yuz berdi");
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;
    const toastId = toast.loading("Post yangilanmoqda...");
    try {
      const { id, ...postData } = editingPost;
      await updateDoc(doc(db, 'posts', id), postData);
      setEditingPost(null);
      toast.success("Post yangilandi", { id: toastId });
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Postni yangilashda xatolik", { id: toastId });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Haqiqatan ham ushbu postni o'chirmoqchimisiz?")) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setEditingPost(null);
      toast.success("Post o'chirildi");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Postni o'chirishda xatolik");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const toastId = toast.loading("Logo yuklanmoqda...");
      try {
        const compressedLogo = await compressImage(file);
        const url = await uploadImageToImgBB(compressedLogo);
        setLocalShopData(prev => ({ ...prev, logo: url }));
        toast.success("Logo yuklandi", { id: toastId });
      } catch (error) {
        console.error("Error uploading logo:", error);
        toast.error("Logo yuklashda xatolik", { id: toastId });
      }
    }
  };

  const handleInstagramClick = () => {
    if (localShopData.instagram) {
      window.open(localShopData.instagram, '_blank');
    }
  };

  const handleTelegramClick = () => {
    if (localShopData.telegram) {
      window.open(localShopData.telegram, '_blank');
    }
  };

  const handlePhoneClick = () => {
    if (localShopData.phone) {
      window.location.href = `tel:${localShopData.phone}`;
    }
  };

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(recordingIntervalRef.current);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const s = seconds || 0;
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const s = seconds || 0;
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (type: 'image' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          if (type === 'image') setStagedImage(base64);
          else setStagedVideo(base64);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleLocationShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setStagedLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  };

  const startVideoMessage = async () => {
    try {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: isFrontCamera ? 'user' : 'environment' }, 
        audio: true 
      });
      streamRef.current = stream;
      setIsVideoRecording(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        safePlayVideo(videoPreviewRef.current);
      }

      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => recordingChunksRef.current.push(e.data);
      recorder.onstop = () => {
        if (!isCancelAreaHoveredRef.current && dragXRef.current > -100) {
          const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            handleSendMessage('videoMessage', reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
        stream.getTracks().forEach(t => t.stop());
        setDragX(0);
        dragXRef.current = 0;
        setIsCancelAreaHovered(false);
        isCancelAreaHoveredRef.current = false;
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Video access denied:", err);
    }
  };

  const stopVideoMessage = () => {
    if (mediaRecorderRef.current && isVideoRecording) {
      mediaRecorderRef.current.stop();
      setIsVideoRecording(false);
      streamRef.current = null;
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const startRecording = async () => {
    try {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];

      recorder.ondataavailable = (e) => recordingChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        if (!isCancelAreaHoveredRef.current && dragXRef.current > -100) {
          const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            handleSendMessage('voice', base64Audio);
          };
        }
        stream.getTracks().forEach(track => track.stop());
        setDragX(0);
        dragXRef.current = 0;
        setIsCancelAreaHovered(false);
        isCancelAreaHoveredRef.current = false;
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Mikrofonga ruxsat berilmadi.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const toggleCamera = async () => {
    const newFacing = !isFrontCamera;
    setIsFrontCamera(newFacing);
    if (isVideoRecording && streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newFacing ? 'user' : 'environment' }, 
        audio: true 
      });
      streamRef.current = newStream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = newStream;
        safePlayVideo(videoPreviewRef.current);
      }
    }
  };

  const handlePlayAudio = (messageId: string, audioData: string) => {
    if (playingMessageId === messageId) {
      audioRef.current?.pause();
      setPlayingMessageId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioData);
    audioRef.current = audio;
    setPlayingMessageId(messageId);

    audio.ontimeupdate = () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      setAudioProgress(prev => ({ ...prev, [messageId]: progress }));
    };

    audio.onended = () => {
      setPlayingMessageId(null);
    };

    audio.play();
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // In a real app, we might just hide it for the user, 
      // but for "full integration" we'll delete the doc
      await deleteDoc(doc(db, 'chats', chatId));
      if (activeChatId === chatId) handleCloseChat();
      toast.success("Chat o'chirildi");
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Chatni o'chirishda xatolik");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStagedFile(file);
    const fakeUrl = URL.createObjectURL(file);
    if (file.type.startsWith('video')) {
      setStagedVideo(fakeUrl);
    } else {
      setStagedImage(fakeUrl);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (type: 'text' | 'image' | 'video' | 'voice' | 'location' | 'post' | 'videoMessage', mediaUrl?: string, location?: {lat: number, lng: number}, post?: PostData) => {
    if (!activeChatId || !shopData.id) return;
    
    const messageText = type === 'text' ? messageInput : undefined;
    
    if (messageText) {
      const prohibitedPattern = /🌈|🏳️‍🌈|🏳️‍⚧️|lgbt|gay|lesbian|homo/i;
      if (prohibitedPattern.test(messageText)) {
        toast.error("Ushbu xabarda taqiqlangan so'zlar yoki belgilar mavjud.");
        return;
      }
    }

    const locationData = location || stagedLocation;
    const postData = post;

    if (type === 'text' && !messageInput.trim() && !stagedImage && !stagedVideo && !stagedLocation && !stagedFile) return;

    setIsUploading(true);
    try {
      let finalType = type;
      let finalMedia = mediaUrl;
      let finalLocation = locationData;

      if (stagedFile) {
        if (stagedImage) {
          finalMedia = await uploadImageToImgBB(stagedFile);
          finalType = 'image';
        } else {
          const fileExt = stagedFile.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const storageRef = ref(storage, `chat_media/${shopData.id}/${fileName}`);
          
          await uploadBytes(storageRef, stagedFile);
          finalMedia = await getDownloadURL(storageRef);
          
          if (stagedVideo) finalType = 'video';
        }
      } else if (type === 'text') {
        if (stagedLocation) {
          finalType = 'location';
          finalLocation = stagedLocation;
        }
      }

      const msgData: any = {
        senderUid: shopData.id,
        text: messageText,
        
        // ShopWorkspace.tsx compat
        type: finalType,
        mediaUrl: finalMedia,
        location: finalLocation,
        post: postData,
        
        // Profile.tsx compat
        audio: finalType === 'voice' ? finalMedia : undefined,
        image: finalType === 'image' ? finalMedia : undefined,
        video: finalType === 'video' ? finalMedia : undefined,
        videoMessage: finalType === 'videoMessage' ? finalMedia : undefined,

        timestamp: serverTimestamp(),
        replyTo: replyingTo?.id
      };

      // Ensure no undefined values are written to Firestore
      Object.keys(msgData).forEach(key => msgData[key] === undefined && delete msgData[key]);

      const chatRef = doc(db, 'chats', activeChatId);
      await setDoc(chatRef, {
        lastMessage: messageText || `[${finalType}]`,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await addDoc(collection(db, `chats/${activeChatId}/messages`), msgData);
      
      if (type === 'text') setMessageInput('');
      setReplyingTo(null);
      setStagedImage(null);
      setStagedVideo(null);
      setStagedFile(null);
      setStagedLocation(null);
      setShowAttachmentMenu(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Xabar yuborishda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChatId) return;
    try {
      await deleteDoc(doc(db, `chats/${activeChatId}/messages`, messageId));
      setSelectedMessageId(null);
      toast.success("Xabar o'chirildi");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Xabarni o'chirishda xatolik");
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!activeChatId) return;
    const msgRef = doc(db, `chats/${activeChatId}/messages`, messageId);
    try {
      const msgSnap = await getDoc(msgRef);
      if (msgSnap.exists()) {
        const reactions = msgSnap.data().reactions || [];
        const newReactions = reactions.includes(emoji) 
          ? reactions.filter((r: string) => r !== emoji)
          : [...reactions, emoji].slice(-3); // Limit to 3 reactions
        await updateDoc(msgRef, { reactions: newReactions });
      }
      setSelectedMessageId(null);
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const updateChatStatus = (status: 'new' | 'in-progress' | 'completed') => {
    if (!activeChatId) return;
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, status } : c));
    toast.success(`Chat holati: ${status === 'new' ? 'Yangi' : status === 'in-progress' ? 'Jarayonda' : 'Yakunlangan'}`);
  };

  // Premium features removed

  const handleFreezeShop = async () => {
    try {
      setIsFreezing(true);
      const shopRef = doc(db, 'shops', shopData.id);
      await updateDoc(shopRef, { status: 'frozen' });
      toast.success("Do'koningiz vaqtinchalik muzlatildi");
      setShowFreezeModal(false);
      onBackToMarketplace();
    } catch (error) {
      console.error("Error freezing shop:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsFreezing(false);
    }
  };

  const handleDeleteShop = async () => {
    if (deleteCode !== '123456') {
      toast.error("Kod noto'g'ri");
      return;
    }
    
    try {
      setIsDeleting(true);
      // Delete shop document
      await deleteDoc(doc(db, 'shops', shopData.id));
      
      // Note: In a real app, you'd also delete all posts, stories, and chats associated with this shop
      // For this demo, deleting the shop document is sufficient to remove it from the UI
      
      toast.success("Do'koningiz butunlay o'chirildi");
      setShowDeleteModal(false);
      onBackToMarketplace();
    } catch (error) {
      console.error("Error deleting shop:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'MyShop':
        return (
          <div className="h-full overflow-y-auto scrollbar-hide pb-24">
            {/* Hero Section */}
            <div className="relative h-[300px] w-full overflow-hidden bg-text-primary/5">
              {(() => {
                const latestPost = posts.find(p => {
                  const postSellerId = p.seller?.id || (p as any).sellerId || (p as any).uid;
                  const matchesSeller = String(postSellerId) === String(shopData.id);
                  return matchesSeller && p.mediaUrls && p.mediaUrls.length > 0;
                });

                const mediaUrl = latestPost?.mediaUrls?.[0] || shopData.coverImage;
                const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;

                if (isVideo) {
                  return (
                    <video 
                      ref={coverVideoRef}
                      src={mediaUrl + '#t=0.1'}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      loop
                    />
                  );
                }

                return (
                  <img 
                    src={mediaUrl || `https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800`}
                    alt="Cover"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                );
              })()}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/20 to-transparent" />
              
              {/* Shop Identity Overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex items-end gap-4">
                <div className="relative">
                  <div className="p-[3px] bg-gradient-to-br from-accent-blue to-accent-light rounded-3xl shadow-2xl">
                    <div className="p-[2px] bg-bg-primary rounded-[22px]">
                      {localShopData.logo ? (
                        <img 
                          src={localShopData.logo || undefined} 
                          className="w-20 h-20 rounded-[20px] object-cover" 
                          alt="Logo" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-[20px] bg-white flex items-center justify-center text-accent-blue">
                          <Store size={40} strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                </div>
                
                <div className="flex-1 mb-1">
                  <h1 className="text-2xl font-black text-text-primary tracking-tight leading-none mb-1 uppercase italic">
                    {localShopData.name}
                  </h1>
                  <div className="flex items-center gap-2">
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-border-primary">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-lg font-black text-text-primary">0</span>
                  <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest">Obunachilar</span>
                </div>
                <div className="w-px h-6 bg-border-primary" />
                <div className="flex flex-col">
                  <span className="text-lg font-black text-text-primary">{posts.length}</span>
                  <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest">Postlar</span>
                </div>
              </div>
            </div>

            {/* Management Actions */}
            <div className="px-6 py-4 flex gap-3">
              <button 
                onClick={() => handleTabChange('Settings')}
                className="flex-1 py-4 bg-text-primary/5 rounded-[24px] border border-border-primary hover:bg-text-primary/10 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Settings size={16} className="text-text-primary/60" />
                <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">Sozlamalar</span>
              </button>
            </div>

            {/* Contact Links Grid (Like Buyer View) */}
            <div className="px-6 py-2 grid grid-cols-3 gap-3">
              <button 
                onClick={handlePhoneClick}
                className="bg-text-primary/5 p-4 rounded-[28px] border border-border-primary flex flex-col items-center gap-2 transition-all active:scale-95 hover:bg-green-500/5 hover:border-green-500/20 group"
              >
                <div className="p-2.5 bg-green-500/10 text-green-500 rounded-2xl group-hover:bg-green-500 group-hover:text-white transition-colors">
                  <Phone size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Telefon</span>
              </button>

              <button 
                onClick={handleTelegramClick}
                className="bg-text-primary/5 p-4 rounded-[28px] border border-border-primary flex flex-col items-center gap-2 transition-all active:scale-95 hover:bg-[#0088cc]/5 hover:border-[#0088cc]/20 group"
              >
                <div className="p-2.5 bg-[#0088cc]/10 text-[#0088cc] rounded-2xl group-hover:bg-[#0088cc] group-hover:text-white transition-colors">
                  <Send size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Telegram</span>
              </button>

              <button 
                onClick={handleInstagramClick}
                className="bg-text-primary/5 p-4 rounded-[28px] border border-border-primary flex flex-col items-center gap-2 transition-all active:scale-95 hover:bg-[#E4405F]/5 hover:border-[#E4405F]/20 group"
              >
                <div className="p-2.5 bg-[#E4405F]/10 text-[#E4405F] rounded-2xl group-hover:bg-[#E4405F] group-hover:text-white transition-colors">
                  <Instagram size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Instagram</span>
              </button>
            </div>

            {/* Shop Info Cards (Rich Styling like Buyer View) */}
            <div className="px-6 mb-8 space-y-4">
              {/* Map Card */}
              {localShopData.location && (
                <div className="relative overflow-hidden bg-red-500/5 backdrop-blur-xl p-5 rounded-[32px] border border-white/10 shadow-xl">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20">
                          <MapPin size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-widest text-red-600/60">Manzil</span>
                          <span className="text-xs font-black text-text-primary">Xaritada ko'rish</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowMap(true)}
                        className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-600"
                      >
                        <Navigation size={20} />
                      </button>
                    </div>
                    <div 
                      className="h-32 rounded-2xl overflow-hidden border border-white/10 cursor-pointer"
                      onClick={() => setShowMap(true)}
                    >
                      <YMaps query={{ lang: language === 'ru' ? 'ru_RU' : 'en_US' }}>
                        <Map 
                          state={{ center: [localShopData.location.lat, localShopData.location.lng], zoom: 15 }}
                          width="100%"
                          height="100%"
                          options={{ suppressMapOpenBlock: true }}
                        >
                          <Placemark geometry={[localShopData.location.lat, localShopData.location.lng]} />
                        </Map>
                      </YMaps>
                    </div>
                  </div>
                </div>
              )}

              {/* Description Card */}
              {localShopData.description && (
                <div className="relative overflow-hidden bg-gradient-to-br from-accent-blue/5 to-accent-light/5 p-6 rounded-[32px] border border-accent-blue/10">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent-blue/10 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-accent-blue text-white rounded-xl flex items-center justify-center shadow-lg shadow-accent-blue/20">
                        <Sparkles size={16} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue">Do'kon haqida</span>
                    </div>
                    <p className="text-sm font-medium text-text-primary leading-relaxed">
                      {localShopData.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Working Schedule Card */}
              <div className="relative overflow-hidden bg-accent-blue/5 backdrop-blur-xl p-5 rounded-[32px] border border-white/10 shadow-xl">
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-accent-blue/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-accent-blue text-white rounded-2xl shadow-lg shadow-accent-blue/20">
                        <Clock size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-accent-blue/60">Ish tartibi</span>
                        <span className="text-xs font-black text-text-primary">{localShopData.workingHours || '09:00 - 20:00'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center px-1">
                    {[
                      { key: 'Mon', label: 'D' },
                      { key: 'Tue', label: 'S' },
                      { key: 'Wed', label: 'Ch' },
                      { key: 'Thu', label: 'P' },
                      { key: 'Fri', label: 'J' },
                      { key: 'Sat', label: 'Sh' },
                      { key: 'Sun', label: 'Y' }
                    ].map((day) => {
                      const isActive = localShopData.workingDays?.includes(day.key);
                      return (
                        <div key={day.key} className="flex flex-col items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                            isActive 
                            ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20 scale-110' 
                            : 'bg-white/10 text-text-secondary border border-white/5'
                          }`}>
                            {day.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs & Content */}
            <div className="px-6 mb-6 flex justify-center">
              <div className="bg-text-primary/5 p-1 rounded-2xl flex items-center gap-1 border border-border-primary">
                {[
                  { id: 'Postlar', label: 'Postlar', icon: <Grid size={14} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveProfileTab(tab.id as any)}
                    className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all rounded-xl relative ${
                      activeProfileTab === tab.id 
                      ? 'text-bg-primary bg-text-primary shadow-lg' 
                      : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pb-20">
              {activeProfileTab === 'Postlar' && (
                <div className="flex flex-col gap-6">
                  {/* Action Buttons */}
                  <div className="px-6 flex flex-col gap-3 w-full">
                    <button 
                      onClick={() => setShowInstagramImportModal(true)}
                      className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-pink-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                      <Instagram size={18} />
                      Instagramdan import
                    </button>
                    <button 
                      onClick={() => setShowCreateStoryModal(true)}
                      className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                      <Play size={18} />
                      Story qo'shish
                    </button>
                  </div>

                  {/* Post Grid */}
                  {(posts.length > 0 || uploadProgress !== null) ? (
                    <div className="grid grid-cols-2 gap-0">
                      {uploadProgress !== null && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="aspect-[9/16] overflow-hidden relative flex items-center justify-center border border-border-primary"
                        >
                          {/* Animated mixing gradient background with 15% opacity/blur effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] bg-[length:200%_200%] animate-[gradient_3s_ease_infinite] opacity-85"></div>
                          <div className="absolute inset-0 backdrop-blur-[2px] bg-white/10"></div>
                          
                          {/* Glassmorphism percentage pill */}
                          <div className="relative z-10 bg-white/40 backdrop-blur-xl border border-white/50 px-5 py-3 rounded-2xl shadow-[0_8px_32px_rgba(0,122,255,0.3)] flex flex-col items-center justify-center">
                            <span className="bg-gradient-to-r from-[#007AFF] to-[#0056b3] bg-clip-text text-transparent font-black text-3xl drop-shadow-sm">{uploadProgress}%</span>
                            <span className="text-[#007AFF] font-bold text-[9px] uppercase tracking-widest mt-1">Yuklanmoqda</span>
                          </div>
                        </motion.div>
                      )}
                      {posts.map((post, index) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={post.id} 
                          className="aspect-[9/16] bg-text-primary/5 overflow-hidden relative group"
                        >
                          {post.mediaType === 'video' || (post.mediaUrls?.[0] && post.mediaUrls[0].includes('.mp4')) ? (
                            <video 
                              src={`${post.mediaUrls?.[0]}#t=0.1`}
                              className="w-full h-full object-cover cursor-pointer"
                              preload="metadata"
                              muted
                              playsInline
                              onClick={() => setSelectedPostDetails(post)}
                            />
                          ) : (
                            <img 
                              src={post.mediaUrls?.[0] || undefined} 
                              className="w-full h-full object-cover cursor-pointer" 
                              alt={post.outfitName} 
                              referrerPolicy="no-referrer" 
                              onClick={() => setSelectedPostDetails(post)}
                            />
                          )}

                          {/* Simplified View Button Overlay */}
                          <div 
                            onClick={() => setSelectedPostDetails(post)}
                            className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all cursor-pointer flex justify-center items-center opacity-0 hover:opacity-100 z-[40]"
                          >
                             <div className="bg-black/50 backdrop-blur-md rounded-full px-4 py-2 text-white font-bold text-xs">
                               Batafsil
                             </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center bg-white/5 rounded-3xl border-2 border-dashed border-border-primary">
                      <PlusCircle size={48} className="text-text-primary/10 mb-4" />
                      <p className="text-xs font-bold text-text-primary/40 uppercase tracking-widest">Hali postlar yo'q</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        );
      case 'Chats':
        const filteredChats = chats.filter(chat => {
          const matchesSearch = chat.customerName.toLowerCase().includes(chatSearchQuery.toLowerCase()) || 
                               chat.lastMessage.toLowerCase().includes(chatSearchQuery.toLowerCase());
          if (chatFilter === 'unread') return matchesSearch && chat.status === 'new';
          if (chatFilter === 'pending') return matchesSearch && chat.status === 'in-progress';
          return matchesSearch;
        });

        return (
          <div className="h-full flex flex-col bg-bg-primary">
            <AnimatePresence mode="wait">
              {!activeChatId ? (
                <motion.div 
                  key="chat-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col h-full"
                >
                  {/* Chat List Header */}
                  <div className="p-6 pb-2">
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-4">Xabarlar</h2>
                    
                    {/* Search Bar */}
                    <div className="relative mb-4">
                      <input 
                        type="text"
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        placeholder="Mijoz yoki xabarni qidirish..."
                        className="w-full bg-text-primary/5 border border-text-primary/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 transition-all"
                      />
                      <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/30" />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
                      {[
                        { id: 'all', label: 'Barchasi' },
                        { id: 'unread', label: 'Yangi', color: 'bg-accent-blue' },
                        { id: 'pending', label: 'Jarayonda', color: 'bg-amber-500' },
                        { id: 'completed', label: 'Yakunlangan', color: 'bg-emerald-500' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setChatFilter(f.id as any)}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2 ${
                            chatFilter === f.id 
                              ? 'bg-accent-blue border-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                              : 'border-text-primary/10 text-text-primary/40 hover:border-text-primary/20'
                          }`}
                        >
                          {f.color && <span className={`w-1.5 h-1.5 rounded-full ${f.color}`} />}
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat List */}
                  <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
                    <div className="flex flex-col gap-2">
                      {filteredChats.length > 0 ? filteredChats.map(chat => (
                        <motion.div 
                          layout
                          key={chat.id} 
                          onClick={() => handleOpenChat(chat.id)}
                          className="flex items-center gap-3 p-4 bg-white dark:bg-white/5 rounded-2xl border border-text-primary/5 hover:border-accent-blue/30 active:scale-[0.98] transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="relative">
                            <img src={chat.customerAvatar || undefined} className="w-14 h-14 rounded-2xl object-cover shadow-md" alt="avatar" />
                            {chat.status === 'new' && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-blue rounded-full border-2 border-bg-primary flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <p className="font-black text-sm text-text-primary truncate">{chat.customerName}</p>
                              <span className="text-[9px] font-bold text-text-primary/30 uppercase tracking-tighter">{chat.timestamp}</span>
                            </div>
                            <p className="text-xs text-text-primary/50 truncate font-medium">{chat.lastMessage}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button 
                              onClick={(e) => handleDeleteChat(chat.id, e)}
                              className="p-2 text-text-primary/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                            {chat.status === 'new' ? (
                              <span className="w-2 h-2 bg-accent-blue rounded-full" />
                            ) : chat.status === 'in-progress' ? (
                              <span className="w-2 h-2 bg-amber-500 rounded-full" />
                            ) : (
                              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                            )}
                          </div>
                        </motion.div>
                      )) : (
                        <div className="py-20 flex flex-col items-center justify-center text-text-primary/20">
                          <div className="w-20 h-20 rounded-full bg-text-primary/5 flex items-center justify-center mb-4">
                            <MessageSquare size={40} strokeWidth={1} />
                          </div>
                          <p className="text-xs font-black uppercase tracking-[0.2em]">Xabarlar topilmadi</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="chat-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col h-full bg-bg-primary overflow-hidden"
                >
                  {/* Chat Header */}
                  <div className="flex flex-col border-b border-border-primary bg-white/80 dark:bg-bg-primary/80 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-3 p-4">
                      <button 
                        onClick={() => handleCloseChat()} 
                        className="w-10 h-10 rounded-xl bg-text-primary/5 flex items-center justify-center text-text-primary/60 active:scale-90 transition-all"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <div className="relative">
                        <img src={activeChat?.customerAvatar || undefined} className="w-11 h-11 rounded-xl object-cover shadow-lg" alt="avatar" />
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-bg-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-text-primary">{activeChat?.customerName}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">
                            Online
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex bg-text-primary/5 rounded-xl p-1 border border-text-primary/10">
                          {[
                            { id: 'new', color: 'bg-accent-blue' },
                            { id: 'in-progress', color: 'bg-amber-500' },
                            { id: 'completed', color: 'bg-emerald-500' }
                          ].map(s => (
                            <button
                              key={s.id}
                              onClick={() => updateChatStatus(s.id as any)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activeChat?.status === s.id ? s.color + ' text-white shadow-lg' : 'text-text-primary/20 hover:text-text-primary/40'}`}
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={(e) => activeChat && handleDeleteChat(activeChat.id, e as any)}
                          className="w-10 h-10 rounded-xl bg-text-primary/5 flex items-center justify-center text-text-primary/40 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Pinned Product Context */}
                    {activeChat?.pinnedProduct && (
                      <div className="px-4 pb-3 flex items-center gap-3">
                        <div className="flex-1 bg-accent-blue/5 border border-accent-blue/10 rounded-xl p-2 flex items-center gap-3">
                          <img src={activeChat.pinnedProduct.image || undefined} className="w-10 h-10 rounded-lg object-cover" alt="product" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-blue/60 mb-0.5">Qiziqayotgan mahsuloti</p>
                            <p className="text-xs font-bold text-text-primary truncate">{activeChat.pinnedProduct.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-accent-blue">{activeChat.pinnedProduct.price}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 pb-8 flex flex-col gap-4 scrollbar-hide bg-slate-50/50 dark:bg-transparent min-h-0">
                    {activeChat?.messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-text-primary/40 pt-20">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4">
                          <MessageSquare size={40} className="text-accent-blue opacity-50" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-1">Xabarlar yo'q</h3>
                        <p className="text-xs font-medium text-center px-8">
                          Mijoz bilan suhbatni boshlang.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-center my-4">
                          <span className="px-3 py-1 bg-text-primary/5 rounded-full text-[9px] font-black uppercase tracking-widest text-text-primary/30 border border-text-primary/5">Bugun</span>
                        </div>
                        
                        {activeChat?.messages.map((msg, idx) => {
                      const isNextSame = idx < activeChat.messages.length - 1 && activeChat.messages[idx + 1].sender === msg.sender;
                      const isPrevSame = idx > 0 && activeChat.messages[idx - 1].sender === msg.sender;
                      
                      const bubbleRadius = msg.sender === 'shop'
                        ? `rounded-l-3xl ${isNextSame ? 'rounded-br-3xl' : 'rounded-br-sm'} ${isPrevSame ? 'rounded-tr-md' : 'rounded-tr-3xl'}`
                        : `rounded-r-3xl ${isNextSame ? 'rounded-bl-3xl' : 'rounded-bl-sm'} ${isPrevSame ? 'rounded-tl-md' : 'rounded-tl-3xl'}`;
                      
                      const bubbleStyle = msg.sender === 'shop'
                        ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl text-text-primary border border-white/40 dark:border-white/10 shadow-lg shadow-black/5';

                      const hasMediaOnly = (msg.type === 'image' || msg.type === 'video' || msg.type === 'location' || msg.type === 'post' || msg.type === 'videoMessage') && !msg.text;
                      const paddingStyle = hasMediaOnly ? 'p-1' : 'p-4';

                      return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id} 
                        className={`flex flex-col max-w-[85%] relative ${msg.sender === 'shop' ? 'self-end items-end' : 'self-start items-start'} ${isNextSame ? 'mb-0.5' : 'mb-3'}`}
                      >
                        {/* Reply Preview */}
                        {msg.replyTo && (
                          <div className={`mb-1 p-2 rounded-xl text-[10px] border-l-2 ${msg.sender === 'shop' ? 'bg-white/10 border-white/40' : 'bg-text-primary/5 border-accent-blue'} max-w-full truncate`}>
                            {activeChat.messages.find(m => m.id === msg.replyTo)?.text || "Media xabar"}
                          </div>
                        )}

                        <div 
                          onClick={() => setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                          className={`${paddingStyle} text-[14px] shadow-sm cursor-pointer transition-all active:scale-[0.98] ${bubbleRadius} ${bubbleStyle}`}
                        >
                          {msg.text && <p className={`leading-relaxed whitespace-pre-wrap ${msg.type !== 'text' ? 'mb-2' : ''}`}>{msg.text}</p>}
                          {msg.type === 'image' && (
                            <div className="relative group">
                              <img src={msg.mediaUrl || undefined} className="rounded-xl max-w-full h-auto shadow-lg" alt="sent" referrerPolicy="no-referrer" />
                              <button className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download size={14} />
                              </button>
                            </div>
                          )}
                          {msg.type === 'video' && (
                            <div className="relative aspect-video bg-black rounded-xl flex items-center justify-center overflow-hidden shadow-lg min-w-[200px] group">
                              <video src={`${msg.mediaUrl}#t=0.1`} controls preload="metadata" className="w-full h-full object-cover" />
                            </div>
                          )}
                          {msg.type === 'videoMessage' && (
                            <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-accent-blue shadow-xl group">
                              <video 
                                src={msg.mediaUrl || undefined} 
                                className="w-full h-full object-cover scale-x-[-1]" 
                                loop 
                                muted 
                                onMouseOver={(e) => safePlayVideo(e.currentTarget)}
                                onMouseOut={(e) => e.currentTarget.pause()}
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 size={24} className="text-white" />
                              </div>
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 bg-accent-blue rounded-full text-white">
                                <Video size={10} />
                                <span className="text-[8px] font-black uppercase tracking-widest">Video Xabar</span>
                              </div>
                            </div>
                          )}
                          {msg.type === 'location' && msg.location && (
                            <div className="w-48 h-32 rounded-xl overflow-hidden border border-text-primary/10 relative group">
                              <YMaps query={{ lang: 'en_US' }}>
                                <Map 
                                  state={{ center: [msg.location.lat, msg.location.lng], zoom: 15 }}
                                  width="100%"
                                  height="100%"
                                  options={{ suppressMapOpenBlock: true }}
                                >
                                  <Placemark geometry={[msg.location.lat, msg.location.lng]} />
                                </Map>
                              </YMaps>
                              <div className="absolute inset-0 bg-transparent" />
                              <button className="absolute bottom-2 right-2 p-2 bg-white dark:bg-bg-primary rounded-lg shadow-lg text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity">
                                <Navigation size={14} />
                              </button>
                            </div>
                          )}
                          {msg.type === 'post' && msg.post && (
                            <div 
                               className={`${msg.text ? 'mb-2' : ''} w-56 max-w-full bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-text-primary/10 shadow-sm cursor-pointer`}
                               onClick={(e) => {
                                  // Currently ShopWorkspace doesn't explicitly open post details here, but let's prevent defaults
                                  // e.stopPropagation();
                               }}
                            >
                              {isVideoUrl(msg.post.mediaUrls?.[0] || '') ? (
                                <div className="relative w-full aspect-[9/16] bg-black flex items-center justify-center group">
                                  <video 
                                    src={`${msg.post.mediaUrls[0]}#t=0.1`} 
                                    preload="metadata" 
                                    className="w-full h-full object-cover" 
                                  />
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-90 group-hover:bg-black/10 transition-colors">
                                    <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
                                      <Play size={24} className="text-white ml-1" fill="currentColor" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <img src={msg.post.mediaUrls?.[0] || undefined} className="w-full aspect-[9/16] object-cover" alt="post" referrerPolicy="no-referrer" />
                              )}
                              <div className="p-2.5 bg-white dark:bg-bg-primary">
                                <p className="text-xs font-black uppercase tracking-tight text-text-primary truncate">{msg.post.outfitName}</p>
                                <p className="text-[10px] font-black text-accent-blue mt-0.5">{msg.post.price}</p>
                              </div>
                            </div>
                          )}
                          {msg.type === 'voice' && (
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <button 
                                onClick={() => handlePlayAudio(msg.id, msg.mediaUrl || '')}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${msg.sender === 'shop' ? 'bg-white/20 hover:bg-white/30' : 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20'}`}
                              >
                                {playingMessageId === msg.id ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                              </button>
                              <div className="flex-1 space-y-1">
                                <div className={`h-1 w-full rounded-full overflow-hidden ${msg.sender === 'shop' ? 'bg-white/20' : 'bg-text-primary/10'}`}>
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${audioProgress[msg.id] || 0}%` }}
                                    className={`h-full ${msg.sender === 'shop' ? 'bg-white' : 'bg-accent-blue'}`}
                                  />
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className={`text-[8px] font-bold uppercase tracking-widest ${msg.sender === 'shop' ? 'text-white/60' : 'text-text-primary/40'}`}>Ovozli xabar</span>
                                  <span className={`text-[8px] font-bold ${msg.sender === 'shop' ? 'text-white/60' : 'text-text-primary/40'}`}>0:12</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex gap-1 mt-1 ${msg.sender === 'shop' ? 'justify-end' : 'justify-start'}`}>
                            {msg.reactions.map((r, i) => (
                              <span key={i} className="text-xs bg-white dark:bg-white/10 rounded-full px-1.5 py-0.5 shadow-sm border border-text-primary/5">{r}</span>
                            ))}
                          </div>
                        )}

                        {/* Message Actions Menu */}
                        <AnimatePresence>
                          {selectedMessageId === msg.id && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              className={`absolute z-50 ${idx < 2 ? 'top-full mt-2' : 'bottom-full mb-2'} ${msg.sender === 'shop' ? 'right-0' : 'left-0'} bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-border-primary overflow-hidden min-w-[120px]`}
                            >
                              <div className="flex p-2 gap-2 border-b border-border-primary overflow-x-auto scrollbar-hide">
                                {['❤️', '👍', '🔥', '😂', '😮', '😢'].map(emoji => (
                                  <button 
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className="text-lg hover:scale-125 transition-transform"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              <div className="flex flex-col">
                                <button 
                                  onClick={() => {
                                    setReplyingTo(msg);
                                    setSelectedMessageId(null);
                                  }}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-text-primary/5 text-xs font-bold text-text-primary transition-colors"
                                >
                                  <Send size={14} className="rotate-[-45deg]" />
                                  Javob berish
                                </button>
                                <button 
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-xs font-bold text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                  O'chirish
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex items-center gap-1.5 mt-1.5 px-1">
                          <span className="text-[9px] text-text-primary/30 uppercase font-black tracking-tighter">{msg.timestamp}</span>
                          {msg.sender === 'shop' && <Zap size={8} className="text-accent-blue" fill="currentColor" />}
                        </div>
                      </motion.div>
                    )})}
                    </>
                    )}
                  </div>

                  {/* Input Area */}
                  <div 
                    className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl flex flex-col gap-3 relative"
                    style={{ paddingBottom: '16px' }}
                  >
                    {/* Staged Media Preview */}
                    <AnimatePresence>
                      {(stagedImage || stagedVideo || stagedLocation) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="flex items-center gap-3 p-2 bg-text-primary/5 rounded-2xl border border-border-primary"
                        >
                          {stagedImage && (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden">
                              <img src={stagedImage || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <button onClick={() => { setStagedImage(null); setStagedFile(null); }} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"><X size={12} /></button>
                            </div>
                          )}
                          {stagedVideo && (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                              <Video size={24} className="text-white/50" />
                              <button onClick={() => { setStagedVideo(null); setStagedFile(null); }} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"><X size={12} /></button>
                            </div>
                          )}
                          {stagedLocation && (
                            <div className="flex-1 flex items-center gap-2 px-2">
                              <MapPin size={16} className="text-accent-blue" />
                              <span className="text-[10px] font-bold text-text-primary/60 uppercase tracking-widest">Joylashuv tayyor</span>
                              <button onClick={() => setStagedLocation(null)} className="ml-auto p-1 text-text-primary/40"><X size={16} /></button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Reply Preview */}
                    <AnimatePresence>
                      {replyingTo && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mb-2 bg-text-primary/5 rounded-xl p-2 flex items-center gap-3 border-l-4 border-accent-blue"
                        >
                          <Reply size={16} className="text-accent-blue" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Javob berish</p>
                            <p className="text-xs text-text-primary/60 truncate">{replyingTo.text || "Media xabar"}</p>
                          </div>
                          <button onClick={() => setReplyingTo(null)} className="p-1 text-text-primary/40">
                            <X size={16} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Attachment Menu */}
                    <AnimatePresence>
                      {showAttachmentMenu && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.95 }}
                          className="absolute bottom-full left-4 mb-4 bg-white dark:bg-bg-primary rounded-[2rem] shadow-2xl border border-border-primary p-2 flex flex-col gap-1 z-50 min-w-[200px] backdrop-blur-xl"
                        >
                          <button 
                            onClick={() => handleFileUpload('image')}
                            className="flex items-center gap-3 p-3 hover:bg-text-primary/5 rounded-2xl transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-accent-blue/10 rounded-xl flex items-center justify-center text-accent-blue">
                              <ImageIcon size={20} />
                            </div>
                            <span className="text-xs font-bold text-text-primary uppercase tracking-widest">Rasm yuborish</span>
                          </button>
                          <button 
                            onClick={() => handleFileUpload('video')}
                            className="flex items-center gap-3 p-3 hover:bg-text-primary/5 rounded-2xl transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                              <Video size={20} />
                            </div>
                            <span className="text-xs font-bold text-text-primary uppercase tracking-widest">Video yuborish</span>
                          </button>
                          <button 
                            onClick={handleLocationShare}
                            className="flex items-center gap-3 p-3 hover:bg-text-primary/5 rounded-2xl transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                              <MapPin size={20} />
                            </div>
                            <span className="text-xs font-bold text-text-primary uppercase tracking-widest">Joylashuv</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Quick Replies Bar */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                      {QUICK_REPLIES.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => setMessageInput(reply)}
                          className="flex-shrink-0 px-4 py-2 bg-transparent border border-text-primary/10 rounded-xl text-[10px] font-bold text-text-primary/40 hover:bg-accent-blue/5 hover:text-accent-blue hover:border-accent-blue/30 transition-all whitespace-nowrap"
                        >
                          {reply.length > 25 ? reply.substring(0, 25) + '...' : reply}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-end gap-2">
                      <button 
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${showAttachmentMenu ? 'bg-accent-blue text-white rotate-45' : 'bg-text-primary/5 text-text-primary/40 hover:bg-text-primary/10'}`}
                      >
                        <Plus size={24} />
                      </button>

                      <div className="flex-1 relative bg-text-primary/5 border border-border-primary rounded-2xl overflow-hidden backdrop-blur-md">
                        <textarea 
                          value={messageInput}
                          onChange={(e) => {
                            setMessageInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage('text');
                            }
                          }}
                          placeholder="Xabar yozing..."
                          rows={1}
                          className="w-full bg-transparent px-4 py-3.5 text-sm focus:outline-none transition-all resize-none max-h-[120px] scrollbar-hide"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {messageInput.trim() || stagedImage || stagedVideo || stagedLocation || stagedFile ? (
                          <button 
                            onClick={() => handleSendMessage('text')}
                            disabled={isUploading}
                            className={`w-12 h-12 flex items-center justify-center bg-gradient-to-br from-accent-blue to-accent-light text-white rounded-2xl shadow-xl shadow-accent-blue/30 transition-all flex-shrink-0 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'active:scale-90'}`}
                          >
                            {isUploading ? <RefreshCw size={22} className="animate-spin" /> : <Send size={22} />}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {/* Video Recording Interface */}
                            {isVideoRecording && (
                              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="relative w-[300px] h-[300px] rounded-full overflow-hidden border-4 border-accent-blue shadow-2xl shadow-accent-blue/20">
                                  <video 
                                    ref={videoPreviewRef} 
                                    muted 
                                    playsInline 
                                    className="w-full h-full object-cover scale-x-[-1]" 
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                                  <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full animate-pulse">
                                      <div className="w-2 h-2 bg-white rounded-full" />
                                      <span className="text-xs font-black text-white tabular-nums">{formatDuration(recordingDuration)}</span>
                                    </div>
                                    <button 
                                      onClick={toggleCamera}
                                      className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                                    >
                                      <FlipHorizontal size={20} />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="absolute bottom-32 left-0 right-0 flex justify-center">
                                  <motion.div 
                                    animate={{ x: dragX }}
                                    className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20"
                                  >
                                    <ChevronLeft size={20} className="text-white animate-pulse" />
                                    <span className="text-sm font-bold text-white uppercase tracking-widest">
                                      {dragX < -100 ? "Qo'yib yuboring" : "Bekor qilish uchun suring"}
                                    </span>
                                  </motion.div>
                                </div>
                              </div>
                            )}

                            {/* Voice Recording Interface */}
                            {isRecording && (
                              <div className="absolute right-0 bottom-0 left-0 h-full bg-white dark:bg-bg-primary z-50 flex items-center justify-between px-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                  <span className="text-sm font-black text-red-500 tabular-nums">{formatDuration(recordingDuration)}</span>
                                </div>
                                
                                <motion.div 
                                  animate={{ x: dragX }}
                                  className="flex items-center gap-2 text-text-primary/40"
                                >
                                  <ChevronLeft size={16} className="animate-pulse" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">
                                    {dragX < -100 ? "Qo'yib yuboring" : "Bekor qilish uchun suring"}
                                  </span>
                                </motion.div>

                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCancelAreaHovered ? 'bg-red-500 text-white scale-125' : 'bg-accent-blue text-white'} transition-all`}>
                                  <Mic size={20} />
                                </div>
                              </div>
                            )}

                            <button 
                              onPointerDown={(e) => {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                setRecordType('video');
                                setDragX(0);
                                dragStartRef.current = e.clientX;
                                startVideoMessage();
                              }}
                              onPointerUp={(e) => {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                                dragStartRef.current = null;
                                stopVideoMessage();
                              }}
                              onPointerMove={(e) => {
                                if (isVideoRecording && dragStartRef.current !== null) {
                                  const diff = e.clientX - dragStartRef.current;
                                  const newX = Math.min(0, diff);
                                  setDragX(newX);
                                  dragXRef.current = newX;
                                  const isHovered = newX < -100;
                                  setIsCancelAreaHovered(isHovered);
                                  isCancelAreaHoveredRef.current = isHovered;
                                }
                              }}
                              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-125 relative touch-none bg-gradient-to-br from-accent-blue to-accent-light text-white shadow-sm ${isVideoRecording ? 'scale-150 z-[60] shadow-xl' : 'hover:shadow-md'}`}
                            >
                              <Video size={22} />
                            </button>

                            <button 
                              onPointerDown={(e) => {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                setRecordType('voice');
                                setDragX(0);
                                dragStartRef.current = e.clientX;
                                startRecording();
                              }}
                              onPointerUp={(e) => {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                                dragStartRef.current = null;
                                stopRecording();
                              }}
                              onPointerMove={(e) => {
                                if (isRecording && dragStartRef.current !== null) {
                                  const diff = e.clientX - dragStartRef.current;
                                  const newX = Math.min(0, diff);
                                  setDragX(newX);
                                  dragXRef.current = newX;
                                  const isHovered = newX < -100;
                                  setIsCancelAreaHovered(isHovered);
                                  isCancelAreaHoveredRef.current = isHovered;
                                }
                              }}
                              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-125 relative touch-none bg-gradient-to-br from-accent-blue to-accent-light text-white shadow-sm ${isRecording ? 'scale-150 z-[60] shadow-xl' : 'hover:shadow-md'}`}
                            >
                              <Mic size={22} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'Settings':
        return (
          <div className="h-full overflow-y-auto scrollbar-hide p-4 pb-24 bg-bg-primary">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => handleTabChange('MyShop')}
                className="p-2 bg-white/5 backdrop-blur-md rounded-full hover:bg-white/10 transition-all border border-white/10 text-text-primary"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black italic tracking-tighter uppercase text-text-primary">Do'kon Sozlamalari</h2>
            </div>
            
            {/* Edit Info */}
            <div className="flex flex-col gap-6">
              {/* Logo Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                  {localShopData.logo ? (
                    <div className="p-1 rounded-full bg-gradient-to-br from-accent-blue to-accent-light shadow-lg shadow-accent-blue/20">
                      <img 
                        src={localShopData.logo || undefined} 
                        className="w-24 h-24 rounded-full object-cover border-2 border-white/20 group-hover:opacity-50 transition-opacity" 
                        alt="Logo" 
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center text-accent-blue border-2 border-accent-blue/30 group-hover:opacity-50 transition-opacity">
                      <Store size={40} strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white">
                      <Camera size={24} />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={logoInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                  />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40">Logoni o'zgartirish</p>
              </div>

              <div className="grid gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Do'kon nomi</label>
                  <input 
                    type="text" 
                    value={localShopData.name}
                    onChange={(e) => setLocalShopData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Kategoriyalar * (Kamida bitta)</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                    {SELLER_CATEGORIES.map(category => {
                      const isActive = localShopData.categories.includes(category);
                      return (
                        <button
                          key={category}
                          onClick={() => {
                            const currentCats = localShopData.categories || [];
                            const newCats = isActive 
                              ? currentCats.filter(c => c !== category)
                              : [...currentCats, category];
                            if (newCats.length > 0) {
                              setLocalShopData(prev => ({ ...prev, categories: newCats }));
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            isActive 
                              ? 'bg-gradient-to-br from-accent-blue to-accent-light border-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                              : 'bg-white/5 border-white/5 text-text-primary/40 hover:border-accent-blue/30'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Tavsif</label>
                  <textarea 
                    value={localShopData.description}
                    onChange={(e) => setLocalShopData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm h-24 focus:outline-none focus:border-accent-blue/50 text-text-primary resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Ish vaqti</label>
                    <input 
                      type="text" 
                      value={localShopData.workingHours}
                      onChange={(e) => setLocalShopData(prev => ({ ...prev, workingHours: e.target.value }))}
                      placeholder="09:00 - 21:00"
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Telefon</label>
                    <input 
                      type="text" 
                      value={localShopData.phone}
                      onChange={(e) => setLocalShopData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Ish kunlari</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                    {DAYS_OF_WEEK.map(day => {
                      const isActive = localShopData.workingDays?.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            const currentDays = localShopData.workingDays || [];
                            const newDays = isActive 
                              ? currentDays.filter(d => d !== day)
                              : [...currentDays, day];
                            setLocalShopData(prev => ({ ...prev, workingDays: newDays }));
                          }}
                          className={`flex-1 min-w-[60px] py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                            isActive 
                              ? 'bg-gradient-to-br from-accent-blue to-accent-light border-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                              : 'bg-white/5 border-white/5 text-text-primary/40 hover:border-accent-blue/30'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Instagram Link</label>
                    <input 
                      type="text" 
                      value={localShopData.instagram}
                      onChange={(e) => setLocalShopData(prev => ({ ...prev, instagram: e.target.value }))}
                      placeholder="https://instagram.com/..."
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Telegram Link</label>
                    <input 
                      type="text" 
                      value={localShopData.telegram}
                      onChange={(e) => setLocalShopData(prev => ({ ...prev, telegram: e.target.value }))}
                      placeholder="https://t.me/..."
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary"
                    />
                  </div>
                </div>

                {/* Map Picker Simulation */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Xaritadagi joylashuv</label>
                  <div className="w-full h-48 rounded-xl overflow-hidden border border-white/10 relative bg-white/5 backdrop-blur-md">
                    <YMaps query={{ lang: language === 'ru' ? 'ru_RU' : 'en_US' }}>
                      <Map 
                        state={{ center: [localShopData.location?.lat || 41.311081, localShopData.location?.lng || 69.240562], zoom: 15 }}
                        width="100%"
                        height="100%"
                        onClick={(e: any) => {
                          const coords = e.get('coords');
                          setLocalShopData(prev => ({
                            ...prev,
                            location: { lat: coords[0], lng: coords[1] }
                          }));
                        }}
                        options={{
                          suppressMapOpenBlock: true,
                        }}
                      >
                        <Placemark geometry={[localShopData.location?.lat || 41.311081, localShopData.location?.lng || 69.240562]} />
                      </Map>
                    </YMaps>
                    <button 
                      type="button"
                      onClick={detectLocation}
                      className="absolute bottom-3 right-3 z-10 p-3 bg-gradient-to-br from-accent-blue to-accent-light text-white rounded-xl shadow-lg shadow-accent-blue/20 active:scale-90 transition-all flex items-center gap-2"
                    >
                      <Navigation size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Hozirgi joylashuv</span>
                    </button>
                    <div className="absolute top-3 left-3 z-10 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60">
                      Joylashuvni aniqlash
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleSaveShopInfo}
                className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-accent-blue/20 active:scale-95 transition-all mt-4"
              >
                O'zgarishlarni saqlash
              </button>

              {/* Account Management */}
              <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-4">
                <h3 className="text-sm font-black italic tracking-tighter uppercase text-red-500/80 mb-2">Xavfli Hudud</h3>
                
                <button 
                  onClick={() => setShowFreezeModal(true)}
                  className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-white/10 flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Vaqtinchalik chiqish (Muzlatish)
                </button>

                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-red-500/20 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Do'konni butunlay o'chirish
                </button>
              </div>
            </div>
          </div>
        );
      case 'Telegram':
        return <TelegramLinkManager />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Shop Bottom Nav */}
      {!isKeyboardOpen && (
        <div className="h-20 bg-header-bg border-t border-border-primary flex items-center justify-around px-2 pb-safe">
          <ShopNavButton 
            active={activeTab === 'MyShop'} 
            onClick={() => handleTabChange('MyShop')} 
            icon={Store} 
            label="Do'konim" 
          />
          <ShopNavButton 
            active={activeTab === 'Chats'} 
            onClick={() => handleTabChange('Chats')} 
            icon={MessageSquare} 
            label="Chatlar" 
          />
          <ShopNavButton 
            active={activeTab === 'Telegram'} 
            onClick={() => handleTabChange('Telegram')} 
            icon={Link2} 
            label="Telegram" 
          />
        </div>
      )}
      {/* Instagram Import Modal */}
      <AnimatePresence>
        {showInstagramImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-bg-primary rounded-[40px] border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                      <Instagram size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-text-primary tracking-tight">Instagram Import</h3>
                      <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Link orqali post qo'shish</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowInstagramImportModal(false);
                      setImportPreview(null);
                      setInstagramLink('');
                    }}
                    className="p-3 bg-text-primary/5 rounded-2xl text-text-primary/40 hover:text-red-500 transition-colors"
                  >
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
                      Post linkini kiriting va tizim avtomatik ravishda rasm va tavsifni ajratib oladi. Siz faqat kerakli ma'lumotlarni tasdiqlaysiz.
                    </p>

                    <button 
                      onClick={handleInstagramImport}
                      disabled={isImporting || !instagramLink}
                      className="w-full py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-pink-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          Ma'lumotlar olinmoqda...
                        </>
                      ) : (
                        <>
                          <Zap size={18} />
                          Ma'lumotlarni olish
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex gap-4 p-4 bg-text-primary/5 rounded-3xl border border-border-primary">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        {importPreview.mediaType === 'video' ? (
                          <video 
                            src={getProxiedUrl(importPreview?.mediaUrls?.[0] || '')} 
                            className="w-full h-full object-cover" 
                            muted
                            playsInline
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <img 
                            src={getProxiedUrl(importPreview?.mediaUrls?.[0] || '')} 
                            className="w-full h-full object-cover" 
                            alt="Preview"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const originalUrl = importPreview?.mediaUrls?.[0] || '';
                              const proxy1 = `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}`;
                              const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
                              
                              if (!target.dataset.triedProxy1) {
                                target.dataset.triedProxy1 = 'true';
                                target.src = proxy1;
                              } else if (!target.dataset.triedProxy2) {
                                target.dataset.triedProxy2 = 'true';
                                target.src = proxy2;
                              }
                            }}
                          />
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
                        {!importPreview.price && (
                          <input 
                            type="text"
                            maxLength={50}
                            value={importPreview.priceMessage || ''}
                            onChange={(e) => setImportPreview({...importPreview, priceMessage: e.target.value})}
                            className="w-full bg-accent-blue/10 border border-accent-blue/20 rounded-lg px-3 py-1.5 outline-none text-[10px] font-bold text-accent-blue mb-2 placeholder:text-accent-blue/50"
                            placeholder="Tugma yozuvi (masalan: Narxi qancha?)"
                          />
                        )}
                        <textarea 
                          value={importPreview.description}
                          onChange={(e) => setImportPreview({...importPreview, description: e.target.value})}
                          className="w-full bg-transparent border-none outline-none text-xs font-bold text-black leading-tight resize-none h-16"
                          placeholder="Tavsif"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setImportPreview(null)}
                        className="flex-1 py-4 bg-text-primary/5 text-text-primary/60 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-primary active:scale-95 transition-all"
                      >
                        Qayta urinish
                      </button>
                      <button 
                        onClick={confirmImport}
                        disabled={isUploading}
                        className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
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

      {/* Statistics Modal */}
      <AnimatePresence>
        {showCreateStoryModal && (
          <CreateStoryModal 
            posts={posts}
            sellerId={shopData.id}
            ownerUid={user?.uid || ''}
            shopData={shopData}
            onClose={() => setShowCreateStoryModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Edit Post Modal */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-bg-primary rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md">
                <h3 className="font-black italic uppercase tracking-tighter text-text-primary">Postni Tahrirlash</h3>
                <button onClick={() => setEditingPost(null)} className="p-2 hover:bg-white/10 rounded-full transition-all text-text-primary/40">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Nomi</label>
                    <input 
                      type="text" 
                      value={editingPost?.outfitName || ''}
                      onChange={(e) => editingPost && setEditingPost({ ...editingPost, outfitName: e.target.value })}
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Narxi</label>
                    <input 
                      type="text" 
                      value={editingPost?.price || ''}
                      onChange={(e) => editingPost && setEditingPost({ ...editingPost, price: e.target.value })}
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Izoh</label>
                  <textarea 
                    value={editingPost?.description || ''}
                    onChange={(e) => editingPost && setEditingPost({ ...editingPost, description: e.target.value })}
                    className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm h-32 focus:outline-none focus:border-accent-blue/50 text-text-primary resize-none"
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => editingPost && handleDeletePost(editingPost.id)}
                    className="flex-1 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-red-500 hover:text-white"
                  >
                    O'chirish
                  </button>
                  <button 
                    onClick={handleUpdatePost}
                    className="flex-[2] py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent-blue/20 active:scale-95 transition-all"
                  >
                    Saqlash
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Location Modal */}
      <AnimatePresence>
        {showMap && localShopData.location && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-bg-primary rounded-3xl overflow-hidden shadow-2xl border border-border-primary flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-border-primary flex items-center justify-between bg-bg-primary/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-accent-blue" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-text-primary">Do'kon Joylashuvi</h3>
                </div>
                <button 
                  onClick={() => setShowMap(false)}
                  className="p-2 hover:bg-text-primary/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div 
                className="flex-1 relative min-h-[300px] cursor-pointer group"
                onClick={() => window.open(`https://yandex.com/maps/?pt=${localShopData.location!.lng},${localShopData.location!.lat}&z=16&l=map`, '_blank')}
              >
                <YMaps query={{ lang: language === 'ru' ? 'ru_RU' : 'en_US' }}>
                    <Map 
                      state={{ center: [localShopData.location.lat, localShopData.location.lng], zoom: 15 }}
                      width="100%"
                      height="100%"
                      options={{
                        suppressMapOpenBlock: true,
                      }}
                    >
                      <Placemark 
                        geometry={[localShopData.location.lat, localShopData.location.lng]} 
                        properties={{
                          iconContent: `
                            <div style="position: relative; width: 50px; height: 50px;">
                              <div class="pulse-ring" style="position: absolute; top: 50%; left: 50%; width: 60px; height: 60px; border-radius: 50%; background: rgba(0, 149, 255, 0.4); z-index: 1;"></div>
                              <div style="position: relative; z-index: 2; width: 50px; height: 50px; background: white; border-radius: 50%; border: 3px solid #0095FF; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                                <img src="${localShopData.logo || `https://ui-avatars.com/api/?name=${localShopData.name}&background=random`}" style="width: 100%; height: 100%; object-fit: cover;" referrerpolicy="no-referrer" />
                              </div>
                              <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #0095FF; z-index: 1;"></div>
                            </div>
                          `
                        }}
                        options={{
                          iconLayout: 'default#imageWithContent',
                          iconImageHref: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                          iconImageSize: [1, 1],
                          iconImageOffset: [-25, -25],
                          iconContentOffset: [-25, -25],
                        }}
                      />
                    </Map>
                </YMaps>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="px-4 py-2 bg-bg-primary/90 backdrop-blur-md rounded-xl border border-border-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    Yandex Maps-da ochish
                  </div>
                </div>
              </div>

              <div className="p-4 bg-bg-primary border-t border-border-primary">
                <button 
                  onClick={() => window.open(`https://yandex.com/maps/?pt=${localShopData.location!.lng},${localShopData.location!.lat}&z=16&l=map`, '_blank')}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  <Navigation size={18} />
                  Yandex Maps orqali ochish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Freeze Shop Modal */}
      {/* Post Details Modal for Seller */}
      <AnimatePresence>
        {selectedPostDetails && (
          <div className="fixed inset-0 z-[20000] flex flex-col bg-bg-primary overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-primary/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedPostDetails(null)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft size={24} className="text-text-primary" />
                </button>
                <h3 className="font-black uppercase tracking-widest text-text-primary text-sm flex items-center gap-2">
                  <Package size={16} className="text-accent-blue" /> Maxsulot
                </h3>
              </div>
              
              {/* Tabs */}
              <div className="flex bg-white/5 rounded-xl p-1">
                <button 
                  onClick={() => setPostDetailsTab('stats')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${postDetailsTab === 'stats' ? 'bg-white text-black shadow-md' : 'text-text-primary/50 hover:text-text-primary/80'}`}
                >
                  Statistika
                </button>
                <button 
                  onClick={() => setPostDetailsTab('settings')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${postDetailsTab === 'settings' ? 'bg-white text-black shadow-md' : 'text-text-primary/50 hover:text-text-primary/80'}`}
                >
                  Sozlamalar
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto pb-24">
              {postDetailsTab === 'stats' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 space-y-6"
                >
                  {/* Image Preview */}
                  <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-border-primary/50 shadow-2xl bg-black relative">
                    {selectedPostDetails.mediaType === 'video' || (selectedPostDetails.mediaUrls?.[0] && selectedPostDetails.mediaUrls[0].includes('.mp4')) ? (
                      <video 
                        src={`${selectedPostDetails.mediaUrls?.[0]}#t=0.1`}
                        className="w-full h-full object-contain"
                        preload="metadata"
                        controls
                        playsInline
                      />
                    ) : (
                      <img 
                        src={selectedPostDetails.mediaUrls?.[0]} 
                        className="w-full h-full object-cover" 
                        alt={selectedPostDetails.outfitName} 
                      />
                    )}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white font-black text-sm">
                      {selectedPostDetails.price.toLocaleString('uz-UZ')} UZS
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                        <Eye size={28} className="text-accent-blue mb-2" />
                        <span className="text-3xl font-black text-text-primary">{selectedPostDetails.views || 0}</span>
                        <span className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest mt-1">Ko'rishlar</span>
                     </div>
                     <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                        <Heart size={28} className="text-rose-500 mb-2 fill-rose-500" />
                        <span className="text-3xl font-black text-text-primary">{selectedPostDetails.likes}</span>
                        <span className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest mt-1">Yoqtirishlar</span>
                     </div>
                     <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                        <Share2 size={28} className="text-emerald-500 mb-2" />
                        <span className="text-3xl font-black text-text-primary">{selectedPostDetails.shares || 0}</span>
                        <span className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest mt-1">Ulashishlar</span>
                     </div>
                     <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                        <Bookmark size={28} className="text-amber-500 mb-2" />
                        <span className="text-3xl font-black text-text-primary">{selectedPostDetails.saves || 0}</span>
                        <span className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest mt-1">Saqlashlar</span>
                     </div>
                  </div>
                </motion.div>
              )}

              {postDetailsTab === 'settings' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 space-y-4"
                >
                  <button 
                    onClick={() => {
                      setEditingPost(selectedPostDetails);
                      setSelectedPostDetails(null);
                    }}
                    className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center hidden sm:flex">
                         <Settings size={22} className="text-accent-blue" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-black text-text-primary uppercase tracking-tighter">Tahrirlash</h4>
                        <p className="text-[10px] font-bold text-text-primary/40 mt-1 uppercase tracking-widest">Ma'lumotlarni o'zgartirish</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-text-primary/40" />
                  </button>

                  <button 
                    onClick={() => {
                      handleDeletePost(selectedPostDetails.id);
                      setSelectedPostDetails(null);
                    }}
                    className="w-full flex items-center justify-between p-5 bg-red-500/5 border border-red-500/20 rounded-2xl hover:bg-red-500/10 transition-colors active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center hidden sm:flex">
                         <Trash2 size={22} className="text-red-500" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-black text-red-500 uppercase tracking-tighter">O'chirish</h4>
                        <p className="text-[10px] font-bold text-red-500/60 mt-1 uppercase tracking-widest">Maxsulotni butunlay olib tashlash</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-red-500/40" />
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFreezeModal && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-bg-primary rounded-3xl overflow-hidden shadow-2xl border border-border-primary flex flex-col"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogOut size={32} className="text-accent-blue" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-text-primary mb-2">Do'konni muzlatish</h3>
                <p className="text-xs text-text-primary/60 font-medium leading-relaxed">
                  Do'koningiz vaqtinchalik muzlatiladi va xaridorlarga ko'rinmaydi. Istalgan vaqtda qayta faollashtirishingiz mumkin.
                </p>
              </div>
              <div className="p-6 bg-white/5 border-t border-white/10 flex gap-3">
                <button 
                  onClick={() => setShowFreezeModal(false)}
                  className="flex-1 py-3 bg-white/5 text-white rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-white/10"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={handleFreezeShop}
                  disabled={isFreezing}
                  className="flex-1 py-3 bg-accent-blue text-white rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-accent-blue/20"
                >
                  {isFreezing ? 'Muzlatilmoqda...' : 'Muzlatish'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Shop Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-bg-primary rounded-3xl overflow-hidden shadow-2xl border border-border-primary flex flex-col"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-red-500" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-text-primary mb-2">Do'konni o'chirish</h3>
                <p className="text-xs text-red-500/80 font-bold leading-relaxed mb-4">
                  DIQQAT! Do'konni o'chirish qaytarib bo'lmas jarayon. Barcha ma'lumotlar o'chib ketadi!
                </p>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-2">Tasdiqlash kodi: 123456</label>
                  <input 
                    type="text" 
                    value={deleteCode}
                    onChange={(e) => setDeleteCode(e.target.value)}
                    placeholder="Kodni kiriting"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 text-text-primary text-center font-black tracking-[0.5em]"
                  />
                </div>
              </div>
              <div className="p-6 bg-white/5 border-t border-white/10 flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 bg-white/5 text-white rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-white/10"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={handleDeleteShop}
                  disabled={isDeleting || deleteCode !== '123456'}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'O\'chirilmoqda...' : 'O\'chirish'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ShopNavButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-accent-blue scale-110' : 'text-text-primary/40'}`}
  >
    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

// Premium features removed

const CreateStoryModal = ({ posts, sellerId, ownerUid, shopData, onClose }: { posts: PostData[], sellerId: string, ownerUid: string, shopData: Seller, onClose: () => void }) => {
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

export default ShopWorkspace;
