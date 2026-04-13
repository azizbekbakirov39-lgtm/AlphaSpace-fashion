import { db, collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from './firebase';

const MOCK_SHOPS = [
  {
    name: "Terra Pro",
    logo: "https://picsum.photos/seed/shop1/200",
    type: "Erkaklar kiyimi",
    rating: 4.9,
    followers: 12500,
    region: "Toshkent",
    description: "Zamonaviy va sifatli erkaklar kiyimlari do'koni.",
    phone: "+998901234567",
    telegram: "terrapro_uz",
    instagram: "terrapro.uz",
    location: { lat: 41.2858, lng: 69.2035 }
  },
  {
    name: "Selfie",
    logo: "https://picsum.photos/seed/shop2/200",
    type: "Ayollar kiyimi",
    rating: 4.8,
    followers: 8900,
    region: "Samarqand",
    description: "Har bir ayol uchun nafis va zamonaviy obrazlar.",
    phone: "+998911234567",
    telegram: "selfie_uz",
    instagram: "selfie.uz",
    location: { lat: 39.6270, lng: 66.9750 }
  },
  {
    name: "Vicco",
    logo: "https://picsum.photos/seed/shop3/200",
    type: "Bolalar kiyimi",
    rating: 4.7,
    followers: 5600,
    region: "Namangan",
    description: "Bolajonlar uchun eng qulay va rang-barang kiyimlar.",
    phone: "+998931234567",
    telegram: "vicco_kids",
    instagram: "vicco_uz",
    location: { lat: 41.0001, lng: 71.6726 }
  },
  {
    name: "Penti",
    logo: "https://picsum.photos/seed/shop4/200",
    type: "Ichki kiyimlar",
    rating: 4.9,
    followers: 15000,
    region: "Farg'ona",
    description: "Sifat va qulaylik uyg'unligi.",
    phone: "+998941234567",
    telegram: "penti_uz",
    instagram: "penti.uz",
    location: { lat: 40.3833, lng: 71.7833 }
  },
  {
    name: "LC Waikiki",
    logo: "https://picsum.photos/seed/shop5/200",
    type: "Oilaviy kiyimlar",
    rating: 4.6,
    followers: 45000,
    region: "Buxoro",
    description: "Hamma uchun hamyonbop va zamonaviy kiyimlar.",
    phone: "+998951234567",
    telegram: "lcwaikiki_uz",
    instagram: "lcwaikiki.uz",
    location: { lat: 39.7747, lng: 64.4286 }
  },
  {
    name: "Just",
    logo: "https://picsum.photos/seed/shop6/200",
    type: "Sport kiyimlari",
    rating: 4.8,
    followers: 7200,
    region: "Andijon",
    description: "Sport va faol hayot tarzi uchun kiyimlar.",
    phone: "+998971234567",
    telegram: "just_sport",
    instagram: "just_uz",
    location: { lat: 40.7833, lng: 72.3333 }
  },
  {
    name: "Basconi",
    logo: "https://picsum.photos/seed/shop7/200",
    type: "Oyoq kiyimlar",
    rating: 4.9,
    followers: 11000,
    region: "Toshkent",
    description: "Italiya dizayni va yuqori sifatli poyabzallar.",
    phone: "+998981234567",
    telegram: "basconi_uz",
    instagram: "basconi.uz",
    location: { lat: 41.3111, lng: 69.2406 }
  },
  {
    name: "RedTag",
    logo: "https://picsum.photos/seed/shop8/200",
    type: "Universal",
    rating: 4.5,
    followers: 22000,
    region: "Qarshi",
    description: "Har kunlik kiyimlar va aksessuarlar.",
    phone: "+998991234567",
    telegram: "redtag_uz",
    instagram: "redtag.uz",
    location: { lat: 38.8667, lng: 65.8000 }
  },
  {
    name: "AVVA",
    logo: "https://picsum.photos/seed/shop9/200",
    type: "Klassik erkaklar kiyimi",
    rating: 4.8,
    followers: 9500,
    region: "Xiva",
    description: "Klassik uslub va zamonaviy erkak qiyofasi.",
    phone: "+998907654321",
    telegram: "avva_uz",
    instagram: "avva.uz",
    location: { lat: 41.3783, lng: 60.3639 }
  },
  {
    name: "Batik",
    logo: "https://picsum.photos/seed/shop10/200",
    type: "Milliy kiyimlar",
    rating: 4.9,
    followers: 13000,
    region: "Marg'ilon",
    description: "Milliy matolar va zamonaviy dizayn uyg'unligi.",
    phone: "+998917654321",
    telegram: "batik_uz",
    instagram: "batik.uz",
    location: { lat: 40.4667, lng: 71.7333 }
  }
];

const MOCK_POSTS = [
  {
    outfitName: "Klassik Kostyum-shim",
    price: "1,200,000 so'm",
    description: "To'ylar va rasmiy uchrashuvlar uchun ideal tanlov. Yuqori sifatli jun matodan tikilgan, qulay va nafis dizayn.",
    mediaUrls: ["https://picsum.photos/seed/post1/800/1000"],
    type: "clothing",
    category: "Kostyumlar",
    sizes: ["48", "50", "52", "54"],
    colors: [{ name: "To'q ko'k", hex: "#000080" }, { name: "Qora", hex: "#000000" }]
  },
  {
    outfitName: "Yozgi Ko'ylak",
    price: "350,000 so'm",
    description: "Yengil va havo o'tkazuvchi tabiiy paxta matosidan tikilgan yozgi ko'ylak. Kundalik sayrlar uchun juda mos.",
    mediaUrls: ["https://picsum.photos/seed/post2/800/1000"],
    type: "clothing",
    category: "Ko'ylaklar",
    sizes: ["S", "M", "L"],
    colors: [{ name: "Oq", hex: "#FFFFFF" }, { name: "Pushti", hex: "#FFC0CB" }]
  },
  {
    outfitName: "Sportivka Nike Tech",
    price: "450,000 so'm",
    description: "Sport bilan shug'ullanish va kundalik kiyish uchun qulay. Nike Tech Fleece texnologiyasi asosida tayyorlangan.",
    mediaUrls: ["https://picsum.photos/seed/post3/800/1000"],
    type: "clothing",
    category: "Sport",
    sizes: ["M", "L", "XL"],
    colors: [{ name: "Kulrang", hex: "#808080" }, { name: "Qora", hex: "#000000" }]
  },
  {
    outfitName: "Krossovka Adidas Ultraboost",
    price: "850,000 so'm",
    description: "Yangi kolleksiya, juda qulay va chidamli. Yugurish va uzoq masofaga piyoda yurish uchun maxsus ishlab chiqilgan.",
    mediaUrls: ["https://picsum.photos/seed/post4/800/1000"],
    type: "clothing",
    category: "Oyoq kiyim",
    sizes: ["40", "41", "42", "43"],
    colors: [{ name: "Qizil", hex: "#FF0000" }, { name: "Qora", hex: "#000000" }]
  },
  {
    outfitName: "Djinsoviy Kurtka Levi's",
    price: "550,000 so'm",
    description: "Bahorgi mavsum uchun zamonaviy djinsoviy kurtka. Klassik uslub va yuqori sifatli denim matosi.",
    mediaUrls: ["https://picsum.photos/seed/post5/800/1000"],
    type: "clothing",
    category: "Kurtkalar",
    sizes: ["M", "L", "XL"],
    colors: [{ name: "Ko'k", hex: "#0000FF" }]
  },
  {
    outfitName: "Smart Watch Series 8",
    price: "3,200,000 so'm",
    description: "Sog'lig'ingizni nazorat qilish va doimo aloqada bo'lish uchun eng yaxshi yordamchi. Suvga chidamli va ko'plab funksiyalarga ega.",
    mediaUrls: ["https://picsum.photos/seed/post6/800/1000"],
    type: "electronics",
    category: "Texnika",
    sizes: ["41mm", "45mm"],
    colors: [{ name: "Qora", hex: "#000000" }, { name: "Kumush", hex: "#C0C0C0" }]
  },
  {
    outfitName: "Charm sumka (Handbag)",
    price: "750,000 so'm",
    description: "Haqiqiy charmdan tayyorlangan nafis ayollar sumkasi. Har qanday kiyim uslubiga mos tushadi.",
    mediaUrls: ["https://picsum.photos/seed/post7/800/1000"],
    type: "accessory",
    category: "Aksessuarlar",
    sizes: ["Standart"],
    colors: [{ name: "Jigarrang", hex: "#8B4513" }, { name: "Qora", hex: "#000000" }]
  },
  {
    outfitName: "Quyoshdan saqlovchi ko'zoynak",
    price: "250,000 so'm",
    description: "UV nurlaridan 100% himoya qiluvchi zamonaviy ko'zoynak. Ray-Ban uslubidagi dizayn.",
    mediaUrls: ["https://picsum.photos/seed/post8/800/1000"],
    type: "accessory",
    category: "Aksessuarlar",
    sizes: ["Standart"],
    colors: [{ name: "Qora", hex: "#000000" }, { name: "Oltin", hex: "#FFD700" }]
  },
  {
    outfitName: "Qishki Parka Kurtka",
    price: "1,500,000 so'm",
    description: "Eng sovuq kunlarda ham sizni issiq tutadi. Suv o'tkazmaydigan va shamoldan himoya qiluvchi mato.",
    mediaUrls: ["https://picsum.photos/seed/post9/800/1000"],
    type: "clothing",
    category: "Kurtkalar",
    sizes: ["L", "XL", "XXL"],
    colors: [{ name: "Zaytun", hex: "#808000" }, { name: "Qora", hex: "#000000" }]
  },
  {
    outfitName: "Oq Klassik Ko'ylak",
    price: "280,000 so'm",
    description: "Ofis va rasmiy tadbirlar uchun klassik oq ko'ylak. Dazmollash oson va sifatli mato.",
    mediaUrls: ["https://picsum.photos/seed/post10/800/1000"],
    type: "clothing",
    category: "Ko'ylaklar",
    sizes: ["39", "40", "41", "42"],
    colors: [{ name: "Oq", hex: "#FFFFFF" }]
  }
];

export const clearDatabase = async () => {
  try {
    console.log("Clearing database...");
    const shopsSnapshot = await getDocs(collection(db, 'shops'));
    for (const shopDoc of shopsSnapshot.docs) {
      await deleteDoc(doc(db, 'shops', shopDoc.id));
    }

    const postsSnapshot = await getDocs(collection(db, 'posts'));
    for (const postDoc of postsSnapshot.docs) {
      await deleteDoc(doc(db, 'posts', postDoc.id));
    }

    const storiesSnapshot = await getDocs(collection(db, 'stories'));
    for (const storyDoc of storiesSnapshot.docs) {
      await deleteDoc(doc(db, 'stories', storyDoc.id));
    }

    const obrazlarSnapshot = await getDocs(collection(db, 'obrazlar'));
    for (const obrazDoc of obrazlarSnapshot.docs) {
      await deleteDoc(doc(db, 'obrazlar', obrazDoc.id));
    }
    
    console.log("Database cleared!");
    return true;
  } catch (error) {
    console.error("Error clearing database:", error);
    return false;
  }
};

const MOCK_OBRAZLAR = [
  {
    title: "Klassik Office Obrazi",
    description: "Ish uchrashuvlari va ofis uchun mukammal tanlov. Oq ko'ylak va klassik kostyum uyg'unligi.",
    type: "Office uchun",
    totalPrice: "1,480,000 so'm"
  },
  {
    title: "Sportiv Kechki Obraz",
    description: "Do'stlar bilan uchrashuv va kechki sayrlar uchun qulay sportiv obraz.",
    type: "Kundalik",
    totalPrice: "1,300,000 so'm"
  },
  {
    title: "Yozgi Dengiz Obrazi",
    description: "Dengiz bo'yida dam olish uchun yengil va yorqin rangli obraz.",
    type: "Dam olish",
    totalPrice: "600,000 so'm"
  }
];

export const seedDatabase = async (userUid: string = "system") => {
  try {
    console.log("Seeding database with UID:", userUid);
    for (const shop of MOCK_SHOPS) {
      const shopRef = await addDoc(collection(db, 'shops'), {
        ...shop,
        ownerUid: userUid,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const shopPosts: any[] = [];

      // Add 3-4 random posts for each shop
      const numPosts = Math.floor(Math.random() * 2) + 3;
      for (let i = 0; i < numPosts; i++) {
        const randomPost = MOCK_POSTS[Math.floor(Math.random() * MOCK_POSTS.length)];
        const postData = {
          ...randomPost,
          ownerUid: userUid,
          seller: {
            id: shopRef.id,
            name: shop.name,
            logo: shop.logo,
            region: shop.region
          },
          likes: Math.floor(Math.random() * 500),
          views: Math.floor(Math.random() * 5000),
          shares: Math.floor(Math.random() * 100),
          createdAt: serverTimestamp()
        };
        const postRef = await addDoc(collection(db, 'posts'), postData);
        shopPosts.push({ id: postRef.id, ...postData });
      }

      // Add a story for each shop
      await addDoc(collection(db, 'stories'), {
        ownerUid: userUid,
        seller: {
          id: shopRef.id,
          name: shop.name,
          logo: shop.logo,
          region: shop.region
        },
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-fashion-model-posing-in-a-studio-34444-large.mp4",
        price: MOCK_POSTS[Math.floor(Math.random() * MOCK_POSTS.length)].price,
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 50),
        isLive: Math.random() > 0.8,
        createdAt: serverTimestamp()
      });

      // Add an obraz for each shop using their posts
      const randomObraz = MOCK_OBRAZLAR[Math.floor(Math.random() * MOCK_OBRAZLAR.length)];
      await addDoc(collection(db, 'obrazlar'), {
        ...randomObraz,
        sellerId: shopRef.id,
        ownerUid: userUid,
        posts: shopPosts.slice(0, 2), // Use first 2 posts of the shop
        createdAt: serverTimestamp()
      });
    }
    console.log("Database seeded successfully!");
    return true;
  } catch (error) {
    console.error("Error seeding database:", error);
    return false;
  }
};
