import React from 'react';
import { motion } from 'motion/react';
import { MoreVertical, ExternalLink, ArrowUpRight, Chrome } from 'lucide-react';

export const InAppBrowserGuide: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center w-full max-w-md mx-auto">
      <h2 className="text-2xl font-black text-white mb-2">Brauzerni o'zgartiring</h2>
      <p className="text-white/70 mb-8 text-sm">
        Instagram yoki Telegram ichida ilovani o'rnatib bo'lmaydi. Ilovani o'rnatish uchun quyidagi qadamlarni bajaring:
      </p>

      {/* Mockup UI */}
      <div className="relative w-full bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl mb-8">
        
        {/* Fake Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#222]">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-white/20" />
            <div className="h-4 w-32 bg-white/20 rounded-md" />
          </div>
          <div className="relative">
            <MoreVertical className="text-white" size={24} />
            
            {/* Red Arrow pointing to 3 dots */}
            <motion.div 
              initial={{ x: -10, y: 10, opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
              className="absolute -bottom-10 -left-12 flex items-center text-red-500"
            >
              <span className="text-xs font-bold mr-1 whitespace-nowrap bg-red-500 text-white px-2 py-1 rounded-lg">1. Shu yerni bosing</span>
              <ArrowUpRight size={24} strokeWidth={3} />
            </motion.div>
          </div>
        </div>

        {/* Fake Dropdown Menu */}
        <div className="absolute top-12 right-2 w-48 bg-[#333] rounded-xl shadow-xl border border-white/10 py-2 z-10">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 text-white/50">
            <div className="w-5 h-5 rounded bg-white/20" />
            <div className="h-3 w-20 bg-white/20 rounded" />
          </div>
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 text-white/50">
            <div className="w-5 h-5 rounded bg-white/20" />
            <div className="h-3 w-24 bg-white/20 rounded" />
          </div>
          
          {/* Target Menu Item */}
          <div className="px-4 py-3 bg-white/5 flex items-center gap-3 text-white relative">
            <Chrome size={20} className="text-blue-400" />
            <span className="text-sm font-medium">Open in Chrome</span>
            
            {/* Red Arrow pointing to Open in Chrome */}
            <motion.div 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ repeat: Infinity, duration: 1, repeatType: "reverse", delay: 0.5 }}
              className="absolute -left-32 top-1/2 -translate-y-1/2 flex items-center text-red-500"
            >
              <span className="text-xs font-bold mr-1 whitespace-nowrap bg-red-500 text-white px-2 py-1 rounded-lg">2. Tanlang</span>
              <ArrowUpRight size={20} strokeWidth={3} className="rotate-45" />
            </motion.div>
          </div>
        </div>

        {/* Fake Content Area */}
        <div className="h-48 bg-[#111] p-4 opacity-50">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue mx-auto mb-4 mt-8" />
          <div className="h-6 w-32 bg-white/20 rounded mx-auto mb-2" />
          <div className="h-10 w-48 bg-accent-blue rounded-xl mx-auto mt-6" />
        </div>
      </div>
      
      <div className="bg-accent-blue/20 p-4 rounded-2xl text-left w-full">
        <ol className="text-white/80 text-sm space-y-3 list-decimal list-inside font-medium">
          <li>Yuqori o'ng burchakdagi <b>3 ta nuqtani (⋮)</b> bosing.</li>
          <li>Menyudan <b>"Open in Chrome"</b> (yoki Safari) ni tanlang.</li>
          <li>Ochilgan sahifada <b>"Yuklab olish"</b> tugmasini bosing.</li>
        </ol>
      </div>
    </div>
  );
};
