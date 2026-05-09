import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, Image as ImageIcon, X, LayoutGrid, Shirt, Search } from 'lucide-react';
import { Type } from '@google/genai';
import { AIMessage, PostData } from '../types';
import { isVideoUrl, getProxiedUrl, getPostThumbnailUrl } from '../utils/mediaUtils';
import { ImageWithFallback } from './ImageWithFallback';
import { motion, AnimatePresence } from 'motion/react';
import SmartSellerLogo from './SmartSellerLogo';

const SearchProgressIndicator = () => {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      {/* Outer Rotating Glow - Blue and Purple */}
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          rotate: { duration: 5, repeat: Infinity, ease: "linear" },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent-blue/40 via-transparent to-purple-500/40 blur-xl"
      />
      
      {/* Rotating Saturated Ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 rounded-full border-[3px] border-transparent border-t-accent-blue border-b-purple-500 opacity-80"
      />
      
      {/* Central Magnifying Glass */}
      <motion.div
        animate={{ 
          y: [-3, 3, -3],
          scale: [1, 1.1, 1],
          rotate: [0, 8, -8, 0]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative z-10 p-5 bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-[2rem] border border-white/50 dark:border-white/10 shadow-2xl"
      >
        <Search size={36} className="text-accent-blue drop-shadow-[0_0_12px_rgba(0,85,255,0.6)]" strokeWidth={3} />
      </motion.div>

      {/* 3 Magical Stars Effect */}
      {[
        { x: -45, y: -40, size: 18, delay: 0, color: 'text-accent-light' },
        { x: 50, y: -30, size: 24, delay: 0.9, color: 'text-purple-400' },
        { x: 10, y: 55, size: 16, delay: 1.8, color: 'text-blue-300' }
      ].map((star, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            scale: [0, 1.3, 1, 0],
            x: [0, star.x],
            y: [0, star.y],
            rotate: [0, 270]
          }}
          transition={{ 
            duration: 3.5, 
            repeat: Infinity, 
            delay: star.delay,
            ease: "anticipate"
          }}
          className={`absolute z-20 ${star.color}`}
        >
          <Sparkles size={star.size} className="fill-current drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </motion.div>
      ))}
    </div>
  );
};

interface SearchAIProps {
  language?: string;
  messages?: AIMessage[];
  setMessages?: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  allPosts?: PostData[];
  allSellers?: any[];
  foundPosts?: PostData[];
  foundSellers?: any[];
  setFoundPosts?: React.Dispatch<React.SetStateAction<PostData[]>>;
  setFoundSellers?: React.Dispatch<React.SetStateAction<any[]>>;
  onOpenPostDetails?: (post: PostData) => void;
  onOpenShopProfile?: (shopId: string) => void;
}

const SYSTEM_INSTRUCTION = `Siz AlphaSpace Marketplace-da foydalanuvchilarga xarid qilishda juda tez va aniq yordam beruvchi SmartSeller (Aqlli Sotuvchi) sun'iy intellektisiz.
Sizning vazifangiz nafaqat mahsulot qidirish, balki sanki har bir videoni va rasmni o'z ko'zingiz bilan ko'rib turganingizdek tasavvur qilib, mahsulotlarning shakli, rangi, dizayni va narxlarini tahlil qilib berishdir.

SIZDA HAR BIR MAHSULOTNING BARCHA TAFSILOTLARI (NOMI, NARXI, RANGI, OLCHAMLARI, IZOXLLAR SONI, TAVSIFI) KONTEKST SIFATIDA MAVJUD.
Hech qachon "menda narx ko'rinmayapti", "men videoni ko'ra olmayman" yoki "batafsil ma'lumot yo'q" deb aytmang! Siz hamma videolardagi mahsulotlarni tafsilotlarini matn orqali "ko'ra" olasiz.

Qoidalar:
1. Videodagi Kadrlab "Ko'rish": Foydalanuvchi "videodagi...", "bu videoda..." kabi savollar bersa, sizga kelgan kontekst ma'lumotiga qarab, go'yoki videoni ko'rib turganingizdek mahsulotni tasvirlang va tahlil qilib bering (masalan: "Videodagi bu qora ko'ylak...", "Ha, bu oyoq kiyimning narxi...").
2. Tafsilotlarni o'qish: Mahsulot nomini, narxini, qidiringan yoki videodagi mahsulot qanday rangdaligini va ushbu mahsulotga qancha izoh yozilganini (comments) foydalanuvchiga ishonch bilan aytib bering.
3. Tezkorlik va Aniqlik: Javoblaringiz qisqa, aniq va juda tez bo'lishi kerak. Keraksiz uzun gaplardan saqlaning. Iloji bo'lsa darhol \`find_products\` orqali mahsulotni ko'rsating.
4. Tabiiy va O'ziga Xos: Foydalanuvchi bilan xuddi haqiqiy tajribali sotuvchi va stilist kabi muomala qiling. Narxlarni qisqa va aniq (masalan, "250,000 so'm") ko'rinishida yozing.
`;

const TypewriterText: React.FC<{ text: string; speed?: number }> = ({ text, speed = 15 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return <span>{displayedText}</span>;
};

const SearchAI: React.FC<SearchAIProps> = ({
  language = 'uz',
  messages = [],
  setMessages,
  initialQuery,
  onClearInitialQuery,
  allPosts = [],
  allSellers = [],
  foundPosts = [],
  foundSellers = [],
  setFoundPosts,
  setFoundSellers,
  onOpenPostDetails,
  onOpenShopProfile
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialQuery) {
      setInput(initialQuery + ' ');
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery, onClearInitialQuery]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if ((!messageText.trim() && !selectedImage) || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      image: selectedImage || undefined
    };

    setMessages?.(prev => [...prev, userMessage]);
    if (!textOverride) setInput('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);
    const searchKeywords = ['top', 'qidir', 'ko\'rsat', 'kerak', 'bor', 'qanaqa', 'kiyim', 'shim', 'koylak', 'ko\'ylak', 'razmer', 'narx', 'sotuvchi', 'natija', 'topildimi', 'topdingmi', 'mln', 'sum', 'so\'m', 'm', 'k', 'ming'];
    const isSearchQuery = searchKeywords.some(kw => messageText.toLowerCase().includes(kw)) || !!selectedImage;
    setIsSearching(isSearchQuery);
    
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const callAiWithRetry = async (contents: any, config: any, retries = 3): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch('/api/gemini/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gemini-3-flash-preview',
              contents,
              config
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server Error: ${res.status}`);
          }

          return await res.json();
        } catch (error: any) {
          if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) && i < retries - 1) {
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            console.warn(`Rate limit hit, retrying in ${delay}ms...`);
            await sleep(delay);
            continue;
          }
          throw error;
        }
      }
    };

    try {
      // Provide a summary of all available products and shops to the AI
      const productsSummary = allPosts.slice(0, 30).map(p => {
        return `[MAHSULOT ID: ${p.id}]
Nomi: ${p.outfitName}
Narxi: ${p.price}
Tavsif: ${p.description || 'Yo\'q'}
Kategoriya: ${p.aiMetadata?.category || 'Noma\'lum'}
Rangi: ${p.aiMetadata?.color || p.colors?.map((c: any) => c.name).join(', ') || 'Noma\'lum'}
O'lchamlari: ${p.sizes?.join(', ') || 'Noma\'lum'}
Izohlar soni: ${p.comments || 0} ta izoh
Holati: ${p.inStock !== false ? 'Mavjud' : 'Tugagan'}
---`;
      }).join('\n');

      const shopsSummary = allSellers.slice(0, 15).map(s => {
        return `- ${s.name} (Hudud: ${s.region || 'Noma\'lum'}, Kategoriyalar: ${s.categories?.join(', ') || 'Noma\'lum'})`;
      }).join('\n');
      
      const contextInstruction = `
Hozirgi vaqtda marketplace-da quyidagi mahsulotlar bor:
${productsSummary || 'Hech qanday mahsulot yo\'q'}

Va quyidagi do'konlar bor:
${shopsSummary || 'Hech qanday do\'kon yo\'q'}
`;

      // Detect product link in message to provide context
      let enhancedMessageText = messageText;
      const postMatch = messageText.match(/\?post=([a-zA-Z0-9_]+)/);
      if (postMatch) {
        const postId = postMatch[1];
        const product = allPosts.find(p => p.id === postId);
        if (product) {
          enhancedMessageText = `[KONTEKST: Foydalanuvchi quyidagi mahsulot (videodagi) haqida so'ramoqda:
Nomi: ${product.outfitName}
Narxi: ${product.price}
Sotuvchi: ${product.seller.name}
Tavsif: ${product.description || 'Tavsif yo\'q'}
O'lchamlar: ${product.sizes?.join(', ') || 'Noma\'lum'}
Ranglar: ${product.colors?.map(c => c.name).join(', ') || product.aiMetadata?.color || 'Noma\'lum'}
Izohlar soni: ${product.comments || 0} ta
Holati: ${product.inStock !== false ? 'Mavjud' : 'Tugagan'}]

Foydalanuvchi xabari: ${messageText}`;
        }
      }

      // Limit history to last 5 messages to save tokens
      const history = messages.slice(-5).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const parts: any[] = [{ text: enhancedMessageText }];
      if (currentImage) {
        const base64Data = currentImage.includes(',') ? currentImage.split(',')[1] : currentImage;
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        });
      }

      const contents = [
        ...history,
        { role: 'user', parts }
      ];

      const findProductsTool = {
        name: "find_products",
        description: "Marketplace-dan mahsulotlarni qidirish.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Qidiruv so'rovi (masalan: 'ko'ylak', 'admin')" },
            minPrice: { type: Type.NUMBER, description: "Minimal narx (masalan: 1000000)" },
            maxPrice: { type: Type.NUMBER, description: "Maksimal narx (masalan: 5000000)" },
            color: { type: Type.STRING, description: "Rang so'ralgan bo'lsa" },
            ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Kontekstdagi mos mahsulotlarning ID lari." }
          }
        }
      };

      const findShopsTool = {
        name: "find_shops",
        description: "Marketplace-dan do'konlarni qidirish.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Umumiy qidiruv so'rovi" },
            ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Kontekstdagi mos do'konlarning 'ID' lari massivi." }
          }
        }
      };

      const response = await callAiWithRetry(contents as any, {
        systemInstruction: SYSTEM_INSTRUCTION + contextInstruction,
        tools: [{ functionDeclarations: [findProductsTool, findShopsTool] }]
      });

      let aiResponseText = response.text;
      
      const functionCalls = response.functionCalls;
      if (functionCalls) {
        let hasResults = false;
        setFoundPosts?.([]);
        setFoundSellers?.([]);

        for (const call of functionCalls) {
          if (call.name === 'find_products') {
            const args = call.args as any;
            let results: PostData[] = [];
            
            // Helper for all matching
            const normalize = (val: string | number) => (val || '').toString().replace(/[^0-9]/g, '');

            results = allPosts.filter(p => {
              // 1. Explicit ID match
              if (args.ids && args.ids.length > 0) {
                return args.ids.includes(p.id);
              }

              const normalizedPrice = normalize(p.price);
              const pPrice = normalizedPrice ? parseInt(normalizedPrice) : 0;
              
              // 2. Numeric Price Filtering
              if (args.minPrice !== undefined && pPrice < args.minPrice) return false;
              if (args.maxPrice !== undefined && pPrice > args.maxPrice) return false;

              // 3. Keyword / Query Match
              if (args.query) {
                const q = args.query.toLowerCase();
                const searchableText = `${p.outfitName} ${p.description || ''} ${p.seller.name} ${p.aiMetadata?.category || ''}`.toLowerCase();
                if (!searchableText.includes(q)) return false;
              }

              // 4. Color match
              if (args.color && p.aiMetadata?.color) {
                if (!p.aiMetadata.color.toLowerCase().includes(args.color.toLowerCase())) return false;
              }

              return true;
            });
            
            if (results.length > 0) {
              hasResults = true;
              setFoundPosts?.(results);
              setTimeout(() => setShowResults(true), 1500); 
            }
          } else if (call.name === 'find_shops') {
            const args = call.args as any;
            let results: any[] = [];
            
            if (args.ids && args.ids.length > 0) {
              results = allSellers.filter(s => args.ids.includes(s.id));
            }

            if (results.length === 0 && args.query) {
              const q = args.query.toLowerCase();
              results = allSellers.filter(s => {
                const searchableText = [
                  s.name,
                  s.description || '',
                  s.region || '',
                  ...(s.categories || [])
                ].join(' ').toLowerCase();
                return searchableText.includes(q);
              });
            }
            
            if (results.length > 0) {
              hasResults = true;
              setFoundSellers?.(results);
              setTimeout(() => setShowResults(true), 1500);
            }
          }
        }

        const successText = language === 'uz' ? "Siz so'ragan narsalarni topdim, mana ular:" : "Я нашел то, что вы просили, вот они:";
        const failText = language === 'uz' ? "Kechirasiz, marketplace-dan siz qidirgan ma'lumotni topa olmadim." : "Извините, я не нашел в маркетплейсе то, что вы искали.";
        
        if (hasResults) {
          aiResponseText = aiResponseText ? (aiResponseText + "\n\n" + successText) : successText;
        } else {
          aiResponseText = failText;
        }
      }

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseText || (language === 'uz' ? 'Kechirasiz, javob topilmadi.' : 'Извините, ответ не найден.')
      };

      setMessages?.(prev => [...prev, aiMessage]);
      
      // If AI didn't call the tool but the user clearly wanted a search, do a fallback search
      if (!functionCalls && isSearching) {
        const q = messageText.toLowerCase();
        const queryWords = q.split(/\s+/).filter(w => w.length > 1);

        // Fallback Products Search
        let postResults = allPosts.filter(p => {
          const q = messageText.toLowerCase().trim();
          
          // Helper for all matching
          const normalize = (val: string | number) => val.toString().replace(/[^0-9]/g, '');
          const pPrice = parseInt(normalize(p.price));

          // Simple Check: Does the message contain a numeric match with the price?
          // E.g., if price is 2000000 and user says "2 mln", "2 mln" contains "2" or logic converts it.
          // For simplicity, we also check if any number from the query matches the price start.
          const queryNumbers = q.match(/\d+/g);
          if (queryNumbers) {
            for (const num of queryNumbers) {
              // If user writes 2000000 directly
              if (normalize(p.price) === num) return true;
              // If user writes '2' and 'mln' is nearby (semantic)
              if (num === '2' && (q.includes('mln') || q.includes('m')) && pPrice === 2000000) return true;
              if (num === '1' && (q.includes('mln') || q.includes('m')) && pPrice === 1000000) return true;
              if (num.length >= 4 && normalize(p.price).startsWith(num)) return true;
            }
          }

          const searchableText = `${p.outfitName} ${p.description || ''} ${p.seller.name} ${p.aiMetadata?.category || ''}`.toLowerCase();
          return searchableText.includes(q);
        });
        
        // Fallback Shops Search
        let shopResults = allSellers.filter(s => {
          const searchableText = [
            s.name,
            s.description || '',
            s.region || '',
            ...(s.categories || [])
          ].join(' ').toLowerCase();
          return searchableText.includes(q);
        });

        // Ensure we clear previous results
        setFoundPosts?.([]);
        setFoundSellers?.([]);

        if (postResults.length > 0 || shopResults.length > 0) {
          if (postResults.length > 0) setFoundPosts?.(postResults);
          if (shopResults.length > 0) setFoundSellers?.(shopResults);
          setTimeout(() => setShowResults(true), 1500); 
        }
      }
      // Ensure searching continues for at least a duration to let animation play
      if (isSearchQuery) {
        await sleep(2500); 
      }
    } catch (error: any) {
      console.error('AI Error:', error);
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: language === 'uz' 
          ? `Kechirasiz, xatolik yuz berdi: ${error.message || 'Noma\'lum xato'}. Iltimos qaytadan urinib ko'ring.` 
          : `Извините, произошла ошибка: ${error.message || 'Неизвестная ошибка'}. Пожалуйста, попробуйте еще раз.`
      };
      setMessages?.(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 relative">
      {/* Floating Header - Top Left */}
      <div className="absolute top-0 left-0 p-4 z-30 pointer-events-none">
        <SmartSellerLogo width={45} showText={true} className="pointer-events-auto" />
      </div>

      {/* "Topildi" Badge - Floating Right */}
      <AnimatePresence>
        {(foundPosts.length > 0 || foundSellers.length > 0) && !showResults && (
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            onClick={() => setShowResults(true)}
            className="absolute top-24 right-4 z-40 bg-accent-blue text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border border-white/20"
          >
            <LayoutGrid size={14} />
            {language === 'uz' ? 'Topildi' : 'Найдено'}
            <span className="bg-white text-accent-blue w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
              {foundPosts.length + foundSellers.length}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Results Panel */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100) {
                setShowResults(false);
              }
            }}
            className="absolute inset-0 z-50 bg-white dark:bg-neutral-950 flex flex-col"
          >
            <div className="p-6 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-accent-blue rounded-full" />
                <h2 className="text-xl font-black text-text-primary uppercase tracking-tighter">
                  {language === 'uz' ? 'Topilgan Mahsulotlar' : 'Найденные Товары'}
                </h2>
              </div>
              <button 
                onClick={() => setShowResults(false)}
                className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Swipe hint */}
            <div className="flex justify-center py-2 opacity-30">
              <div className="w-12 h-1 bg-neutral-400 rounded-full" />
            </div>

            <div className="flex-1 overflow-y-auto pb-safe scrollbar-hide">
              {foundSellers.length > 0 && (
                <div className="p-4 space-y-4">
                  <h3 className="text-xs font-black text-text-primary/40 uppercase tracking-widest mb-4">
                    {language === 'uz' ? 'Topilgan do\'konlar' : 'Найденные магазины'}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {foundSellers.map(seller => (
                      <motion.div
                        key={seller.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setShowResults(false);
                          onOpenShopProfile?.(seller.id);
                        }}
                        className="flex items-center gap-4 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800"
                      >
                        <img 
                          src={seller.logo} 
                          alt={seller.name} 
                          className="w-16 h-16 rounded-xl object-cover border border-white/20" 
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-text-primary">{seller.name}</h4>
                          <p className="text-xs text-text-secondary line-clamp-1">{seller.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-accent-blue uppercase">{seller.region}</span>
                            <span className="text-[10px] text-text-primary/30">•</span>
                            <span className="text-[10px] font-bold text-text-primary/60">{seller.categories?.[0]}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {foundPosts.length > 0 && (
                <>
                  {foundSellers.length > 0 && <div className="h-4" />}
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-black text-text-primary/40 uppercase tracking-widest mb-4">
                      {language === 'uz' ? 'Topilgan mahsulotlar' : 'Найденные товары'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-0">
                    {foundPosts.map(post => (
                      <motion.div
                        key={post.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onOpenPostDetails?.(post)}
                        className="bg-neutral-50 dark:bg-neutral-900 overflow-hidden relative"
                      >
                        <div className="aspect-[9/16] relative">
                          {isVideoUrl(getPostThumbnailUrl(post)) ? (
                            <video 
                              src={`${getProxiedUrl(getPostThumbnailUrl(post), 0)}#t=0.1`}
                              className="w-full h-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                            />
                          ) : (
                            <ImageWithFallback 
                              originalSrc={getPostThumbnailUrl(post)} 
                              alt={post.outfitName} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white">
                            <p className="text-[10px] font-black truncate">{post.outfitName}</p>
                            <p className="text-xs font-black text-accent-light">{post.price}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide pt-32 pb-48"
        >
          {messages.length === 0 && !isLoading && !isSearching && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="mb-6 shadow-2xl shadow-accent-blue/20 rounded-full p-4">
                <SmartSellerLogo width={120} showText={true} animated={true} />
              </div>
              <h3 className="text-2xl font-black text-text-primary mb-2 tracking-tight">
                {language === 'uz' ? 'SmartSellerga xush kelibsiz' : 'Добро пожаловать в SmartSeller'}
              </h3>
              <p className="text-base font-medium text-text-secondary leading-relaxed max-w-[320px]">
                {language === 'uz' 
                  ? 'Istagan narsangizni qidiring, men marketplace bo\'yicha sizga yordam beraman!' 
                  : 'Ищите что угодно, я помогу вам с маркетплейсом!'}
              </p>
            </div>
          )}

          {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start w-full'}`}
          >
            <div className={`w-full ${
              message.role === 'user' 
                ? 'flex justify-end' 
                : 'flex justify-start'
            }`}>
              <div className={`max-w-[90%] text-base leading-relaxed ${
                message.role === 'user' 
                  ? 'bg-accent-blue text-white px-6 py-4 rounded-[2rem] font-medium shadow-lg shadow-accent-blue/10' 
                  : 'text-neutral-900 dark:text-neutral-100 font-medium py-2 w-full'
              }`}>
                {message.image && (
                  <img 
                    src={message.image} 
                    alt="User upload" 
                    className="w-full max-w-[200px] rounded-2xl mb-3 border border-white/20"
                  />
                )}
                {message.role === 'assistant' && index === messages.length - 1 && !isLoading ? (
                  <TypewriterText text={message.content} />
                ) : (
                  message.content
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {(isLoading || isSearching) && (
          <div className="flex flex-col items-start w-full gap-4">
            {isLoading && (
              <div className="flex items-center gap-3 py-2">
                <div className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center">
                  <Loader2 size={14} className="animate-spin text-accent-blue" />
                </div>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest animate-pulse">SmartSeller o'ylamoqda...</span>
              </div>
            )}
            
            {/* Magnifying Glass Search Animation - Only show when searching */}
            <AnimatePresence>
              {isSearching && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="ml-2 mb-4"
                >
                  <div className="flex flex-col items-center gap-2">
                    <SearchProgressIndicator />
                    <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-accent-blue to-purple-500 bg-clip-text text-transparent animate-pulse">
                      {language === 'uz' ? 'Marketplace tahlil qilinmoqda...' : 'Анализируем маркетплейс...'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating Input Panel with AI Liquid Effect */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 pointer-events-none z-20">
        <div className="relative z-10 flex flex-col gap-2 pointer-events-auto max-w-2xl mx-auto">
          {/* Image Preview */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-accent-blue shadow-lg mb-2"
              >
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                >
                  <X size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <div className="flex-1 relative group overflow-hidden rounded-3xl shadow-2xl shadow-black/5 border border-neutral-200 dark:border-neutral-800">
              {/* Liquid Background Effect - Brand Dark Saturated and very slow */}
              <div className="absolute inset-0 pointer-events-none opacity-100 z-0">
                <motion.div 
                  animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, 180, 360],
                    x: [-25, 25, -25],
                    y: [-15, 15, -15],
                  }}
                  transition={{
                    duration: 14.4,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute -top-1/2 -left-1/2 w-full h-full bg-[#0055FF] rounded-[40%] blur-xl"
                />
                <motion.div 
                  animate={{
                    scale: [1.3, 1, 1.3],
                    rotate: [360, 180, 0],
                    x: [25, -25, 25],
                    y: [15, -15, 15],
                  }}
                  transition={{
                    duration: 11.2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[#7C3AED] rounded-[30%] blur-2xl"
                />
              </div>

              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-blue via-accent-light to-purple-500 rounded-3xl blur-[3px] opacity-20 group-focus-within:opacity-50 transition duration-300"></div>
              
              <div className="relative flex items-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl rounded-3xl z-10">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="pl-4 pr-2 text-text-secondary hover:text-accent-blue transition-colors"
                >
                  <ImageIcon size={20} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={language === 'uz' ? 'SmartSellerga xabar yozing...' : 'Напишите SmartSeller...'}
                  className="w-full bg-transparent pl-2 pr-14 py-5 text-base font-medium text-text-primary focus:outline-none transition-all placeholder:text-text-secondary/60"
                />
              </div>
              
              {/* Integrated Smaller Send Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSend()}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-11 h-11 bg-accent-blue text-white rounded-2xl disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-accent-blue/40 flex items-center justify-center z-30 group/btn"
              >
                <Send size={18} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchAI;
