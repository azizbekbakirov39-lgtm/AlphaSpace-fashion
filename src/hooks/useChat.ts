import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment,
  storage,
  ref,
  uploadBytes,
  getDownloadURL
} from '../firebase';
import { ChatMessage } from '../components/profile/types';
import { PostData, Seller, User } from '../types';
import { toast } from 'sonner';
import { uploadImageToImgBB } from '../services/imgbb';

export const useChat = (user: User | null, subscribedSellers: Seller[], initialChatSellerId?: string | null) => {
  const [chatMessages, setChatMessages] = useState<{[key: string]: ChatMessage[]}>({});
  const messageUnsubs = useRef<{ [chatId: string]: () => void }>({});
  const [activeChatSeller, setActiveChatSeller] = useState<Seller | null>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [stagedVideo, setStagedVideo] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedLocation, setStagedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const isSendingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    
    const unsubChats = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(chatDoc => {
        const chatId = chatDoc.id;
        const sellerId = chatId.replace(user.uid, '').replace('_', '');
        
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

  const handleSendMessage = async (text?: string, audio?: string, image?: string, video?: string, videoMessage?: string, location?: {lat: number, lng: number}, post?: PostData, targetSellerId?: string) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    
    const messageText = text || newMessage;
    const sellerId = targetSellerId || activeChatSeller?.id;
    if (!sellerId || !user) {
      isSendingRef.current = false;
      return;
    }

    const prohibitedPattern = /🌈|🏳️‍🌈|🏳️‍⚧️|lgbt|gay|lesbian|homo/i;
    if (prohibitedPattern.test(messageText)) {
      toast.error("Ushbu xabarda taqiqlangan so'zlar yoki belgilar mavjud.");
      isSendingRef.current = false;
      return;
    }

    if (!messageText.trim() && !audio && !recordedAudio && !stagedFile && !image && !video && !videoMessage && !location && !stagedLocation && !post) {
      isSendingRef.current = false;
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = image || null;
      let finalVideoUrl = video || null;

      if (stagedFile) {
        if (stagedImage) {
          finalImageUrl = await uploadImageToImgBB(stagedFile);
        } else if (stagedVideo) {
          const fileName = `${Date.now()}_video`;
          const storageRef = ref(storage, `chat_media/${user.uid}/${fileName}`);
          await uploadBytes(storageRef, stagedFile);
          finalVideoUrl = await getDownloadURL(storageRef);
        }
      }

      let finalAudioUrl = audio || recordedAudio;
      if (finalAudioUrl?.startsWith('data:')) {
        const res = await fetch(finalAudioUrl);
        const blob = await res.blob();
        const fileName = `audio_${Date.now()}.webm`;
        const storageRef = ref(storage, `chat_media/${user.uid}/${fileName}`);
        await uploadBytes(storageRef, blob);
        finalAudioUrl = await getDownloadURL(storageRef);
      }

      if (videoMessage?.startsWith('data:')) {
        const res = await fetch(videoMessage);
        const blob = await res.blob();
        const fileName = `vmsg_${Date.now()}.webm`;
        const storageRef = ref(storage, `chat_media/${user.uid}/${fileName}`);
        await uploadBytes(storageRef, blob);
        videoMessage = await getDownloadURL(storageRef);
      }

      const chatId = [user.uid, sellerId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      
      await setDoc(chatRef, {
        id: chatId,
        participants: Array.from(new Set([user.uid, sellerId])),
        lastMessage: messageText || "Media xabar",
        lastSender: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await addDoc(collection(db, `chats/${chatId}/messages`), {
        text: messageText,
        senderUid: user.uid,
        timestamp: serverTimestamp(),
        image: finalImageUrl,
        video: finalVideoUrl,
        videoMessage,
        audio: finalAudioUrl,
        location: location || stagedLocation,
        post: post || null,
        replyTo: replyingTo?.id || null
      });

      setNewMessage('');
      setStagedImage(null);
      setStagedVideo(null);
      setStagedFile(null);
      setStagedLocation(null);
      setRecordedAudio(null);
      setReplyingTo(null);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Xabar yuborishda xatolik yuz berdi.");
    } finally {
      setIsUploading(false);
      isSendingRef.current = false;
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!user || !activeChatSeller) return;
    const chatId = [user.uid, activeChatSeller.id].sort().join('_');
    const msgRef = doc(db, `chats/${chatId}/messages`, msgId);
    try {
      const msgDoc = await getDoc(msgRef);
      if (msgDoc.exists()) {
        const existingReactions = msgDoc.data().reactions || [];
        if (existingReactions.includes(emoji)) {
          await updateDoc(msgRef, {
            reactions: existingReactions.filter((r: string) => r !== emoji)
          });
        } else {
          await updateDoc(msgRef, {
            reactions: Array.from(new Set([...existingReactions, emoji]))
          });
        }
      }
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };

  const handleDeleteMessage = async (sellerId: string, msgId: string) => {
    if (!user) return;
    const chatId = [user.uid, sellerId].sort().join('_');
    const msgRef = doc(db, `chats/${chatId}/messages`, msgId);
    try {
      // In a real app we might soft-delete or check ownership
      await updateDoc(msgRef, {
        deleted: true,
        text: "Xabar o'chirildi",
        image: null, video: null, audio: null, location: null, post: null
      });
      toast.success("Xabar o'chirildi.");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Xabarni o'chirishda xatolik.");
    }
  };

  const getLastMessagePreview = useCallback((sellerId: string) => {
    const msgs = chatMessages[sellerId] || [];
    if (msgs.length === 0) return "Suhbatni boshlash...";
    const last = msgs[msgs.length - 1];
    if (last.image) return "🖼 Rasm";
    if (last.audio) return "🎤 Ovozli xabar";
    if (last.video || last.videoMessage) return "🎥 Video xabar";
    if (last.location) return "📍 Joylashuv";
    if (last.post) return `🛒 Mahsulot: ${last.post.outfitName}`;
    return last.text || "...";
  }, [chatMessages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setRecordedAudio(base64Audio);
          handleSendMessage(undefined, base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Mikrofonga ruxsat berilmadi.");
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!shouldSend) {
          mediaRecorderRef.current.onstop = null;
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const chatSellers = useMemo(() => {
    const sellersMap = new Map<string, Seller>();
    subscribedSellers.forEach(s => sellersMap.set(s.id, s));
    
    Object.keys(chatMessages).forEach(sellerId => {
      if (!sellersMap.has(sellerId)) {
        const firstMessage = chatMessages[sellerId][0];
        if (firstMessage && firstMessage.post) {
          sellersMap.set(sellerId, {
            ...firstMessage.post.seller,
            isSubscribed: false
          });
        }
      }
    });

    if (activeChatSeller && !sellersMap.has(activeChatSeller.id)) {
        sellersMap.set(activeChatSeller.id, activeChatSeller);
    }
    
    return Array.from(sellersMap.values()).sort((a, b) => {
      const getTime = (msgs: any[]) => {
        if (msgs.length === 0) return 0;
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.timestamp?.seconds) return lastMsg.timestamp.seconds;
        return 0;
      };
      return getTime(chatMessages[b.id] || []) - getTime(chatMessages[a.id] || []);
    });
  }, [subscribedSellers, chatMessages, activeChatSeller]);

  return {
    chatMessages,
    chatSellers,
    activeChatSeller,
    setActiveChatSeller,
    getLastMessagePreview,
    newMessage,
    setNewMessage,
    isUploading,
    stagedImage,
    setStagedImage,
    stagedVideo,
    setStagedVideo,
    stagedFile,
    setStagedFile,
    stagedLocation,
    setStagedLocation,
    replyingTo,
    setReplyingTo,
    isRecording,
    isVideoRecording,
    setIsVideoRecording,
    recordingDuration,
    handleSendMessage,
    handleReaction,
    handleDeleteMessage,
    startRecording,
    stopRecording
  };
};

