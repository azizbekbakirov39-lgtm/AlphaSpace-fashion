import React from 'react';
import { Home, Sparkles, MapPin, User, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../translations';
import { useKeyboard } from '../hooks/useKeyboard';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, language }) => {
  const t = translations[language];
  const { isKeyboardOpen } = useKeyboard();
  
  const tabs = [
    { name: 'Home', icon: Home, label: t.home },
    { name: 'Brands', icon: Tag, label: t.brands },
    { name: 'Search', icon: Sparkles, label: t.ai },
    { name: 'Live', icon: MapPin, label: t.live },
    { name: 'Profile', icon: User, label: t.profile },
  ];

  if (isKeyboardOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-bg-primary/80 backdrop-blur-2xl border-t border-border-primary/50 px-2 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {/* SVG Gradient Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="nav-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0095FF" />
            <stop offset="100%" stopColor="#5AC8FA" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex items-center max-w-md mx-auto relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;
          
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className="relative flex-1 flex flex-col items-center justify-center py-1 outline-none"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.2 : 1,
                  y: isActive ? -4 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative z-10"
              >
                <Icon 
                  size={22} 
                  strokeWidth={isActive ? 2 : 1.5} 
                  stroke={isActive ? "url(#nav-gradient)" : "currentColor"}
                  className={`transition-colors duration-300 ${isActive ? '' : 'text-text-primary/50'}`}
                />
              </motion.div>
              
              <div className="relative mt-1 flex flex-col items-center">
                <motion.span 
                  animate={{
                    opacity: isActive ? 1 : 0.6,
                    scale: isActive ? 1.1 : 1,
                  }}
                  className={`text-[8px] font-black tracking-[0.1em] uppercase transition-all duration-300 text-center px-1 whitespace-nowrap relative ${isActive ? 'bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent' : 'text-text-primary/50'}`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-[1px] left-0 right-0 h-[1px] rounded-full bg-accent-blue shadow-[0_0_3px_#0095FF]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
