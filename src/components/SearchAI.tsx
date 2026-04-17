import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, Image as ImageIcon, X, LayoutGrid, Shirt, Search } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { AIMessage, PostData } from '../types';
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
  foundPosts?: PostData[];
  setFoundPosts?: React.Dispatch<React.SetStateAction<PostData[]>>;
  onOpenPostDetails?: (post: PostData) => void;
}

const SYSTEM_INSTRUCTION = `Siz AlphaSpace Marketplace-ning "SmartSeller" deb nomlangan aqlli yordamchisiz. 
Foydalanuvchiga "sen" deb murojaat qil. Ortiqcha xushomadgo'ylik (paxta qo'yish) qilma. 
Javoblaring qisqa va lo'nda bo'lsin: oddiy savollarga 1-2 qator, murakkabroqlariga 5-6 qatordan oshmasin. 
Foydalanuvchi xato qilsa, xatosini ochiq va to'g'ridan-to'g'ri ayt, lekin hurmatni saqlagan holda. 
O'zingni hurmat qiladigan, aqlli va samimiy do'st kabi tut.

Siz rasm va videolarni tahlil qila olasiz. Ranglar, uslublar va kiyim turlarini tushunasiz.
Foydalanuvchi rasm tashlasa, undagi kiyimlarni tahlil qil va shunga o'xshash mahsulotlarni topib ber.
Obraz yaratishda (outfit matching) mohirsiz. Masalan, jigarrang ko'ylak bilan oq shim kabi mos keladigan kiyimlarni tavsiya qiling.

MUHIM: Agar foydalanuvchi kiyim, poyabzal, shim, ko'ylak yoki biror mahsulot haqida so'rasa, albatta "find_products" funksiyasini chaqir. 
Hatto rasm tashlab "shunga o'xshashini top" desa ham funksiyani ishlat.

QIDIRUV QOIDASI: Qidiruv so'rovi bo'lganda (kiyim, narx, qidirish haqida), ALBATTA bitta javobning o'zida ham qidiruvni boshlayotganing haqida matnli xabarni ("Hozir qidirib ko'raman...", "Hozir ko'ramiz, qidiryapman...") ham "find_products" funksiyasini birgalikda yubor. 
Hech qachon mahsulotlarni topmasdan turib "Topdim" deb aytma.`;

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
  foundPosts = [],
  setFoundPosts,
  onOpenPostDetails
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
    const searchKeywords = ['top', 'qidir', 'ko\'rsat', 'kerak', 'bor', 'qanaqa', 'kiyim', 'shim', 'koylak', 'ko\'ylak', 'razmer', 'narx', 'sotuvchi', 'natija', 'topildimi', 'topdingmi'];
    const isSearchQuery = searchKeywords.some(kw => messageText.toLowerCase().includes(kw)) || !!selectedImage;
    setIsSearching(isSearchQuery);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const callAiWithRetry = async (contents: any, config: any, retries = 3): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          return await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: contents,
            config: config
          });
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
      // Provide a summary of all available products to the AI so it knows what it can find
      const productsSummary = allPosts.map(p => {
        const info = [
          p.outfitName,
          p.aiMetadata?.color ? `Rangi: ${p.aiMetadata.color}` : '',
          p.aiMetadata?.category ? `Kategoriya: ${p.aiMetadata.category}` : '',
          p.aiMetadata?.tags?.length ? `Teglar: ${p.aiMetadata.tags.join(', ')}` : ''
        ].filter(Boolean).join(', ');
        return `- ${info} (ID: ${p.id}, Narxi: ${p.price})`;
      }).join('\n');
      
      const contextInstruction = `
Hozirgi vaqtda marketplace-da quyidagi mahsulotlar bor:
${productsSummary || 'Hech qanday mahsulot yo\'q'}
`;

      // Detect product link in message to provide context
      let enhancedMessageText = messageText;
      const postMatch = messageText.match(/\?post=([a-zA-Z0-9_]+)/);
      if (postMatch) {
        const postId = postMatch[1];
        const product = allPosts.find(p => p.id === postId);
        if (product) {
          enhancedMessageText = `[KONTEKST: Foydalanuvchi quyidagi mahsulot haqida so'ramoqda:
Nomi: ${product.outfitName}
Narxi: ${product.price}
Sotuvchi: ${product.seller.name}
Tavsif: ${product.description || 'Tavsif yo\'q'}
O'lchamlar: ${product.sizes?.join(', ') || 'Noma\'lum'}
Ranglar: ${product.colors?.map(c => c.name).join(', ') || 'Noma\'lum'}
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
        description: "Marketplace-dan mahsulotlarni qidirish. Rang, kategoriya, brend yoki kiyim turi bo'yicha qidirish imkoniyati bor.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Qidiruv so'rovi (masalan: 'jigarrang kastyum' yoki 'sport kiyimi')" },
            ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Aniq mahsulot ID-lari" }
          }
        }
      };

      const response = await callAiWithRetry(contents as any, {
        systemInstruction: SYSTEM_INSTRUCTION + contextInstruction,
        tools: [{ functionDeclarations: [findProductsTool] }]
      });

      let aiResponseText = response.text;
      
      const functionCalls = response.functionCalls;
      if (functionCalls) {
        let hasResults = false;
        for (const call of functionCalls) {
          if (call.name === 'find_products') {
            const args = call.args as any;
            let results: PostData[] = [];
            if (args.ids) {
              results = allPosts.filter(p => args.ids.includes(p.id));
            } else if (args.query) {
              const q = args.query.toLowerCase();
              const queryWords = q.split(/\s+/).filter(w => w.length > 1);
              
              results = allPosts.filter(p => {
                const searchableText = [
                  p.outfitName,
                  p.description || '',
                  p.seller.name,
                  p.aiMetadata?.color || '',
                  p.aiMetadata?.category || '',
                  p.aiMetadata?.style || '',
                  ...(p.aiMetadata?.tags || []),
                  ...(p as any).items?.map((item: any) => item.name) || []
                ].join(' ').toLowerCase();

                if (queryWords.length > 1) {
                  return queryWords.every(word => searchableText.includes(word));
                }
                return searchableText.includes(q);
              });
              
              if (results.length === 0 && (q.includes('kiyim') || q.includes('kiyimlar') || q.includes('hammasi'))) {
                results = allPosts;
              }
            }
            if (results.length > 0) {
              hasResults = true;
              setFoundPosts?.(results);
              setTimeout(() => setShowResults(true), 1500); 
            }
          }
        }

        if (!aiResponseText) {
          if (hasResults) {
            aiResponseText = language === 'uz' ? "Siz so'ragan narsalarni topdim, mana ular:" : "Я нашел то, что вы просили, вот они:";
          } else {
            aiResponseText = language === 'uz' ? "Kechirasiz, marketplace-dan siz qidirgan mahsulotlarni topa olmadim." : "Извините, я не нашел в маркетплейсе товары, которые вы искали.";
          }
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

        let results = allPosts.filter(p => {
          const searchableText = [
            p.outfitName,
            p.description || '',
            p.aiMetadata?.color || '',
            p.aiMetadata?.category || '',
            ...(p.aiMetadata?.tags || []),
            ...(p as any).items?.map((item: any) => item.name) || []
          ].join(' ').toLowerCase();

          if (queryWords.length > 1) {
            return queryWords.every(word => searchableText.includes(word));
          }
          return searchableText.includes(q);
        });
        
        // If they just asked "topdingmi" and we have existing results, use those
        if (results.length === 0 && foundPosts.length > 0 && (q.includes('top') || q.includes('natija'))) {
          results = foundPosts;
        }

        if (results.length > 0) {
          setFoundPosts?.(results);
          setTimeout(() => setShowResults(true), 1500); 
        }
      }
      // Ensure searching continues for at least a duration to let animation play
      if (isSearchQuery) {
        await sleep(2500); 
      }
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: language === 'uz' ? 'Kechirasiz, xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.' : 'Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.'
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
        {foundPosts.length > 0 && !showResults && (
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
              {foundPosts.length}
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

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              <div className="grid grid-cols-2 gap-4">
                {foundPosts.map(post => (
                  <motion.div
                    key={post.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onOpenPostDetails?.(post)}
                    className="bg-neutral-50 dark:bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-100 dark:border-neutral-800 shadow-sm"
                  >
                    <div className="aspect-[3/4] relative">
                      <img 
                        src={post.mediaUrls[0]} 
                        alt={post.outfitName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white">
                        <p className="text-[10px] font-black truncate">{post.outfitName}</p>
                        <p className="text-xs font-black text-accent-light">{post.price}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
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
