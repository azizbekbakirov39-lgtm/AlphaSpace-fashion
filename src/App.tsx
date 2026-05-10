import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Feed from './components/Feed';
import Brands from './components/Brands';
import SearchAI from './components/SearchAI';
import LiveMap from './components/LiveMap';
import BottomNav from './components/BottomNav';
import Profile, { SubView } from './components/Profile';
import ShopWorkspace from './components/ShopWorkspace';
import ShopProfile from './components/ShopProfile';
import StoryViewer from './components/StoryViewer';
import ReelsViewer from './components/ReelsViewer';
import LiveStreamViewer from './components/LiveStreamViewer';
import CommentDrawer from './components/CommentDrawer';
import ProductDetails from './components/ProductDetails';
import SplashScreen from './components/SplashScreen';
import CreateShopModal from './components/CreateShopModal';
import ShopConstruction from './components/ShopConstruction';
import { RealisticBlueMessageIcon } from './components/CustomIcons';
import DownloadPage from './components/DownloadPage';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Mail, X, Zap, CheckCircle2, Check, Plus, Share2, MessageCircle } from 'lucide-react';
import Logo from './components/Logo';
import { Language, translations } from './translations';
import { Seller, Story, AIMessage, SellerCategory, PostData, User } from './types';
import { Toaster, toast } from 'sonner';
import { uploadFile } from './services/uploadService';
import { DesktopSidebar } from './components/DesktopSidebar';
import { 
  auth, 
  onSnapshot, 
  doc, 
  db, 
  signInWithGoogle,
  logout, 
  registerWithEmail,
  loginWithEmail,
  resetPassword,
  updateUserName,
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs,
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
  handleFirestoreError,
  OperationType
} from './firebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Home');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [language, setLanguage] = useState<Language>('uz');
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeStoryList, setActiveStoryList] = useState<any[]>([]);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const [activeReelList, setActiveReelList] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [activeLiveStream, setActiveLiveStream] = useState<Story | null>(null);
  const [initialChatSellerId, setInitialChatSellerId] = useState<string | null>(null);
  const [initialChatProduct, setInitialChatProduct] = useState<PostData | null>(null);
  const [sharingPost, setSharingPost] = useState<PostData | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [profileSubView, setProfileSubView] = useState<SubView>('main');
  const [sentPosts, setSentPosts] = useState<Set<string>>(new Set());
  const [selectedPostForDetails, setSelectedPostForDetails] = useState<any | null>(null);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any | null>(null);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiFoundPosts, setAiFoundPosts] = useState<any[]>([]);
  const [aiFoundSellers, setAiFoundSellers] = useState<any[]>([]);
  const [aiInitialQuery, setAiInitialQuery] = useState<string | undefined>(undefined);
  const [showSplash, setShowSplash] = useState(true);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userSaves, setUserSaves] = useState<Set<string>>(new Set());
  const [userSubscriptions, setUserSubscriptions] = useState<Set<string>>(new Set());
  const [lastViewedPostId, setLastViewedPostId] = useState<string | null>(null);

  // Workspace State
  const [workspace, setWorkspace] = useState<'Marketplace' | 'Shop'>('Marketplace');
  const [hasShop, setHasShop] = useState(false);
  const [userShops, setUserShops] = useState<Seller[]>([]);
  const [userShop, setUserShop] = useState<Seller | null>(null);
  const [showShopSelector, setShowShopSelector] = useState(false);
  const [profileActiveChatSellerId, setProfileActiveChatSellerId] = useState<string | undefined>(undefined);

  // Shop Workspace Internal Navigation (Lifted for history management)
  const [shopWorkspaceTab, setShopWorkspaceTab] = useState('MyShop');
  const [shopWorkspaceChatId, setShopWorkspaceChatId] = useState<string | null>(null);

  useEffect(() => {
    if (activeReelIndex !== null && activeReelList[activeReelIndex]) {
      setLastViewedPostId(activeReelList[activeReelIndex].id);
    } else if (selectedPostForDetails) {
      setLastViewedPostId(selectedPostForDetails.id);
    }
  }, [activeReelIndex, activeReelList, selectedPostForDetails]);

  // Firestore Real-time Listeners
  useEffect(() => {
    const unsubSellers = onSnapshot(collection(db, 'shops'), (snapshot) => {
      const sellersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
      setSellers(sellersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shops');
    });

    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    const storiesQuery = query(
      collection(db, 'stories')
    );

    const unsubStories = onSnapshot(storiesQuery, (snapshot) => {
      const now = Date.now();
      const storiesData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Story))
        .filter(story => {
           // Default to 24h from createdAt if expiresAt is missing
           let expiresAtMs = 0;
           if (story.expiresAt) {
             if (typeof story.expiresAt.toMillis === 'function') {
               expiresAtMs = story.expiresAt.toMillis();
             } else if ((story.expiresAt as any).seconds) {
               expiresAtMs = (story.expiresAt as any).seconds * 1000;
             } else if (story.expiresAt instanceof Date) {
               expiresAtMs = story.expiresAt.getTime();
             } else if (typeof story.expiresAt === 'number') {
               expiresAtMs = story.expiresAt;
             }
           } else if (story.createdAt) {
             let createdAtMs = 0;
             if (typeof story.createdAt.toMillis === 'function') {
               createdAtMs = story.createdAt.toMillis();
             } else if ((story.createdAt as any).seconds) {
               createdAtMs = (story.createdAt as any).seconds * 1000;
             } else if (story.createdAt instanceof Date) {
               createdAtMs = story.createdAt.getTime();
             } else if (typeof story.createdAt === 'number') {
               createdAtMs = story.createdAt;
             }
             expiresAtMs = createdAtMs + (24 * 60 * 60 * 1000);
           } else {
             // If both are missing (shouldn't happen), discard if older than 24h from now as fallback
             return false; 
           }
           
           return expiresAtMs > now;
        });
      setStories(storiesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stories');
    });

    // One-time cleanup of expired stories from Firestore
    const cleanupStories = async () => {
      try {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // 1. Delete stories with expiresAt in the past
        const expiredByDateQuery = query(
          collection(db, 'stories'),
          where('expiresAt', '<', Timestamp.fromDate(now))
        );
        const expiredByDateSnap = await getDocs(expiredByDateQuery);
        
        // 2. Also check for stories WITHOUT expiresAt that are older than 24h
        const oldStoriesQuery = query(
          collection(db, 'stories'),
          where('createdAt', '<', Timestamp.fromDate(yesterday))
        );
        const oldStoriesSnap = await getDocs(oldStoriesQuery);

        const batch = writeBatch(db);
        const toDeleteIds = new Set<string>();
        const affectedSellerIds = new Set<string>();

        expiredByDateSnap.docs.forEach(doc => {
          batch.delete(doc.ref);
          toDeleteIds.add(doc.id);
          affectedSellerIds.add(doc.data().sellerId);
        });

        oldStoriesSnap.docs.forEach(doc => {
          if (!toDeleteIds.has(doc.id)) {
            batch.delete(doc.ref);
            affectedSellerIds.add(doc.data().sellerId);
          }
        });

        if (affectedSellerIds.size > 0) {
          await batch.commit();
          console.log(`Cleaned up ${toDeleteIds.size + oldStoriesSnap.docs.length} expired stories.`);
          
          // Re-check hasStory for affected sellers
          for (const sId of affectedSellerIds) {
             const activeStoriesQuery = query(collection(db, 'stories'), where('sellerId', '==', sId));
             const activeStoriesSnap = await getDocs(activeStoriesQuery);
             const stillHasStories = activeStoriesSnap.docs.some(doc => {
               const data = doc.data();
               const exp = data.expiresAt?.toMillis?.() || (data.createdAt?.toMillis?.() + 24*60*60*1000) || Date.now() + 1000;
               return exp > Date.now();
             });
             
             if (!stillHasStories) {
               await updateDoc(doc(db, 'shops', sId), { hasStory: false });
             }
          }
        }
      } catch (err) {
        console.error("Story cleanup error:", err);
      }
    };
    cleanupStories();

    return () => {
      unsubSellers();
      unsubPosts();
      unsubStories();
    };
  }, [user?.uid]);

  // User-specific data listeners
  useEffect(() => {
    if (!user) {
      setUserLikes(new Set());
      setUserSaves(new Set());
      setUserSubscriptions(new Set());
      return;
    }

    const unsubLikes = onSnapshot(query(collection(db, 'likes'), where('uid', '==', user.uid)), (snapshot) => {
      setUserLikes(new Set(snapshot.docs.map(doc => doc.data().postId)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'likes');
    });

    const unsubSaves = onSnapshot(query(collection(db, 'saved_items'), where('uid', '==', user.uid)), (snapshot) => {
      setUserSaves(new Set(snapshot.docs.map(doc => doc.data().postId)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'saved_items');
    });

    const unsubSubs = onSnapshot(query(collection(db, 'subscriptions'), where('uid', '==', user.uid)), (snapshot) => {
      setUserSubscriptions(new Set(snapshot.docs.map(doc => doc.data().sellerId)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'subscriptions');
    });

    // User's Shop Listener
    const unsubUserShop = onSnapshot(query(collection(db, 'shops'), where('ownerUid', '==', user.uid)), (snapshot) => {
      if (!snapshot.empty) {
        const shopsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
        
        setUserShops(prev => {
          if (prev.length === shopsData.length && prev.every((s, i) => s.id === shopsData[i].id)) return prev;
          return shopsData;
        });
        
        const activeShops = shopsData.filter(s => s.status !== 'frozen');
        
        if (activeShops.length > 0) {
          setUserShop(prev => {
            const updatedActiveShop = activeShops.find(s => s.id === prev?.id);
            const nextShop = updatedActiveShop || activeShops[0];
            if (prev?.id === nextShop.id && prev?.status === nextShop.status && prev?.name === nextShop.name) return prev;
            return nextShop;
          });
          setHasShop(true);
        } else {
          setUserShop(null);
          setHasShop(false);
        }
      } else {
        setUserShops(prev => prev.length === 0 ? prev : []);
        setUserShop(null);
        setHasShop(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shops');
    });

    return () => {
      unsubLikes();
      unsubSaves();
      unsubSubs();
      unsubUserShop();
    };
  }, [user]);

  const handleEmailLogin = async (email: string, pass: string, name?: string, isRegistering?: boolean) => {
    try {
      let result;
      if (isRegistering) {
        result = await registerWithEmail(email, pass);
        if (name) {
          await updateUserName(name);
        }
        
        const userDoc = doc(db, 'users', result.user.uid);
        await setDoc(userDoc, {
          uid: result.user.uid,
          displayName: name || '',
          email: email,
          photoURL: null,
          role: 'buyer',
          hasShop: false,
          createdAt: serverTimestamp()
        });
        toast.success("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
      } else {
        result = await loginWithEmail(email, pass);
        toast.success("Xush kelibsiz!");
      }
      return result;
    } catch (error: any) {
      console.error("Auth Error:", error?.message || error);
      throw error;
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email) {
      toast.error("Iltimos, email manzilingizni kiriting");
      return;
    }
    try {
      await resetPassword(email);
      toast.success("Parolni tiklash havolasi pochtangizga yuborildi.");
    } catch (error: any) {
      console.error("Reset Password Error:", error.code, error.message);
      toast.error("Xatolik: " + (error.message || "Havola yuborishda muammo yuz berdi"));
    }
  };

  // Merge user-specific data into posts/stories
  const postsWithUserStatus = useMemo(() => {
    return posts
      .map(post => {
        const postSellerId = post.seller?.id || (post as any).sellerId;
        const freshSeller = sellers.find(s => s.id === postSellerId);
        const sellerObj = freshSeller || post.seller;
        
        return {
          ...post,
          seller: sellerObj ? {
            ...sellerObj,
            hasStory: stories.some(s => (s.seller?.id || (s as any).sellerId) === sellerObj.id)
          } : sellerObj,
          isLiked: userLikes.has(post.id),
          isSaved: userSaves.has(post.id)
        };
      })
      .filter(post => {
        if (!post.seller) return true; 
        return post.seller.status !== 'frozen';
      })
      .map(post => ({
        ...post,
        seller: post.seller ? {
          ...post.seller,
          isSubscribed: userSubscriptions.has(post.seller.id)
        } : undefined
      }));
  }, [posts, sellers, stories, userLikes, userSaves, userSubscriptions]);

  const storiesWithUserStatus = useMemo(() => {
    return stories
      .map(story => {
        const storySellerId = story.seller?.id || (story as any).sellerId;
        const freshSeller = sellers.find(s => s.id === storySellerId);
        const sellerObj = freshSeller || story.seller;

        return {
          ...story,
          seller: sellerObj ? {
            ...sellerObj,
            hasStory: true // it is a story, so naturally the seller has a story
          } : sellerObj,
          isLiked: userLikes.has(story.id)
        };
      })
      .filter(story => story.seller && story.seller.status !== 'frozen')
      .map(story => ({
        ...story,
        seller: {
          ...story.seller,
          isSubscribed: userSubscriptions.has(story.seller!.id)
        }
      }));
  }, [stories, sellers, userLikes, userSubscriptions]);

  const sellersWithUserStatus = useMemo(() => {
    const allSellers = [...sellers];
    userShops.forEach(uShop => {
      if (!allSellers.some(s => s.id === uShop.id)) {
        allSellers.push(uShop);
      }
    });

    return allSellers
      .filter(seller => seller.status !== 'frozen')
      .map(seller => ({
        ...seller,
        hasStory: stories.some(s => (s.seller?.id || (s as any).sellerId) === seller.id),
        isSubscribed: userSubscriptions.has(seller.id)
      }));
  }, [sellers, stories, userShops, userSubscriptions]);

  // Shop Creation State
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [isConstructingShop, setIsConstructingShop] = useState(false);
  const [constructionProgress, setConstructionProgress] = useState(0);
  const [newShopData, setNewShopData] = useState<{name: string, logoFile: File | null, logoPreview: string | null, workingDays: string[], categories: SellerCategory[], location: { lat: number, lng: number }, region: string} | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        if (!user || user.uid !== currentUser.uid) {
          const userDoc = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDoc);
          if (!docSnap.exists()) {
            const newUser: User = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'buyer',
              hasShop: false
            };
            await setDoc(userDoc, newUser);
            setUser(newUser);
          } else {
            setUser(docSnap.data() as User);
          }
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time User Profile Listener
  useEffect(() => {
    if (!user?.uid) return;

    const userDoc = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDoc, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data() as User;
        setUser(prev => {
          // Use selective comparison to avoid circular structure issues if any
          if (prev?.uid === userData.uid && 
              prev?.hasShop === userData.hasShop && 
              prev?.role === userData.role &&
              prev?.displayName === userData.displayName &&
              prev?.photoURL === userData.photoURL) {
            return prev;
          }
          return userData;
        });
      }
    });

    const qBuyer = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubBuyerChats = onSnapshot(qBuyer, (snapshot) => {
      let unread = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.lastSender && data.lastSender !== user.uid) {
           if (!data.readBy || !data.readBy.includes(user.uid)) {
              unread += 1;
           }
        }
      });
      setUnreadMessages(unread);
    });

    return () => {
      unsubUser();
      unsubBuyerChats();
    };
  }, [user?.uid, userShops]);

  // History tracking to prevent double pushes
  const isPoppingState = useRef(false);

  const handleSearchActive = (active: boolean) => {
    if (active) {
      setIsSearchActive(true);
      window.history.pushState({ 
        type: 'search', 
        workspace, 
        activeTab, 
        profileSubView 
      }, '');
    } else {
      if (window.history.state?.type === 'search') {
        window.history.back();
      } else {
        setIsSearchActive(false);
      }
    }
  };

  const t = translations[language];

  const handleWorkspaceChange = (newWorkspace: 'Marketplace' | 'Shop') => {
    if (newWorkspace === workspace) return;
    if (newWorkspace === 'Shop' && !user) {
      setActiveTab('Profile');
      return;
    }
    setWorkspace(newWorkspace);
    window.history.pushState({ 
      type: 'workspace', 
      workspace: newWorkspace,
      activeTab: newWorkspace === 'Marketplace' ? activeTab : 'MyShop',
      profileSubView: newWorkspace === 'Marketplace' ? profileSubView : 'main'
    }, '');
  };

  const handleOpenShop = () => {
    if (userShops.length > 0) {
      setShowShopSelector(true);
    } else {
      setIsCreatingShop(true);
      window.history.pushState({ 
        type: 'createShop', 
        workspace, 
        activeTab, 
        profileSubView 
      }, '');
    }
  };

  const handleCreateShopSubmit = (name: string, logoFile: File | null, workingDays: string[], categories: SellerCategory[], location: { lat: number, lng: number }, region: string) => {
    // Create a preview for the construction screen
    let logoPreview = null;
    if (logoFile) {
      logoPreview = URL.createObjectURL(logoFile);
    }
    setNewShopData({ name, logoFile, logoPreview, workingDays, categories, location, region });
    setIsCreatingShop(false);
    // If we're in the createShop state, go back
    if (window.history.state?.type === 'createShop') {
      window.history.back();
    }
    setIsConstructingShop(true);
    setConstructionProgress(0);
  };

  // Construction Progress Effect
  useEffect(() => {
    if (isConstructingShop && newShopData && user) {
      const interval = setInterval(() => {
        setConstructionProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + (Math.random() * 8); // Slightly faster
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isConstructingShop, newShopData, user]);

  const constructionFinishedRef = useRef(false);

  // Handle Construction Completion
  useEffect(() => {
    if (isConstructingShop && constructionProgress >= 100 && newShopData && user && !constructionFinishedRef.current) {
      const finishConstruction = async () => {
        constructionFinishedRef.current = true;
        try {
          let logoUrl = '';
          if (newShopData.logoFile) {
            const uploadToastId = toast.loading("Logo yuklanmoqda...");
            try {
              logoUrl = await uploadFile(newShopData.logoFile);
              toast.success("Logo yuklandi!", { id: uploadToastId });
            } catch (uploadError: any) {
              console.error("Upload error:", uploadError?.message || uploadError);
              toast.error(`Logo yuklashda xatolik: ${uploadError.message || 'Noma\'lum xato'}. Do'kon yaratish davom etmoqda...`, { id: uploadToastId });
            }
          }

          const shopId = `shop_${user.uid}_${Date.now()}`;
          const newShop: Seller = {
            id: shopId,
            name: newShopData.name,
            logo: logoUrl || 'https://www.shutterstock.com/image-vector/store-icon-flat-style-isolated-260nw-1389101030.jpg', // More neutral placeholder
            workingDays: newShopData.workingDays,
            categories: newShopData.categories,
            hasStory: false,
            followers: 0,
            description: 'Mening shaxsiy do\'konim tavsifi bu yerda bo\'ladi.',
            region: newShopData.region || 'Toshkent',
            location: newShopData.location,
            ownerUid: user.uid,
            createdAt: serverTimestamp()
          };

          await setDoc(doc(db, 'shops', shopId), newShop);
          
          // Update user profile
          const userDoc = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDoc);
          if (userSnap.exists()) {
            await updateDoc(userDoc, { hasShop: true });
          } else {
            await setDoc(userDoc, {
              ...user,
              hasShop: true
            });
          }
          
          setUserShop(newShop);
          setIsConstructingShop(false);
          setWorkspace('Shop');
          toast.success("Do'kon muvaffaqiyatli yaratildi!");
          constructionFinishedRef.current = false; // Reset for next time if needed
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error("Error creating shop:", errorMessage);
          toast.error("Do'kon yaratishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
          setIsConstructingShop(false);
          constructionFinishedRef.current = false;
        }
      };

      finishConstruction();
    }
  }, [constructionProgress, isConstructingShop, newShopData, user]);
  
  const [recentlyViewedPosts, setRecentlyViewedPosts] = useState<PostData[]>([]);

  const filteredPosts = postsWithUserStatus.filter(post => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;

    // Direct string matches
    const matchesName = (post.outfitName || '').toLowerCase().includes(q);
    const matchesSeller = (post.seller?.name || '').toLowerCase().includes(q);
    const matchesDescription = (post.description || '').toLowerCase().includes(q);
    const matchesPrice = (post.price || '').toLowerCase().includes(q);

    // Semantic Price Matching (e.g., "2M" -> "2000000", "100k" -> "100000")
    const normalizePrice = (p: string) => (p || '').replace(/[^0-9]/g, '');
    const numericPrice = normalizePrice(post.price || '');
    
    // Check if query is a price shorthand
    let isPriceMatch = false;
    if (/^\d+(\.\d+)?[mkb]|mln|ming$/i.test(q)) {
      let multiplier = 1;
      let cleanQuery = q;
      if (q.endsWith('m') || q.includes('mln')) {
        multiplier = 1000000;
        cleanQuery = q.replace(/m|mln/g, '');
      } else if (q.endsWith('k') || q.includes('ming')) {
        multiplier = 1000;
        cleanQuery = q.replace(/k|ming/g, '');
      }
      
      const queryVal = parseFloat(cleanQuery) * multiplier;
      if (!isNaN(queryVal)) {
        // If the query perfectly matches or the price string contains the interpreted number
        if (numericPrice === queryVal.toString() || (queryVal >= 1000 && numericPrice.includes(queryVal.toString()))) {
          isPriceMatch = true;
        }
      }
    }

    // Also check if numeric parts of query match the numeric price
    const numericQuery = q.replace(/[^0-9]/g, '');
    const matchesNumeric = numericQuery.length > 2 && numericPrice.includes(numericQuery);

    return matchesName || matchesSeller || matchesDescription || matchesPrice || matchesNumeric || isPriceMatch;
  });

  const toggleLike = useCallback(async (id: string, type: 'post' | 'story' = 'post') => {
    if (!user) {
      setActiveTab('Profile');
      return;
    }

    const collectionName = type === 'story' ? 'stories' : 'posts';
    const docRef = doc(db, collectionName, id);

    // Optimistic UI update
    setUserLikes(prev => {
      const newLikes = new Set(prev);
      if (newLikes.has(id)) {
        newLikes.delete(id);
      } else {
        newLikes.add(id);
      }
      return newLikes;
    });
    
    const isCurrentlyLiked = userLikes.has(id);
    if (type === 'story') {
      setStories(prev => prev.map(s => s.id === id ? { ...s, likes: isCurrentlyLiked ? Math.max(0, s.likes - 1) : s.likes + 1 } : s));
      setActiveStoryList(prev => prev.map(s => s.id === id ? { ...s, isLiked: !isCurrentlyLiked, likes: isCurrentlyLiked ? Math.max(0, s.likes - 1) : s.likes + 1 } : s));
    } else {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: isCurrentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1 } : p));
      setActiveReelList(prev => prev.map(p => p.id === id ? { ...p, isLiked: !isCurrentlyLiked, likes: isCurrentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1 } : p));
    }

    try {
      // In a real app, we'd have a 'likes' subcollection or a separate collection
      // For simplicity, we'll just update the count and a local 'isLiked' if we had a way to track it per user
      // But since we want "real", let's use a 'likes' collection
      const likeId = `${user.uid}_${id}`;
      const likeRef = doc(db, 'likes', likeId);
      const likeDoc = await getDoc(likeRef);

      if (likeDoc.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(docRef, { likes: increment(-1) });
      } else {
        await setDoc(likeRef, { uid: user.uid, postId: id, createdAt: new Date().toISOString() });
        await updateDoc(docRef, { likes: increment(1) });
      }
    } catch (error: any) {
      console.error("Error toggling like:", error?.message || error);
    }
  }, [user]);

  const toggleSave = useCallback(async (postId: string) => {
    if (!user) {
      setActiveTab('Profile');
      return;
    }

    const saveId = `${user.uid}_${postId}`;
    const saveRef = doc(db, 'saved_items', saveId);
    
    // Optimistic UI
    setUserSaves(prev => {
      const newSaves = new Set(prev);
      if (newSaves.has(postId)) {
        newSaves.delete(postId);
      } else {
        newSaves.add(postId);
      }
      return newSaves;
    });

    try {
      const saveDoc = await getDoc(saveRef);
      if (saveDoc.exists()) {
        await deleteDoc(saveRef);
      } else {
        await setDoc(saveRef, { uid: user.uid, postId, createdAt: new Date().toISOString() });
      }
    } catch (error: any) {
      console.error("Error toggling save:", error?.message || error);
    }
  }, [user]);

  const toggleSubscribe = useCallback(async (sellerId: string) => {
    if (!user) {
      setActiveTab('Profile');
      return;
    }

    const subId = `${user.uid}_${sellerId}`;
    const subRef = doc(db, 'subscriptions', subId);

    // Optimistic UI
    setUserSubscriptions(prev => {
      const newSubs = new Set(prev);
      if (newSubs.has(sellerId)) {
        newSubs.delete(sellerId);
      } else {
        newSubs.add(sellerId);
      }
      return newSubs;
    });

    try {
      const subDoc = await getDoc(subRef);
      if (subDoc.exists()) {
        await deleteDoc(subRef);
      } else {
        await setDoc(subRef, { uid: user.uid, sellerId, createdAt: new Date().toISOString() });
      }
    } catch (error: any) {
      console.error("Error toggling subscription:", error?.message || error);
    }
  }, [user]);

  const markStoryViewed = useCallback((storyId: string) => {
    setStories(prev => {
      const story = prev.find(s => s.id === storyId);
      if (story?.isViewed) return prev;
      return prev.map(s => 
        s.id === storyId ? { ...s, isViewed: true } : s
      );
    });
    // Sync with active story list if open
    setActiveStoryList(prev => prev.map(s =>
      s.id === storyId ? { ...s, isViewed: true } : s
    ));
  }, []);

  const openStories = useCallback((storiesList: any[], index: number) => {
    setActiveStoryList(storiesList);
    setActiveStoryIndex(index);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'story', 
        list: storiesList, 
        index,
        workspace,
        activeTab,
        profileSubView
      }, '');
    }
  }, [workspace, activeTab, profileSubView]);

  const openReels = useCallback((reelsList: any[], index: number = 0) => {
    if (!reelsList || reelsList.length === 0) return;
    const safeIndex = typeof index === 'number' ? Math.max(0, Math.min(index, reelsList.length - 1)) : 0;
    setActiveReelList(reelsList);
    setActiveReelIndex(safeIndex);
    
    if (!isPoppingState.current) {
      window.history.pushState({ 
        type: 'reel', 
        list: reelsList, 
        index: safeIndex,
        workspace,
        activeTab,
        profileSubView
      }, '');
    }
  }, [workspace, activeTab, profileSubView]);

  const openShopProfile = useCallback((shopId: string) => {
    setSelectedShopId(shopId);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'shop', 
        shopId,
        workspace,
        activeTab,
        profileSubView
      }, '', `?shop=${shopId}`);
    }
  }, [workspace, activeTab, profileSubView]);

  const openPostDetails = useCallback((post: any) => {
    setSelectedPostForDetails(post);
    setRecentlyViewedPosts(prev => {
      const filtered = prev.filter(p => p.id !== post.id);
      return [post, ...filtered].slice(0, 100);
    });
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'details', 
        post,
        workspace,
        activeTab,
        profileSubView,
        selectedShopId // Capture if we opened from a shop profile
      }, '', `?post=${post.id}`);
    }
  }, [workspace, activeTab, profileSubView, selectedShopId]);

  // Deep linking initial load
  const initialDeepLinkHandled = useRef(false);
  useEffect(() => {
    if (initialDeepLinkHandled.current) return;
    if (postsWithUserStatus.length === 0 && sellersWithUserStatus.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    const shopId = params.get('shop');

    if (postId && postsWithUserStatus.length > 0) {
      const post = postsWithUserStatus.find(p => p.id === postId);
      if (post) {
        initialDeepLinkHandled.current = true;
        setTimeout(() => openPostDetails(post), 100);
      }
    } else if (shopId && sellersWithUserStatus.length > 0) {
      const shop = sellersWithUserStatus.find(s => s.id === shopId);
      if (shop) {
        initialDeepLinkHandled.current = true;
        setTimeout(() => openShopProfile(shopId), 100);
      }
    } else if (!postId && !shopId) {
      initialDeepLinkHandled.current = true;
    }
  }, [postsWithUserStatus, sellersWithUserStatus, openPostDetails, openShopProfile]);

  const openPostComments = useCallback((post: any) => {
    setSelectedPostForComments(post);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'comments', 
        post,
        workspace,
        activeTab,
        profileSubView,
        selectedShopId
      }, '');
    }
  }, [workspace, activeTab, profileSubView, selectedShopId]);

  const closeStories = useCallback(() => {
    setActiveStoryIndex(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const closeReels = useCallback(() => {
    setActiveReelIndex(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const closeShopProfile = useCallback(() => {
    setSelectedShopId(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const handleAskAI = useCallback((product: PostData) => {
    setSelectedPostForDetails(null); // Close product details
    setActiveTab('Search');
    
    // Create a direct link to the product
    const productLink = `${window.location.origin}?post=${product.id}`;
      
    setAiInitialQuery(productLink);
    
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'tab', 
        tab: 'Search',
        workspace
      }, '');
    }
  }, [workspace]);

  const handleOpenChat = useCallback((sellerId: string, product?: PostData) => {
    setInitialChatSellerId(sellerId);
    setInitialChatProduct(product || null);
    setProfileSubView('chats');
    setActiveTab('Profile');
    setSelectedShopId(null); // Close shop profile
    setSelectedPostForDetails(null); // Close product details
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'profileSubView', 
        subView: 'chats', 
        initialChatSellerId: sellerId, 
        initialChatProduct: product,
        workspace,
        activeTab: 'Profile'
      }, '');
    }
  }, [workspace]);

  const handleOpenLive = (story: Story) => {
    setActiveLiveStream(story);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'live', 
        story,
        workspace,
        activeTab,
        profileSubView
      }, '');
    }
  };

  const closeLiveStream = useCallback(() => {
    setActiveLiveStream(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const handleSharePost = (post: PostData) => {
    setSharingPost(post);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'share', 
        post,
        workspace,
        activeTab,
        profileSubView
      }, '');
    }
  };

  const closeShare = useCallback(() => {
    setSharingPost(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const handleConfirmShare = (sellerId: string) => {
    if (!sharingPost) return;
    handleOpenChat(sellerId, sharingPost);
    setSharingPost(null);
  };

  const closePostDetails = useCallback(() => {
    setSelectedPostForDetails(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const closePostComments = useCallback(() => {
    setSelectedPostForComments(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const handleProfileSubViewChange = useCallback((subView: SubView) => {
    setProfileSubView(subView);
    if (workspace === 'Marketplace' && subView !== 'main') {
      window.history.pushState({ 
        type: 'profileSubView', 
        subView,
        workspace,
        activeTab: 'Profile'
      }, '');
    }
  }, [workspace]);

  // handleTryOn removed to focus on chat and search accuracy
  
  // Handle Tab Change with History
  const handleTabChange = useCallback((tab: string) => {
    if (tab === activeTab) return;
    
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'tab', 
        tab,
        workspace,
        profileSubView: 'main'
      }, '');
    }
    
    // Reset profile subview when leaving profile tab
    if (activeTab === 'Profile' && tab !== 'Profile') {
      setProfileSubView('main');
    }
    
    setActiveTab(tab);
  }, [activeTab, workspace, profileSubView]);

  const handleRefresh = useCallback(() => {
    // Shuffle posts to simulate refresh
    setPosts(prev => [...prev].sort(() => Math.random() - 0.5));
    // Also shuffle stories
    setStories(prev => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  const handleBrandsRefresh = useCallback(() => {
    // Sort sellers: subscribed first, then by followers count
    setSellers(prev => [...prev].sort((a, b) => {
      if (a.isSubscribed && !b.isSubscribed) return -1;
      if (!a.isSubscribed && b.isSubscribed) return 1;
      return b.followers - a.followers;
    }));
    // Also shuffle stories to match
    setStories(prev => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  // Back Button Logic
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isPoppingState.current = true;
      const state = event.state;

      // If no state and on Home tab of Marketplace, refresh
      if (!state && 
          workspace === 'Marketplace' &&
          activeTab === 'Home' && 
          activeStoryIndex === null && 
          activeReelIndex === null && 
          selectedPostForDetails === null && 
          selectedPostForComments === null && 
          selectedShopId === null) {
        handleRefresh();
        const feedElement = document.querySelector('.overflow-y-auto');
        if (feedElement) {
          feedElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
        isPoppingState.current = false;
        return;
      }

      // Reset all viewers first
      setActiveStoryIndex(null);
      setActiveReelIndex(null);
      setSelectedPostForDetails(null);
      setSelectedPostForComments(null);
      setSelectedShopId(null);
      setProfileSubView('main');
      setIsCreatingShop(false);
      setIsSearchActive(false);
      setActiveLiveStream(null);
      setSharingPost(null);
      setInitialChatSellerId(null);
      setInitialChatProduct(null);

      if (state) {
        // Restore workspace if it changed
        if (state.workspace && state.workspace !== workspace) {
          setWorkspace(state.workspace);
        }

        // Restore Marketplace Tab/SubView if present
        if (state.activeTab) setActiveTab(state.activeTab);
        if (state.profileSubView) setProfileSubView(state.profileSubView);

        switch (state.type) {
          case 'workspace':
            // Already handled above
            break;
          case 'search':
            setIsSearchActive(true);
            break;
          case 'createShop':
            setIsCreatingShop(true);
            break;
          case 'story':
            setActiveStoryList(state.list);
            setActiveStoryIndex(state.index);
            break;
          case 'reel':
            setActiveReelList(state.list);
            setActiveReelIndex(state.index);
            break;
          case 'shop':
            setSelectedShopId(state.shopId);
            break;
          case 'details':
            setSelectedPostForDetails(state.post);
            if (state.selectedShopId) setSelectedShopId(state.selectedShopId);
            break;
          case 'comments':
            setSelectedPostForComments(state.post);
            if (state.selectedShopId) setSelectedShopId(state.selectedShopId);
            break;
          case 'live':
            setActiveLiveStream(state.story);
            break;
          case 'share':
            setSharingPost(state.post);
            break;
          case 'profileChat':
        setActiveTab('Profile');
        setProfileSubView('chats');
        setInitialChatSellerId(state.sellerId);
        setInitialChatProduct(state.product || null);
        break;
      case 'profileSubView':
            setActiveTab('Profile');
            setProfileSubView(state.subView);
            if (state.initialChatSellerId) {
              setInitialChatSellerId(state.initialChatSellerId);
              setInitialChatProduct(state.initialChatProduct || null);
            }
            break;
          case 'tab':
            setActiveTab(state.tab);
            break;
          case 'shopWorkspaceTab':
            setWorkspace('Shop');
            setShopWorkspaceTab(state.tab);
            break;
          case 'shopWorkspaceChat':
            setWorkspace('Shop');
            setShopWorkspaceTab('Messages');
            setShopWorkspaceChatId(state.chatId);
            break;
          default:
            // Default to Home if unknown
            if (state.workspace === 'Marketplace') setActiveTab('Home');
        }
      } else {
        // Initial state
        setWorkspace('Marketplace');
        setActiveTab('Home');
        setProfileSubView('main');
        setIsCreatingShop(false);
      }
      
      setTimeout(() => {
        isPoppingState.current = false;
      }, 100);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [workspace, activeStoryIndex, activeReelIndex, selectedShopId, activeTab, profileSubView]);

  if (window.location.pathname === '/download') {
    return <DownloadPage />;
  }

  const selectedSeller = sellers.find(s => s.id === selectedShopId) || postsWithUserStatus.find(p => p.seller?.id === selectedShopId)?.seller;
  const sellerPosts = postsWithUserStatus.filter(p => p.seller?.id === selectedShopId);

  return (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex justify-center items-center overflow-hidden">
      
      <div className="flex w-full md:max-w-5xl h-[100dvh] md:h-[90vh] md:max-h-[850px] shadow-2xl md:rounded-3xl overflow-hidden bg-bg-primary md:border border-border-primary relative">
        {/* Desktop Sidebar */}
        <DesktopSidebar 
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          language={language}
          user={user}
          unreadMessages={unreadMessages}
          workspace={workspace}
          handleWorkspaceChange={handleWorkspaceChange}
          userShops={userShops}
          setShowShopSelector={setShowShopSelector}
          openMessages={() => {
            setActiveTab('Profile');
            setProfileSubView('chats');
            setUnreadMessages(0);
            window.history.pushState({ 
              type: 'profileSubView', 
              subView: 'chats',
              workspace,
              activeTab: 'Profile'
            }, '');
          }}
        />

        {/* Main app container */}
        <div className="h-full w-full flex-1 md:max-w-[480px] lg:max-w-[540px] md:border-l border-border-primary bg-bg-primary text-text-primary font-sans selection:bg-accent-blue/30 overflow-hidden relative flex flex-col z-10 mx-auto border-0">
          <Toaster position="top-center" richColors />
      {/* Modals and Overlays */}
      <CreateShopModal 
        isOpen={isCreatingShop} 
        language={language}
        onClose={() => {
          if (window.history.state?.type === 'createShop') {
            window.history.back();
          } else {
            setIsCreatingShop(false);
          }
        }} 
        onSubmit={handleCreateShopSubmit} 
      />

      <AnimatePresence>
        {isConstructingShop && newShopData && (
          <ShopConstruction 
            progress={constructionProgress} 
            shopName={newShopData.name} 
            shopLogo={newShopData.logoPreview} 
          />
        )}
      </AnimatePresence>

      {/* Share Overlay */}
      <AnimatePresence>
        {sharingPost && (
          <div className="absolute inset-0 z-[20000] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-bg-primary rounded-t-[2.5rem] overflow-hidden shadow-2xl border border-border-primary"
            >
              <div className="p-6 border-b border-border-primary flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-widest text-text-primary">Yuborish</h3>
                <button onClick={closeShare} className="p-2 hover:bg-text-primary/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              {/* Direct Link Share Options */}
              <div className="p-4 border-b border-border-primary flex flex-col gap-3">
                <p className="px-2 text-[10px] font-black uppercase tracking-widest text-text-primary/60">Tashqi havolalar</p>
                <div className="flex gap-4 px-2">
                  <button 
                    onClick={() => {
                      const link = `${window.location.origin}?post=${sharingPost.id}`;
                      navigator.clipboard.writeText(link);
                      toast.success("Havola nusxalandi!");
                      closeShare();
                    }}
                    className="flex-1 py-3 bg-text-primary/5 hover:bg-text-primary/10 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <span className="font-bold text-xs">Nusxalash</span>
                  </button>
                  <button 
                    onClick={() => {
                      const link = `${window.location.origin}?post=${sharingPost.id}`;
                      if (navigator.share) {
                        navigator.share({
                          title: sharingPost.outfitName || 'Mahsulot',
                          text: sharingPost.description || 'Shu mahsulotni ko\'ring!',
                          url: link
                        }).catch((err) => {
                          if (err.name !== 'AbortError' && !err.message?.includes('canceled')) {
                            console.error('Error sharing:', err);
                          }
                        });
                      } else {
                        navigator.clipboard.writeText(link);
                        toast.success("Havola nusxalandi!");
                      }
                      closeShare();
                    }}
                    className="flex-1 py-3 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Share2 size={16} />
                    <span className="font-bold text-xs uppercase tracking-widest">Ulashish</span>
                  </button>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2">
                <p className="px-2 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-blue-500 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">Chatlar</p>
                {sellers.map(seller => (
                  <button
                    key={seller.id}
                    onClick={() => handleConfirmShare(seller.id)}
                    className="w-full p-3 flex items-center gap-4 hover:bg-text-primary/5 rounded-2xl transition-all active:scale-[0.98]"
                  >
                    <img src={seller.logo} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 text-left">
                      <p className="font-black text-text-primary">{seller.name}</p>
                      <p className="text-xs text-text-secondary">Oxirgi xabar...</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                      <Mail size={18} />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSplash ? (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        ) : (
          <motion.div 
            key="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative h-full w-full flex flex-col overflow-hidden"
          >

            <svg width="0" height="0" className="absolute">
              <defs>
                <linearGradient id="header-blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#22D3EE" />
                </linearGradient>
              </defs>
            </svg>
            <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border-primary bg-header-bg z-50">
              <div className="flex items-center justify-between w-full relative">
                {/* Left Side */}
                <div className="flex items-center gap-4">
                  <Logo width={44} height={44} animated={false} />
                </div>


                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
                  <h1 className="text-[32px] font-cursive font-bold italic bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                    AlphaSpace
                  </h1>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-4">
                  {workspace === 'Marketplace' && (
                    <>
                      <button 
                        onClick={() => {
                          // Open messages with history
                          setActiveTab('Profile');
                          setProfileSubView('chats');
                          setUnreadMessages(0);
                          window.history.pushState({ 
                            type: 'profileSubView', 
                            subView: 'chats',
                            workspace,
                            activeTab: 'Profile'
                          }, '');
                        }}
                        className="relative flex flex-col items-center gap-0.5 p-1 hover:bg-accent-blue/5 rounded-xl transition-all active:scale-95"
                      >
                        <RealisticBlueMessageIcon active={true} size={36} />
                        <span className="text-[8px] font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest mt-0.5">Xabarlar</span>
                        {unreadMessages > 0 && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-header-bg shadow-lg"
                          >
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                          </motion.div>
                        )}
                      </button>
                    </>
                  )}
                  {workspace === 'Shop' && (
                    <button 
                      onClick={() => setShowShopSelector(true)}
                      className="relative flex flex-col items-center gap-0.5 p-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl hover:bg-white/20 transition-all active:scale-95 shadow-lg group min-w-[70px]"
                    >
                      <div className="flex -space-x-3 items-center">
                        {userShops.slice(0, 3).map((shop, i) => (
                          <motion.div
                            key={`header-shop-${shop.id}`}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="relative"
                            style={{ zIndex: 10 - i }}
                          >
                            <img 
                              src={shop.logo || `https://picsum.photos/seed/${shop.id}/100/100`} 
                              className="w-5 h-5 rounded-full border border-header-bg object-cover shadow-sm group-hover:scale-110 transition-transform" 
                              alt={shop.name}
                              referrerPolicy="no-referrer"
                            />
                          </motion.div>
                        ))}
                        {userShops.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-accent-blue/20 backdrop-blur-md border border-header-bg flex items-center justify-center text-[7px] font-black text-white z-0">
                            +{userShops.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-[7px] font-black text-white uppercase tracking-widest">Do'konlar</span>
                    </button>
                  )}
                </div>
              </div>
            </header>

            {/* Main Content Container */}
            <main className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {workspace === 'Shop' && userShop ? (
                  <motion.div
                    key="shop-workspace"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full"
                  >
                    <ShopWorkspace 
                      language={language} 
                      shopData={userShop} 
                      user={user}
                      posts={postsWithUserStatus.filter(p => p.seller?.id === userShop.id || (p as any).sellerId === userShop.id)}
                      onBackToMarketplace={() => handleWorkspaceChange('Marketplace')} 
                      onUpdateShop={(updatedShop) => {
                        setUserShop(updatedShop);
                        setSellers(prev => prev.map(s => s.id === updatedShop.id ? updatedShop : s));
                      }}
                      activeTab={shopWorkspaceTab}
                      setActiveTab={setShopWorkspaceTab}
                      activeChatId={shopWorkspaceChatId}
                      setActiveChatId={setShopWorkspaceChatId}
                      onOpenReels={(postsList, index) => openReels(postsList, index)}
                    />
                  </motion.div>
                ) : activeTab === 'Home' ? (
                  <motion.div
                    key="feed"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full"
                  >
                    <Feed 
                      posts={filteredPosts} 
                      stories={storiesWithUserStatus}
                      onToggleLike={toggleLike}
                      onToggleSave={toggleSave}
                      onToggleSubscribe={toggleSubscribe}
                      onMarkStoryViewed={markStoryViewed}
                      onOpenStories={openStories}
                      onOpenLive={handleOpenLive}
                      onOpenReels={openReels}
                      onOpenShopProfile={openShopProfile}
                      onOpenPostDetails={openPostDetails}
                      onOpenPostComments={openPostComments}
                      onOpenChat={handleOpenChat}
                      onSharePost={handleSharePost}
                      onRefresh={handleRefresh}
                      language={language}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      onSearchActive={handleSearchActive}
                      isSearchActive={isSearchActive}
                      globalMuted={globalMuted}
                      setGlobalMuted={setGlobalMuted}
                      isGlobalPaused={
                        activeReelIndex !== null || 
                        activeStoryIndex !== null || 
                        activeLiveStream !== null || 
                        selectedPostForDetails !== null || 
                        selectedShopId !== null ||
                        selectedPostForComments !== null
                      }
                    />
                  </motion.div>
                ) : activeTab === 'Brands' ? (
                  <motion.div
                    key="brands-tab"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="h-full"
                  >
                    <Brands 
                      language={language} 
                      stories={storiesWithUserStatus} 
                      sellers={sellersWithUserStatus}
                      posts={postsWithUserStatus}
                      onToggleSubscribe={toggleSubscribe}
                      onMarkStoryViewed={markStoryViewed}
                      onOpenStories={openStories}
                      onOpenLive={handleOpenLive}
                      onOpenShopProfile={openShopProfile}
                      onRefresh={handleBrandsRefresh}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      onSearchActive={handleSearchActive}
                      isSearchActive={isSearchActive}
                    />
                  </motion.div>
                ) : activeTab === 'Search' ? (
                  <motion.div
                    key="search-ai"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="h-full"
                  >
                    <SearchAI 
                      language={language} 
                      messages={aiMessages}
                      setMessages={setAiMessages}
                      foundPosts={aiFoundPosts}
                      setFoundPosts={setAiFoundPosts}
                      foundSellers={aiFoundSellers}
                      setFoundSellers={setAiFoundSellers}
                      onOpenPostDetails={openPostDetails}
                      onOpenShopProfile={openShopProfile}
                      allPosts={postsWithUserStatus}
                      allSellers={sellersWithUserStatus}
                      initialQuery={aiInitialQuery}
                      onClearInitialQuery={() => setAiInitialQuery(undefined)}
                    />
                  </motion.div>
                ) : activeTab === 'Live' ? (
                  <motion.div
                    key="live-map"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="h-full"
                  >
                    <LiveMap 
                      language={language} 
                      onOpenShopProfile={openShopProfile} 
                      onSearchActive={handleSearchActive}
                      isSearchActive={isSearchActive}
                      sellers={sellersWithUserStatus}
                      currentUserUid={user?.uid}
                    />
                  </motion.div>
                ) : activeTab === 'Profile' ? (
                  <motion.div
                    key="profile-tab"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <Profile 
                      language={language} 
                      setLanguage={setLanguage} 
                      savedPosts={postsWithUserStatus.filter(p => p.isSaved)}
                      subscribedSellers={sellersWithUserStatus.filter(s => s.isSubscribed)}
                      onToggleLike={toggleLike}
                      onToggleSave={toggleSave}
                      onOpenShop={handleOpenShop}
                      onOpenShopProfile={openShopProfile}
                      onOpenPostDetails={openPostDetails}
                      onToggleSubscribe={toggleSubscribe}
                      onOpenChat={handleOpenChat}
                      likedPosts={postsWithUserStatus.filter(p => p.isLiked)}
                      recentlyViewedPosts={recentlyViewedPosts}
                      hasShop={hasShop}
                      subView={profileSubView}
                      setSubView={setProfileSubView}
                      user={user}
                      onLogin={signInWithGoogle}
                      onEmailLogin={handleEmailLogin}
                      onResetPassword={handleResetPassword}
                      onLogout={logout}
                      initialChatSellerId={initialChatSellerId}
                      initialChatProduct={initialChatProduct}
                      sentPosts={sentPosts}
                      setSentPosts={setSentPosts}
                      onOpenShopSelector={() => setShowShopSelector(true)}
                      userShops={userShops}
                      workspace={workspace}
                      onActiveChatSellerIdChange={setProfileActiveChatSellerId}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="other"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-xs"
                  >
                    {t.soon}
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Bottom Navigation */}
            {workspace === 'Marketplace' && !profileActiveChatSellerId && (
              <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} language={language} user={user} />
            )}

            {/* Global Viewers */}
            <AnimatePresence>
              {activeLiveStream && (
                <LiveStreamViewer 
                  story={activeLiveStream} 
                  onClose={closeLiveStream}
                  onOpenShopProfile={(shopId) => {
                    closeLiveStream();
                    openShopProfile(shopId);
                  }}
                  onProductClick={(product) => {
                    closeLiveStream();
                    setSelectedPostForDetails(product);
                  }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeStoryIndex !== null && (
                <StoryViewer
                  key="global-story-viewer"
                  stories={activeStoryList}
                  initialIndex={activeStoryIndex}
                  onClose={closeStories}
                  onMarkViewed={markStoryViewed}
                  onToggleLike={toggleLike}
                  onOpenShopProfile={(shopId) => {
                    setActiveStoryIndex(null);
                    openShopProfile(shopId);
                  }}
                  onOpenChat={handleOpenChat}
                  language={language}
                  allPosts={postsWithUserStatus}
                  allStories={stories}
                  user={user}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeReelIndex !== null && (
                <ReelsViewer
                  key="global-reels-viewer"
                  posts={activeReelList}
                  initialIndex={activeReelIndex}
                  onClose={closeReels}
                  onToggleLike={toggleLike}
                  onToggleSave={toggleSave}
                  onToggleSubscribe={toggleSubscribe}
                  onOpenShopProfile={(shopId) => {
                    setActiveReelIndex(null);
                    openShopProfile(shopId);
                  }}
                  onOpenChat={handleOpenChat}
                  onSharePost={handleSharePost}
                  language={language}
                  globalMuted={globalMuted}
                  setGlobalMuted={setGlobalMuted}
                  allPosts={postsWithUserStatus}
                  user={user}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedShopId && selectedSeller && (
                <ShopProfile
                  seller={selectedSeller}
                  posts={sellerPosts}
                  isOpen={!!selectedShopId}
                  onClose={closeShopProfile}
                  onToggleSubscribe={toggleSubscribe}
                  onOpenChat={handleOpenChat}
                  onOpenPostDetails={(postsList, index) => openReels(postsList, index)}
                  language={language}
                  allPosts={postsWithUserStatus}
                  lastViewedPostId={lastViewedPostId}
                />
              )}
            </AnimatePresence>

            {selectedPostForComments && (
              <CommentDrawer 
                isOpen={!!selectedPostForComments} 
                onClose={closePostComments} 
                postId={selectedPostForComments.id}
                postTitle={selectedPostForComments.seller.name}
                user={user}
              />
            )}

            <AnimatePresence>
              {selectedPostForDetails && (
                <ProductDetails 
                  post={selectedPostForDetails} 
                  onClose={closePostDetails} 
                  onOpenShopProfile={openShopProfile}
                  onMessage={handleOpenChat}
                  onAskAI={handleAskAI}
                  onSharePost={handleSharePost}
                  language={language}
                  allPosts={postsWithUserStatus}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shop Selector Modal */}
      <AnimatePresence>
        {showShopSelector && (
          <div className="absolute inset-0 z-[20000] flex items-end justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg bg-white/10 backdrop-blur-2xl border-t sm:border border-white/20 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-accent-blue/20 rounded-2xl">
                    <Store size={24} className="text-accent-blue" />
                  </div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Do'konlar</h3>
                </div>
                <button 
                  onClick={() => setShowShopSelector(false)}
                  className="p-2 bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {/* Marketplace Option */}
                <button
                  onClick={() => {
                    handleWorkspaceChange('Marketplace');
                    setShowShopSelector(false);
                  }}
                  className={`w-full p-6 rounded-[2.5rem] border flex items-center gap-4 transition-all active:scale-[0.98] ${
                    workspace === 'Marketplace'
                      ? 'bg-accent-blue border-accent-blue/30 shadow-lg shadow-accent-blue/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-4 rounded-2xl ${workspace === 'Marketplace' ? 'bg-white text-accent-blue' : 'bg-accent-blue/20 text-accent-blue'}`}>
                    <Zap size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className={`text-lg font-black uppercase tracking-tight ${workspace === 'Marketplace' ? 'text-white' : 'text-white/80'}`}>Marketplace</h4>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${workspace === 'Marketplace' ? 'text-white/60' : 'text-white/40'}`}>Asosiy bozor</p>
                  </div>
                  {workspace === 'Marketplace' && <CheckCircle2 size={24} className="text-white" />}
                </button>

                <div className="h-px bg-white/10 mx-4 my-2" />

                {/* Shop List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-4 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Mening do'konlarim</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-blue">{userShops.length} ta</span>
                  </div>
                  
                  {userShops
                    .sort((a, b) => {
                      // Sort by creation date (if available)
                      const dateA = a.createdAt?.seconds || 0;
                      const dateB = b.createdAt?.seconds || 0;
                      return dateB - dateA; // Newest first
                    })
                    .map((shop) => (
                      <button
                        key={shop.id}
                        onClick={() => {
                          setUserShop(shop);
                          handleWorkspaceChange('Shop');
                          setShowShopSelector(false);
                        }}
                        className={`w-full p-5 rounded-[2.5rem] border flex items-center gap-4 transition-all active:scale-[0.98] ${
                          workspace === 'Shop' && userShop?.id === shop.id
                            ? 'bg-white/20 border-white/30 shadow-xl'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="relative">
                          <img 
                            src={shop.logo || `https://picsum.photos/seed/${shop.id}/100/100`} 
                            className="w-14 h-14 rounded-2xl object-cover border border-white/20" 
                            alt={shop.name}
                            referrerPolicy="no-referrer"
                          />
                          {workspace === 'Shop' && userShop?.id === shop.id && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="text-base font-black uppercase tracking-tight text-white">{shop.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                              {new Date((shop.createdAt?.seconds || 0) * 1000).toLocaleDateString()}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[9px] font-bold text-accent-blue uppercase tracking-widest">Aktiv</span>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>

                {/* Create New Shop Button */}
                <button
                  onClick={() => {
                    setIsCreatingShop(true);
                    setShowShopSelector(false);
                  }}
                  className="w-full p-5 rounded-[2.5rem] border-2 border-dashed border-white/20 flex items-center justify-center gap-3 text-white/40 hover:text-white hover:border-white/40 transition-all active:scale-[0.98] mt-4"
                >
                  <Plus size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Yangi do'kon ochish</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        body {
          font-family: 'Inter', sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          overflow: hidden;
          margin: 0;
        }
      `}</style>
        </div>
      </div>
    </div>
  );
}
