export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'buyer' | 'seller' | 'admin';
  hasShop: boolean;
  shopId?: string;
}

export interface Story {
  id: string;
  seller: Seller;
  videoUrl: string;
  price: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
  isViewed?: boolean;
  isLive?: boolean;
  poll?: {
    question: string;
    options: string[];
    votes: number[];
    userVote?: number;
  };
  createdAt?: any;
  expiresAt?: any;
}

export type SellerCategory = 
  | 'Erkaklar kiyinishi'
  | 'Ayollar kiyinishi'
  | 'Aksessuarlar'
  | 'Texnika'
  | 'Go‘zallik'
  | 'Xonadon'
  | 'Xizmatlar'
  | 'Boshqa';

export const SELLER_CATEGORIES: SellerCategory[] = [
  'Erkaklar kiyinishi',
  'Ayollar kiyinishi',
  'Aksessuarlar',
  'Texnika',
  'Go‘zallik',
  'Xonadon',
  'Xizmatlar',
  'Boshqa'
];

export interface Seller {
  id: string;
  name: string;
  logo: string;
  hasStory: boolean;
  followers: number;
  categories: SellerCategory[];
  status?: 'active' | 'frozen';
  location?: {
    lat: number;
    lng: number;
  };
  workingHours?: string;
  workingDays?: string[];
  phone?: string;
  telegram?: string;
  instagram?: string;
  description?: string;
  isSubscribed?: boolean;
  region?: string; // e.g., 'Chilonzor', 'Yunusobod', 'Mirobod'
  coverImage?: string;
  isVerified?: boolean;
  rating?: number;
  styleMatch?: number;
  ownerUid?: string;
  createdAt?: any;
  type?: string;
}

export interface Review {
  id: string;
  user: string;
  avatar?: string;
  rating: number;
  text: string;
  date: string;
}

export interface PostData {
  id: string;
  seller: Seller;
  mediaType: 'video' | 'carousel';
  mediaUrls: string[];
  outfitName: string;
  description?: string;
  price: string;
  priceMessage?: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
  isSaved?: boolean;
  rating?: number;
  reviewsCount?: number;
  reviews?: Review[];
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  inStock?: boolean;
  aiMetadata?: {
    color?: string;
    category?: string;
    style?: string;
    description?: string;
    tags?: string[];
  };
  instagramUrl?: string;
  thumbnailUrl?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  images?: string[];
  imageDescriptions?: string[];
  audio?: string;
}
