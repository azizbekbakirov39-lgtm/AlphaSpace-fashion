import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, 
  MessageSquare, 
  Zap, 
  Settings, 
  TrendingUp, 
  Users, 
  Phone, 
  Send,
  PlusCircle,
  BarChart3,
  Instagram,
  Smartphone,
  MapPin,
  Clock,
  Trash2,
  Image as ImageIcon,
  Video,
  Mic,
  ChevronLeft,
  Paperclip,
  X,
  Camera,
  Navigation,
  ExternalLink,
  ChevronRight,
  Award,
  Grid,
  Search,
  RefreshCw,
  CheckCircle2,
  Filter,
  MoreVertical,
  Edit,
  LogOut,
  Calendar,
  DollarSign,
  Package,
  Layout,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Sparkles,
  Shirt,
  Mail,
  Plus,
  Play,
  Pause,
  Trash,
  MapPin as MapPinIcon,
  FlipHorizontal,
  Download,
  Maximize2,
  Reply,
  Smile,
  Star,
  Link2
} from 'lucide-react';
import { isVideoUrl, getProxiedUrl } from '../utils/mediaUtils';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Language, translations } from '../translations';
import { useKeyboard } from '../hooks/useKeyboard';
import { toast } from 'sonner';
import { Seller, PostData, SellerCategory, SELLER_CATEGORIES, Obraz, User } from '../types';
import { uploadImageToImgBB } from '../services/imgbb';
import { analyzeProductImage } from '../services/aiService';
import { db, storage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, setDoc, getDoc } from '../firebase';
import { compressImage, compressVideo } from '../lib/compression';
import TelegramLinkManager from './TelegramLinkManager';

interface Message {
  id: string;
  text?: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'location' | 'post' | 'videoMessage';
  mediaUrl?: string;
  sender: 'shop' | 'customer';
  timestamp: string;
  transcription?: string;
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
  obrazlar: Obraz[];
  onBackToMarketplace: () => void;
  onUpdateShop: (shop: Seller) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;
}

const ShopWorkspace: React.FC<ShopWorkspaceProps> = ({ 
  language, 
  shopData, 
  user,
  posts,
  obrazlar,
  onBackToMarketplace, 
  onUpdateShop,
  activeTab,
  setActiveTab,
  activeChatId,
  setActiveChatId
}) => {
  const { isKeyboardOpen } = useKeyboard();
  const [localShopData, setLocalShopData] = useState<Seller>(shopData);
  const [showMap, setShowMap] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);

  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showLiveStreamModal, setShowLiveStreamModal] = useState(false);
  const [stats, setStats] = useState({
    telegram: 124,
    messages: 85,
    calls: 42,
    instagramClicks: 210
  });
  const [chats, setChats] = useState<Chat[]>([]);
  
  // 1. Listen for chats list
  useEffect(() => {
    if (!shopData.id) return;

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', shopData.id));
    const unsubChats = onSnapshot(q, (snapshot) => {
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
      const msgs = msgSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sender: doc.data().senderUid === shopData.id ? 'shop' : 'customer',
        timestamp: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } as any));

      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: msgs } : c));
    });

    return () => unsubMessages();
  }, [activeChatId, shopData.id]);

  const [messageInput, setMessageInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordType, setRecordType] = useState<'voice' | 'video'>('voice');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'pending' | 'completed'>('all');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isCancelAreaHovered, setIsCancelAreaHovered] = useState(false);
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [stagedVideo, setStagedVideo] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedLocation, setStagedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{[key: string]: number}>({});
  
  const dragStartRef = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const isCancelAreaHoveredRef = useRef(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [selectedPremiumService, setSelectedPremiumService] = useState<any | null>(null);
  const [activePremiumServices, setActivePremiumServices] = useState<any[]>([
    { id: '1', title: "Postni topga chiqarish", expires: "2026-03-26T12:00:00Z", icon: TrendingUp }
  ]);

  const QUICK_REPLIES = [
    "Assalomu alaykum! Ha, bu mahsulotimiz sotuvda bor.",
    "Narxi: 250,000 so'm. Yetkazib berish bepul.",
    "Manzilimiz: Toshkent sh., Chilonzor tumani, 5-mavze.",
    "To'lovni Click yoki Payme orqali amalga oshirishingiz mumkin.",
    "Rahmat! Buyurtmangiz qabul qilindi."
  ];
  
  // Post management states
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<PostData | null>(null);
  const [selectedPostForInsights, setSelectedPostForInsights] = useState<PostData | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'Postlar' | 'Obrazlar' | 'Ma\'lumot'>('Postlar');
  const [showCreateObrazModal, setShowCreateObrazModal] = useState(false);
  const [showInstagramImportModal, setShowInstagramImportModal] = useState(false);
  const [instagramLink, setInstagramLink] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [newObrazForm, setNewObrazForm] = useState({
    title: '',
    description: '',
    totalPrice: '',
    type: '',
    selectedPostIds: [] as string[],
    mediaUrls: [] as string[]
  });
  const [newPostForm, setNewPostForm] = useState({
    outfitName: '',
    description: '',
    price: '',
    mediaType: 'carousel' as 'carousel' | 'video',
    mediaUrls: [] as string[],
    mediaFiles: [] as File[]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const postMediaRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<any>(null);
  
  const activeChat = chats.find(c => c.id === activeChatId);
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

      console.log("Updating shop with data:", updateData);
      
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

  const handleAddPost = async () => {
    if (!newPostForm.outfitName || !newPostForm.price || newPostForm.mediaFiles.length === 0 || !user || isUploading) return;

    const toastId = toast.loading("Tayyorlanmoqda...");
    setIsUploading(true);
    setUploadProgress(0);
    setIsAddingPost(false); 

    try {
      console.log("Starting upload process for user:", user.uid);
      const uploadedUrls: string[] = [];
      const totalFiles = newPostForm.mediaFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = newPostForm.mediaFiles[i];
        let fileToUpload = file;
        
        console.log(`Processing file ${i + 1}/${totalFiles}:`, file.name, file.type, file.size);

        // File size limits
        const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
        const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

        if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
          throw new Error(`Video hajmi juda katta (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal hajm 50MB.`);
        }
        if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
          throw new Error(`Rasm hajmi juda katta (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal hajm 10MB.`);
        }

        // Compress media before upload
        if (file.type.startsWith('image/')) {
          toast.loading(`Rasm siqilmoqda (${i + 1}/${totalFiles})...`, { id: toastId });
          try {
            fileToUpload = await compressImage(file);
          } catch (compErr) {
            console.error("Compression failed, using original file:", compErr);
          }
        } else if (file.type.startsWith('video/')) {
          toast.loading(`Video tayyorlanmoqda (${i + 1}/${totalFiles})...`, { id: toastId });
          try {
            fileToUpload = await compressVideo(file);
          } catch (compErr) {
            console.error("Video compression failed:", compErr);
          }
        }

        toast.loading(`Yuklanmoqda (${i + 1}/${totalFiles})...`, { id: toastId });
        const safeFileName = fileToUpload.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${safeFileName}`);
        
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
        
        // Add a timeout to the upload
        const uploadPromise = new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              if (snapshot.totalBytes > 0) {
                const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                const overallProgress = ((i * 100) + fileProgress) / totalFiles;
                setUploadProgress(Math.round(overallProgress));
              }
            }, 
            (error) => {
              console.error("Firebase upload error:", error);
              reject(error);
            }, 
            () => {
              resolve();
            }
          );
        });

        await uploadPromise;
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }

      toast.loading("Ma'lumotlar saqlanmoqda...", { id: toastId });
      
      // AI Analysis
      let aiMetadata = null;
      if (uploadedUrls.length > 0) {
        toast.loading("AI tahlil qilmoqda...", { id: toastId });
        aiMetadata = await analyzeProductImage(uploadedUrls[0]);
      }

      const newPost: any = {
        sellerId: shopData.id,
        mediaType: newPostForm.mediaType,
        mediaUrls: uploadedUrls,
        outfitName: newPostForm.outfitName,
        description: newPostForm.description,
        price: newPostForm.price,
        items: [],
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
        ownerUid: user.uid,
        aiMetadata
      };

      await addDoc(collection(db, 'posts'), newPost);
      
      toast.success("Post muvaffaqiyatli yuklandi", { id: toastId });
      setUploadProgress(null);
      setNewPostForm({
        outfitName: '',
        description: '',
        price: '',
        mediaType: 'carousel',
        mediaUrls: [],
        mediaFiles: []
      });
    } catch (error: any) {
      console.error("Full error adding post:", error);
      const errorMessage = error?.message || "Noma'lum xatolik";
      toast.error(`Xatolik: ${errorMessage}`, { id: toastId });
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
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
      console.log("API Response Data:", result); // For debugging

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
      const postData = {
        ...importPreview,
        ownerUid: user.uid,
        seller: {
          id: shopData.id,
          name: shopData.name,
          logo: shopData.logo,
          region: shopData.region || 'Toshkent'
        },
        likes: 0,
        views: 0,
        shares: 0,
        comments: 0,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'posts'), postData);
      toast.success("Mahsulot muvaffaqiyatli import qilindi!");
      setShowInstagramImportModal(false);
      setImportPreview(null);
      setInstagramLink('');
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Saqlashda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteObraz = async (obrazId: string) => {
    try {
      await deleteDoc(doc(db, 'obrazlar', obrazId));
      toast.success("Obraz o'chirildi");
    } catch (error) {
      console.error("Error deleting obraz:", error);
      toast.error("Obrazni o'chirishda xatolik");
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
    try {
      await deleteDoc(doc(db, 'posts', postId));
      toast.success("Post o'chirildi");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Postni o'chirishda xatolik");
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newUrls: string[] = [];
    const newFiles: File[] = [];
    (Array.from(files) as File[]).forEach(file => {
      if (newPostForm.mediaUrls.length + newUrls.length >= 10) return;
      newUrls.push(URL.createObjectURL(file));
      newFiles.push(file);
    });

    setNewPostForm(prev => ({
      ...prev,
      mediaUrls: [...prev.mediaUrls, ...newUrls],
      mediaFiles: [...prev.mediaFiles, ...newFiles],
      mediaType: files.length > 0 && files[0].type.startsWith('video') ? 'video' : 'carousel'
    }));
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
    setStats(prev => ({ ...prev, instagramClicks: prev.instagramClicks + 1 }));
    if (localShopData.instagram) {
      window.open(localShopData.instagram, '_blank');
    }
  };

  const handleTelegramClick = () => {
    setStats(prev => ({ ...prev, telegram: prev.telegram + 1 }));
    if (localShopData.telegram) {
      window.open(localShopData.telegram, '_blank');
    }
  };

  const handlePhoneClick = () => {
    setStats(prev => ({ ...prev, calls: prev.calls + 1 }));
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
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;

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
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = newStream;
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
        text: messageText || undefined,
        type: finalType,
        mediaUrl: finalMedia,
        location: finalLocation,
        post: postData,
        timestamp: serverTimestamp(),
        replyTo: replyingTo?.id
      };

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

  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'cancel'>('idle');

  // Handle payment status from URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      setPaymentStatus('success');
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'cancel') {
      setPaymentStatus('cancel');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handlePremiumSelect = async (title: string, price: string) => {
    try {
      setIsPaying(true);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, price }),
      });

      if (!response.ok) throw new Error('To\'lov tizimiga ulanishda xatolik');

      const { url } = await response.json();
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Payment Error:', error);
      alert('To\'lov tizimida xatolik yuz berdi. Iltimos keyinroq qayta urinib ko\'ring.');
      setIsPaying(false);
    }
  };

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
              {shopData.coverImage && (
                <img 
                  src={shopData.coverImage}
                  alt="Cover"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
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
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-blue/10 rounded-full border border-accent-blue/20">
                      <Star size={10} className="text-accent-blue" fill="currentColor" />
                      <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">4.9 {t.top_rated}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-border-primary">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-lg font-black text-text-primary">1.2K</span>
                  <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest">Obunachilar</span>
                </div>
                <div className="w-px h-6 bg-border-primary" />
                <div className="flex flex-col">
                  <span className="text-lg font-black text-text-primary">{posts.length}</span>
                  <span className="text-[9px] text-text-secondary uppercase font-black tracking-widest">Postlar</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-accent-blue/5 to-accent-light/5 rounded-2xl border border-accent-blue/10">
                <div className="relative w-10 h-10">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-text-primary/5"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="url(#matchGradient)"
                      strokeWidth="3"
                      strokeDasharray={113}
                      strokeDashoffset={113 - (113 * 85) / 100}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--color-accent-blue)" />
                        <stop offset="100%" stopColor="var(--color-accent-light)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-accent-blue">85%</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-text-primary uppercase tracking-widest">{t.style_match}</span>
                  <span className="text-[8px] text-text-secondary uppercase font-bold tracking-tighter">Sizga mos keladi</span>
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
              <button 
                onClick={() => setShowStatsModal(true)}
                className="flex-1 py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-accent-blue/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <BarChart3 size={16} />
                Statistika
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

            {/* Create Content Section */}
            <div className="px-6 py-4 grid grid-cols-3 gap-2">
              <button 
                onClick={() => setIsAddingPost(true)}
                className="flex flex-col items-center justify-center gap-2 py-4 bg-text-primary text-bg-primary rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                <PlusCircle size={18} />
                <span className="text-[8px] font-black uppercase tracking-widest">Post</span>
              </button>
              <button 
                onClick={() => setShowCreateObrazModal(true)}
                className="flex flex-col items-center justify-center gap-2 py-4 bg-gradient-to-br from-accent-blue to-accent-light text-white rounded-2xl shadow-lg shadow-accent-blue/20 active:scale-95 transition-all"
              >
                <Sparkles size={18} />
                <span className="text-[8px] font-black uppercase tracking-widest">Obraz</span>
              </button>
              <button 
                onClick={() => setShowLiveStreamModal(true)}
                className="flex flex-col items-center justify-center gap-2 py-4 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest">Efir</span>
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
                  { id: 'Obrazlar', label: 'Obrazlar', icon: <Sparkles size={14} /> },
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

            <div className="px-6 pb-20">
              {activeProfileTab === 'Postlar' && (
                (posts.length > 0 || uploadProgress !== null) ? (
                  <div className="grid grid-cols-3 gap-1">
                    {uploadProgress !== null && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-square rounded-lg overflow-hidden relative flex items-center justify-center border border-border-primary"
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
                    {posts.map((post) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={post.id} 
                        className="aspect-square bg-text-primary/5 rounded-lg overflow-hidden border border-border-primary relative group"
                      >
                        <img 
                          src={post.mediaUrls?.[0] || undefined} 
                          className="w-full h-full object-cover" 
                          alt={post.outfitName} 
                          referrerPolicy="no-referrer" 
                          onClick={() => setEditingPost(post)}
                        />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPostForInsights(post);
                          }}
                          className="absolute bottom-1 left-1 right-1 py-1 bg-black/60 backdrop-blur-md text-white text-[7px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
                        >
                          <TrendingUp size={8} />
                          Insights
                        </button>
                        {post.mediaType === 'video' && (
                          <div className="absolute top-1 right-1 bg-black/50 p-0.5 rounded">
                            <Video size={10} className="text-white" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center bg-white/5 rounded-3xl border-2 border-dashed border-border-primary">
                    <PlusCircle size={48} className="text-text-primary/10 mb-4" />
                    <p className="text-xs font-bold text-text-primary/40 uppercase tracking-widest mb-6">Hali postlar yo'q</p>
                    <div className="flex flex-col gap-3 w-full max-w-[280px]">
                      <button 
                        onClick={() => setIsAddingPost(true)}
                        className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-accent-blue/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                      >
                        <PlusCircle size={18} />
                        Post qo'shish
                      </button>
                      <button 
                        onClick={() => setShowInstagramImportModal(true)}
                        className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-pink-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                      >
                        <Instagram size={18} />
                        Instagramdan import
                      </button>
                    </div>
                  </div>
                )
              )}

              {activeProfileTab === 'Obrazlar' && (
                obrazlar.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {obrazlar.map((obraz) => (
                      <div key={obraz.id} className="group bg-white/5 rounded-3xl border border-border-primary overflow-hidden relative">
                        <div className="aspect-[4/5] relative">
                          <img src={obraz.posts?.[0]?.mediaUrls?.[0] || undefined} className="w-full h-full object-cover" alt={obraz.title} referrerPolicy="no-referrer" />
                          <div className="absolute top-2 right-2 p-1.5 bg-accent-blue rounded-full">
                            <Sparkles size={12} className="text-white" />
                          </div>
                          
                          {/* Delete Button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteObraz(obraz.id);
                            }}
                            className="absolute top-2 left-2 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/60 hover:text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="p-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 truncate">{obraz.title}</h4>
                          <p className="text-[11px] font-black text-accent-blue">{obraz.totalPrice}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center bg-white/5 rounded-3xl border-2 border-dashed border-border-primary">
                    <Shirt size={48} className="text-text-primary/10 mb-4" />
                    <p className="text-xs font-bold text-text-primary/40 uppercase tracking-widest mb-6">Hali obrazlar yo'q</p>
                    <button 
                      onClick={() => setShowCreateObrazModal(true)}
                      className="px-8 py-3 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-accent-blue/20 active:scale-95 transition-transform"
                    >
                      Obraz yaratish
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        );
      case 'Statistics':
        return (
          <div className="h-full overflow-y-auto scrollbar-hide p-6 pb-24 bg-bg-primary">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-text-primary">Statistika</h2>
                <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-[0.2em]">Do'koningiz ko'rsatkichlari</p>
              </div>
              <div className="p-3 bg-white/5 backdrop-blur-md shadow-sm rounded-2xl border border-white/10">
                <BarChart3 size={20} className="text-accent-blue" />
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-5 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-sm">
                <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest mb-1">Jami ko'rishlar</p>
                <p className="text-2xl font-black bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent">32,450</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-bold">
                  <TrendingUp size={10} />
                  <span>+12% o'sish</span>
                </div>
              </div>
              <div className="p-5 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-sm">
                <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest mb-1">Konversiya</p>
                <p className="text-2xl font-black bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent">4.8%</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-bold">
                  <TrendingUp size={10} />
                  <span>+0.5% o'sish</span>
                </div>
              </div>
            </div>

            {/* Activity Chart */}
            <div className="mb-8">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 mb-4 ml-2">Link bosishlar (Haftalik)</h4>
              <div className="h-64 w-full bg-white/5 rounded-[2rem] p-6 border border-white/5 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Dush', clicks: 400, views: 2400 },
                    { name: 'Sesh', clicks: 300, views: 1398 },
                    { name: 'Chor', clicks: 200, views: 9800 },
                    { name: 'Pay', clicks: 278, views: 3908 },
                    { name: 'Jum', clicks: 189, views: 4800 },
                    { name: 'Shan', clicks: 239, views: 3800 },
                    { name: 'Yak', clicks: 349, views: 4300 },
                  ]}>
                    <defs>
                      <linearGradient id="colorClicksMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent-blue)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-accent-blue)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#ffffff40" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#ffffff40" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #ffffff10', 
                        borderRadius: '12px',
                        fontSize: '10px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="var(--color-accent-blue)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorClicksMain)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-sky-500/10 rounded-xl">
                    <Send size={14} className="text-sky-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-primary/40">Telegram</span>
                </div>
                <p className="text-2xl font-black text-text-primary">{stats.telegram}</p>
                <p className="text-[10px] text-text-secondary uppercase font-bold mt-1">Link bosishlar</p>
              </div>

              <div className="p-5 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-pink-500/10 rounded-xl">
                    <Instagram size={14} className="text-pink-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-primary/40">Instagram</span>
                </div>
                <p className="text-2xl font-black text-text-primary">{stats.instagramClicks}</p>
                <p className="text-[10px] text-text-secondary uppercase font-bold mt-1">Link bosishlar</p>
              </div>

              <div className="p-5 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Phone size={14} className="text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-primary/40">Telefon</span>
                </div>
                <p className="text-2xl font-black text-text-primary">{stats.calls}</p>
                <p className="text-[10px] text-text-secondary uppercase font-bold mt-1">Raqam bosishlar</p>
              </div>

              <div className="p-5 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <MessageSquare size={14} className="text-amber-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-primary/40">Xabarlar</span>
                </div>
                <p className="text-2xl font-black text-text-primary">{stats.messages}</p>
                <p className="text-[10px] text-text-secondary uppercase font-bold mt-1">Jami yozganlar</p>
              </div>
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
                          <span className={`w-1.5 h-1.5 ${isTyping ? 'bg-accent-blue animate-bounce' : 'bg-emerald-500 animate-pulse'} rounded-full`} />
                          <p className={`text-[9px] ${isTyping ? 'text-accent-blue' : 'text-emerald-500'} font-black uppercase tracking-widest`}>
                            {isTyping ? "Yozmoqda..." : "Online"}
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
                        ? 'bg-gradient-to-br from-blue-500 via-accent-blue to-purple-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl text-text-primary border border-white/40 dark:border-white/10 shadow-lg shadow-black/5';

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
                          className={`p-4 text-[14px] shadow-sm cursor-pointer transition-all active:scale-[0.98] ${bubbleRadius} ${bubbleStyle}`}
                        >
                          {msg.type === 'text' && <p className="leading-relaxed">{msg.text}</p>}
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
                              <video src={msg.mediaUrl || undefined} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play size={32} className="text-white" />
                              </div>
                              <span className="absolute bottom-2 right-2 text-[9px] font-black uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded backdrop-blur-md text-white">Video</span>
                            </div>
                          )}
                          {msg.type === 'videoMessage' && (
                            <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-accent-blue shadow-xl group">
                              <video 
                                src={msg.mediaUrl || undefined} 
                                className="w-full h-full object-cover scale-x-[-1]" 
                                loop 
                                muted 
                                onMouseOver={(e) => e.currentTarget.play()}
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
                            <div className="w-48 bg-white dark:bg-white/5 rounded-xl overflow-hidden border border-text-primary/10">
                              <img src={msg.post.mediaUrls?.[0] || undefined} className="w-full aspect-square object-cover" alt="post" referrerPolicy="no-referrer" />
                              <div className="p-2">
                                <p className="text-[10px] font-black uppercase tracking-tight truncate">{msg.post.outfitName}</p>
                                <p className="text-[10px] font-black text-accent-blue">{msg.post.price}</p>
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
                                    autoPlay 
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
      case 'Premium':
        return (
          <div className="h-full overflow-y-auto scrollbar-hide p-6 pb-24 bg-bg-primary">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-text-primary">Premium</h2>
                <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-[0.2em]">Do'koningizni rivojlantiring</p>
              </div>
              <div className="p-3 bg-white/5 backdrop-blur-md shadow-sm rounded-2xl border border-white/10">
                <Zap size={20} className="text-amber-500 fill-amber-500" />
              </div>
            </div>
            
            {paymentStatus === 'success' && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] text-emerald-600 text-center backdrop-blur-xl"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 size={18} />
                  <p className="font-black uppercase tracking-widest text-xs">Muvaffaqiyatli!</p>
                </div>
                <p className="text-[10px] opacity-70 uppercase tracking-widest">Xizmat tez orada faollashtiriladi.</p>
              </motion.div>
            )}

            {/* Active Services Section */}
            {activePremiumServices.length > 0 && (
              <div className="mb-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-primary/30 mb-4 ml-2">Faol xizmatlar</h3>
                <div className="flex flex-col gap-3">
                  {activePremiumServices.map(service => (
                    <div key={service.id} className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-[1.5rem] flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-blue/10 rounded-xl">
                          <service.icon size={16} className="text-accent-blue" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary uppercase tracking-tight">{service.title}</p>
                          <p className="text-[9px] text-text-primary/40 uppercase tracking-widest">Tugash vaqti: {new Date(service.expires).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Faol</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bento Grid Services */}
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-primary/30 mb-4 ml-2">Xizmatlar</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Main Large Card */}
              <div className="col-span-2">
                <PremiumCard 
                  icon={TrendingUp} 
                  title="Postni topga chiqarish" 
                  desc="Auditoriya qiziqishiga qarab videoni eng yuqori o'rinlarda ko'rsatish" 
                  price="99 000 so'm / kun"
                  onSelect={() => handlePremiumSelect("Postni topga chiqarish", "99000")}
                  onClick={() => setSelectedPremiumService({
                    icon: TrendingUp,
                    title: "Postni topga chiqarish",
                    desc: "Auditoriya qiziqishiga qarab videoni eng yuqori o'rinlarda ko'rsatish",
                    price: "99 000 so'm / kun",
                    priceVal: "99000"
                  })}
                  loading={isPaying}
                  variant="large"
                  color="purple"
                />
              </div>

              {/* Smaller Cards */}
              <PremiumCard 
                icon={Clock} 
                title="Storyga qo'yish" 
                desc="Tepadagi storylar qatoriga bir kun davomida joylashtirish" 
                price="29 000 so'm"
                onSelect={() => handlePremiumSelect("Storyga qo'yish", "29000")}
                onClick={() => setSelectedPremiumService({
                  icon: Clock,
                  title: "Storyga qo'yish",
                  desc: "Tepadagi storylar qatoriga bir kun davomida joylashtirish",
                  price: "29 000 so'm",
                  priceVal: "29000"
                })}
                loading={isPaying}
                color="emerald"
              />
              <PremiumCard 
                icon={Video} 
                title="Splash Reklama" 
                desc="Ilovaga kirganda 5 soniyalik video" 
                price="99 000 so'm"
                onSelect={() => handlePremiumSelect("Splash Video Reklama", "99000")}
                onClick={() => setSelectedPremiumService({
                  icon: Video,
                  title: "Splash Reklama",
                  desc: "Ilovaga kirganda 5 soniyalik video",
                  price: "99 000 so'm",
                  priceVal: "99000"
                })}
                loading={isPaying}
                color="amber"
              />
              
              <div className="col-span-2">
                <PremiumCard 
                  icon={Send} 
                  title="Bildirishnoma yuborish" 
                  desc="Foydalanuvchi qiziqishiga qarab telefoniga do'kon haqida xabar yuborish" 
                  price="99 000 so'm / kun"
                  onSelect={() => handlePremiumSelect("Bildirishnoma yuborish", "99000")}
                  onClick={() => setSelectedPremiumService({
                    icon: Send,
                    title: "Bildirishnoma yuborish",
                    desc: "Foydalanuvchi qiziqishiga qarab telefoniga do'kon haqida xabar yuborish",
                    price: "99 000 so'm / kun",
                    priceVal: "99000"
                  })}
                  loading={isPaying}
                  variant="wide"
                  color="rose"
                />
              </div>
            </div>

            <AnimatePresence>
              {selectedPremiumService && (
                <PremiumServiceDetailModal 
                  service={selectedPremiumService}
                  onClose={() => setSelectedPremiumService(null)}
                  onSelect={() => handlePremiumSelect(selectedPremiumService.title, selectedPremiumService.priceVal)}
                  loading={isPaying}
                  shopData={localShopData}
                  posts={posts}
                />
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
            active={activeTab === 'Premium'} 
            onClick={() => handleTabChange('Premium')} 
            icon={Zap} 
            label="Premium" 
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
                      <img 
                        src={getProxiedUrl(importPreview?.mediaUrls?.[0] || '')} 
                        className="w-24 h-24 rounded-2xl object-cover border border-white/10" 
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

      {/* Post Insights Modal */}
      <AnimatePresence>
        {selectedPostForInsights && (
          <PostInsightsModal 
            post={selectedPostForInsights} 
            onClose={() => setSelectedPostForInsights(null)} 
          />
        )}
      </AnimatePresence>

      {/* Statistics Modal */}
      <AnimatePresence>
        {showCreateObrazModal && (
          <CreateObrazModal 
            posts={posts}
            sellerId={shopData.id}
            ownerUid={user?.uid || ''}
            onClose={() => setShowCreateObrazModal(false)}
          />
        )}

        {showStatsModal && (
          <StatsModal 
            stats={stats} 
            onClose={() => setShowStatsModal(false)} 
          />
        )}
      </AnimatePresence>

      {/* Add Post Modal */}
      <AnimatePresence>
        {isAddingPost && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-bg-primary rounded-3xl border border-border-primary overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-border-primary flex justify-between items-center bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <PlusCircle size={20} className="text-accent-blue" />
                  <h3 className="font-black italic uppercase tracking-tighter text-text-primary">Yangi Post Qo'shish</h3>
                </div>
                <button onClick={() => setIsAddingPost(false)} className="p-2 hover:bg-white/10 rounded-full transition-all text-text-primary/40">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Nomi</label>
                    <input 
                      type="text" 
                      value={newPostForm.outfitName}
                      onChange={(e) => setNewPostForm(prev => ({ ...prev, outfitName: e.target.value }))}
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary"
                      placeholder="Masalan: Yozgi ko'ylak"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Narxi</label>
                    <input 
                      type="text" 
                      value={newPostForm.price}
                      onChange={(e) => setNewPostForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary"
                      placeholder="150 000 so'm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Izoh</label>
                  <textarea 
                    value={newPostForm.description}
                    onChange={(e) => setNewPostForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm h-24 focus:outline-none focus:border-accent-blue/50 text-text-primary resize-none"
                    placeholder="Mahsulot haqida batafsil ma'lumot..."
                  />
                </div>
                
                {/* Media Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Media (Max 10 rasm yoki 1 min video)</label>
                  <div className="flex flex-wrap gap-2">
                    {newPostForm.mediaUrls.map((url, i) => (
                      <div key={i} className="w-20 h-20 rounded-xl overflow-hidden relative border border-white/10 shadow-sm group">
                        <img src={url || undefined} className="w-full h-full object-cover" alt="preview" />
                        <button 
                          onClick={() => setNewPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, idx) => idx !== i) }))}
                          className="absolute top-1 right-1 bg-black/40 backdrop-blur-md text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {newPostForm.mediaUrls.length < 10 && (
                      <button 
                        onClick={() => postMediaRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-text-primary/20 hover:text-accent-blue hover:border-accent-blue/50 transition-all bg-white/5 backdrop-blur-md"
                      >
                        <Camera size={24} />
                        <span className="text-[8px] font-black uppercase mt-1">Qo'shish</span>
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={postMediaRef} 
                    className="hidden" 
                    multiple 
                    accept="image/*,video/*" 
                    onChange={handleMediaUpload} 
                  />
                </div>
              </div>
              <div className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-md">
                <button 
                  onClick={handleAddPost}
                  className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent-blue/20 active:scale-95 transition-all"
                >
                  Postni Joylash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live Stream Modal */}
      <AnimatePresence>
        {showLiveStreamModal && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-bg-primary rounded-3xl border border-border-primary overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-border-primary flex justify-between items-center bg-bg-primary/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <h3 className="font-black italic uppercase tracking-tighter">Jonli Efir Boshlash</h3>
                </div>
                <button onClick={() => setShowLiveStreamModal(false)} className="p-2 hover:bg-text-primary/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="aspect-video bg-black rounded-2xl overflow-hidden relative border border-border-primary">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera size={48} className="text-white/20" />
                  </div>
                  <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    Preview
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Efir mavzusi</label>
                    <input 
                      type="text" 
                      placeholder="Masalan: Yangi kolleksiya taqdimoti"
                      className="w-full bg-text-primary/5 border border-text-primary/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-text-primary/5 rounded-2xl border border-border-primary flex flex-col items-center gap-2">
                      <Users size={20} className="text-accent-blue" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-primary/60">Kutilayotgan: 120+</span>
                    </div>
                    <div className="p-4 bg-text-primary/5 rounded-2xl border border-border-primary flex flex-col items-center gap-2">
                      <Zap size={20} className="text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-primary/60">Sifat: 1080p</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setShowLiveStreamModal(false);
                    toast.success("Jonli efir boshlandi!", {
                      description: "Mijozlar endi sizni ko'rishlari mumkin.",
                      duration: 3000,
                    });
                  }}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Efirni Boshlash
                </button>
              </div>
            </motion.div>
          </div>
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
                    <Placemark geometry={[localShopData.location.lat, localShopData.location.lng]} />
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

const PremiumCard = ({ icon: Icon, title, desc, price, onSelect, loading, variant = 'default', color = 'blue', onClick }: any) => {
  const colorMap: any = {
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-600',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-600',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-600',
    rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/20 text-rose-600',
    blue: 'from-accent-blue/20 to-accent-blue/5 border-accent-blue/20 text-accent-blue'
  };

  const glowMap: any = {
    purple: 'bg-purple-500/10',
    emerald: 'bg-emerald-500/10',
    amber: 'bg-amber-500/10',
    rose: 'bg-rose-500/10',
    blue: 'bg-accent-blue/10'
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden p-6 rounded-[2.5rem] border backdrop-blur-2xl flex flex-col justify-between transition-all group cursor-pointer bg-gradient-to-br ${colorMap[color]} ${
        variant === 'large' ? 'min-h-[220px]' : variant === 'wide' ? 'min-h-[140px]' : 'min-h-[180px]'
      }`}
    >
      {/* Background Glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[40px] group-hover:blur-[60px] transition-all ${glowMap[color]}`} />
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/20 shadow-sm backdrop-blur-md">
            <Icon size={20} className={colorMap[color].split(' ').pop()} />
          </div>
          <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
            <span className="text-[8px] font-black text-text-primary/40 uppercase tracking-widest">Premium</span>
          </div>
        </div>
        
        <h3 className={`font-black text-text-primary uppercase tracking-tight leading-none mb-2 ${variant === 'large' ? 'text-lg' : 'text-xs'}`}>
          {title}
        </h3>
        <p className="text-[10px] text-text-primary/50 font-bold leading-relaxed mb-4 line-clamp-2">
          {desc}
        </p>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-text-primary/20 uppercase tracking-widest">Narxi</span>
          <span className="text-xs font-black text-text-primary">{price}</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          disabled={loading}
          className="p-3 bg-white/10 text-text-primary rounded-2xl shadow-lg active:scale-90 transition-all disabled:opacity-50 border border-white/10 backdrop-blur-md"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-text-primary/20 border-t-text-primary rounded-full animate-spin" />
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
      </div>
    </motion.div>
  );
};

const PremiumServiceDetailModal = ({ service, onClose, onSelect, loading, shopData, posts }: any) => {
  if (!service) return null;

  const details: any = {
    "Postni topga chiqarish": {
      fullDesc: "Sizning mahsulotingiz asosiy sahifada eng yuqori o'rinlarda ko'rsatiladi. Bu orqali ko'rishlar soni 10 barobargacha oshadi va sotuv ehtimoli sezilarli darajada ortadi.",
      benefits: ["Asosiy sahifada birinchi o'rinlar", "Ko'rishlar soni 10x oshishi", "Maqsadli auditoriyaga ko'rsatish"],
      previewType: "feed"
    },
    "Storyga qo'yish": {
      fullDesc: "Mahsulotingiz tepadagi storylar qatoriga joylashtiriladi. Foydalanuvchilar ilovaga kirishi bilan sizning mahsulotingizni ko'rishadi va bir zumda o'tish imkoniyatiga ega bo'lishadi.",
      benefits: ["Storylar qatorida birinchi bo'lish", "Tezkor o'tish tugmasi", "24 soat davomida faol bo'lish"],
      previewType: "story"
    },
    "Splash Reklama": {
      fullDesc: "Foydalanuvchi ilovaga kirgan zahoti 5 soniya davomida sizning reklamangizni ko'radi. Bu brendingizni tanitish va yangi kolleksiyalarni e'lon qilish uchun eng yaxshi usul.",
      benefits: ["100% foydalanuvchilar ko'rishi", "To'liq ekranli reklama", "Brend tanilishini oshirish"],
      previewType: "splash"
    },
    "Bildirishnoma yuborish": {
      fullDesc: "Sizning mahsulotingizga qiziqishi mumkin bo'lgan foydalanuvchilarga to'g'ridan-to'g'ri push-bildirishnoma yuboriladi. Bu foydalanuvchini ilovaga qaytarishning eng samarali yo'li.",
      benefits: ["To'g'ridan-to'g'ri push-xabar", "Qiziqishga qarab saralash", "Yuqori konversiya"],
      previewType: "notification"
    }
  };

  const detail = details[service.title] || {
    fullDesc: service.desc,
    benefits: ["Premium imkoniyatlar", "Kengaytirilgan statistika"],
    previewType: "default"
  };

  const renderPreview = () => {
    switch (detail.previewType) {
      case 'story':
        return (
          <div className="w-full h-full bg-bg-primary flex flex-col">
            {/* Header - Skrinshotdagidek */}
            <div className="p-4 border-b border-border-primary flex items-center justify-between bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center text-white text-[6px] font-black italic">Alpha</div>
                <span className="text-[10px] font-black italic tracking-tighter text-text-primary">AlphaSpace</span>
              </div>
              <div className="relative">
                <Mail size={18} className="text-accent-blue" />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-bg-primary flex items-center justify-center text-[6px] text-white font-bold">3</div>
              </div>
            </div>
            
            {/* Stories - Skrinshotdagidek */}
            <div className="p-4 flex gap-4 overflow-hidden bg-white/5 backdrop-blur-md">
              {/* Premium Story Preview */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full p-1 border-2 border-red-500 relative shadow-lg shadow-red-500/20">
                  <img src={shopData.logo || undefined} className="w-full h-full rounded-full object-cover" alt="Logo" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-[6px] font-black rounded uppercase tracking-tighter">Live</div>
                </div>
                <span className="text-[8px] font-black uppercase text-red-500 tracking-tighter">{shopData.name}</span>
              </div>
              
              {/* Other Stories */}
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-1 opacity-40">
                  <div className="w-16 h-16 rounded-full p-1 border-2 border-accent-blue">
                    <div className="w-full h-full rounded-full bg-text-primary/5" />
                  </div>
                  <div className="w-10 h-2 bg-text-primary/5 rounded" />
                </div>
              ))}
            </div>

            {/* Search Bar - Skrinshotdagidek */}
            <div className="px-4 pb-4 bg-white/5 backdrop-blur-md border-b border-border-primary">
              <div className="w-full h-11 bg-text-primary/5 rounded-xl flex items-center px-4 gap-3">
                <Search size={16} className="text-text-primary/20" />
                <span className="text-[10px] text-text-primary/30 font-medium">Maxsulotlarni qidirish...</span>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="flex-1 p-4 bg-bg-primary">
              <div className="w-full h-full rounded-2xl border-2 border-dashed border-text-primary/5 flex items-center justify-center">
                <span className="text-[8px] font-black text-text-primary/10 uppercase tracking-[0.3em]">Asosiy sahifa</span>
              </div>
            </div>
          </div>
        );
      case 'feed':
        return (
          <div className="w-full h-full bg-bg-primary flex flex-col p-4 gap-4">
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-accent-blue/30 shadow-xl shadow-accent-blue/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-accent-blue text-white text-[8px] font-black uppercase tracking-widest rounded-bl-xl">Top</div>
              <div className="flex items-center gap-2 mb-3">
                <img src={shopData.logo || undefined} className="w-6 h-6 rounded-full object-cover" alt="Logo" />
                <span className="text-[10px] font-black uppercase text-text-primary">{shopData.name}</span>
              </div>
              <div className="aspect-video bg-text-primary/5 rounded-xl mb-3 overflow-hidden">
                {posts?.[0] && <img src={posts[0].mediaUrls?.[0] || undefined} className="w-full h-full object-cover" alt="Post" />}
              </div>
              <div className="h-2 w-2/3 bg-text-primary/5 rounded mb-1" />
              <div className="h-2 w-1/2 bg-text-primary/5 rounded" />
            </div>
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 opacity-30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-text-primary/10" />
                <div className="w-20 h-2 bg-text-primary/10 rounded" />
              </div>
              <div className="aspect-video bg-text-primary/5 rounded-xl" />
            </div>
          </div>
        );
      case 'splash':
        return (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            {posts?.[0] && <img src={posts[0].mediaUrls?.[0] || undefined} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Splash" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
            <div className="relative z-10 text-center p-8">
              <img src={shopData.logo || undefined} className="w-20 h-20 rounded-full border-2 border-white mx-auto mb-4 shadow-2xl" alt="Logo" />
              <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">{shopData.name}</h4>
              <p className="text-[10px] text-white/60 uppercase tracking-[0.2em]">Yangi kolleksiya bilan tanishing</p>
            </div>
            <div className="absolute top-6 right-6 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-widest">O'tkazib yuborish 5s</div>
          </div>
        );
      case 'notification':
        return (
          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6">
            <div className="w-full p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-accent-blue rounded-xl flex items-center justify-center text-white text-[6px] font-black italic">Alpha</div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-white uppercase tracking-tight">AlphaSpace</p>
                  <p className="text-[8px] text-white/40 uppercase tracking-widest">Hozirda</p>
                </div>
              </div>
              <h5 className="text-xs font-bold text-white mb-1">{shopData.name} dan yangi xabar!</h5>
              <p className="text-[10px] text-white/60 leading-tight">Siz kutgan yangi kiyimlar do'konimizga keldi. Birinchilardan bo'lib ko'ring!</p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-2 opacity-20">
              <div className="w-12 h-1 bg-white/20 rounded-full" />
              <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">Qulflash ekrani</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="w-full h-full bg-black/5 flex items-center justify-center">
            <service.icon size={48} className="text-black/10" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[15000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-white rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
      >
        <div className="relative h-[320px] w-full overflow-hidden bg-bg-primary border-b border-border-primary">
          {renderPreview()}
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-all z-20"
          >
            <X size={20} />
          </button>
          
          <div className="absolute top-6 left-6 z-20">
            <div className="px-3 py-1 bg-accent-blue text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-accent-blue/20">
              Jonli ko'rinish
            </div>
          </div>
        </div>

        <div className="p-8 overflow-y-auto scrollbar-hide bg-bg-primary">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/5 backdrop-blur-md shadow-sm rounded-2xl border border-white/10">
              <service.icon size={24} className="text-accent-blue" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-text-primary">{service.title}</h3>
          </div>

          <p className="text-sm text-text-primary/60 leading-relaxed mb-8 font-medium">
            {detail.fullDesc}
          </p>

          <div className="space-y-4 mb-10">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary/30">Asosiy afzalliklari</h4>
            {detail.benefits.map((benefit: string, i: number) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                <div className="w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_10px_rgba(0,149,255,0.5)]" />
                <span className="text-xs font-bold text-text-primary">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-6 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 mb-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-text-primary/30 uppercase tracking-widest">Xizmat narxi</span>
              <span className="text-lg font-black text-text-primary">{service.price}</span>
            </div>
            <button 
              onClick={() => {
                onSelect();
                onClose();
              }}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? '...' : 'Sotib olish'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const PostInsightsModal = ({ post, onClose }: { post: PostData, onClose: () => void }) => {
  const engagementData = [
    { time: '0:00', engagement: 20 },
    { time: '0:15', engagement: 45 },
    { time: '0:30', engagement: 85 },
    { time: '0:45', engagement: 60 },
    { time: '1:00', engagement: 30 },
  ];

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-bg-primary rounded-[2.5rem] overflow-hidden shadow-2xl border border-border-primary flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-border-primary flex items-center justify-between bg-bg-primary/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-blue/10 rounded-xl">
              <TrendingUp size={20} className="text-accent-blue" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-text-primary">Post Insights</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-text-primary/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-8">
          {/* Main Metrics */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Ko\'rish', value: '12.4K', icon: Zap },
              { label: 'Like', value: post.likes, icon: TrendingUp },
              { label: 'Izoh', value: post.comments, icon: MessageSquare },
              { label: 'Saqlash', value: '450', icon: Grid },
            ].map((stat, idx) => (
              <div key={idx} className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
                <stat.icon size={14} className="mx-auto mb-1 text-text-primary/40" />
                <p className="text-sm font-black text-text-primary">{stat.value}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-text-primary/40">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Video Retention / Engagement Chart */}
          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary/40">Video faolligi</h4>
              <span className="text-[9px] font-bold text-accent-blue">Eng qiziq nuqta: 0:32</span>
            </div>
            <div className="h-48 w-full bg-white/5 rounded-3xl p-4 border border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementData}>
                  <defs>
                    <linearGradient id="colorEngage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent-blue)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-accent-blue)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="engagement" stroke="var(--color-accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorEngage)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Audience Info */}
          <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 mb-4">Auditoriya</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-text-primary">85%</p>
                <p className="text-[9px] font-bold text-text-primary/40 uppercase tracking-widest">Obuna bo'lmaganlar</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-500">+124</p>
                <p className="text-[9px] font-bold text-text-primary/40 uppercase tracking-widest">Yangi obunachilar</p>
              </div>
            </div>
          </div>

          {/* Link Clicks Table */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 mb-4 ml-2">Link bosishlar (Ushbu postdan)</h4>
            <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-4 py-3 font-black uppercase tracking-widest text-text-primary/40">Platforma</th>
                    <th className="px-4 py-3 font-black uppercase tracking-widest text-text-primary/40 text-right">Bosishlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { name: 'Instagram', value: 142, icon: Instagram, color: 'text-pink-500' },
                    { name: 'Telegram', value: 89, icon: Send, color: 'text-sky-500' },
                    { name: 'Telefon', value: 34, icon: Phone, color: 'text-emerald-500' },
                    { name: 'Xabarlar', value: 56, icon: MessageSquare, color: 'text-amber-500' },
                  ].map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <row.icon size={12} className={row.color} />
                        <span className="font-bold">{row.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-text-primary">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 bg-bg-primary border-t border-border-primary">
          <button onClick={onClose} className="w-full py-4 bg-text-primary text-bg-primary rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">
            Yopish
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const CreateObrazModal = ({ posts, sellerId, ownerUid, onClose }: { posts: PostData[], sellerId: string, ownerUid: string, onClose: () => void }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    totalPrice: '',
    type: '',
    selectedPostIds: [] as string[],
    mediaUrls: [] as string[]
  });

  const togglePostSelection = (id: string) => {
    setForm(prev => {
      const isSelected = prev.selectedPostIds.includes(id);
      if (!isSelected && prev.selectedPostIds.length >= 7) {
        toast.error("Maksimal 7 ta mahsulot tanlash mumkin");
        return prev;
      }
      return {
        ...prev,
        selectedPostIds: isSelected
          ? prev.selectedPostIds.filter(pid => pid !== id)
          : [...prev.selectedPostIds, id]
      };
    });
  };

  const handleCreate = async () => {
    try {
      const selectedPosts = posts.filter(p => form.selectedPostIds.includes(p.id));
      const newObrazData = {
        sellerId,
        ownerUid,
        title: form.title,
        description: form.description,
        totalPrice: form.totalPrice,
        type: form.type,
        posts: selectedPosts,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'obrazlar'), newObrazData);
      toast.success("Obraz muvaffaqiyatli yaratildi");
      onClose();
    } catch (error) {
      console.error("Error creating obraz:", error);
      toast.error("Obraz yaratishda xatolik");
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
            <div className="p-2 bg-accent-blue/10 rounded-xl">
              <Sparkles size={20} className="text-accent-blue" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-text-primary">Obraz Yaratish</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-text-primary/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">
          {/* Post Selection */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary/40">Mahsulotlarni tanlang</h4>
              <span className={`text-[10px] font-black uppercase tracking-widest ${form.selectedPostIds.length >= 7 ? 'text-red-500' : 'text-accent-blue'}`}>
                {form.selectedPostIds.length} / 7
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {posts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => togglePostSelection(post.id)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${form.selectedPostIds.includes(post.id) ? 'border-accent-blue scale-95' : 'border-transparent opacity-60'}`}
                >
                  <img src={post.mediaUrls?.[0] || undefined} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  {form.selectedPostIds.includes(post.id) && (
                    <div className="absolute inset-0 bg-accent-blue/20 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-2">Obraz nomi</label>
              <input 
                type="text" 
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                placeholder="Masalan: Kechki ziyofat uchun"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-accent-blue/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-2">Umumiy narxi</label>
              <input 
                type="text" 
                value={form.totalPrice}
                onChange={e => setForm({...form, totalPrice: e.target.value})}
                placeholder="Masalan: 1,200,000 so'm"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-accent-blue/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 ml-2">Izoh va ma'lumot</label>
              <textarea 
                rows={3}
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Obraz haqida to'liq ma'lumot..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-accent-blue/50 transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-bg-primary border-t border-border-primary">
          <button 
            onClick={handleCreate}
            disabled={!form.title || !form.totalPrice || form.selectedPostIds.length === 0}
            className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-accent-blue/20 active:scale-95 transition-all disabled:opacity-50"
          >
            Obrazni Saqlash
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const StatsModal = ({ stats, onClose }: { stats: any, onClose: () => void }) => {
  const data = [
    { name: 'Dush', clicks: 400, views: 2400 },
    { name: 'Sesh', clicks: 300, views: 1398 },
    { name: 'Chor', clicks: 200, views: 9800 },
    { name: 'Pay', clicks: 278, views: 3908 },
    { name: 'Jum', clicks: 189, views: 4800 },
    { name: 'Shan', clicks: 239, views: 3800 },
    { name: 'Yak', clicks: 349, views: 4300 },
  ];

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-bg-primary rounded-[2.5rem] overflow-hidden shadow-2xl border border-border-primary flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-border-primary flex items-center justify-between bg-bg-primary/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-blue/10 rounded-xl">
              <BarChart3 size={20} className="text-accent-blue" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tighter text-text-primary">Batafsil Statistika</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-text-primary/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
              <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest mb-1">Jami ko'rishlar</p>
              <p className="text-2xl font-black bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent">32,450</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-bold">
                <TrendingUp size={10} />
                <span>+12% o'sish</span>
              </div>
            </div>
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
              <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest mb-1">Konversiya</p>
              <p className="text-2xl font-black bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent">4.8%</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-bold">
                <TrendingUp size={10} />
                <span>+0.5% o'sish</span>
              </div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="mb-8">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary/40 mb-4 ml-2">Link bosishlar (Haftalik)</h4>
            <div className="h-64 w-full bg-white/5 rounded-3xl p-4 border border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent-blue)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-accent-blue)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#ffffff40" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#ffffff40" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #ffffff10', 
                      borderRadius: '12px',
                      fontSize: '10px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="var(--color-accent-blue)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorClicks)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-sky-500/10 rounded-lg">
                  <Send size={12} className="text-sky-500" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-text-primary/40">Telegram</span>
              </div>
              <p className="text-xl font-black text-text-primary">{stats.telegram}</p>
              <p className="text-[9px] text-text-secondary uppercase font-bold mt-1">Link bosishlar</p>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-pink-500/10 rounded-lg">
                  <Instagram size={12} className="text-pink-500" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-text-primary/40">Instagram</span>
              </div>
              <p className="text-xl font-black text-text-primary">{stats.instagramClicks}</p>
              <p className="text-[9px] text-text-secondary uppercase font-bold mt-1">Link bosishlar</p>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                  <Phone size={12} className="text-emerald-500" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-text-primary/40">Telefon</span>
              </div>
              <p className="text-xl font-black text-text-primary">{stats.calls}</p>
              <p className="text-[9px] text-text-secondary uppercase font-bold mt-1">Raqam bosishlar</p>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-500/10 rounded-lg">
                  <MessageSquare size={12} className="text-amber-500" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-text-primary/40">Xabarlar</span>
              </div>
              <p className="text-xl font-black text-text-primary">{stats.messages}</p>
              <p className="text-[9px] text-text-secondary uppercase font-bold mt-1">Jami yozganlar</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-bg-primary border-t border-border-primary">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-accent-blue/20 active:scale-95 transition-all"
          >
            Yopish
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ShopWorkspace;
