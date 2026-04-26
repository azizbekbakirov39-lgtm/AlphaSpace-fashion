import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Logo animation takes about 2.6s. We wait 1s after that.
    const timer = setTimeout(() => {
      setIsFinished(true);
      setTimeout(onComplete, 800);
    }, 3600);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isFinished ? 0 : 1 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 z-[9999] bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="flex flex-col items-center gap-16">
        {/* Large Animated Logo (Tag Icon with A.S) */}
        <div className="relative">
          <Logo width={180} height={180} animated={true} className="drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
          
          {/* Subtle Glow */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-white blur-[80px] rounded-full -z-10"
          />
        </div>
      </div>

      {/* Subtle Progress Line */}
      <div className="absolute bottom-20 w-64 h-[1px] bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 10, ease: "linear" }}
          className="h-full bg-white/30"
        />
      </div>
    </motion.div>
  );
};

export default SplashScreen;
