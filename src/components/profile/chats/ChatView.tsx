import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Play, 
  MapPin as MapPinIcon, 
  Pause, 
  Reply, 
  Trash2, 
  Video, 
  X, 
  Plus, 
  Image as ImageIcon, 
  Mic, 
  Send,
  RefreshCw,
  ChevronLeft
} from 'lucide-react';
import { Seller, PostData } from '../../../types';
import { ChatMessage } from '../types';
import { ImageWithFallback } from '../../ImageWithFallback';
import { isVideoUrl, getProxiedUrl, getPostThumbnailUrl } from '../../../utils/mediaUtils';

interface ChatViewProps {
  activeChatSeller: Seller;
  messages: ChatMessage[];
  onOpenShopProfile: (id: string) => void;
  onOpenPostDetails: (posts: PostData[], index: number) => void;
  selectedMessageId: string | null;
  setSelectedMessageId: (id: string | null) => void;
  handleReaction: (msgId: string, emoji: string) => void;
  setReplyingTo: (msg: ChatMessage | null) => void;
  handleDeleteMessage: (sellerId: string, msgId: string) => void;
  handlePlayAudio: (id: string, url: string) => void;
  playingMessageId: string | null;
  audioProgress: {[key: string]: number};
  newMessage: string;
  setNewMessage: (val: string) => void;
  handleSendMessage: (text?: string) => void;
  isUploading: boolean;
  stagedImage: string | null;
  stagedVideo: string | null;
  stagedLocation: { lat: number, lng: number } | null;
  setStagedImage: (val: string | null) => void;
  setStagedVideo: (val: string | null) => void;
  setStagedLocation: (val: any) => void;
  replyingTo: ChatMessage | null;
  isRecording: boolean;
  isVideoRecording: boolean;
  recordingDuration: number;
  formatDuration: (d: number) => string;
  dragX: number;
  showAttachmentMenu: boolean;
  setShowAttachmentMenu: (val: boolean) => void;
  handleFileUpload: (type: 'image' | 'video') => void;
  handleLocationShare: () => void;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  toggleCamera: () => void;
  startVideoMessage: () => void;
  stopVideoMessage: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  dragStartRef: React.MutableRefObject<number | null>;
  setRecordType: (val: 'voice' | 'video' | null) => void;
  setDragX: (val: number) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  t: any;
}

export const ChatView: React.FC<ChatViewProps> = (props) => {
  const {
    activeChatSeller,
    messages,
    onOpenShopProfile,
    onOpenPostDetails,
    selectedMessageId,
    setSelectedMessageId,
    handleReaction,
    setReplyingTo,
    handleDeleteMessage,
    handlePlayAudio,
    playingMessageId,
    audioProgress,
    newMessage,
    setNewMessage,
    handleSendMessage,
    isUploading,
    stagedImage,
    stagedVideo,
    stagedLocation,
    setStagedImage,
    setStagedVideo,
    setStagedLocation,
    replyingTo,
    isRecording,
    isVideoRecording,
    recordingDuration,
    formatDuration,
    dragX,
    showAttachmentMenu,
    setShowAttachmentMenu,
    handleFileUpload,
    handleLocationShare,
    videoPreviewRef,
    toggleCamera,
    startVideoMessage,
    stopVideoMessage,
    startRecording,
    stopRecording,
    dragStartRef,
    setRecordType,
    setDragX,
    messagesEndRef,
    t
  } = props;

  const quickActions = [
    { id: 'price', label: "Narxi qancha?", text: "Assalomu alaykum! Ushbu mahsulotning narxi qancha?" },
    { id: 'delivery', label: "Dostavka bormi?", text: "Dostavka xizmati bormi va qancha vaqtda yetib keladi?" },
    { id: 'size', label: "Razmer bormi?", text: "Ushbu mahsulotning boshqa razmerlari bormi?" },
    { id: 'location', label: "Manzil?", text: "Do'koningiz manzilini tashlab bera olasizmi?" },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-primary">
       <div className="flex items-center gap-4 px-4 py-4 border-b border-border-primary shrink-0">
          <button 
            onClick={() => handleSendMessage()} // This should actually be handled by Profile.tsx to go back
            className="p-2 -ml-2 text-text-primary/60 hover:text-text-primary active:scale-95 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
             <img src={activeChatSeller.logo || '/placeholder.png'} className="w-8 h-8 rounded-full" alt={activeChatSeller.name} />
             <div>
                <p className="text-sm font-black uppercase italic tracking-tighter">{activeChatSeller.name}</p>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</p>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
           {messages.map((msg, i) => (
             <div key={msg.id || i} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-3 ${msg.isMe ? 'bg-accent-blue text-white' : 'bg-text-primary/5 text-text-primary'}`}>
                   {msg.text && <p className="text-sm font-medium">{msg.text}</p>}
                   {msg.image && <img src={msg.image} alt="Media" className="rounded-xl mt-2 w-full" />}
                   {msg.video && <video src={msg.video} controls className="rounded-xl mt-2 w-full" />}
                   {msg.audio && (
                     <button 
                        onClick={() => handlePlayAudio(msg.id, msg.audio)}
                        className="flex items-center gap-2 mt-1"
                     >
                        {playingMessageId === msg.id ? <Pause size={18} /> : <Play size={18} />}
                        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden min-w-[100px]">
                            <div className="h-full bg-white transition-all" style={{ width: `${audioProgress[msg.id] || 0}%` }} />
                        </div>
                     </button>
                   )}
                   <p className="text-[9px] opacity-60 mt-1 text-right">{msg.time}</p>
                </div>
             </div>
           ))}
           <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border-primary bg-bg-primary/80 backdrop-blur-xl shrink-0">
           <div className="flex items-center gap-2">
              <input 
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                 placeholder="Xabar yozing..."
                 className="flex-1 bg-text-primary/5 border border-border-primary rounded-2xl px-4 py-3 text-sm font-medium outline-none"
              />
              <button 
                 onClick={() => handleSendMessage()}
                 className="p-3 bg-accent-blue text-white rounded-2xl active:scale-95 transition-all"
              >
                 <Send size={20} />
              </button>
           </div>
        </div>
    </div>
  );
};
