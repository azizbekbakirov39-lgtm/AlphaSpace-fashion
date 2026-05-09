import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  MessageSquare, 
  Users, 
  Trash2, 
  Download, 
  Maximize2, 
  Video, 
  MapPin, 
  Navigation,
  Play, 
  Pause, 
  Send, 
  Reply, 
  X, 
  Plus, 
  RefreshCw, 
  FlipHorizontal, 
  Trash, 
  Mic, 
  Pencil,
  Zap 
} from 'lucide-react';
import { Map, Placemark } from '@pbe/react-yandex-maps';
import { isVideoUrl, safePlayVideo, getProxiedUrl } from '../../utils/mediaUtils';
import { ImageWithFallback } from '../ImageWithFallback';
import { PostData } from '../../types';

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
  duration?: number;
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

interface ChatsTabProps {
  chats: Chat[];
  activeChatId: string | null;
  chatSearchQuery: string;
  setChatSearchQuery: (q: string) => void;
  handleOpenChat: (id: string) => void;
  handleCloseChat: () => void;
  handleDeleteChat: (id: string, e: React.MouseEvent) => void;
  setSelectedMessageId: (id: string | null) => void;
  selectedMessageId: string | null;
  messageInput: string;
  setMessageInput: (text: string) => void;
  handleSendMessage: (type: any, url?: string) => void;
  handleClearChat: () => void;
  isUploading: boolean;
  replyingTo: Message | null;
  setReplyingTo: (msg: Message | null) => void;
  editingMessage: Message | null;
  setEditingMessage: (msg: Message | null) => void;
  showAttachmentMenu: boolean;
  setShowAttachmentMenu: (show: boolean) => void;
  handleFileUpload: (type: 'image' | 'video') => void;
  handleLocationShare: () => void;
  stagedImage: string | null;
  setStagedImage: (s: string | null) => void;
  stagedVideo: string | null;
  setStagedVideo: (s: string | null) => void;
  stagedLocation: { lat: number, lng: number } | null;
  setStagedLocation: (l: { lat: number, lng: number } | null) => void;
  setStagedFile: (f: File | null) => void;
  playingMessageId: string | null;
  isAudioPlaying: boolean;
  playbackSpeed: number;
  togglePlaybackSpeed: (e: React.MouseEvent) => void;
  handlePlayAudio: (id: string, url: string, initialProgress?: number) => void;
  handleSeekAudio: (id: string, progress: number, audioData?: string) => void;
  audioProgress: { [key: string]: number };
  handleReaction: (id: string, emoji: string) => void;
  handleDeleteMessage: (id: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  videoPreviewRef: React.RefObject<HTMLVideoElement>;
  isFrontCamera: boolean;
  toggleCamera: () => void;
  isVideoRecording: boolean;
  isRecording: boolean;
  recordingDuration: number;
  dragX: number;
  formatDuration: (s: number) => string;
  startVideoMessage: () => void;
  stopVideoMessage: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  setDragX: (x: number) => void;
  dragStartRef: React.MutableRefObject<number | null>;
  onOpenReels?: (posts: PostData[], index: number) => void;
}

export const ChatsTab = ({
  chats,
  activeChatId,
  chatSearchQuery,
  setChatSearchQuery,
  handleOpenChat,
  handleCloseChat,
  handleDeleteChat,
  setSelectedMessageId,
  selectedMessageId,
  messageInput,
  setMessageInput,
  handleSendMessage,
  handleClearChat,
  isUploading,
  replyingTo,
  setReplyingTo,
  editingMessage,
  setEditingMessage,
  showAttachmentMenu,
  setShowAttachmentMenu,
  handleFileUpload,
  handleLocationShare,
  stagedImage,
  setStagedImage,
  stagedVideo,
  setStagedVideo,
  stagedLocation,
  setStagedLocation,
  setStagedFile,
  playingMessageId,
  isAudioPlaying,
  playbackSpeed,
  togglePlaybackSpeed,
  handlePlayAudio,
  handleSeekAudio,
  audioProgress,
  handleReaction,
  handleDeleteMessage,
  messagesEndRef,
  videoPreviewRef,
  isFrontCamera,
  toggleCamera,
  isVideoRecording,
  isRecording,
  recordingDuration,
  dragX,
  formatDuration,
  startVideoMessage,
  stopVideoMessage,
  startRecording,
  stopRecording,
  setDragX,
  dragStartRef,
  onOpenReels
}: ChatsTabProps) => {
  const activeChat = chats.find(c => c.id === activeChatId);
  const filteredChats = chats.filter(chat => 
    chat.customerName.toLowerCase().includes(chatSearchQuery.toLowerCase()) || 
    chat.lastMessage.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

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
            <div className="p-6 pb-2">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-4">Xabarlar</h2>
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
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-16 scrollbar-hide">
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
            className="absolute inset-0 z-[9999] flex flex-col bg-bg-primary overflow-hidden"
          >
            <div className="flex flex-col border-b border-border-primary bg-white/80 dark:bg-bg-primary/80 backdrop-blur-xl z-20 pt-[env(safe-area-inset-top)]">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <button onClick={handleCloseChat} className="w-10 h-10 rounded-xl bg-text-primary/5 flex items-center justify-center text-text-primary/60 active:scale-90 transition-all">
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
                      <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Online</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleClearChat}
                  className="p-2.5 hover:bg-red-500/10 text-red-500 rounded-xl transition-colors flex items-center gap-2 group shrink-0"
                  title="Tarixni tozalash"
                >
                  <Trash2 size={18} />
                  <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest leading-none">Tarixni tozalash</span>
                </button>
              </div>

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

            <div className="flex-1 overflow-y-auto p-4 pb-8 flex flex-col gap-4 scrollbar-hide bg-slate-50/50 dark:bg-transparent min-h-0">
              {activeChat?.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-primary/40 pt-20">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4">
                    <MessageSquare size={40} className="text-accent-blue opacity-50" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">Xabarlar yo'q</h3>
                  <p className="text-xs font-medium text-center px-8">Mijoz bilan suhbatni boshlang.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 bg-text-primary/5 rounded-full text-[9px] font-black uppercase tracking-widest text-text-primary/30 border border-text-primary/5">Bugun</span>
                  </div>
                  <AnimatePresence>
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
                        layout
                        key={msg.id}
                        exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                        className={`w-full flex flex-col cursor-pointer ${msg.sender === 'shop' ? 'items-end' : 'items-start'} ${isNextSame ? 'mb-0.5' : 'mb-3'}`}
                      >
                        <div className={`flex flex-col max-w-[85%] relative ${msg.sender === 'shop' ? 'items-end' : 'items-start'}`}>
                          {msg.replyTo && (
                            <div className={`mb-1 p-2 rounded-xl text-[10px] border-l-2 ${msg.sender === 'shop' ? 'bg-white/10 border-white/40' : 'bg-text-primary/5 border-accent-blue'} max-w-full truncate`}>
                              {activeChat.messages.find(m => m.id === msg.replyTo)?.text || "Media xabar"}
                            </div>
                          )}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className={`${paddingStyle} text-[14px] shadow-sm transition-all ${bubbleRadius} ${bubbleStyle}`}
                          >
                          {msg.text && <p className={`leading-relaxed whitespace-pre-wrap ${msg.type !== 'text' ? 'mb-2' : ''}`}>{msg.text}</p>}
                          {msg.type === 'image' && (
                            <div className="relative group">
                              <ImageWithFallback originalSrc={msg.mediaUrl || ''} className="rounded-xl max-w-full h-auto shadow-lg" alt="sent" referrerPolicy="no-referrer" />
                              <button className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Download size={14} /></button>
                            </div>
                          )}
                          {msg.type === 'video' && (
                            <div className="relative aspect-video bg-black rounded-xl flex items-center justify-center overflow-hidden shadow-lg min-w-[200px] group">
                              <video src={msg.mediaUrl ? `${getProxiedUrl(msg.mediaUrl, 0)}#t=0.1` : undefined} controls playsInline preload="metadata" className="w-full h-full object-cover" />
                            </div>
                          )}
                          {msg.type === 'videoMessage' && (
                            <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-accent-blue shadow-xl group">
                              <video 
                                src={msg.mediaUrl ? getProxiedUrl(msg.mediaUrl, 0) : undefined} 
                                className="w-full h-full object-cover scale-x-[-1]" 
                                loop muted playsInline
                                onMouseOver={(e) => safePlayVideo(e.currentTarget)}
                                onMouseOut={(e) => e.currentTarget.pause()}
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 size={24} className="text-white" /></div>
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 bg-accent-blue rounded-full text-white">
                                <Video size={10} /><span className="text-[8px] font-black uppercase tracking-widest">Video Xabar</span>
                              </div>
                            </div>
                          )}
                          {msg.type === 'location' && msg.location && (
                            <div className="w-48 h-32 rounded-xl overflow-hidden border border-text-primary/10 relative group text-black">
                              <Map state={{ center: [msg.location.lat, msg.location.lng], zoom: 15 }} width="100%" height="100%" options={{ suppressMapOpenBlock: true }}>
                                <Placemark geometry={[msg.location.lat, msg.location.lng]} />
                              </Map>
                              <div className="absolute inset-0 bg-transparent" />
                              <button className="absolute bottom-2 right-2 p-2 bg-white dark:bg-bg-primary rounded-lg shadow-lg text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity"><Navigation size={14} /></button>
                            </div>
                          )}
                          {msg.type === 'post' && msg.post && (
                            <div className={`${msg.text ? 'mb-2' : ''} w-56 max-w-full bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-text-primary/10 shadow-sm cursor-pointer`}
                              onClick={(e) => { e.stopPropagation(); if (msg.post) onOpenReels?.([msg.post], 0); }}
                            >
                              {isVideoUrl(msg.post.mediaUrls?.[0] || '') ? (
                                <div className="relative w-full aspect-[9/16] bg-black flex items-center justify-center group">
                                  <video src={`${getProxiedUrl(msg.post.mediaUrls[0], 0)}#t=0.1`} preload="metadata" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-90 group-hover:bg-black/10 transition-colors">
                                    <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center"><Play size={24} className="text-white ml-1" fill="currentColor" /></div>
                                  </div>
                                </div>
                              ) : (
                                <ImageWithFallback originalSrc={msg.post.mediaUrls?.[0] || ''} className="w-full aspect-[9/16] object-cover" alt="sent" referrerPolicy="no-referrer" />
                              )}
                              <div className="p-2.5 bg-white dark:bg-bg-primary">
                                <p className="text-xs font-black uppercase tracking-tight text-text-primary truncate">{msg.post.outfitName}</p>
                                <p className="text-[10px] font-black text-accent-blue mt-0.5">{msg.post.price}</p>
                              </div>
                            </div>
                          )}
                          {msg.type === 'voice' && (
                            <div className="flex items-center gap-3 min-w-[220px] relative mt-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayAudio(msg.id, msg.mediaUrl || (msg as any).audio || '');
                                }} 
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm ${msg.sender === 'shop' ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20'}`}
                              >
                                {playingMessageId === msg.id && isAudioPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                              </button>
                              
                              {playingMessageId === msg.id && (
                                <button 
                                  onClick={togglePlaybackSpeed}
                                  className={`absolute -top-4 left-0 px-2 py-0.5 rounded-full text-[9px] font-bold border shadow-sm transition-all active:scale-95 z-20 ${msg.sender === 'shop' ? 'bg-white text-accent-blue border-white/50' : 'bg-accent-blue text-white border-accent-blue/50'}`}
                                >
                                  {playbackSpeed}x
                                </button>
                              )}

                              <div className="flex-1 space-y-1 py-1">
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const progress = (x / rect.width) * 100;
                                    handleSeekAudio(msg.id, progress, msg.mediaUrl || (msg as any).audio);
                                  }}
                                  className={`h-8 w-full flex items-center justify-between gap-[2px] cursor-pointer group/seek`}
                                >
                                  {[...Array(32)].map((_, j) => {
                                    const barHeights = [8, 14, 10, 18, 6, 12, 16, 8, 20, 10, 14, 6, 12, 18, 10, 16, 8, 14, 10, 18, 6, 12, 16, 8, 20, 10, 14, 6, 12, 18, 10, 16];
                                    const barHeight = barHeights[j % barHeights.length];
                                    const barProgress = (j / 32) * 100;
                                    const isPlayed = (audioProgress[msg.id] || 0) > barProgress;
                                    const isPlayingThisMsg = playingMessageId === msg.id;

                                    return (
                                      <motion.div 
                                        key={j}
                                        animate={isPlayingThisMsg && isPlayed && isAudioPlaying ? { 
                                          height: [barHeight, barHeight * 1.5, barHeight],
                                        } : { height: barHeight }}
                                        transition={isPlayingThisMsg && isPlayed && isAudioPlaying ? { 
                                          repeat: Infinity, 
                                          duration: 0.8, 
                                          delay: j * 0.03 
                                        } : { duration: 0.2 }}
                                        className={`w-[2.5px] rounded-full transition-all duration-300 ${
                                          isPlayed 
                                            ? (msg.sender === 'shop' ? 'bg-white opacity-100' : 'bg-accent-blue opacity-100') 
                                            : (msg.sender === 'shop' ? 'bg-white opacity-25 group-hover/seek:opacity-50' : 'bg-accent-blue opacity-15 group-hover/seek:opacity-30')
                                        }`}
                                        style={{ height: barHeight }}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className={`text-[8px] font-bold uppercase tracking-widest ${msg.sender === 'shop' ? 'text-white/60' : 'text-text-primary/40'}`}>
                                    {playingMessageId === msg.id ? "Eshitilmoqda..." : "Ovozli xabar"}
                                  </span>
                                  {audioProgress[msg.id] > 0 && (
                                    <span className={`text-[8px] font-bold ${msg.sender === 'shop' ? 'text-white/80' : 'text-accent-blue'}`}>
                                      {Math.floor(audioProgress[msg.id])}%
                                    </span>
                                  )}
                                  {msg.duration && <span className={`text-[8px] font-bold ${msg.sender === 'shop' ? 'text-white/60' : 'text-text-primary/40'}`}>{formatDuration(msg.duration)}</span>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex gap-1 mt-1 ${msg.sender === 'shop' ? 'justify-end' : 'justify-start'}`}>
                            {msg.reactions.map((r, i) => (<span key={i} className="text-xs bg-white dark:bg-white/10 rounded-full px-1.5 py-0.5 shadow-sm border border-text-primary/5">{r}</span>))}
                          </div>
                        )}

                        <AnimatePresence>
                          {selectedMessageId === msg.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }} className={`absolute z-50 ${idx < 2 ? 'top-full mt-2' : 'bottom-full mb-2'} ${msg.sender === 'shop' ? 'right-0' : 'left-0'} bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-border-primary overflow-hidden min-w-[120px]`}>
                              <div className="flex p-2 gap-2 border-b border-border-primary overflow-x-auto scrollbar-hide">
                                {['❤️', '👍', '🔥', '😂', '😮', '😢'].map(emoji => (
                                  <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="text-lg hover:scale-125 transition-transform">{emoji}</button>
                                ))}
                              </div>
                              <div className="flex flex-col">
                                <button onClick={() => { setReplyingTo(msg); setSelectedMessageId(null); setEditingMessage(null); }} className="flex items-center gap-3 px-4 py-3 hover:bg-text-primary/5 text-xs font-bold text-text-primary transition-colors"><Send size={14} className="rotate-[-45deg]" />Javob berish</button>
                                {msg.sender === 'shop' && msg.type === 'text' && (
                                  <button 
                                    onClick={() => { 
                                      setEditingMessage(msg); 
                                      setMessageInput(msg.text || ''); 
                                      setSelectedMessageId(null); 
                                      setReplyingTo(null); 
                                    }} 
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-text-primary/5 text-xs font-bold text-text-primary transition-colors"
                                  >
                                    <Pencil size={14} />Tahrirlash
                                  </button>
                                )}
                                <button onClick={() => handleDeleteMessage(msg.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-xs font-bold text-red-500 transition-colors"><Trash2 size={14} />O'chirish</button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="flex items-center gap-1.5 mt-1.5 px-1">
                          <span className="text-[9px] text-text-primary/30 uppercase font-black tracking-tighter">{msg.timestamp}</span>
                          {msg.sender === 'shop' && <Zap size={8} className="text-accent-blue" fill="currentColor" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                  })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl relative" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
              <AnimatePresence>
                {(stagedImage || stagedVideo || stagedLocation) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-3 p-2 bg-text-primary/5 rounded-2xl border border-border-primary">
                    {stagedImage && (<div className="relative w-16 h-16 rounded-xl overflow-hidden"><img src={stagedImage || undefined} className="w-full h-full object-cover" /><button onClick={() => { setStagedImage(null); setStagedFile(null); }} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"><X size={12} /></button></div>)}
                    {stagedVideo && (<div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black flex items-center justify-center"><Video size={24} className="text-white/50" /><button onClick={() => { setStagedVideo(null); setStagedFile(null); }} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"><X size={12} /></button></div>)}
                    {stagedLocation && (<div className="flex-1 flex items-center gap-2 px-2"><MapPin size={16} className="text-accent-blue" /><span className="text-[10px] font-bold text-text-primary/60 uppercase tracking-widest">Joylashuv tayyor</span><button onClick={() => setStagedLocation(null)} className="ml-auto p-1 text-text-primary/40"><X size={16} /></button></div>)}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {editingMessage && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-2 bg-text-primary/5 rounded-xl p-2 flex items-center gap-3 border-l-4 border-accent-blue">
                    <Pencil size={16} className="text-accent-blue" /><div className="flex-1 min-w-0"><p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Tahrirlash</p><p className="text-xs text-text-primary/60 truncate">{editingMessage.text}</p></div><button onClick={() => { setEditingMessage(null); setMessageInput(''); }} className="p-1 text-text-primary/40"><X size={16} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {replyingTo && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-2 bg-text-primary/5 rounded-xl p-2 flex items-center gap-3 border-l-4 border-accent-blue">
                    <Reply size={16} className="text-accent-blue" /><div className="flex-1 min-w-0"><p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Javob berish</p><p className="text-xs text-text-primary/60 truncate">{replyingTo.text || "Media xabar"}</p></div><button onClick={() => setReplyingTo(null)} className="p-1 text-text-primary/40"><X size={16} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {showAttachmentMenu && (
                  <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="absolute bottom-full left-4 mb-4 bg-white dark:bg-bg-primary rounded-[2rem] shadow-2xl border border-border-primary p-2 flex flex-col gap-1 z-50 min-w-[200px] backdrop-blur-xl">
                    <button onClick={() => handleFileUpload('image')} className="flex items-center gap-3 p-3 hover:bg-text-primary/5 rounded-2xl transition-colors text-left"><div className="w-10 h-10 bg-accent-blue/10 rounded-xl flex items-center justify-center text-accent-blue"><ImageIcon size={20} /></div><span className="text-xs font-bold text-text-primary uppercase tracking-widest">Rasm</span></button>
                    <button onClick={() => handleFileUpload('video')} className="flex items-center gap-3 p-3 hover:bg-text-primary/5 rounded-2xl transition-colors text-left"><div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500"><Video size={20} /></div><span className="text-xs font-bold text-text-primary uppercase tracking-widest">Video</span></button>
                    <button onClick={handleLocationShare} className="flex items-center gap-3 p-3 hover:bg-text-primary/5 rounded-2xl transition-colors text-left"><div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><MapPin size={20} /></div><span className="text-xs font-bold text-text-primary uppercase tracking-widest">Joylashuv</span></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-1.5 bg-text-primary/5 border border-border-primary rounded-[1.5rem] p-1 backdrop-blur-xl mt-2 relative min-h-[44px]">
                <button onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} className={`w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${showAttachmentMenu ? 'bg-accent-blue text-white rotate-45 shadow-md' : 'text-text-primary/40 hover:bg-text-primary/10'}`}><Plus size={20} /></button>
                <div className="flex-1 relative">
                  <textarea value={messageInput} onChange={(e) => { setMessageInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage('text'); } }} placeholder="Xabar yozing..." rows={1} className="w-full bg-transparent text-text-primary px-2 py-2 text-[15px] focus:outline-none transition-all resize-none max-h-[120px] scrollbar-hide min-w-[80px]" />
                </div>
                <div className="flex items-center gap-0.5 px-0.5 mb-0.5">
                  {messageInput.trim() || stagedImage || stagedVideo || stagedLocation ? (
                    <button onClick={() => handleSendMessage('text')} disabled={isUploading} className={`w-8 h-8 flex items-center justify-center bg-accent-blue text-white rounded-full shadow-md transition-all flex-shrink-0 ${isUploading ? 'opacity-50' : 'active:scale-95'}`}>{isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}</button>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      {isVideoRecording && (
                        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <div className="relative w-[300px] h-[300px] rounded-full overflow-hidden border-4 border-accent-blue shadow-2xl shadow-accent-blue/20">
                            <video ref={videoPreviewRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" /><div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2"><div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full animate-pulse"><div className="w-2 h-2 bg-white rounded-full" /><span className="text-xs font-black text-white tabular-nums">{formatDuration(recordingDuration)}</span></div><button onClick={toggleCamera} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"><FlipHorizontal size={20} /></button></div>
                          </div>
                          <div className="absolute bottom-32 left-0 right-0 flex justify-center"><motion.div animate={{ x: dragX }} className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20"><ChevronLeft size={20} className="text-white animate-pulse" /><span className="text-sm font-bold text-white uppercase tracking-widest">{dragX < -100 ? "Qo'yib yuboring" : "Bekor qilish uchun suring"}</span></motion.div></div>
                        </div>
                      )}
                      {isRecording && (
                        <div className="absolute right-0 bottom-0 left-0 h-full bg-bg-primary z-50 flex items-center justify-between px-4 rounded-2xl border border-border-primary"><div className="flex items-center gap-3"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /><span className="text-sm font-black text-red-500 tabular-nums">{formatDuration(recordingDuration)}</span></div><motion.div animate={{ x: dragX }} className="flex items-center gap-2 text-text-primary/40"><ChevronLeft size={16} className="animate-pulse" /><span className="text-[10px] font-bold uppercase tracking-widest">{dragX < -100 ? "Qo'yib yuboring" : "Bekor qilish uchun suring"}</span></motion.div><div className={`p-2 rounded-full transition-colors ${dragX < -100 ? 'bg-red-500 text-white' : 'text-text-primary/20'}`}><Trash size={20} /></div></div>
                      )}
                      <button onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragStartRef.current = e.clientX; startVideoMessage(); }} onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); dragStartRef.current = null; stopVideoMessage(); }} onPointerMove={(e) => { if (isVideoRecording && dragStartRef.current !== null) { const diff = e.clientX - dragStartRef.current; setDragX(Math.min(0, diff)); } }} className={`w-8 h-8 flex items-center justify-center rounded-full text-accent-blue hover:bg-accent-blue/5 transition-all active:scale-125 ${isVideoRecording ? 'bg-accent-blue text-white scale-125' : ''}`}><Video size={18} /></button>
                      <button onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragStartRef.current = e.clientX; startRecording(); }} onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); dragStartRef.current = null; stopRecording(); }} onPointerMove={(e) => { if (isRecording && dragStartRef.current !== null) { const diff = e.clientX - dragStartRef.current; setDragX(Math.min(0, diff)); } }} className={`w-8 h-8 flex items-center justify-center rounded-full text-accent-blue hover:bg-accent-blue/5 transition-all active:scale-125 ${isRecording ? 'bg-accent-blue text-white scale-125' : ''}`}><Mic size={18} /></button>
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
};

const ImageIcon = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
