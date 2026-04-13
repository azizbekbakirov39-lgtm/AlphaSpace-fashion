import React from 'react';
import { motion } from 'motion/react';
import { Download, Share, PlusSquare, ExternalLink } from 'lucide-react';
import Logo from './Logo';
import { usePWA } from '../hooks/usePWA';
import { InAppBrowserGuide } from './InAppBrowserGuide';

const DownloadPage: React.FC = () => {
  const { installApp, isIOS, isInAppBrowser } = usePWA();

  if (isInAppBrowser) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <InAppBrowserGuide />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-blue/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="mb-8"
        >
          <Logo width={140} height={140} animated={true} />
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-black text-white mb-4 tracking-tighter"
        >
          AlphaSpace
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/70 text-lg mb-12 font-medium"
        >
          Moda va kiyimlarga asoslangan platforma
        </motion.p>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={installApp}
          className="w-full py-5 bg-accent-blue text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,122,255,0.3)]"
        >
          <Download size={20} />
          Ilovani yuklab olish
        </motion.button>

        {isIOS && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 text-left w-full"
          >
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-accent-blue flex items-center justify-center text-xs">i</span>
              iPhone uchun yo'riqnoma:
            </h3>
            <ol className="text-white/70 text-sm space-y-4">
              <li className="flex items-start gap-3">
                <span className="font-black text-white mt-0.5">1.</span>
                <span>Pastdagi menyudan <Share size={16} className="inline mx-1 text-accent-blue" /> (Ulashish) tugmasini bosing</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-black text-white mt-0.5">2.</span>
                <span>Ro'yxatdan <strong>"Add to Home Screen"</strong> <PlusSquare size={16} className="inline mx-1 text-white" /> ni tanlang</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-black text-white mt-0.5">3.</span>
                <span>Yuqori o'ng burchakdagi <strong>"Add"</strong> tugmasini bosing</span>
              </li>
            </ol>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DownloadPage;
