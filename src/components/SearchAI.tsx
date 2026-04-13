import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { AIMessage } from '../types';
import { motion } from 'motion/react';

interface SearchAIProps {
  language?: string;
  pendingTryOn?: any;
  onClearPendingTryOn?: () => void;
  messages?: AIMessage[];
  setMessages?: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  foundPosts?: any[];
  setFoundPosts?: any;
  foundObrazlar?: any[];
  setFoundObrazlar?: any;
  foundSellers?: any[];
  setFoundSellers?: any;
  onOpenPostDetails?: any;
  onOpenShopProfile?: any;
  globalMuted?: boolean;
  setGlobalMuted?: any;
  allPosts?: any[];
  allObrazlar?: any[];
  allSellers?: any[];
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
        model: 'gemini-1.5-flash',
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

      {/* Input Panel */}
      <div className="p-4 border-t border-border-primary bg-bg-primary shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* Quick Actions / Keyboard */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleSend(action.text)}
              className="whitespace-nowrap px-4 py-2.5 bg-white dark:bg-neutral-800 border border-border-primary rounded-xl text-[11px] font-black text-text-primary hover:border-accent-blue/50 active:scale-95 transition-all shadow-sm"
            >
              {action.text}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={language === 'uz' ? 'Xabaringizni yozing...' : 'Введите сообщение...'}
              className="w-full bg-text-primary/5 border border-border-primary rounded-2xl px-5 py-4 text-sm font-bold text-text-primary focus:outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all placeholder:text-text-secondary/50"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-4 bg-accent-blue text-white rounded-2xl disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-accent-blue/20"
          >
            <Send size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default SearchAI;
