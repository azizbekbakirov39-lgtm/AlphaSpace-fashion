import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFile } from '../services/uploadService';
import { 
  db, 
  storage,
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
} from '../firebase';
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
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayAudio = (messageId: string, url?: string) => {
    if (!url) {
      toast.error("Ovozli xabar topilmadi");
      return;
    }

    if (playingMessageId === messageId && audioRef.current) {
      audioRef.current.pause();
      setPlayingMessageId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; // Clear source to avoid memory leaks
      audioRef.current = null;
    }
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      setAudioProgress(prev => ({ ...prev, [messageId]: progress }));
    };

    audio.onended = () => {
      setPlayingMessageId(null);
      setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        setPlayingMessageId(messageId);
      }).catch(e => {
        if (e.name !== 'AbortError') {
          console.error('Audio play error:', e);
          toast.error("Ovozli xabarni o'qib bo'lmadi");
          setPlayingMessageId(null);
          setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
        }
      });
    } else {
      setPlayingMessageId(messageId);
    }
  };

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
        lastMessage: type === 'text' ? messageInput : (type === 'voice' ? 'Ovozli xabar' : `[${type}]`),
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
        const blob = new Blob(chunks, { type: mimeType });
        setIsUploading(true);
        try {
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: mimeType });
          const url = await uploadFile(file, `chats/${activeChatId}/audio`);
          await handleSendMessage('voice', { mediaUrl: url, duration: recordingDuration });
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
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Mikrofonga ruxsat berilmadi");
    }
  };

  const startVideoMessage = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Brauzeringiz video yozishni qo'llab-quvvatlamaydi.");
        return;
      }

      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { facingMode: 'user' }
      });
      
      setVideoStream(stream);
      setIsVideoRecording(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(e => console.error("Auto-play blocked:", e));
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
        ? 'video/webm;codecs=vp8,opus' 
        : (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '');
        
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        setIsUploading(true);
        try {
          const file = new File([blob], `vmsg_${Date.now()}.webm`, { type: 'video/webm' });
          const url = await uploadFile(file, `chats/${activeChatId}/videos`);
          await handleSendMessage('videoMessage', { mediaUrl: url, duration: recordingDuration });
        } catch (error) {
          console.error("Video message upload error:", error);
          toast.error("Video xabarni yuborib bo'lmadi");
        } finally {
          setIsUploading(false);
          stream.getTracks().forEach(track => track.stop());
          setVideoStream(null);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Video access denied:", err);
      toast.error("Kamera va mikrofonga ruxsat berilmadi");
    }
  };

  const stopRecording = (cancelled: boolean = false) => {
    if (!mediaRecorderRef.current) return;
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
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

  const stopVideoMessage = () => {
    if (mediaRecorderRef.current && isVideoRecording) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsVideoRecording(false);
      setVideoStream(null);
      mediaRecorderRef.current.stop();
    }
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
    startRecording,
    stopRecording,
    startVideoMessage,
    stopVideoMessage,
    setIsRecording,
    setIsVideoRecording,
    setRecordingDuration,
    mediaRecorderRef,
    recordingTimerRef,
    playingMessageId,
    audioProgress,
    handlePlayAudio
  };
};
