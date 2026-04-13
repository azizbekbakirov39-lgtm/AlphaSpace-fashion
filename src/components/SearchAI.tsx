import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { AIMessage } from '../types';
import { motion } from 'motion/react';

interface SearchAIProps {
  language?: string;
  messages?: AIMessage[];
  setMessages?: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

const SearchAI: React.FC<SearchAIProps> = ({
  language = 'uz',
  messages = [],
  setMessages,
  initialQuery,
  onClearInitialQuery
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { id: 'how_to_buy', text: language === 'uz' ? 'Qanday sotib olaman?' : 'Как купить?' },
    { id: 'delivery', text: language === 'uz' ? 'Yetkazib berish bormi?' : 'Есть доставка?' },
    { id: 'quality', text: language === 'uz' ? 'Sifatiga kafolat bormi?' : 'Есть гарантия качества?' },
    { id: 'discount', text: language === 'uz' ? 'Chegirmalar bormi?' : 'Есть скидки?' },
  ];

  useEffect(() => {
    if (initialQuery) {
      setInput(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery, onClearInitialQuery]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const systemInstruction = `Siz AlphaSpace Marketplace-ning "SmartSeller" deb nomlangan aqlli yordamchisiz. 
      Foydalanuvchiga mahsulotlar, do'konlar va platformadan foydalanish bo'yicha yordam bering.
      Juda qisqa va aniq javob bering. Do'stona va samimiy bo'ling.`;

      const contents = [
        ...history,
        { role: 'user', parts: [{ text: messageText }] }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents as any,
        config: {
          systemInstruction
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
    <div className="flex flex-col h-full bg-bg-primary relative">
      {/* Header */}
      <div className="p-4 border-b border-border-primary flex items-center justify-between bg-bg-primary/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-accent-blue flex items-center justify-center shadow-lg shadow-accent-blue/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-text-primary">SmartSeller</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Onlayn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-[2rem] bg-accent-blue/5 flex items-center justify-center text-accent-blue mb-6">
              <Sparkles size={40} />
            </div>
            <h3 className="text-lg font-black text-text-primary mb-2">
              {language === 'uz' ? 'Sizga qanday yordam bera olaman?' : 'Чем я могу вам помочь?'}
            </h3>
            <p className="text-xs font-bold text-text-secondary leading-relaxed">
              {language === 'uz' 
                ? 'Mahsulotlar, do\'konlar yoki platforma haqida istalgan savolingizni bering.' 
                : 'Задавайте любые вопросы о товарах, магазинах или платформе.'}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold shadow-sm ${
              message.role === 'user' 
                ? 'bg-accent-blue text-white rounded-tr-none' 
                : 'bg-text-primary/5 text-text-primary border border-border-primary rounded-tl-none'
            }`}>
              {message.content}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-text-primary/5 border border-border-primary p-4 rounded-3xl rounded-tl-none flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-accent-blue" />
              <span className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest">Yozmoqda...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Panel with AI Liquid Effect */}
      <div className="p-3 pb-24 border-t border-border-primary bg-bg-primary relative">
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex-1 relative group overflow-hidden rounded-2xl">
            {/* Liquid Background Effect - Now inside the input container */}
            <div className="absolute inset-0 pointer-events-none opacity-30 z-0">
              <motion.div 
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                  x: [-20, 20, -20],
                  y: [-10, 10, -10],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -top-1/2 -left-1/2 w-full h-full bg-accent-blue/40 rounded-[40%] blur-xl"
              />
              <motion.div 
                animate={{
                  scale: [1.2, 1, 1.2],
                  rotate: [360, 180, 0],
                  x: [20, -20, 20],
                  y: [10, -10, 10],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-500/30 rounded-[30%] blur-2xl"
              />
            </div>

            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-blue to-purple-500 rounded-2xl blur-[2px] opacity-10 group-focus-within:opacity-30 transition duration-300"></div>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={language === 'uz' ? 'SmartSellerga savol bering...' : 'Спросите у SmartSeller...'}
              className="relative w-full bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/20 rounded-2xl pl-6 pr-14 py-4 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/20 transition-all placeholder:text-text-secondary/40 z-10"
            />
            
            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-20 z-20">
              <Sparkles size={12} className="text-accent-blue animate-pulse" />
            </div>

            {/* Integrated Smaller Send Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-accent-blue text-white rounded-xl disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-accent-blue/20 flex items-center justify-center z-30 group/btn"
            >
              <Send size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchAI;
