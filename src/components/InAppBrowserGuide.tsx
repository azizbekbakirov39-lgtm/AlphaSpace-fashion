import React from 'react';
import { motion } from 'motion/react';
import { MoreVertical, ArrowUpRight, Chrome, Share, PlusSquare } from 'lucide-react';

export const InAppBrowserGuide: React.FC = () => {
  const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center w-full max-w-md mx-auto">
      <h2 className="text-2xl font-black text-white mb-2">Ilovani o'rnatish</h2>
      <p className="text-white/70 mb-6 text-sm px-2">
        Agar o'rnatish oynasi avtomatik chiqmasa, quyidagi qadamlarni bajaring:
      </p>

      {isIOS ? (
        <div className="relative w-full bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl mb-8 p-6 flex flex-col items-center">
          <Share size={32} className="text-blue-400 mb-4" />
          <p className="text-white text-sm font-medium mb-4">1. Pastki menyudan <b>Ulashish (Share)</b> tugmasiga bosing.</p>
          <div className="w-full h-px bg-white/10 my-2" />
          <PlusSquare size={32} className="text-white mb-4 mt-2" />
          <p className="text-white text-sm font-medium">2. <b>Bosh ekranga qo'shish (Add to Home Screen)</b> tugmasini tanlang.</p>
        </div>
      ) : (
        <div className="relative w-full bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl mb-8">
          {/* Fake Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#222]">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-white/20" />
              <div className="h-4 w-32 bg-white/20 rounded-md" />
            </div>
            <div className="relative">
              <MoreVertical className="text-white" size={24} />
              <motion.div 
                initial={{ x: -10, y: 10, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
                className="absolute -bottom-10 -left-12 flex items-center text-red-500 z-20"
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
            
            {/* Target Menu Item */}
            <div className="px-4 py-3 bg-white/5 flex items-center gap-3 text-white relative">
              <Chrome size={20} className="text-blue-400" />
              <span className="text-sm font-medium text-left">Asosiy ekranga qo'shish yoki Chrome deb tanlang</span>
              
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
          <div className="h-40 bg-[#111] p-4 opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-accent-blue mx-auto mb-4 mt-4" />
            <div className="h-6 w-32 bg-white/20 rounded mx-auto mb-2" />
          </div>
        </div>
      )}
      
      <div className="bg-accent-blue/20 p-4 rounded-2xl text-left w-full">
        <ol className="text-white/80 text-sm space-y-3 list-decimal list-inside font-medium">
          {isIOS ? (
            <>
              <li>Brauzerning pastki qismidagi <b>Ulashish (Share) <Share className="inline w-4 h-4 ml-1 mb-1"/></b> ga bosing.</li>
              <li>Ochilgan menyudan pastga suring.</li>
              <li><b>"Bosh ekranga qo'shish" (Add to Home Screen)</b> ni tanlang.</li>
            </>
          ) : (
            <>
              <li>Yuqori o'ng burchakdagi <b>3 ta nuqtani (⋮)</b> bosing.</li>
              <li>Menyudan <b>"Asosiy ekranga qo'shish"</b> (Add to Home screen) ni tanlang.</li>
              <li>Agar ichki brauzerda bo'lsangiz <b>"Open in Chrome"</b> ni tanlang va o'rnating.</li>
            </>
          )}
        </ol>
      </div>
    </div>
  );
};
