import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Language, translations } from '../translations';
import { useKeyboard } from '../hooks/useKeyboard';
import { usePWA } from '../hooks/usePWA';
import { useChat } from '../hooks/useChat';
import { PostData, Seller, User } from '../types';
import { 
  db, 
  doc, 
  onSnapshot
} from '../firebase';

import { SubView } from './profile/types';
import AuthSection from './profile/AuthSection';
import ProfileMain from './profile/ProfileMain';
import ProfileHeader from './profile/ProfileHeader';
import { ChatList } from './profile/chats/ChatList';
import { ChatView } from './profile/chats/ChatView';
import { SavedPostsView } from './profile/SavedPostsView';
import { StyleDNAView } from './profile/StyleDNAView';
import { ClosetView } from './profile/ClosetView';
import { InAppBrowserGuide } from './InAppBrowserGuide';
import { ChevronLeft } from 'lucide-react';
import LanguageSelector from './profile/LanguageSelector';

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
  onActiveChatSellerIdChange?: (id: string | undefined) => void;
  likedPosts: PostData[];
  recentlyViewedPosts: PostData[];
  hasShop: boolean;
  subView: SubView;
  setSubView: (view: SubView) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onEmailLogin?: (email: string, pass: string, name?: string, isRegistering?: boolean) => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
  onBackToHome?: () => void;
  onOpenAdminDashboard?: () => void;
  onOpenChat: (sellerId: string, product?: PostData | null) => void;
  initialChatSellerId?: string | null;
  initialChatProduct?: PostData | null;
  sentPosts: Set<string>;
  setSentPosts: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const Profile: React.FC<ProfileProps> = (props) => {
  const { 
    user, language, subView, setSubView, subscribedSellers, initialChatSellerId,
    onActiveChatSellerIdChange, onEmailLogin, onLogout, onOpenShop, onOpenAdminDashboard,
    hasShop, userShops, workspace, setLanguage
  } = props;
  
  const languages = [
    { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
    { code: 'uz-cyrl', name: 'Ўзбекча', flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const { isInAppBrowser } = usePWA();
  const [showInAppGuideModal, setShowInAppGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'dna' | 'closet'>('posts');
  const [activeClosetCategory, setActiveClosetCategory] = useState<'all' | 'clothing' | 'outfits' | 'other'>('all');
  const [downloadCount, setDownloadCount] = useState<number>(0);

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const chat = useChat(user, subscribedSellers, initialChatSellerId);
  const t = translations[language];

  useEffect(() => {
    if (onActiveChatSellerIdChange) {
      onActiveChatSellerIdChange(chat.activeChatSeller?.id);
    }
  }, [chat.activeChatSeller, onActiveChatSellerIdChange]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stats', 'appTracker'), (docSnap) => {
      if (docSnap.exists()) {
        setDownloadCount(docSnap.data().downloads || 0);
      }
    });
    return () => unsub();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onEmailLogin) return;
    setAuthLoading(true);
    try {
      await onEmailLogin(email, password, displayName, !isLogin);
      toast.success(isLogin ? "Hush kelibsiz!" : "Muvaffaqiyatli ro'yxatdan o'tdingiz!");
    } catch (error: any) {
      toast.error(error.message || "Xatolik yuz berdi");
    } finally {
      setAuthLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <div className="grid grid-cols-3 gap-1">
            {subscribedSellers.length > 0 ? (
              subscribedSellers.slice(0, 9).map((seller) => (
                <div 
                  key={seller.id} 
                  className="aspect-square relative group overflow-hidden cursor-pointer" 
                  onClick={() => props.onOpenShopProfile(seller.id)}
                >
                  <img 
                    src={seller.logo || '/placeholder.png'} 
                    alt={seller.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
              ))
             ) : (
              <div className="col-span-3 py-20 text-center text-text-primary/20">
                <p className="text-sm font-medium">Hozircha postlar yo'q</p>
              </div>
            )}
          </div>
        );
      case 'saved':
        return <SavedPostsView savedPosts={props.savedPosts} onOpenPostDetails={props.onOpenPostDetails} t={t} />;
      case 'closet':
        return <ClosetView activeClosetCategory={activeClosetCategory} setActiveClosetCategory={setActiveClosetCategory} t={t} />;
      case 'dna':
        return <StyleDNAView t={t} />;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <AuthSection 
        isLogin={isLogin} setIsLogin={setIsLogin}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        displayName={displayName} setDisplayName={setDisplayName}
        showPassword={showPassword} setShowPassword={setShowPassword}
        authLoading={authLoading} handleAuth={handleAuth}
        language={language}
      />
    );
  }

  if (subView === 'language') {
    return (
      <LanguageSelector 
        currentLanguage={language}
        languages={languages}
        onBack={() => setSubView('main')}
        onSelect={(lang) => {
          setLanguage(lang);
          setSubView('main');
        }}
        t={t}
      />
    );
  }

  if (subView === 'chats') {
    if (chat.activeChatSeller) {
      return (
        <ChatView 
          activeChatSeller={chat.activeChatSeller}
          messages={chat.chatMessages[chat.activeChatSeller.id] || []}
          onOpenShopProfile={props.onOpenShopProfile}
          onOpenPostDetails={props.onOpenPostDetails}
          selectedMessageId={null}
          setSelectedMessageId={() => {}}
          handleReaction={chat.handleReaction}
          setReplyingTo={chat.setReplyingTo}
          handleDeleteMessage={chat.handleDeleteMessage}
          handlePlayAudio={() => {}}
          playingMessageId={null}
          audioProgress={{}}
          newMessage={chat.newMessage}
          setNewMessage={chat.setNewMessage}
          handleSendMessage={chat.handleSendMessage}
          isUploading={chat.isUploading}
          stagedImage={chat.stagedImage}
          stagedVideo={chat.stagedVideo}
          stagedLocation={chat.stagedLocation}
          setStagedImage={chat.setStagedImage}
          setStagedVideo={chat.setStagedVideo}
          setStagedLocation={chat.setStagedLocation}
          replyingTo={chat.replyingTo}
          isRecording={chat.isRecording}
          isVideoRecording={chat.isVideoRecording}
          recordingDuration={chat.recordingDuration}
          formatDuration={(s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`}
          dragX={0}
          showAttachmentMenu={false}
          setShowAttachmentMenu={() => {}}
          handleFileUpload={() => {}}
          handleLocationShare={() => {}}
          videoPreviewRef={{ current: null }}
          toggleCamera={() => {}}
          startVideoMessage={() => {}}
          stopVideoMessage={() => {}}
          startRecording={chat.startRecording}
          stopRecording={chat.stopRecording}
          dragStartRef={{ current: null }}
          setRecordType={() => {}}
          setDragX={() => {}}
          messagesEndRef={{ current: null }}
          t={t}
        />
      );
    }
    return (
      <div className="flex flex-col h-full bg-bg-primary">
         <div className="flex items-center gap-4 px-4 py-4 border-b border-border-primary">
          <button 
            onClick={() => setSubView('main')} 
            className="p-2 hover:bg-text-primary/5 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-tight italic">Chatlar</h2>
        </div>
        <ChatList 
          chatSellers={chat.chatSellers}
          chatMessages={chat.chatMessages}
          onOpenChat={props.onOpenChat}
          getLastMessagePreview={chat.getLastMessagePreview}
        />
      </div>
    );
  }


  return (
    <div className="h-full bg-bg-primary overflow-hidden">
      <ProfileMain
        user={user}
        onOpenSettings={() => setSubView('settings')}
        onBack={() => props.onBackToHome?.()}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userPosts={[]} 
        savedPosts={props.savedPosts}
        onOpenPostDetails={props.onOpenPostDetails}
        onLogout={onLogout}
        onLanguageSettings={() => setSubView('language')}
        onOpenShop={onOpenShop}
        onOpenAdminDashboard={onOpenAdminDashboard}
        hasShop={hasShop}
        language={language}
        languages={languages}
        downloadCount={downloadCount}
        userShops={userShops}
        workspace={workspace}
        t={t}
        renderProfileHeader={() => (
          <ProfileHeader 
            user={user}
            userPosts={[]} 
            downloadCount={downloadCount}
            onEditProfile={() => setSubView('edit-profile')}
            language={language}
          />
        )}
        renderTabContent={renderTabContent}
      />

      <InAppBrowserGuide />
    </div>
  );
};

export default Profile;
