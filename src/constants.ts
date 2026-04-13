import { PostData, Seller, Story } from './types';

export const MOCK_POSTS: PostData[] = [
  {
    id: '1',
    seller: {
      id: 's1',
      name: 'Maison de Luxe',
      logo: 'https://picsum.photos/seed/shop1/200',
      hasStory: true,
      followers: 12500,
      categories: ['Erkaklar kiyinishi'],
      location: { lat: 41.311081, lng: 69.240562 },
      workingHours: 'Dush-Shan: 09:00 - 20:00, Yak: 10:00 - 18:00',
      phone: '+998 90 123 45 67',
      telegram: 'maison_luxe',
      instagram: 'maison_luxe_official',
      description: 'Eksklyuziv frantsuz modasi va aksessuarlari.',
      region: 'Mirobod'
    },
    mediaType: 'video',
    mediaUrls: ['https://assets.mixkit.co/videos/preview/mixkit-fashion-model-walking-on-the-street-1219-large.mp4'],
    outfitName: 'Autumn Elegance Collection',
    price: '32 000 000 so\'m',
    items: [
      { id: 'i1', type: 'jacket', name: 'Cashmere Overcoat', price: '15 000 000 so\'m', store: 'Luxe Boutique' },
      { id: 'i2', type: 'pants', name: 'Silk Trousers', price: '11 000 000 so\'m', store: 'Silk & Co' },
      { id: 'i3', type: 'shoes', name: 'Leather Loafers', price: '6 000 000 so\'m', store: 'Footwear Elite' },
    ],
    likes: 1240,
    comments: 84,
    rating: 4.8,
    reviewsCount: 124,
    inStock: true,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Qora', hex: '#000000' },
      { name: 'To\'q ko\'k', hex: '#1a237e' },
      { name: 'Kulrang', hex: '#9e9e9e' }
    ],
    reviews: [
      { id: 'r1', user: 'Azizbek', rating: 5, text: 'Sifati juda zo\'r, kutilganidan ham yaxshi chiqdi.', date: '2024-03-20' },
      { id: 'r2', user: 'Malika', rating: 4, text: 'Chiroyli, lekin o\'lchami biroz kichikroq ekan.', date: '2024-03-15' }
    ]
  },
  {
    id: '2',
    seller: {
      id: 's2',
      name: 'Avenue Montaigne',
      logo: 'https://picsum.photos/seed/shop2/200',
      hasStory: true,
      followers: 45000,
      categories: ['Ayollar kiyinishi'],
      location: { lat: 41.315081, lng: 69.245562 },
      workingHours: 'Har kuni: 10:00 - 22:00',
      phone: '+998 91 234 56 78',
      telegram: 'avenue_montaigne',
      instagram: 'avenue_montaigne_uz',
      description: 'Yuqori sifatli kiyimlar va poyabzallar.',
      region: 'Yunusobod'
    },
    mediaType: 'carousel',
    mediaUrls: [
      'https://picsum.photos/seed/post2a/1080/1080',
      'https://picsum.photos/seed/post2b/1080/1080',
      'https://picsum.photos/seed/post2c/1080/1080',
    ],
    outfitName: 'Midnight Gala Set',
    price: '48 000 000 so\'m',
    items: [
      { id: 'i4', type: 'shirt', name: 'Evening Tuxedo Shirt', price: '8 000 000 so\'m', store: 'Avenue M' },
      { id: 'i5', type: 'pants', name: 'Velvet Trousers', price: '15 000 000 so\'m', store: 'Avenue M' },
      { id: 'i6', type: 'jacket', name: 'Velvet Blazer', price: '25 000 000 so\'m', store: 'Avenue M' },
    ],
    likes: 856,
    comments: 42,
    rating: 4.9,
    reviewsCount: 86,
    inStock: true,
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Qizil', hex: '#d32f2f' },
      { name: 'Oltin', hex: '#ffd700' }
    ],
    reviews: [
      { id: 'r3', user: 'Jasur', rating: 5, text: 'Dizayni daxshat, hamma havas qilyapti.', date: '2024-03-10' }
    ]
  },
  {
    id: '3',
    seller: {
      id: 's3',
      name: 'Riviera Style',
      logo: 'https://picsum.photos/seed/shop3/200',
      hasStory: false,
      followers: 8200,
      categories: ['Aksessuarlar'],
      location: { lat: 41.305081, lng: 69.235562 },
      workingHours: 'Dush-Jum: 09:00 - 19:00',
      phone: '+998 93 345 67 89',
      telegram: 'riviera_style',
      instagram: 'riviera_style_fashion',
      description: 'Yozgi va dam olish kiyimlari to\'plami.',
      region: 'Chilonzor'
    },
    mediaType: 'video',
    mediaUrls: ['https://assets.mixkit.co/videos/preview/mixkit-young-woman-walking-on-a-sunny-day-1221-large.mp4'],
    outfitName: 'Summer Breeze Linen',
    price: '15 000 000 so\'m',
    items: [
      { id: 'i7', type: 'shirt', name: 'Linen Shirt', price: '4 500 000 so\'m', store: 'Riviera' },
      { id: 'i8', type: 'pants', name: 'Linen Shorts', price: '3 500 000 so\'m', store: 'Riviera' },
      { id: 'i9', type: 'shoes', name: 'Espadrilles', price: '7 000 000 so\'m', store: 'Riviera' },
    ],
    likes: 2100,
    comments: 156,
    rating: 4.5,
    reviewsCount: 210,
    inStock: false,
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'Oq', hex: '#ffffff' },
      { name: 'Bej', hex: '#f5f5dc' }
    ]
  },
  {
    id: '4',
    seller: {
      id: 's4',
      name: 'Urban Elite',
      logo: 'https://picsum.photos/seed/shop4/200',
      hasStory: true,
      followers: 23400,
      categories: ['Texnika'],
      location: { lat: 41.321081, lng: 69.250562 },
      workingHours: '10:00 - 20:00',
      phone: '+998 94 456 78 90',
      region: 'Yunusobod'
    },
    mediaType: 'video',
    mediaUrls: ['https://assets.mixkit.co/videos/preview/mixkit-fashion-model-posing-in-a-studio-1220-large.mp4'],
    outfitName: 'Cyberpunk Techwear',
    price: '25 000 000 so\'m',
    items: [
      { id: 'i10', type: 'jacket', name: 'Neon Jacket', price: '12 000 000 so\'m', store: 'Urban Elite' },
      { id: 'i11', type: 'pants', name: 'Cargo Pants', price: '8 000 000 so\'m', store: 'Urban Elite' },
      { id: 'i12', type: 'shoes', name: 'Tech Sneakers', price: '5 000 000 so\'m', store: 'Urban Elite' },
    ],
    likes: 3400,
    comments: 210,
    rating: 4.7,
    reviewsCount: 340,
    inStock: true,
    sizes: ['S', 'M', 'L'],
    colors: [
      { name: 'Neon Yashil', hex: '#39ff14' },
      { name: 'Qora', hex: '#000000' }
    ]
  },
  {
    id: '5',
    seller: {
      id: 's6',
      name: 'Milan Moda',
      logo: 'https://picsum.photos/seed/shop6/200',
      hasStory: true,
      followers: 31200,
      categories: ['Xonadon'],
      location: { lat: 41.331081, lng: 69.260562 },
      workingHours: '10:00 - 20:00',
      phone: '+998 97 678 90 12',
      region: 'Chilonzor'
    },
    mediaType: 'video',
    mediaUrls: ['https://assets.mixkit.co/videos/preview/mixkit-woman-walking-in-a-park-1222-large.mp4'],
    outfitName: 'Casual Spring Look',
    price: '12 000 000 so\'m',
    items: [
      { id: 'i13', type: 'shirt', name: 'Floral Blouse', price: '3 000 000 so\'m', store: 'Milan Moda' },
      { id: 'i14', type: 'pants', name: 'White Jeans', price: '4 000 000 so\'m', store: 'Milan Moda' },
      { id: 'i15', type: 'shoes', name: 'Sandals', price: '5 000 000 so\'m', store: 'Milan Moda' },
    ],
    likes: 1800,
    comments: 95,
    rating: 4.6,
    reviewsCount: 180,
    inStock: true,
    sizes: ['S', 'M', 'L'],
    colors: [
      { name: 'Pushti', hex: '#ffc0cb' },
      { name: 'Oq', hex: '#ffffff' }
    ]
  }
];

export const MOCK_SELLERS: Seller[] = [
  { 
    id: 's1', 
    name: 'Maison de Luxe', 
    logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=100&auto=format&fit=crop', 
    hasStory: true, 
    followers: 12500, 
    categories: ['Erkaklar kiyinishi'],
    location: { lat: 41.311081, lng: 69.240562 },
    workingHours: 'Dush-Shan: 09:00 - 20:00, Yak: 10:00 - 18:00',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    phone: '+998 90 123 45 67',
    telegram: 'maison_luxe',
    instagram: 'maison_luxe_official',
    description: 'Eksklyuziv frantsuz modasi va aksessuarlari.',
    region: 'Mirobod',
    coverImage: 'https://picsum.photos/seed/cover1/800/400',
    isVerified: true
  },
  { 
    id: 's2', 
    name: 'Avenue Montaigne', 
    logo: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=100&auto=format&fit=crop', 
    hasStory: true, 
    followers: 45000, 
    categories: ['Ayollar kiyinishi'],
    location: { lat: 41.315081, lng: 69.245562 },
    workingHours: 'Har kuni: 10:00 - 22:00',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    phone: '+998 91 234 56 78',
    telegram: 'avenue_montaigne',
    instagram: 'avenue_montaigne_uz',
    description: 'Yuqori sifatli kiyimlar va poyabzallar.',
    region: 'Yunusobod',
    coverImage: 'https://picsum.photos/seed/cover2/800/400',
    isVerified: true
  },
  { 
    id: 's3', 
    name: 'Riviera Style', 
    logo: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=100&auto=format&fit=crop', 
    hasStory: false, 
    followers: 8200, 
    categories: ['Aksessuarlar'],
    location: { lat: 41.305081, lng: 69.235562 },
    workingHours: 'Dush-Jum: 09:00 - 19:00',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    phone: '+998 93 345 67 89',
    telegram: 'riviera_style',
    instagram: 'riviera_style_fashion',
    description: 'Yozgi va dam olish kiyimlari to\'plami.',
    region: 'Chilonzor',
    coverImage: 'https://picsum.photos/seed/cover3/800/400',
    isVerified: false
  },
  { id: 's4', name: 'Urban Elite', logo: 'https://picsum.photos/seed/shop4/200', hasStory: true, followers: 23400, categories: ['Texnika'], location: { lat: 41.321081, lng: 69.250562 }, workingHours: '10:00 - 20:00', phone: '+998 94 456 78 90', region: 'Yunusobod', coverImage: 'https://picsum.photos/seed/cover4/800/400', isVerified: true },
  { id: 's5', name: 'Parisian Chic', logo: 'https://picsum.photos/seed/shop5/200', hasStory: false, followers: 15600, categories: ['Go‘zallik'], location: { lat: 41.301081, lng: 69.220562 }, workingHours: '10:00 - 20:00', phone: '+998 95 567 89 01', region: 'Mirobod', coverImage: 'https://picsum.photos/seed/cover5/800/400', isVerified: false },
  { id: 's6', name: 'Milan Moda', logo: 'https://picsum.photos/seed/shop6/200', hasStory: true, followers: 31200, categories: ['Xonadon'], location: { lat: 41.331081, lng: 69.260562 }, workingHours: '10:00 - 20:00', phone: '+998 97 678 90 12', region: 'Chilonzor', coverImage: 'https://picsum.photos/seed/cover6/800/400', isVerified: true },
  { id: 's7', name: 'Nordic Minimal', logo: 'https://picsum.photos/seed/shop7/200', hasStory: false, followers: 5400, categories: ['Xizmatlar'], location: { lat: 41.291081, lng: 69.210562 }, workingHours: '10:00 - 20:00', phone: '+998 98 789 01 23', region: 'Shayxontohur', coverImage: 'https://picsum.photos/seed/cover7/800/400', isVerified: false },
  { id: 's8', name: 'Tokyo Trend', logo: 'https://picsum.photos/seed/shop8/200', hasStory: true, followers: 18900, categories: ['Boshqa'], location: { lat: 41.341081, lng: 69.270562 }, workingHours: '10:00 - 20:00', phone: '+998 99 890 12 34', region: 'Yunusobod', coverImage: 'https://picsum.photos/seed/cover8/800/400', isVerified: true },
  { id: 's9', name: 'Sergeli Style', logo: 'https://picsum.photos/seed/shop9/200', hasStory: true, followers: 12000, categories: ['Kiyim'], location: { lat: 41.221081, lng: 69.210562 }, workingHours: '10:00 - 20:00', phone: '+998 90 999 88 77', region: 'Sergeli', coverImage: 'https://picsum.photos/seed/cover9/800/400', isVerified: false },
];

export const MOCK_STORIES: Story[] = [
  {
    id: 'st-live',
    seller: MOCK_SELLERS[0],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-walking-on-the-street-1219-large.mp4',
    price: '29 000 so\'m/soat',
    likes: 1200,
    comments: 45,
    isLive: true,
    poll: {
      question: 'Sizga qaysi rang yoqadi?',
      options: ['Qora', 'Oq'],
      votes: [120, 85]
    }
  },
  {
    id: 'st1',
    seller: MOCK_SELLERS[0],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-walking-on-the-street-1219-large.mp4',
    price: '15 000 000 so\'m',
    likes: 1200,
    comments: 45,
    poll: {
      question: 'Yangi kolleksiya yoqdimi?',
      options: ['Ha', 'Yo\'q'],
      votes: [450, 20]
    }
  },
  {
    id: 'st2',
    seller: MOCK_SELLERS[1],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-walking-on-a-sunny-day-1221-large.mp4',
    price: '22 000 000 so\'m',
    likes: 850,
    comments: 32
  },
  {
    id: 'st3',
    seller: MOCK_SELLERS[3],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-posing-in-a-studio-1220-large.mp4',
    price: '18 500 000 so\'m',
    likes: 2100,
    comments: 112
  },
  {
    id: 'st4',
    seller: MOCK_SELLERS[5],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-walking-in-a-park-1222-large.mp4',
    price: '9 800 000 so\'m',
    likes: 540,
    comments: 18
  }
];
