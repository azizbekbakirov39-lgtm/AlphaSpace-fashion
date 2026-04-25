import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  ChevronRight, 
  ChevronLeft,
  Globe, 
  Users, 
  MessageSquare, 
  Bookmark, 
  LogOut, 
  ArrowLeft,
  User as UserIcon,
  ShoppingBag,
  Send,
  Dna,
  LayoutGrid,
  Heart,
  Sparkles,
  Zap,
  Mic,
  Play,
  Pause,
  Trash2,
  X,
  Image as ImageIcon,
  Video,
  MapPin as MapPinIcon,
  Plus,
  Reply,
  RefreshCw,
  Trash,
  Store,
  ShieldCheck,
  Download,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { isVideoUrl, safePlayVideo } from '../utils/mediaUtils';
import { Language, translations } from '../translations';
import { useKeyboard } from '../hooks/useKeyboard';
import { usePWA } from '../hooks/usePWA';
import { showChatNotification } from '../utils/notifications';
import { PostData, Seller, User } from '../types';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, setDoc, getDoc, updateDoc, increment, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { uploadImageToImgBB } from '../services/imgbb';

import { InAppBrowserGuide } from './InAppBrowserGuide';
import Logo from './Logo';

interface ProfileProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  savedPosts: PostData[];
  subscribedSellers: Seller[];
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onOpenShop: () => void;
  onOpenShopProfile: (shopId: string) => void;
  onOpenPostDetails: (posts: PostData[], index: number) => void;
  onToggleSubscribe: (sellerId: string) => void;
  onOpenShopSelector?: () => void;
  userShops?: Seller[];
  workspace: 'Marketplace' | 'Shop';
  likedPosts: PostData[];
  recentlyViewedPosts: PostData[];
  hasShop: boolean;
  subView: SubView;
  setSubView: (view: SubView) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onEmailLogin?: (email: string, pass: string, name?: string) => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
  onBackToHome?: () => void;
  onOpenAdminDashboard?: () => void;
  onOpenChat: (sellerId: string, product?: PostData | null) => void;
  initialChatSellerId?: string | null;
  initialChatProduct?: PostData | null;
}

export type SubView = 'main' | 'language' | 'subscriptions' | 'chats' | 'saved' | 'style-dna' | 'closet' | 'try-ons' | 'fit-profile' | 'comments' | 'liked-posts' | 'recently-viewed';

interface ChatMessage {
  id: string;
  text?: string;
  audio?: string;
  image?: string;
  video?: string;
  videoMessage?: string; // Square video message
  location?: { lat: number, lng: number };
  post?: PostData;
  isMe: boolean;
  time: string;
  reactions?: string[];
  replyTo?: string; // ID of the message being replied to
}

const Profile: React.FC<ProfileProps> = ({ 
  language, 
  setLanguage, 
  savedPosts, 
  subscribedSellers,
  onToggleLike,
  onToggleSave,
  onOpenShop,
  onOpenShopProfile,
  onOpenPostDetails,
  onToggleSubscribe,
  onOpenShopSelector,
  userShops = [],
  workspace,
  likedPosts,
  recentlyViewedPosts,
  hasShop,
  subView,
  setSubView,
  user,
  onLogin,
  onLogout,
  onEmailLogin,
  onResetPassword,
  onBackToHome,
  onOpenAdminDashboard,
  onOpenChat,
  initialChatSellerId,
  initialChatProduct,
  sentPosts,
  setSentPosts
}) => {
  const { isKeyboardOpen } = useKeyboard();
  const { installApp, isStandalone, isInAppBrowser, canInstall } = usePWA();
  const [showInAppGuideModal, setShowInAppGuideModal] = useState(false);
  const [activeChatSeller, setActiveChatSeller] = useState<Seller | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<{[key: string]: ChatMessage[]}>({});
  
  // Firestore Chat Listeners
  const messageUnsubs = React.useRef<{ [chatId: string]: () => void }>({});

  const [downloadCount, setDownloadCount] = useState<number>(0);

  // Realtime listener for app downloads
  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stats', 'appTracker'), (docSnap) => {
      if (docSnap.exists()) {
        setDownloadCount(docSnap.data().downloads || 0);
      }
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (!user) return;

    // Listen for all chats where user is a participant
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    
    let initComplete = false;

    const unsubChats = onSnapshot(q, (snapshot) => {
      // Notification Logic
      if (initComplete) {
        snapshot.docChanges().forEach(change => {
           if (change.type === 'modified') {
             const data = change.doc.data();
             // If last sender is NOT the user, it means shop sent a message
             if (data.lastSender && data.lastSender !== user.uid) {
                const msgSellerId = change.doc.id.replace(user.uid, '').replace('_', '');
               // Show notification only if we're not actively conversing in this specific chat
               if (document.hidden || activeChatSeller?.id !== msgSellerId || subView !== 'messages') {
                  showChatNotification("Do'kondan xabar", data.lastMessage || "Yangi xabar keldi");
               }
             }
           }
        });
      }
      initComplete = true;

      snapshot.docs.forEach(chatDoc => {
        const chatId = chatDoc.id;
        const sellerId = chatId.replace(user.uid, '').replace('_', '');
        
        // Only add listener if we don't already have one for this chat
        if (!messageUnsubs.current[chatId]) {
          const msgQ = query(collection(db, `chats/${chatId}/messages`), orderBy('timestamp', 'asc'));
          messageUnsubs.current[chatId] = onSnapshot(msgQ, (msgSnapshot) => {
            const msgs = msgSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              isMe: doc.data().senderUid === user.uid,
              time: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            } as ChatMessage));
            
            setChatMessages(prev => ({
              ...prev,
              [sellerId]: msgs
            }));
          });
        }
      });
    });

    return () => {
      unsubChats();
      Object.values(messageUnsubs.current).forEach((unsub: () => void) => unsub());
      messageUnsubs.current = {};
    };
  }, [user?.uid]);

  const chatSellers = React.useMemo(() => {
    const sellersMap = new Map<string, Seller>();
    
    // Add subscribed sellers
    subscribedSellers.forEach(s => sellersMap.set(s.id, s));
    
    // Ensure all sellers from chat history are included
    Object.keys(chatMessages).forEach(sellerId => {
      if (!sellersMap.has(sellerId)) {
        // Construct a partial seller from history if not subscribed
        const firstMessage = chatMessages[sellerId][0];
        if (firstMessage && firstMessage.post) {
          sellersMap.set(sellerId, {
            ...firstMessage.post.seller,
            isSubscribed: false
          });
        } else {
          sellersMap.set(sellerId, {
            id: sellerId,
            name: `Sotuvchi ${sellerId.substring(0, 4)}`,
            logo: '',
            followers: 0,
            isVerified: false,
            hasStory: false,
            categories: []
          });
        }
      }
    });

    if (activeChatSeller && !sellersMap.has(activeChatSeller.id)) {
        sellersMap.set(activeChatSeller.id, activeChatSeller);
    }
    
    // Sort by latest message time
    return Array.from(sellersMap.values()).sort((a, b) => {
      const msgsA = chatMessages[a.id] || [];
      const msgsB = chatMessages[b.id] || [];
      
      const getTime = (msgs: any[]) => {
        if (msgs.length === 0) return 0;
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.timestamp?.seconds) return lastMsg.timestamp.seconds;
        if (lastMsg.date && lastMsg.time) {
            return new Date(`${lastMsg.date} ${lastMsg.time}`).getTime();
        }
        return 0;
      };

      const timeA = getTime(msgsA);
      const timeB = getTime(msgsB);
      
      return timeB - timeA;
    });
  }, [subscribedSellers, chatMessages, activeChatSeller]);

  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  
  // Audio Playback State
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{[key: string]: number}>({});
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [activeClosetCategory, setActiveClosetCategory] = useState<'all' | 'clothing' | 'outfits' | 'other'>('all');

  const handleBack = () => {
    if (activeChatSeller) {
      // Just go back, App.tsx handlePopState will handle state restoration
      window.history.back();
    } else if (subView !== 'main') {
      setSubView('main');
      window.history.back();
    } else if (onBackToHome) {
      onBackToHome();
    }
  };

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoPreviewRef] = useState(() => React.createRef<HTMLVideoElement>());
  const [isHoldingRecord, setIsHoldingRecord] = useState(false);
  const [recordType, setRecordType] = useState<'voice' | 'video' | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isCancelAreaHovered, setIsCancelAreaHovered] = useState(false);
  const isCancelAreaHoveredRef = React.useRef(false);
  const [dragX, setDragX] = useState(0);
  const dragXRef = React.useRef(0);
  const dragStartRef = React.useRef<number | null>(null);
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [stagedVideo, setStagedVideo] = useState<string | null>(null);
  const [stagedLocation, setStagedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isSendingRef = React.useRef(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const recordButtonRef = React.useRef<HTMLButtonElement>(null);
  const cancelAreaRef = React.useRef<HTMLDivElement>(null);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Brauzeringiz audio yozishni qo'llab-quvvatlamaydi.");
        return;
      }

      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        if (!isCancelAreaHoveredRef.current && dragXRef.current > -100) {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            handleSendMessage(undefined, base64Audio);
          };
        }
        stream.getTracks().forEach(track => track.stop());
        setDragX(0);
        dragXRef.current = 0;
        setIsCancelAreaHovered(false);
        isCancelAreaHoveredRef.current = false;
        setMediaRecorder(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Mikrofonga ruxsat berilmadi yoki xatolik yuz berdi.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecordedAudio = () => {
    setRecordedAudio(null);
    setRecordingDuration(0);
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
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setStagedFile(file);
        const previewUrl = URL.createObjectURL(file);
        if (type === 'image') {
          setStagedImage(previewUrl);
          setStagedVideo(null);
        } else {
          setStagedVideo(previewUrl);
          setStagedImage(null);
        }
      }
      document.body.removeChild(input);
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

  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const startVideoMessage = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Brauzeringiz video yozishni qo'llab-quvvatlamaydi.");
        return;
      }

      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: cameraFacing }, 
        audio: true 
      });
      setVideoStream(stream);
      setIsVideoRecording(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        safePlayVideo(videoPreviewRef.current);
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
        ? 'video/webm;codecs=vp8,opus' 
        : (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '');
      
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        if (!isCancelAreaHoveredRef.current && dragXRef.current > -100) {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            handleSendMessage(undefined, undefined, undefined, undefined, reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
        stream.getTracks().forEach(t => t.stop());
        setDragX(0);
        dragXRef.current = 0;
        setIsCancelAreaHovered(false);
        isCancelAreaHoveredRef.current = false;
        setMediaRecorder(null);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Video access denied:", err);
      toast.error("Kameraga ruxsat berilmadi yoki xatolik yuz berdi.");
    }
  };

  const stopVideoMessage = () => {
    if (mediaRecorder && isVideoRecording) {
      mediaRecorder.stop();
      setIsVideoRecording(false);
      setVideoStream(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const toggleCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    if (isVideoRecording && videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newFacing }, 
        audio: true 
      });
      setVideoStream(newStream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = newStream;
        safePlayVideo(videoPreviewRef.current);
      }
    }
  };

  const t = translations[language];
  React.useEffect(() => {
    if (initialChatSellerId && subView === 'chats') {
      // Find seller in computed chatSellers (which includes history and subscriptions)
      let seller = chatSellers.find(s => s.id === initialChatSellerId);
      
      if (!seller) {
        // Fallback to subscribedSellers if chatSellers doesn't have it yet
        seller = subscribedSellers.find(s => s.id === initialChatSellerId);
      }

      if (!seller) {
        // Create a temporary seller object
        seller = {
          id: initialChatSellerId,
          name: initialChatProduct ? initialChatProduct.seller.name : `Sotuvchi ${initialChatSellerId.substring(0, 4)}`,
          logo: initialChatProduct ? initialChatProduct.seller.logo : '',
          followers: 0,
          isVerified: false,
          hasStory: false,
          categories: []
        };
      }

      if (seller) {
        if (activeChatSeller?.id !== seller.id) {
          setActiveChatSeller(seller);
        }

        // If it's a shared post, send it as a message once
        const sendKey = `${seller.id}-${initialChatProduct?.id}`;
        if (initialChatProduct && !sentPosts.has(sendKey)) {
          // Immediately mark as sent to prevent double triggers
          setSentPosts(prev => new Set(prev).add(sendKey));
          handleSendMessage(undefined, undefined, undefined, undefined, undefined, undefined, initialChatProduct, seller.id);
        }
      }
    } else if (!initialChatSellerId) {
      setActiveChatSeller(null);
    }
  }, [initialChatSellerId, subView, subscribedSellers, initialChatProduct, activeChatSeller?.id, chatSellers]);

  const languages: { code: Language; name: string }[] = [
    { code: 'uz', name: "O'zbek (Lotin)" },
    { code: 'uz-cyrl', name: "Ўзбек (Кирилл)" },
    { code: 'ru', name: "Русский" },
    { code: 'en', name: "English" },
  ];

  const handleSendMessage = async (text?: string, audio?: string, image?: string, video?: string, videoMessage?: string, location?: {lat: number, lng: number}, post?: PostData, targetSellerId?: string) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    
    const messageText = text || newMessage;
    
    const prohibitedPattern = /🌈|🏳️‍🌈|🏳️‍⚧️|lgbt|gay|lesbian|homo/i;
    if (prohibitedPattern.test(messageText)) {
      toast.error("Ushbu xabarda taqiqlangan so'zlar yoki belgilar mavjud.");
      isSendingRef.current = false;
      return;
    }

    const audioData = audio || recordedAudio;
    const locationData = location || stagedLocation;
    
    const sellerId = targetSellerId || activeChatSeller?.id;
    if (!sellerId || !user) {
      isSendingRef.current = false;
      return;
    }

    if (!messageText.trim() && !audioData && !stagedFile && !image && !video && !videoMessage && !locationData && !post) {
      isSendingRef.current = false;
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = image || null;
      let finalVideoUrl = video || null;

      if (stagedFile) {
        if (stagedImage) {
          try {
            finalImageUrl = await uploadImageToImgBB(stagedFile);
          } catch (error) {
            console.error("ImgBB upload error:", error);
          }
        } else if (stagedVideo) {
          const fileExt = stagedFile.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const storageRef = ref(storage, `chat_media/${user.uid}/${fileName}`);
          
          await uploadBytes(storageRef, stagedFile);
          finalVideoUrl = await getDownloadURL(storageRef);
        }
      }

      let finalAudioUrl = null;

      // If it's a video message (base64 from recording), upload it properly
      if (videoMessage && videoMessage.startsWith('data:')) {
        try {
          const res = await fetch(videoMessage);
          const blob = await res.blob();
          const fileName = `vmsg_${Date.now()}.webm`;
          const storageRef = ref(storage, `chat_media/${user.uid}/${fileName}`);
          await uploadBytes(storageRef, blob);
          videoMessage = await getDownloadURL(storageRef);
        } catch (err) {
          console.error("Video message upload error:", err);
        }
      }

      if (audioData && audioData.startsWith('data:')) {
        try {
          const res = await fetch(audioData);
          const blob = await res.blob();
          const fileName = `audio_${Date.now()}.webm`;
          const storageRef = ref(storage, `chat_media/${user.uid}/${fileName}`);
          await uploadBytes(storageRef, blob);
          finalAudioUrl = await getDownloadURL(storageRef);
        } catch (err) {
          console.error("Audio upload error:", err);
        }
      } else if (audioData) {
        finalAudioUrl = audioData;
      }

      const chatId = [user.uid, sellerId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      
      // Ensure chat document exists
      await setDoc(chatRef, {
        id: chatId,
        participants: [user.uid, sellerId],
        lastMessage: messageText || "Media xabar",
        lastSender: user.uid,
        readBy: [user.uid],
        updatedAt: serverTimestamp()
      }, { merge: true });

      let finalType = 'text';
      let mediaUrl = undefined;
      
      if (post) {
        finalType = 'post';
      } else if (locationData) {
        finalType = 'location';
      } else if (videoMessage) {
        finalType = 'videoMessage';
        mediaUrl = videoMessage;
      } else if (finalVideoUrl) {
        finalType = 'video';
        mediaUrl = finalVideoUrl;
      } else if (finalImageUrl) {
        finalType = 'image';
        mediaUrl = finalImageUrl;
      } else if (finalAudioUrl) {
        finalType = 'voice';
        mediaUrl = finalAudioUrl;
      }

      const msgData: any = {
        chatId: chatId,
        senderUid: user.uid,
        text: (finalAudioUrl || finalImageUrl || finalVideoUrl || videoMessage || locationData || post) ? (text || "") : messageText,
        
        // Profile.tsx compat
        audio: finalAudioUrl,
        image: finalImageUrl,
        video: finalVideoUrl,
        videoMessage: videoMessage,
        location: locationData,
        post: post,
        
        // ShopWorkspace.tsx compat
        type: finalType,
        mediaUrl: mediaUrl,

        timestamp: serverTimestamp(),
        replyTo: replyingTo?.id
      };

      // Firestore doesn't support undefined values, so we delete them
      Object.keys(msgData).forEach(key => msgData[key] === undefined && delete msgData[key]);

      await addDoc(collection(db, `chats/${chatId}/messages`), msgData);
      
      setNewMessage('');
      setRecordedAudio(null);
      setRecordingDuration(0);
      setReplyingTo(null);
      setStagedImage(null);
      setStagedVideo(null);
      setStagedLocation(null);
      setStagedFile(null);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Xabar yuborishda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
      isSendingRef.current = false;
    }
  };

  const getLastMessagePreview = (sellerId: string) => {
    const messages = chatMessages[sellerId];
    if (!messages || messages.length === 0) return "Oxirgi xabar yo'q";
    const last = messages[messages.length - 1];
    
    if (last.text) return last.text;
    if (last.audio) return "🎤 Ovozli xabar";
    if (last.image) return "📷 Rasm";
    if (last.video || last.videoMessage) return "🎥 Video xabar";
    if (last.location) return "📍 Joylashuv";
    if (last.post) return "🛍 Mahsulot";
    return "Xabar";
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!activeChatSeller) return;
    setChatMessages(prev => ({
      ...prev,
      [activeChatSeller.id]: prev[activeChatSeller.id].map(msg => 
        msg.id === messageId 
        ? { ...msg, reactions: [...(msg.reactions || []), emoji].slice(-3) } 
        : msg
      )
    }));
    setSelectedMessageId(null);
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
      setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
    };

    audio.play();
  };

  const handleDeleteMessage = (sellerId: string, messageId: string) => {
    setChatMessages(prev => ({
      ...prev,
      [sellerId]: prev[sellerId].filter(m => m.id !== messageId)
    }));
  };

  const renderMain = () => {
    if (!user) {
      return (
        <div className="flex flex-col h-full p-4">
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-20">
            <AnimatePresence mode="wait">
              {!showEmailForm ? (
                <motion.div
                  key="login-options"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full max-w-sm"
                >
                  <div className="w-24 h-24 bg-accent-blue/10 rounded-full flex items-center justify-center text-accent-blue mx-auto mb-6">
                    <UserIcon size={48} />
                  </div>
                  <h2 className="text-2xl font-black text-text-primary mb-2">Xush kelibsiz!</h2>
                  <p className="text-sm text-text-primary/60 mb-8">
                    Barcha imkoniyatlardan foydalanish uchun tizimga kiring.
                  </p>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onLogin}
                    className="w-full py-4 bg-white text-text-primary border border-gray-200 rounded-2xl font-black uppercase tracking-widest text-sm shadow-sm flex items-center justify-center gap-3 mb-4"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google orqali kirish
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEmailForm(true)}
                    className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-accent-blue/20 flex items-center justify-center gap-3 mb-4"
                  >
                    <Mail size={20} />
                    Email va Parol
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="email-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100"
                >
                  <button 
                    onClick={() => setShowEmailForm(false)}
                    className="absolute top-6 left-6 p-2 text-gray-400 hover:text-accent-blue transition-colors"
                  >
                    <ArrowLeft size={24} />
                  </button>

                  <h2 className="text-2xl font-black text-text-primary mb-2 mt-4">
                    {isRegistering ? "Ro'yxatdan o'tish" : "Kirish"}
                  </h2>
                  <p className="text-sm text-text-primary/60 mb-8">
                    {isRegistering ? "Ma'lumotlaringizni kiriting" : "Email va parolingizni kiriting"}
                  </p>

                  <div className="space-y-4">
                    {isRegistering && (
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Ismingiz"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent-blue/20 transition-all"
                        />
                      </div>
                    )}

                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        placeholder="Email manzilingiz"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent-blue/20 transition-all"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Parol"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent-blue/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {!isRegistering && (
                      <button
                        onClick={() => onResetPassword?.(email)}
                        className="text-xs text-accent-blue font-bold hover:underline block ml-auto"
                      >
                        Parolni unutdingizmi?
                      </button>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      disabled={authLoading}
                      onClick={async () => {
                        if (!email || !password) {
                          toast.error("Barcha maydonlarni to'ldiring");
                          return;
                        }
                        setAuthLoading(true);
                        try {
                          await onEmailLogin?.(email, password, isRegistering ? name : undefined);
                        } catch (error: any) {
                          console.error("Login Error Details:", error.code, error.message);
                          
                          switch (error.code) {
                            case 'auth/email-already-in-use':
                              toast.error("Bu email bilan allaqachon ro'yxatdan o'tilgan. Iltimos, kiring.");
                              break;
                            case 'auth/invalid-email':
                              toast.error("Email manzili noto'g'ri formatda.");
                              break;
                            case 'auth/user-disabled':
                              toast.error("Ushbu foydalanuvchi akkaunti bloklangan.");
                              break;
                            case 'auth/user-not-found':
                              toast.error("Bunday email bilan foydalanuvchi topilmadi. Ro'yxatdan o'ting.");
                              break;
                            case 'auth/wrong-password':
                            case 'auth/invalid-credential':
                              toast.error("Email yoki parol noto'g'ri. Iltimos, qaytadan tekshiring.");
                              break;
                            case 'auth/weak-password':
                              toast.error("Parol juda zaif. Kamida 6 ta belgi bo'lishi kerak.");
                              break;
                            case 'auth/too-many-requests':
                              toast.error("Juda ko'p urinish bo'ldi. Xavfsizlik yuzasidan birozdan keyin qayta urinib ko'ring.");
                              break;
                            case 'auth/network-request-failed':
                              toast.error("Internet aloqasi yo'q yoki juda zaif. Tarmoqni tekshiring.");
                              break;
                            case 'auth/popup-closed-by-user':
                              toast.error("Kirish oynasi yopildi. Qayta urinib ko'ring.");
                              break;
                            default:
                              toast.error("Xatolik: " + (error.message || "Noma'lum muammo yuz berdi"));
                          }
                        } finally {
                          setAuthLoading(false);
                        }
                      }}
                      className="w-full py-4 bg-accent-blue text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-accent-blue/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {authLoading ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : (
                        isRegistering ? "Ro'yxatdan o'tish" : "Kirish"
                      )}
                    </motion.button>

                    <button
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="w-full text-sm text-text-primary/60 font-medium py-2"
                    >
                      {isRegistering ? (
                        <>Akkauntingiz bormi? <span className="text-accent-blue font-bold">Kiring</span></>
                      ) : (
                        <>Akkauntingiz yo'qmi? <span className="text-accent-blue font-bold">Ochish</span></>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Smart App Download Banner */}
          {!isStandalone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-white rounded-[2.5rem] p-6 shadow-2xl shadow-accent-blue/10 border border-border-primary/50 flex flex-col items-center gap-6 mt-8 mb-6 overflow-hidden relative shrink-0"
            >
              {/* Background embellishments */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col items-center justify-center relative z-10 w-full">
                <Logo width={120} height={120} showText={true} animated={false} />
                <span className="text-[12px] uppercase font-black text-accent-blue tracking-[0.2em] leading-tight text-center mt-2 bg-accent-blue/10 px-4 py-1.5 rounded-full">
                  Ilova sifatida yuklash
                </span>
                {downloadCount > 0 && (
                  <span className="text-xs font-bold text-gray-400 mt-3 flex items-center gap-1">
                    <Users size={14} className="text-accent-blue" />
                    {downloadCount.toLocaleString()}+ marta yuklab olingan
                  </span>
                )}
              </div>
              
              <button
                onClick={async () => {
                  try {
                    const statsRef = doc(db, 'stats', 'appTracker');
                    const statsDoc = await getDoc(statsRef);
                    if (statsDoc.exists()) {
                      await updateDoc(statsRef, { downloads: increment(1) });
                    } else {
                      await setDoc(statsRef, { downloads: 1 });
                    }
                  } catch (e) {
                     console.error('Failed to increment download count', e);
                  }
                  const promptShown = await installApp();
                  if (!promptShown) {
                    setShowInAppGuideModal(true);
                  }
                }}
                className="w-full relative z-10 px-6 py-5 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-accent-blue/30 active:scale-95 transition-all flex items-center justify-center gap-3 hover:shadow-2xl hover:-translate-y-1"
              >
                <Download size={24} strokeWidth={2.5} />
                O'rnatish
              </button>
            </motion.div>
          )}

          {/* Modal for App Guide */}
          <AnimatePresence>
            {showInAppGuideModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden relative"
                >
                  <button 
                    onClick={() => setShowInAppGuideModal(false)}
                    className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors z-10"
                  >
                    <X size={20} />
                  </button>
                  <div className="p-2">
                    <InAppBrowserGuide />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 p-4">
        {/* Glassmorphic Identity Card */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="relative p-6 rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl group"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#8ec5fc] to-[#e0c3fc] z-0" />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-white/20 rounded-full blur-[80px] z-0" 
          />
          
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/40 p-1 shadow-inner">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-accent-blue to-accent-light flex items-center justify-center text-white shadow-lg">
                      {user.photoURL ? (
                        <img src={user.photoURL || undefined} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon size={40} />
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{user.displayName || 'Foydalanuvchi'}</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">
                      {user.role === 'seller' ? 'SOTUVCHI' : t.alpha_member}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">{t.id_status}</p>
                <p className="text-xs font-black text-white bg-white/10 px-3 py-1 rounded-lg border border-white/20">{t.verified}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={() => setSubView('subscriptions')}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center cursor-pointer"
              >
                <p className="text-[10px] font-black text-white/60 uppercase tracking-tighter mb-1">{t.subscriptions}</p>
                <p className="text-sm font-black text-white">{subscribedSellers.length}</p>
              </motion.div>
              <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={() => setSubView('saved')}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center cursor-pointer"
              >
                <p className="text-[10px] font-black text-white/60 uppercase tracking-tighter mb-1">{t.saved}</p>
                <p className="text-sm font-black text-white">{savedPosts.length}</p>
              </motion.div>
              <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={() => setSubView('chats')}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center cursor-pointer"
              >
                <p className="text-[10px] font-black text-white/60 uppercase tracking-tighter mb-1">{t.chats}</p>
                <p className="text-sm font-black text-white">{Object.keys(chatMessages).length}</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Smart App Download Banner */}
        {!isStandalone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white rounded-[2.5rem] p-6 shadow-2xl shadow-accent-blue/10 border border-border-primary/50 flex flex-col items-center gap-6 mt-2 overflow-hidden relative"
          >
            {/* Background embellishments */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center justify-center relative z-10 w-full">
              <Logo width={120} height={120} showText={true} animated={false} />
              <span className="text-[12px] uppercase font-black text-accent-blue tracking-[0.2em] leading-tight text-center mt-2 bg-accent-blue/10 px-4 py-1.5 rounded-full">
                Ilova sifatida yuklash
              </span>
              {downloadCount > 0 && (
                <span className="text-xs font-bold text-gray-400 mt-3 flex items-center gap-1">
                  <Users size={14} className="text-accent-blue" />
                  {downloadCount.toLocaleString()}+ marta yuklab olingan
                </span>
              )}
            </div>
            
            <button
              onClick={async () => {
                try {
                  const statsRef = doc(db, 'stats', 'appTracker');
                  const statsDoc = await getDoc(statsRef);
                  if (statsDoc.exists()) {
                    await updateDoc(statsRef, { downloads: increment(1) });
                  } else {
                    await setDoc(statsRef, { downloads: 1 });
                  }
                } catch (e) {
                   console.error('Failed to increment download count', e);
                }
                const promptShown = await installApp();
                if (!promptShown) {
                  setShowInAppGuideModal(true);
                }
              }}
              className="w-full relative z-10 px-6 py-5 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-accent-blue/30 active:scale-95 transition-all flex items-center justify-center gap-3 hover:shadow-2xl hover:-translate-y-1"
            >
              <Download size={24} strokeWidth={2.5} />
              O'rnatish
            </button>
          </motion.div>
        )}

      {/* New Interactive Sections */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('style-dna')}
          className="p-5 bg-gradient-to-br from-purple-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-500 mb-3 group-hover:scale-110 transition-transform">
            <Dna size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t['style-dna']}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">{t.style_analysis}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('closet')}
          className="p-5 bg-gradient-to-br from-emerald-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
            <Bookmark size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.closet}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">{t.virtual_wardrobe}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('comments')}
          className="p-5 bg-gradient-to-br from-rose-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-500 mb-3 group-hover:scale-110 transition-transform">
            <MessageSquare size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.my_comments}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">{t.comments}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('liked-posts')}
          className="p-5 bg-gradient-to-br from-pink-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-500 mb-3 group-hover:scale-110 transition-transform">
            <Heart size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.liked_posts}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">100 {t.view_all}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('recently-viewed')}
          className="p-5 bg-gradient-to-br from-emerald-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
            <RefreshCw size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.recently_viewed}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">100 {t.view_all}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('language')}
          className="p-5 bg-gradient-to-br from-blue-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
            <Globe size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.language}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">
            {languages.find(l => l.code === language)?.name}
          </p>
        </motion.button>
      </div>

      {/* Admin Panel Button */}
      {user.role === 'admin' && (
        <motion.button
          onClick={onOpenAdminDashboard}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden group w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-yellow-500/30 mb-2"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            <ShieldCheck size={20} />
            Admin Panel
          </span>
          <motion.div 
            animate={{ 
              x: ['-100%', '200%'],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
          />
        </motion.button>
      )}

      {/* Open Shop Button */}
      {!hasShop && (
        <motion.button
          onClick={onOpenShop}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden group w-full py-5 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-accent-blue/30"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            <ShoppingBag size={20} />
            Do'kon ochish
          </span>
          {/* Shimmer Effect */}
          <motion.div 
            animate={{ 
              x: ['-100%', '200%'],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
          />
        </motion.button>
      )}



      {/* Menu Items removed as they are now integrated into other sections */}

      {/* Interests Section */}
      <div className="p-6 bg-text-primary/5 rounded-[2rem] border border-border-primary">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black text-text-primary/40 uppercase tracking-widest">{t.interests}</h3>
          <div className="flex items-center gap-1 text-[10px] font-black text-accent-blue uppercase tracking-widest">
            <Zap size={12} className="fill-current" />
            <span>Faollik</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10', label: t.trendsetter, percent: 65 },
            { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10', label: t.lover, percent: 82 },
            { icon: Zap, color: 'text-accent-blue', bg: 'bg-accent-blue/10', label: t.fast, percent: 45 },
            { icon: LayoutGrid, color: 'text-purple-500', bg: 'bg-purple-500/10', label: t.collector, percent: 91 },
          ].sort((a, b) => b.percent - a.percent).map((interest, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg ${interest.bg} flex items-center justify-center ${interest.color}`}>
                  <interest.icon size={18} />
                </div>
                <span className="text-[10px] font-black text-text-primary">{interest.percent}%</span>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-text-primary/60 uppercase tracking-tight truncate">{interest.label}</p>
                <div className="h-1 w-full bg-text-primary/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${interest.percent}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full ${interest.color.replace('text-', 'bg-')}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="flex items-center gap-3 p-4 text-red-500 font-bold mt-4 hover:bg-red-500/10 rounded-xl transition-colors w-full"
      >
        <LogOut size={20} strokeWidth={1.5} />
        <span>{t.logout}</span>
      </button>
    </div>
  );
};

  const renderLanguage = () => (
    <div className="flex flex-col gap-2 p-4">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => {
            setLanguage(lang.code);
            setSubView('main');
          }}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            language === lang.code 
              ? 'bg-accent-blue/10 border-accent-blue/50 text-accent-blue' 
              : 'bg-text-primary/5 border-transparent text-text-primary/80 hover:bg-text-primary/10'
          }`}
        >
          <span className="font-medium">{lang.name}</span>
          {language === lang.code && <div className="w-2 h-2 rounded-full bg-gradient-to-br from-accent-blue to-accent-light shadow-[0_0_8px_rgba(0,85,255,0.5)]" />}
        </button>
      ))}
    </div>
  );

  const renderSubscriptions = () => (
    <div className="flex flex-col gap-3 p-4">
      {subscribedSellers.length > 0 ? (
        subscribedSellers.map((seller) => (
          <div key={seller.id} className="flex items-center justify-between p-4 bg-text-primary/5 rounded-xl border border-text-primary/10">
            <div className="flex items-center gap-3">
              <img src={seller.logo || undefined} alt={seller.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              <div>
                <p className="font-bold text-sm">{seller.name}</p>
                <p className="text-[10px] text-text-primary/40 uppercase tracking-widest">{(seller.followers || 0).toLocaleString()} obunachi</p>
              </div>
            </div>
            <button 
              onClick={() => onToggleSubscribe(seller.id)}
              className="px-4 py-1.5 bg-gradient-to-r from-accent-blue/10 to-accent-light/10 text-accent-blue text-xs font-bold rounded-lg border border-accent-blue/20 active:scale-95 transition-transform"
            >
              Obunadasiz
            </button>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-text-primary/20">
          <Users size={48} strokeWidth={1} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">{t.no_subscriptions}</p>
        </div>
      )}
    </div>
  );

  const renderChats = () => {
    if (activeChatSeller) {
      const messages = chatMessages[activeChatSeller.id] || [];
      const quickActions = [
        { id: 'price', label: "Narxi qancha?", text: "Assalomu alaykum! Ushbu mahsulotning narxi qancha?" },
        { id: 'delivery', label: "Dostavka bormi?", text: "Dostavka xizmati bormi va qancha vaqtda yetib keladi?" },
        { id: 'size', label: "Razmer bormi?", text: "Ushbu mahsulotning boshqa razmerlari bormi?" },
        { id: 'location', label: "Manzil?", text: "Do'koningiz manzilini tashlab bera olasizmi?" },
      ];

      return (
        <div className="flex flex-col h-full relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="w-full h-full bg-gradient-to-br from-[#fdfbfb] to-[#ebedee] dark:from-neutral-900 dark:to-neutral-800">
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-4 scrollbar-hide relative z-10 min-h-0">
            {activeChatSeller && (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center border-b border-border-primary/5 mb-6">
                <div className="relative mb-4">
                  <div className="p-1 bg-gradient-to-br from-accent-blue/40 to-accent-light/40 rounded-full">
                    <div className="relative w-24 h-24 overflow-hidden rounded-full border-4 border-bg-primary bg-accent-blue/10 shadow-2xl">
                      <div className="absolute inset-0 flex items-center justify-center text-accent-blue font-black text-3xl">
                        {activeChatSeller.name.charAt(0).toUpperCase()}
                      </div>
                      {activeChatSeller.logo && (
                        <img 
                          src={activeChatSeller.logo} 
                          alt={activeChatSeller.name} 
                          className="absolute inset-0 w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-bg-primary shadow-lg" />
                </div>
                <h3 className="text-xl font-black text-text-primary tracking-tight mb-1 uppercase italic">{activeChatSeller.name}</h3>
                <p className="text-xs font-black text-accent-blue uppercase tracking-[0.2em] mb-4">Official Shop</p>
                <p className="text-xs text-text-primary/60 max-w-[240px] leading-relaxed mb-6">
                  {activeChatSeller.description || "Bu do'kon o'zining ajoyib mahsulotlari bilan mashhur. Xarid qilish uchun suhbatni boshlang."}
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onOpenShopProfile(activeChatSeller.id)}
                    className="px-6 py-2 bg-text-primary text-bg-primary text-[10px] font-black uppercase tracking-widest rounded-full active:scale-95 transition-all shadow-lg"
                  >
                    Profilni ko'rish
                  </button>
                </div>
              </div>
            )}
            
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-text-primary/40 pt-20">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4">
                  <MessageSquare size={40} className="text-accent-blue opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-1">Xabarlar yo'q</h3>
                <p className="text-xs font-medium text-center px-8">
                  Sotuvchiga savol bering yoki mahsulot haqida batafsil ma'lumot so'rang.
                </p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isNextSame = i < messages.length - 1 && messages[i + 1].isMe === msg.isMe;
              const isPrevSame = i > 0 && messages[i - 1].isMe === msg.isMe;
              
              const bubbleRadius = msg.isMe 
                ? `rounded-l-3xl ${isNextSame ? 'rounded-br-3xl' : 'rounded-br-sm'} ${isPrevSame ? 'rounded-tr-md' : 'rounded-tr-3xl'}`
                : `rounded-r-3xl ${isNextSame ? 'rounded-bl-3xl' : 'rounded-bl-sm'} ${isPrevSame ? 'rounded-tl-md' : 'rounded-tl-3xl'}`;
              
              const bubbleStyle = msg.isMe
                ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl text-text-primary border border-white/40 dark:border-white/10 shadow-lg shadow-black/5';

              const hasMediaOnly = (msg.post || msg.image || msg.video || msg.videoMessage || msg.location) && !msg.text;
              const paddingStyle = hasMediaOnly ? 'p-1' : 'px-4 py-2.5';

              return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} group ${isNextSame ? 'mb-0.5' : 'mb-3'}`}
              >
                <div 
                  onClick={() => setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                  className={`relative max-w-[85%] ${paddingStyle} text-[14px] transition-all cursor-pointer active:scale-[0.98] ${bubbleRadius} ${bubbleStyle}`}
                >
                  {msg.replyTo && (
                    <div className="mb-2 p-2 bg-black/5 rounded-lg border-l-4 border-accent-blue text-[11px] opacity-70 truncate">
                      {messages.find(m => m.id === msg.replyTo)?.text || "Ovozli xabar"}
                    </div>
                  )}

                  {msg.image && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-black/5">
                      <img src={msg.image || undefined} alt="" className="w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {(msg.video || msg.videoMessage) && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-black/5 bg-black w-full max-w-[200px]">
                      <video 
                        src={`${msg.video || msg.videoMessage}#t=0.1`} 
                        controls 
                        playsInline
                        preload="metadata" 
                        className="w-full h-auto" 
                      />
                    </div>
                  )}

                  {msg.location && (
                    <div className="mb-2 w-48 h-32 rounded-xl overflow-hidden border border-black/5 bg-neutral-100 flex flex-col items-center justify-center gap-2">
                      <MapPinIcon size={24} className="text-red-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/60">Joylashuv</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://www.google.com/maps?q=${msg.location!.lat},${msg.location!.lng}`, '_blank');
                        }}
                        className="text-[10px] text-accent-blue font-bold underline"
                      >
                        Xaritada ko'rish
                      </button>
                    </div>
                  )}

                  {msg.post && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPostDetails(msg.post!);
                      }}
                      className={`${msg.text ? 'mb-2' : ''} w-56 max-w-full bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-border-primary shadow-sm cursor-pointer active:scale-95 transition-transform`}
                    >
                      {isVideoUrl(msg.post.mediaUrls[0] || '') ? (
                        <div className="relative w-full aspect-[9/16] bg-black flex items-center justify-center group">
                          <video 
                            src={`${msg.post.mediaUrls[0]}#t=0.1`} 
                            preload="metadata" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center opacity-90 group-hover:bg-black/10 transition-colors">
                            <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
                              <Play size={24} className="text-white ml-1" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img src={msg.post.mediaUrls[0] || undefined} alt="" className="w-full aspect-[9/16] object-cover" referrerPolicy="no-referrer" />
                      )}
                      <div className="p-2.5 pointer-events-none bg-white dark:bg-neutral-800">
                        <p className="text-xs font-black truncate text-text-primary">{msg.post.outfitName}</p>
                        <p className="text-[10px] font-black text-accent-blue mt-0.5">{msg.post.price}</p>
                      </div>
                    </div>
                  )}

                  {msg.audio ? (
                    <div className="flex items-center gap-2 min-w-[200px] py-1">
                      <button 
                        onClick={() => handlePlayAudio(msg.id, msg.audio!)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90 ${msg.isMe ? 'bg-white text-accent-blue' : 'bg-accent-blue text-white'}`}
                      >
                        {playingMessageId === msg.id ? (
                          <Pause size={20} fill="currentColor" />
                        ) : (
                          <Play size={20} fill="currentColor" className="ml-1" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 h-6 relative">
                          {[...Array(20)].map((_, j) => {
                            const barProgress = (j / 20) * 100;
                            const isPlayed = (audioProgress[msg.id] || 0) > barProgress;
                            return (
                              <div 
                                key={j} 
                                className={`w-[2px] rounded-full transition-colors duration-200 ${
                                  isPlayed 
                                  ? (msg.isMe ? 'bg-white' : 'bg-accent-blue') 
                                  : (msg.isMe ? 'bg-white/30' : 'bg-accent-blue/30')
                                }`}
                                style={{ height: `${20 + Math.random() * 80}%` }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-[10px] font-medium ${msg.isMe ? 'text-white/80' : 'text-accent-blue'}`}>Ovozli xabar</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="leading-tight break-all whitespace-pre-wrap">
                      {msg.text}
                      <span className="inline-block w-12" />
                    </p>
                  )}
                  
                  <div className="absolute bottom-1.5 right-3 flex items-center gap-1">
                    <p className={`text-[9px] font-medium ${msg.isMe ? 'text-white/90' : 'text-text-primary/50'}`}>{msg.time}</p>
                    {msg.isMe && (
                      <div className="text-white/90">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`absolute -bottom-3 ${msg.isMe ? 'right-0' : 'left-0'} flex gap-0.5 bg-white dark:bg-neutral-800 rounded-full px-1.5 py-0.5 shadow-md border border-border-primary scale-75 origin-top`}>
                      {msg.reactions.map((r, idx) => <span key={idx}>{r}</span>)}
                    </div>
                  )}

                  {/* Message Actions Menu */}
                  <AnimatePresence>
                    {selectedMessageId === msg.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className={`absolute z-50 ${i < 2 ? 'top-full mt-2' : 'bottom-full mb-2'} ${msg.isMe ? 'right-0' : 'left-0'} bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-border-primary overflow-hidden min-w-[120px]`}
                      >
                        <div className="flex p-2 gap-2 border-b border-border-primary overflow-x-auto scrollbar-hide">
                          {['❤️', '👍', '🔥', '😂', '😮', '😢'].map(emoji => (
                            <button 
                              key={emoji} 
                              onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setSelectedMessageId(null); }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold hover:bg-text-primary/5 text-text-primary"
                        >
                          <Reply size={16} className="text-accent-blue" /> Javob berish
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteMessage(activeChatSeller.id, msg.id); }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold hover:bg-red-500/5 text-red-500"
                        >
                          <Trash2 size={16} /> O'chirish
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          {messages.length === 0 && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide relative z-10">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSendMessage(action.text)}
                  className="whitespace-nowrap px-4 py-2 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border border-border-primary rounded-full text-[11px] font-bold text-text-primary hover:bg-accent-blue hover:text-white hover:border-accent-blue transition-all active:scale-95 shadow-sm"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <div 
            className="p-2 border-t border-border-primary bg-bg-primary/95 backdrop-blur-xl relative z-20"
            style={{ paddingBottom: (subView === 'chats' && activeChatSeller) ? 'calc(6rem + env(safe-area-inset-bottom))' : 'calc(8px + env(safe-area-inset-bottom))' }}
          >
            <AnimatePresence>
              {(stagedImage || stagedVideo || stagedLocation) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-2 bg-text-primary/5 rounded-xl p-2 flex items-center gap-3 border border-border-primary"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/10 flex items-center justify-center">
                    {stagedImage && <img src={stagedImage} className="w-full h-full object-cover" />}
                    {stagedVideo && <Video size={18} className="text-accent-blue" />}
                    {stagedLocation && <MapPinIcon size={18} className="text-accent-blue" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-accent-blue uppercase tracking-widest">
                      {stagedImage ? "Rasm tayyor" : stagedVideo ? "Video tayyor" : "Joylashuv tayyor"}
                    </p>
                    <p className="text-[11px] text-text-primary/60 truncate">
                      {stagedImage ? "Yuborish uchun bosing" : stagedVideo ? "Yuborish uchun bosing" : `${stagedLocation?.lat.toFixed(4)}, ${stagedLocation?.lng.toFixed(4)}`}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setStagedImage(null); setStagedVideo(null); setStagedLocation(null); setStagedFile(null); }} 
                    className="p-1 text-text-primary/40 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {replyingTo && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-2 bg-text-primary/5 rounded-xl p-2 flex items-center gap-3 border-l-4 border-accent-blue"
                >
                  <Reply size={14} className="text-accent-blue" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-accent-blue uppercase tracking-widest">Javob qaytarish</p>
                    <p className="text-[11px] text-text-primary/60 truncate">{replyingTo.text || "Ovozli xabar"}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 text-text-primary/40">
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {(isRecording || isVideoRecording) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute inset-0 bg-bg-primary z-50 flex items-center px-4 gap-3 rounded-2xl border border-border-primary shadow-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <motion.div 
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-accent-blue shadow-[0_0_8px_rgba(0,122,255,0.5)]'}`}
                    />
                    <span className="text-sm font-mono font-bold text-text-primary tabular-nums">
                      {formatDuration(recordingDuration)}
                    </span>
                    
                    <div className="flex-1 flex justify-center overflow-hidden">
                      <motion.div 
                        animate={{ x: dragX }}
                        className="flex items-center gap-2 text-text-primary/40 whitespace-nowrap"
                      >
                        <ChevronLeft size={14} className="animate-pulse" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">
                          {dragX < -100 ? "Qo'yib yuboring bekor qilish uchun" : "Bekor qilish uchun suring"}
                        </span>
                      </motion.div>
                    </div>
                  </div>

                  {isVideoRecording && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      className="absolute bottom-20 left-1/2 -translate-x-1/2 aspect-square w-48 rounded-2xl overflow-hidden bg-black border-2 border-accent-blue shadow-2xl z-[60]"
                    >
                      <video ref={videoPreviewRef} muted playsInline className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                        className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md text-white rounded-full active:scale-90 transition-transform"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </motion.div>
                  )}

                  <div className={`p-2 rounded-full transition-all duration-300 ${dragX < -100 ? 'bg-red-500 text-white scale-125 shadow-lg' : 'text-text-primary/20'}`}>
                    <Trash size={20} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2 bg-text-primary/5 border border-border-primary rounded-[1.5rem] p-1 backdrop-blur-xl relative min-h-[44px]">
              <div className="flex items-center mb-0.5 ml-0.5">
                <button 
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className={`w-8 h-8 flex items-center justify-center transition-all duration-300 rounded-full ${showAttachmentMenu ? 'rotate-45 bg-accent-blue text-white shadow-md' : 'text-text-primary/40 hover:bg-text-primary/10 active:scale-95'}`}
                >
                  <Plus size={20} />
                </button>
                
                <AnimatePresence>
                  {showAttachmentMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -10 }}
                      className="flex items-center gap-1 ml-1"
                    >
                      <button 
                        onClick={() => {
                          handleFileUpload('image');
                          setShowAttachmentMenu(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-accent-blue text-white rounded-full shadow-md active:scale-90 transition-all"
                      >
                        <ImageIcon size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          handleLocationShare();
                          setShowAttachmentMenu(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-accent-blue text-white rounded-full shadow-md active:scale-90 transition-all"
                      >
                        <MapPinIcon size={16} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <textarea 
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                    e.currentTarget.style.height = 'auto';
                  }
                }}
                placeholder="Xabar yozing..."
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-[15px] px-2 min-w-[80px] resize-none max-h-32 py-2 scrollbar-hide self-center"
                disabled={isRecording || isVideoRecording}
              />
              
              <div className="flex items-center mb-0.5 mr-0.5">
                {(!newMessage.trim() && !stagedImage && !stagedVideo && !stagedLocation) ? (
                  <div className="flex items-center gap-0.5">
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
                      className={`w-8 h-8 flex items-center justify-center transition-all active:scale-110 relative touch-none rounded-full text-accent-blue hover:bg-accent-blue/5 ${isVideoRecording ? 'bg-accent-blue text-white shadow-xl scale-125' : ''}`}
                    >
                      <Video size={18} />
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
                      className={`w-8 h-8 flex items-center justify-center transition-all active:scale-110 relative touch-none rounded-full text-accent-blue hover:bg-accent-blue/5 ${isRecording ? 'bg-accent-blue text-white shadow-xl scale-125' : ''}`}
                    >
                      <Mic size={18} />
                    </button>
                  </div>
                ) : (
                  <motion.button 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => handleSendMessage()}
                    disabled={isUploading}
                    className={`w-8 h-8 flex items-center justify-center rounded-full shadow-md transition-all ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-accent-blue text-white active:scale-95'}`}
                  >
                    {isUploading ? (
                      <RefreshCw size={14} className="animate-spin text-white" />
                    ) : (
                      <Send size={14} className="ml-0.5" />
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }


    return (
      <div className="flex flex-col gap-1 p-2">
        {chatSellers.map((seller) => (
          <button
            key={seller.id}
            onClick={() => {
              onOpenChat(seller.id);
            }}
            className="flex items-center gap-3 p-3 hover:bg-text-primary/5 rounded-xl transition-colors text-left"
          >
            <div className="relative">
              <img src={seller.logo || undefined} alt={seller.name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-bg-primary rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="font-bold text-sm truncate">{seller.name}</p>
                <p className="text-[10px] text-text-primary/40">
                  {chatMessages[seller.id]?.slice(-1)[0]?.time || '12:45'}
                </p>
              </div>
              <p className="text-xs text-text-primary/60 truncate">
                {getLastMessagePreview(seller.id)}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderSaved = () => (
    <div className="grid grid-cols-3 gap-1">
      {savedPosts.length > 0 ? (
        savedPosts.map((post, index) => (
          <div 
            key={post.id} 
            onClick={() => onOpenPostDetails(savedPosts, index)}
            className="aspect-square relative group overflow-hidden cursor-pointer"
          >
            <img 
              src={post.mediaUrls[0] || undefined} 
              alt={post.outfitName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
              <div className="flex items-center gap-1 text-white text-[10px] font-bold">
                <Bookmark size={12} fill="white" />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-3 flex flex-col items-center justify-center py-20 text-text-primary/20">
          <Bookmark size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">{t.no_saved}</p>
        </div>
      )}
    </div>
  );

  const renderStyleDNA = () => (
    <div className="p-6 space-y-8">
      {/* Style Profile Header */}
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-accent-blue rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
          <Dna size={40} />
        </div>
        <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Sizning Uslub DNKngiz</h2>
        <p className="text-xs text-text-primary/60 font-medium">AI tomonidan tahlil qilingan shaxsiy moda profilingiz</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary">
          <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-4">Uslub Yo'nalishlari</h3>
          <div className="space-y-4">
            {[
              { label: t.minimalism, value: 65, color: 'bg-accent-blue' },
              { label: t.streetwear, value: 25, color: 'bg-purple-500' },
              { label: t.classic, value: 10, color: 'bg-emerald-500' }
            ].map((style) => (
              <div key={style.label} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                  <span className="text-text-primary">{style.label}</span>
                  <span className="text-accent-blue">{style.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-text-primary/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${style.value}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full ${style.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary">
            <p className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-3">Ranglar Palitrasi</p>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-black border border-white/10" />
              <div className="w-6 h-6 rounded-full bg-white border border-black/10" />
              <div className="w-6 h-6 rounded-full bg-slate-500" />
              <div className="w-6 h-6 rounded-full bg-neutral-300" />
            </div>
          </div>
          <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary">
            <p className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-2">Vibe</p>
            <p className="text-xs font-black text-text-primary uppercase tracking-tight">Modern Tech</p>
            <p className="text-[9px] font-bold text-accent-blue uppercase mt-1">Urban Casual</p>
          </div>
        </div>

        <div className="p-5 bg-accent-blue/5 rounded-[2rem] border border-accent-blue/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-accent-blue/20 rounded-xl flex items-center justify-center text-accent-blue">
              <Sparkles size={18} />
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-tight">AI Tavsiyasi</h4>
          </div>
          <p className="text-[11px] text-text-primary/70 leading-relaxed font-medium">
            Sizning tanlovlaringizga ko'ra, sizga **monoxrom** ranglar va **minimalistik** bichimlar ko'proq mos keladi. Keyingi xaridingizda teksturali matolarga e'tibor bering.
          </p>
        </div>
      </div>
    </div>
  );

  const renderCloset = () => {
    const clothingCategories = ['Erkaklar kiyinishi', 'Ayollar kiyinishi', 'Kiyim'];
    
    const filteredPosts = savedPosts.filter(post => {
      const isClothing = post.seller?.categories?.some(cat => clothingCategories.includes(cat)) || false;
      if (activeClosetCategory === 'clothing') return isClothing;
      if (activeClosetCategory === 'other') return !isClothing;
      return true;
    });

    return (
      <div className="p-4 flex flex-col gap-4">
        {/* Category Tabs */}
        <div className="flex gap-2 p-1 bg-text-primary/5 rounded-2xl border border-border-primary overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: language === 'uz' ? 'Hammasi' : 'Все' },
            { id: 'clothing', label: language === 'uz' ? 'Kiyimlar' : 'Одежда' },
            { id: 'other', label: language === 'uz' ? 'Boshqalar' : 'Другие' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveClosetCategory(tab.id as any)}
              className={`flex-1 min-w-[80px] py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                activeClosetCategory === tab.id 
                  ? 'bg-white dark:bg-neutral-800 text-accent-blue shadow-sm' 
                  : 'text-text-primary/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post, index) => (
              <div 
                key={post.id} 
                onClick={() => onOpenPostDetails(filteredPosts, index)}
                className="aspect-square relative group overflow-hidden cursor-pointer rounded-xl"
              >
                {post.mediaType === 'video' || (post.mediaUrls[0] && post.mediaUrls[0].includes('.mp4')) ? (
                  <video 
                    src={`${post.mediaUrls[0]}#t=0.1`}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                ) : (
                  <img 
                    src={post.mediaUrls[0] || undefined} 
                    alt={post.outfitName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <Bookmark size={16} fill="white" className="text-white" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center py-24 text-text-primary/40">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-blue/10 to-blue-500/10 flex items-center justify-center mb-4">
                <Bookmark size={32} className="text-accent-blue opacity-50" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">Saqlanganlar yo'q</h3>
              <p className="text-xs font-medium text-center px-8">
                {activeClosetCategory === 'clothing' 
                  ? (language === 'uz' ? "Siz hali hech qanday kiyim saqlamadingiz." : "Вы еще не сохранили одежду.")
                  : (language === 'uz' ? "Garderobingiz bo'sh." : "Ваш гардероб пуст.")}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderComments = () => (
    <div className="p-4 space-y-4">
      {/* Empty state if no comments */}
      <div className="flex flex-col items-center justify-center py-20 text-text-primary/20">
        <MessageSquare size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-medium">{t.no_comments || "Sharhlar yo'q"}</p>
      </div>
    </div>
  );

  const renderLikedPosts = () => (
    <div className="p-4 grid grid-cols-2 gap-3">
      {likedPosts.slice(0, 100).map((post, index) => (
        <motion.div
          key={post.id}
          whileTap={{ scale: 0.98 }}
          onClick={() => onOpenPostDetails(likedPosts, index)}
          className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 group bg-white/5 backdrop-blur-md cursor-pointer"
        >
          <img 
            src={post.mediaUrls[0] || undefined} 
            alt={post.outfitName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-500/80 backdrop-blur-md flex items-center justify-center text-white">
            <Heart size={16} className="fill-current" />
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{post.outfitName}</p>
          </div>
        </motion.div>
      ))}
      {likedPosts.length === 0 && (
        <div className="col-span-2 flex flex-col items-center justify-center py-20 text-text-primary/20">
          <Heart size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Hali hech qanday post yoqtirilmagan</p>
        </div>
      )}
    </div>
  );

  const renderRecentlyViewed = () => (
    <div className="p-4 grid grid-cols-2 gap-3">
      {recentlyViewedPosts.slice(0, 100).map((post, index) => (
        <motion.div
          key={post.id}
          whileTap={{ scale: 0.98 }}
          onClick={() => onOpenPostDetails(recentlyViewedPosts, index)}
          className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 group bg-white/5 backdrop-blur-md cursor-pointer"
        >
          <img 
            src={post.mediaUrls[0] || undefined} 
            alt={post.outfitName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500/80 backdrop-blur-md flex items-center justify-center text-white">
            <RefreshCw size={16} />
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{post.outfitName}</p>
          </div>
        </motion.div>
      ))}
      {recentlyViewedPosts.length === 0 && (
        <div className="col-span-2 flex flex-col items-center justify-center py-20 text-text-primary/20">
          <RefreshCw size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Hali hech qanday post ko'rilmagan</p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col bg-bg-primary overflow-hidden ${(subView === 'chats' && activeChatSeller) ? 'fixed inset-0 z-[9999]' : 'h-full'}`}>
      {/* Sub-view Header */}
      <div className={`flex items-center gap-4 px-4 py-4 border-b border-border-primary bg-header-bg ${(subView === 'chats' && activeChatSeller) ? 'pt-[calc(1rem+env(safe-area-inset-top))]' : ''}`}>
        {subView !== 'main' && (
          <button 
            onClick={handleBack}
            className="p-1 hover:bg-text-primary/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {subView === 'chats' && activeChatSeller ? (
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => onOpenShopProfile(activeChatSeller.id)}
          >
            <div className="relative w-10 h-10 overflow-hidden rounded-full border border-border-primary bg-accent-blue/10">
              <div className="absolute inset-0 flex items-center justify-center text-accent-blue font-black text-lg">
                {activeChatSeller.name.charAt(0).toUpperCase()}
              </div>
              {activeChatSeller.logo && (
                <img 
                  src={activeChatSeller.logo} 
                  alt={activeChatSeller.name} 
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-header-bg rounded-full z-10" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black truncate leading-tight uppercase tracking-tighter italic">
                {activeChatSeller.name}
              </h1>
              <p className="text-[10px] font-black text-accent-blue uppercase tracking-widest leading-none">
                Online
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <h1 className="text-lg font-black italic tracking-tighter uppercase">
              {subView === 'main' ? t.profile : subView === 'comments' ? t.my_comments : subView === 'liked-posts' ? t.liked_posts : subView === 'recently-viewed' ? t.recently_viewed : t[subView as keyof typeof t] as string}
            </h1>
            {subView === 'main' && onOpenShopSelector && (
              <button 
                onClick={onOpenShopSelector}
                className="flex flex-col items-center gap-0.5 p-1.5 bg-gradient-to-br from-[#8ec5fc]/80 to-[#e0c3fc]/80 backdrop-blur-md border border-white/40 rounded-2xl hover:opacity-90 transition-all active:scale-95 shadow-lg group min-w-[70px]"
              >
                <div className="flex -space-x-3 items-center">
                  {userShops.slice(0, 3).map((shop, i) => (
                    <motion.div
                      key={shop.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative"
                      style={{ zIndex: 10 - i }}
                    >
                      <img 
                        src={shop.logo || undefined} 
                        className="w-5 h-5 rounded-full border border-bg-primary object-cover shadow-sm group-hover:scale-110 transition-transform" 
                        alt={shop.name}
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  ))}
                  {userShops.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-accent-blue/20 backdrop-blur-md border border-bg-primary flex items-center justify-center text-[7px] font-black text-white z-0">
                      +{userShops.length - 3}
                    </div>
                  )}
                  {userShops.length === 0 && (
                    <div className="w-5 h-5 rounded-full bg-accent-blue/20 backdrop-blur-md border border-bg-primary flex items-center justify-center text-white">
                      <Zap size={10} />
                    </div>
                  )}
                </div>
                <span className="text-[7px] font-black text-white uppercase tracking-widest">Do'konlar</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`flex-1 ${subView === 'chats' && activeChatSeller ? 'overflow-hidden' : 'overflow-y-auto'} scrollbar-hide ${(subView === 'chats' && activeChatSeller) ? 'pb-0' : (isKeyboardOpen ? 'pb-2' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]')}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={subView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className={subView === 'chats' && activeChatSeller ? 'h-full flex flex-col' : ''}
          >
            {subView === 'main' && renderMain()}
            {subView === 'language' && renderLanguage()}
            {subView === 'subscriptions' && renderSubscriptions()}
            {subView === 'chats' && renderChats()}
            {subView === 'saved' && renderSaved()}
            {subView === 'style-dna' && renderStyleDNA()}
            {subView === 'closet' && renderCloset()}
            {subView === 'comments' && renderComments()}
            {subView === 'liked-posts' && renderLikedPosts()}
            {subView === 'recently-viewed' && renderRecentlyViewed()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* In-App Browser Guide Modal */}
      <AnimatePresence>
        {showInAppGuideModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden relative"
            >
              <button 
                onClick={() => setShowInAppGuideModal(false)}
                className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors z-10"
              >
                <X size={20} />
              </button>
              <div className="p-2">
                <InAppBrowserGuide />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface MenuButtonProps {
  icon: any;
  label: string;
  value?: string;
  onClick: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ icon: Icon, label, value, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center justify-between p-4 bg-text-primary/5 hover:bg-text-primary/10 rounded-xl border border-text-primary/10 transition-all active:scale-[0.98]"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gradient-to-br from-accent-blue/10 to-accent-light/10 rounded-lg text-accent-blue border border-accent-blue/20">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <span className="font-bold text-sm">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-text-primary/40 font-medium">{value}</span>}
      <ChevronRight size={16} strokeWidth={1.5} className="text-text-primary/20" />
    </div>
  </button>
);

export default Profile;
