import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { AIMessage, PostData } from '../types';
import { motion } from 'motion/react';

interface SearchAIProps {
  language?: string;
  messages?: AIMessage[];
  setMessages?: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  allPosts?: PostData[];
}

const SYSTEM_INSTRUCTION = `Siz AlphaSpace Marketplace-ning "SmartSeller" deb nomlangan aqlli yordamchisiz. 
Foydalanuvchiga "sen" deb murojaat qil. Ortiqcha xushomadgo'ylik (paxta qo'yish) qilma. 
Javoblaring qisqa va lo'nda bo'lsin: oddiy savollarga 1-2 qator, murakkabroqlariga 5-6 qatordan oshmasin. 
Foydalanuvchi xato qilsa, xatosini ochiq va to'g'ridan-to'g'ri ayt, lekin hurmatni saqlagan holda. 
O'zingni hurmat qiladigan, aqlli va samimiy do'st kabi tut.`;

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
  allPosts = []
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText
    };

    setMessages?.(prev => [...prev, userMessage]);
    if (!textOverride) setInput('');
    setIsLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    try {
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

      const contents = [
        ...history,
        { role: 'user', parts: [{ text: enhancedMessageText }] }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents as any,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || (language === 'uz' ? 'Kechirasiz, javob topilmadi.' : 'Извините, ответ не найден.')
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
      {/* Floating Header - Top Left */}
      <div className="absolute top-0 left-0 p-6 flex flex-col items-start pointer-events-none z-30">
        <div className="flex flex-col items-center gap-1.5">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-accent-blue flex items-center justify-center shadow-xl shadow-accent-blue/20 pointer-events-auto"
          >
            <Sparkles size={16} className="text-white" />
          </motion.div>
          <motion.h2 
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[8px] font-black text-text-primary uppercase tracking-tighter pointer-events-auto"
          >
            SmartSeller
          </motion.h2>
        </div>
      </div>

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
        <div className="relative z-10 flex items-center gap-2 pointer-events-auto max-w-2xl mx-auto">
          <div className="flex-1 relative group overflow-hidden rounded-3xl shadow-2xl shadow-black/5 border border-neutral-200 dark:border-neutral-800">
            {/* Liquid Background Effect - Saturated and slower */}
            <div className="absolute inset-0 pointer-events-none opacity-100 z-0">
              <motion.div 
                animate={{
                  scale: [1, 1.3, 1],
                  rotate: [0, 180, 360],
                  x: [-25, 25, -25],
                  y: [-15, 15, -15],
                }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -top-1/2 -left-1/2 w-full h-full bg-accent-blue rounded-[40%] blur-xl"
              />
              <motion.div 
                animate={{
                  scale: [1.3, 1, 1.3],
                  rotate: [360, 180, 0],
                  x: [25, -25, 25],
                  y: [15, -15, 15],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-600 rounded-[30%] blur-2xl"
              />
            </div>

            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-blue via-accent-light to-purple-500 rounded-3xl blur-[3px] opacity-20 group-focus-within:opacity-50 transition duration-300"></div>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={language === 'uz' ? 'SmartSellerga xabar yozing...' : 'Напишите SmartSeller...'}
              className="relative w-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl rounded-3xl pl-6 pr-14 py-5 text-base font-medium text-text-primary focus:outline-none transition-all placeholder:text-text-secondary/60 z-10"
            />
            
            {/* Integrated Smaller Send Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-11 h-11 bg-accent-blue text-white rounded-2xl disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-accent-blue/40 flex items-center justify-center z-30 group/btn"
            >
              <Send size={18} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchAI;
