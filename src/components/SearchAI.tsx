import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, Image as ImageIcon, X, LayoutGrid, Shirt } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { AIMessage, PostData, Obraz } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SearchAIProps {
  language?: string;
  messages?: AIMessage[];
  setMessages?: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  allPosts?: PostData[];
  allObrazlar?: Obraz[];
  foundPosts?: PostData[];
  setFoundPosts?: React.Dispatch<React.SetStateAction<PostData[]>>;
  foundObrazlar?: Obraz[];
  setFoundObrazlar?: React.Dispatch<React.SetStateAction<Obraz[]>>;
  onOpenPostDetails?: (post: PostData) => void;
  pendingTryOn?: any;
  onClearPendingTryOn?: () => void;
  foundSellers?: any[];
  setFoundSellers?: React.Dispatch<React.SetStateAction<any[]>>;
  onOpenShopProfile?: (shop: any) => void;
  globalMuted?: boolean;
  setGlobalMuted?: React.Dispatch<React.SetStateAction<boolean>>;
}

const SYSTEM_INSTRUCTION = `Siz AlphaSpace Marketplace-ning "SmartSeller" deb nomlangan aqlli yordamchisiz. 
Foydalanuvchiga "sen" deb murojaat qil. Ortiqcha xushomadgo'ylik (paxta qo'yish) qilma. 
Javoblaring qisqa va lo'nda bo'lsin: oddiy savollarga 1-2 qator, murakkabroqlariga 5-6 qatordan oshmasin. 
Foydalanuvchi xato qilsa, xatosini ochiq va to'g'ridan-to'g'ri ayt, lekin hurmatni saqlagan holda. 
O'zingni hurmat qiladigan, aqlli va samimiy do'st kabi tut.

Siz rasm va videolarni tahlil qila olasiz. Ranglar, uslublar va kiyim turlarini tushunasiz.
Foydalanuvchi rasm tashlasa, undagi kiyimlarni tahlil qil va shunga o'xshash mahsulotlarni topib ber.
Obraz yaratishda (outfit matching) mohirsiz. Masalan, jigarrang ko'ylak bilan oq shim kabi mos keladigan kiyimlarni tavsiya qiling.

MUHIM: Har doim foydalanuvchiga matnli javob qaytar. Agar mahsulot qidirayotgan bo'lsang, bu haqda foydalanuvchiga ayt (masalan: "Hozir qidirib ko'raman...").
Agar foydalanuvchi mahsulot yoki obraz qidirsa, "find_products" yoki "find_outfits" funksiyalarini chaqiring.`;

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
  allObrazlar = [],
  foundPosts = [],
  setFoundPosts,
  foundObrazlar = [],
  setFoundObrazlar,
  onOpenPostDetails
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    try {
      // Provide a summary of all available products to the AI so it knows what it can find
      const productsSummary = allPosts.map(p => `- ${p.outfitName} (ID: ${p.id}, Narxi: ${p.price})`).join('\n');
      const obrazlarSummary = allObrazlar.map(o => `- ${o.title} (ID: ${o.id})`).join('\n');
      
      const contextInstruction = `
Hozirgi vaqtda marketplace-da quyidagi mahsulotlar bor:
${productsSummary || 'Hech qanday mahsulot yo\'q'}

Va quyidagi obrazlar bor:
${obrazlarSummary || 'Hech qanday obraz yo\'q'}

Agar foydalanuvchi kiyim yoki poyabzal so'rasa, yuqoridagi ro'yxatdan mosini topib "find_products" funksiyasini chaqir.
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

      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const parts: any[] = [{ text: enhancedMessageText }];
      if (currentImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: currentImage.split(',')[1]
          }
        });
      }

      const contents = [
        ...history,
        { role: 'user', parts }
      ];

      const findProductsTool = {
        name: "find_products",
        description: "Marketplace-dan mahsulotlarni qidirish",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Qidiruv so'rovi (masalan: 'oq ko'ylak')" },
            ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Aniq mahsulot ID-lari" }
          }
        }
      };

      const findOutfitsTool = {
        name: "find_outfits",
        description: "Marketplace-dan tayyor obrazlarni qidirish",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Obraz turi (masalan: 'to'y uchun')" },
            ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Aniq obraz ID-lari" }
          }
        }
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: contents as any,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION + contextInstruction,
          tools: [{ functionDeclarations: [findProductsTool, findOutfitsTool] }]
        }
      });

      let aiResponseText = response.text;
      
      const functionCalls = response.functionCalls;
      if (functionCalls) {
        if (!aiResponseText) {
          aiResponseText = language === 'uz' ? "Mana, qidirib topdim:" : "Вот что я нашел:";
        }
        for (const call of functionCalls) {
          if (call.name === 'find_products') {
            const args = call.args as any;
            let results: PostData[] = [];
            if (args.ids) {
              results = allPosts.filter(p => args.ids.includes(p.id));
            } else if (args.query) {
              const q = args.query.toLowerCase();
              results = allPosts.filter(p => 
                p.outfitName.toLowerCase().includes(q) || 
                p.description?.toLowerCase().includes(q) ||
                p.items.some(item => item.name.toLowerCase().includes(q)) ||
                p.seller.name.toLowerCase().includes(q)
              );
              
              // If no results found with specific query, try a broader search if it's a generic term
              if (results.length === 0 && (q.includes('kiyim') || q.includes('kiyimlar') || q.includes('hammasi'))) {
                results = allPosts;
              }
            }
            if (results.length > 0) {
              setFoundPosts?.(results);
              setFoundObrazlar?.([]);
              setShowResults(false); // Don't show immediately, wait for user to click badge
            }
          } else if (call.name === 'find_outfits') {
            const args = call.args as any;
            let results: Obraz[] = [];
            if (args.ids) {
              results = allObrazlar.filter(o => args.ids.includes(o.id));
            } else if (args.query) {
              const q = args.query.toLowerCase();
              results = allObrazlar.filter(o => 
                o.title.toLowerCase().includes(q) || 
                o.description.toLowerCase().includes(q)
              );
            }
            if (results.length > 0) {
              setFoundObrazlar?.(results);
              setFoundPosts?.([]);
              setShowResults(false);
            }
          }
        }
      }

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseText || (language === 'uz' ? 'Kechirasiz, javob topilmadi.' : 'Извините, ответ не найден.')
      };

      setMessages?.(prev => [...prev, aiMessage]);
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
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 relative">
      {/* Floating Header - Top Left (No background, icon above text) */}
      <div className="absolute top-0 left-0 p-6 flex flex-col items-start pointer-events-none z-30">
        <div className="flex flex-col items-center gap-1">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-accent-blue flex items-center justify-center shadow-xl shadow-accent-blue/20 pointer-events-auto"
          >
            <Sparkles size={20} className="text-white" />
          </motion.div>
          <motion.h2 
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[10px] font-black text-text-primary uppercase tracking-tighter pointer-events-auto"
          >
            SmartSeller
          </motion.h2>
        </div>
      </div>

      {/* "Topildi" Badge - Floating Right */}
      <AnimatePresence>
        {(foundPosts.length > 0 || foundObrazlar.length > 0) && !showResults && (
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
              {foundPosts.length || foundObrazlar.length}
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
                  {foundObrazlar.length > 0 
                    ? (language === 'uz' ? 'Topilgan Obrazlar' : 'Найденные Образы')
                    : (language === 'uz' ? 'Topilgan Mahsulotlar' : 'Найденные Товары')}
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
              {foundPosts.length > 0 ? (
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
              ) : (
                <div className="space-y-6">
                  {foundObrazlar.map(obraz => (
                    <div key={obraz.id} className="bg-neutral-50 dark:bg-neutral-900 rounded-[2.5rem] p-6 border border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                          <Shirt size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-text-primary">{obraz.title}</h3>
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{obraz.type}</p>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-text-secondary mb-6 leading-relaxed">{obraz.description}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {obraz.posts.map(post => (
                          <motion.div
                            key={post.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onOpenPostDetails?.(post)}
                            className="aspect-square rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700"
                          >
                            <img 
                              src={post.mediaUrls[0]} 
                              alt={post.outfitName} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-[2rem] bg-accent-blue/5 flex items-center justify-center text-accent-blue mb-6">
              <Sparkles size={32} />
            </div>
            <h3 className="text-xl font-black text-text-primary mb-2">
              {language === 'uz' ? 'SmartSellerga xush kelibsiz' : 'Добро пожаловать в SmartSeller'}
            </h3>
            <p className="text-sm font-medium text-text-secondary leading-relaxed max-w-[280px]">
              {language === 'uz' 
                ? 'Sizga marketplace bo\'yicha istalgan savolga javob berishga tayyorman.' 
                : 'Я готов ответить на любые вопросы по маркетплейсу.'}
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
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="flex items-center gap-3 py-2">
              <div className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center">
                <Loader2 size={14} className="animate-spin text-accent-blue" />
              </div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest animate-pulse">SmartSeller o'ylamoqda...</span>
            </div>
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
