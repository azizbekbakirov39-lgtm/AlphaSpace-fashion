import { RealisticBlueMessageIcon } from './CustomIcons';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, 
  MessageSquare, 
  Settings as SettingsIcon, 
  Grid 
} from 'lucide-react';
import { toast } from 'sonner';
import { Seller, PostData, User } from '../types';
import { Language } from '../translations';
import { db, storage } from '../firebase';
import { 
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
  serverTimestamp 
} from 'firebase/firestore';

// Modular components
import { MyShopTab } from './shop/MyShopTab';
import { ChatsTab } from './shop/ChatsTab';
import { SettingsTab } from './shop/SettingsTab';
import { ShopModals } from './shop/ShopModals';

interface ShopWorkspaceProps {
  language: Language;
  shopData: Seller;
  user: User | null;
  posts: PostData[];
  onBackToMarketplace: () => void;
  onUpdateShop: (shop: Seller) => void;
}

const ShopWorkspace: React.FC<ShopWorkspaceProps> = ({
  language,
  shopData,
  user,
  posts,
  onBackToMarketplace,
  onUpdateShop
}) => {
  // Navigation States
  const [activeTab, setActiveTab] = useState('MyShop');
  const [activeProfileTab, setActiveProfileTab] = useState<'Postlar' | 'Ma\'lumot'>('Postlar');

  // Shop Data States
  const [localShopData, setLocalShopData] = useState<Seller>(shopData);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  // Chat States
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
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
  const [showInstagramImportModal, setShowInstagramImportModal] = useState(false);
  const [instagramLink, setInstagramLink] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
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

  const handleSaveShopInfo = async () => {
    try {
      await updateDoc(doc(db, 'shops', shopData.id), { ...localShopData });
      toast.success("Ma'lumotlar saqlandi");
      onUpdateShop(localShopData);
    } catch (error) {
      toast.error("Saqlashda xatolik");
    }
  };

  const handleSendMessage = async (type: string, url?: string) => {
    // Logic for message sending...
  };

  const handleOpenChat = (id: string) => setActiveChatId(id);
  const handleCloseChat = () => setActiveChatId(null);

  return (
    <div className="fixed inset-0 bg-bg-primary z-[1000] flex flex-col overflow-hidden">
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
                handleTelegramClick={() => window.open(`https://t.me/${localShopData.telegram?.replace('@', '')}`)}
                handleInstagramClick={() => window.open(`https://instagram.com/${localShopData.instagram?.replace('@', '')}`)}
                setShowMap={setShowMap}
                setShowInstagramImportModal={setShowInstagramImportModal}
                setShowCreateStoryModal={() => {}}
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
        showInstagramImportModal={showInstagramImportModal}
        setShowInstagramImportModal={setShowInstagramImportModal}
        instagramLink={instagramLink}
        setInstagramLink={setInstagramLink}
        isImporting={isImporting}
        handleInstagramImport={() => {}}
        importPreview={importPreview}
        confirmImport={() => {}}
        isUploading={isUploading}
        selectedPostDetails={selectedPostDetails}
        setSelectedPostDetails={setSelectedPostDetails}
        postDetailsTab={postDetailsTab}
        setPostDetailsTab={setPostDetailsTab}
        handleUpdatePost={() => {}}
        handleDeletePost={() => {}}
      />
    </div>
  );
};

export default ShopWorkspace;
