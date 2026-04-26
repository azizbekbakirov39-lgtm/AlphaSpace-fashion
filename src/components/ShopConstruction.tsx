import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, ShoppingBag } from 'lucide-react';

interface ShopConstructionProps {
  progress: number;
  shopName: string;
  shopLogo: string | null;
}

const ShopConstruction: React.FC<ShopConstructionProps> = ({ progress, shopName, shopLogo }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] bg-accent-blue flex flex-col items-center justify-center p-8 overflow-hidden"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="w-full h-full" style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-xs">
        {/* Construction Container */}
        <div className="relative w-48 h-48">
          {/* Base Icon (Ghost) */}
          <div className="absolute inset-0 flex items-center justify-center text-white/10">
            <Store size={120} strokeWidth={1} />
          </div>

          {/* Building Icon (Masked by Progress) */}
          <div 
            className="absolute inset-0 flex items-center justify-center text-white overflow-hidden transition-all duration-300 ease-out"
            style={{ 
              clipPath: `inset(${100 - progress}% 0 0 0)`,
              filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.4))'
            }}
          >
            {shopLogo ? (
              <div className="w-40 h-40 rounded-[2.5rem] border-4 border-white overflow-hidden shadow-2xl">
                <img src={shopLogo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-40 h-40 rounded-[2.5rem] bg-white flex flex-col items-center justify-center shadow-2xl">
                <ShoppingBag size={64} className="text-accent-blue mb-2" />
                <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Shop</span>
              </div>
            )}
          </div>

          {/* Floating Particles */}
          <AnimatePresence>
            {progress < 100 && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-1 bg-white/40 blur-sm"
                animate={{ 
                  y: [0, -5, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ bottom: `${progress}%` }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Text Info */}
        <div className="text-center space-y-4 w-full">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black italic tracking-tighter uppercase text-white"
          >
            {shopName}
          </motion.h2>
          
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Qurilmoqda...</span>
              <span className="text-sm font-black text-white tracking-tighter">{Math.round(progress)}%</span>
            </div>
          </div>

          {progress >= 100 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => window.location.reload()}
              className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-colors"
            >
              Bekor qilish / Yangilash
            </motion.button>
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
    </motion.div>
  );
};

export default ShopConstruction;
