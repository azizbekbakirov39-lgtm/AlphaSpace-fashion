import React from 'react';
import { Home, MapPin, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../translations';
import { useKeyboard } from '../hooks/useKeyboard';
import { BrandsIcon, LiveIcon } from './CustomIcons';
import SmartSellerLogo from './SmartSellerLogo';
import Logo from './Logo';
import { User } from '../types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  user: User | null;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, language, user }) => {
  const t = translations[language];
  const { isKeyboardOpen } = useKeyboard();
  
  const tabs = [
    { name: 'Home', label: t.home, isLogo: true },
    { name: 'Brands', icon: BrandsIcon, label: t.brands, isLogo: false },
    { name: 'Search', label: t.ai, isLogo: true },
    { name: 'Live', icon: LiveIcon, label: t.live, isLogo: false },
    { name: 'Profile', icon: UserIcon, label: t.profile, isLogo: false },
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
                  scale: isActive ? (tab.isLogo ? 0.9 : 1.2) : (tab.isLogo ? 0.8 : 1),
                  y: isActive ? (tab.isLogo ? 0 : -4) : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative z-10 flex items-center justify-center h-[28px]"
              >
                {tab.name === 'Search' ? (
                  <SmartSellerLogo width={61} showText={true} className="-mt-3" />
                ) : tab.name === 'Brands' ? (
                  <BrandsIcon size={40} isActive={isActive} />
                ) : tab.name === 'Home' ? (
                  <div className="mt-[-4px]">
                    <Logo width={63} showText={true} />
                  </div>
                ) : tab.name === 'Profile' && user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'Profile'} 
                    className="w-[28px] h-[28px] rounded-full border border-border-primary object-cover" 
                  />
                ) : (
                  <Icon 
                    size={tab.name === 'Live' ? 40 : 22} 
                    strokeWidth={isActive ? 2 : 1.5} 
                    stroke={isActive ? "url(#nav-gradient)" : "currentColor"}
                    className={`transition-colors duration-300 ${isActive ? '' : 'text-text-primary/50'}`}
                  />
                )}
              </motion.div>
              
              {!tab.isLogo && (
                <div className="relative mt-1 flex flex-col items-center">
                  <motion.span 
                    animate={{
                      opacity: isActive ? 1 : 0.8,
                      scale: isActive ? 1.05 : 1,
                    }}
                    className={`${['Brands', 'Live'].includes(tab.name) ? 'text-sm font-bold font-cursive' : ['Profile'].includes(tab.name) ? 'text-sm font-medium font-cursive' : 'text-[8px] font-black tracking-[0.1em] uppercase'} transition-all duration-300 text-center px-1 whitespace-nowrap relative bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent`}
                  >
                    {tab.label}
                  </motion.span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
