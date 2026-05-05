import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  getDoc,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { toast } from 'sonner';

export const useShopChat = (shopId: string, userId: string) => {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  
  // Audio/Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [dragX, setDragX] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for chats
  useEffect(() => {
    if (!shopId) return;

    const q = query(
      collection(db, 'chats'),
      where('shopId', '==', shopId),
      orderBy('lastInteraction', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatData);
    });

    return () => unsubscribe();
  }, [shopId]);

  // Listen for messages in active chat
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `chats/${activeChatId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgData);
      
      // Mark as read if last message is from customer
      const chatRef = doc(db, 'chats', activeChatId);
      updateDoc(chatRef, { status: 'read' }).catch(() => {});
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const handleSendMessage = async (type: string, payload?: any) => {
    if (!activeChatId || (!messageInput.trim() && type === 'text' && !payload)) return;

    try {
      const chatRef = doc(db, 'chats', activeChatId);
      const msgData: any = {
        sender: 'shop',
        type,
        timestamp: serverTimestamp(),
        ...payload
      };

      if (type === 'text') msgData.text = messageInput;
      if (replyingTo) msgData.replyTo = replyingTo.id;

      await addDoc(collection(db, `chats/${activeChatId}/messages`), msgData);
      
      await updateDoc(chatRef, {
        lastMessage: type === 'text' ? messageInput : `[${type}]`,
        lastInteraction: serverTimestamp(),
        status: 'replied'
      });

      setMessageInput('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Xabar yuborishda xatolik');
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (!activeChatId) return;
    setIsUploading(true);
    try {
      let url = "";
      try {
        const formData = new FormData();
        formData.append('files', file, file.name);

        const r2Result = await fetch('/api/upload-to-r2', { method: 'POST', body: formData }).then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "Upload failed");
          return data;
        });

        url = r2Result.urls[0].url;
      } catch (err: any) {
        if (err?.message && err.message.includes("R2 sozlanmagan")) {
          toast.error("R2 sozlanmagan!");
          setIsUploading(false);
          return;
        }
        
        toast.info("R2 orqali yuklash muvaffaqiyatsiz tugadi. Firebase yordamida urunib ko'rilmoqda...");
        const storageRef = ref(storage, `chats/${activeChatId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        url = await getDownloadURL(storageRef);
      }
      
      await handleSendMessage(type, { mediaUrl: url });
    } catch (error: any) {
      toast.error("Fayl yuklashda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
    }
  };

  return {
    chats,
    activeChatId,
    setActiveChatId,
    messages,
    isUploading,
    messageInput,
    setMessageInput,
    replyingTo,
    setReplyingTo,
    isRecording,
    isVideoRecording,
    recordingDuration,
    dragX,
    setDragX,
    messagesEndRef,
    videoPreviewRef,
    handleSendMessage,
    handleFileUpload,
    setIsRecording,
    setIsVideoRecording,
    setRecordingDuration,
    mediaRecorderRef,
    recordingTimerRef
  };
};
