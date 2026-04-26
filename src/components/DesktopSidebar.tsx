import React from 'react';
import { Home, User as UserIcon, LogOut, Store, MapPin, MessageCircle } from 'lucide-react';
import { BrandsIcon, LiveIcon } from './CustomIcons';
import { RealisticBlueMessageIcon } from './RealisticBlueMessageIcon';
import { Language, translations } from '../translations';
import { User, Seller } from '../types';
import Logo from './Logo';
import SmartSellerLogo from './SmartSellerLogo';

interface DesktopSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  user: User | null;
  unreadMessages: number;
  workspace: string;
  handleWorkspaceChange: (w: 'Marketplace' | 'Shop') => void;
  userShops: Seller[];
  setShowShopSelector: (show: boolean) => void;
  openMessages: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  setActiveTab,
  language,
  user,
  unreadMessages,
  workspace,
  handleWorkspaceChange,
  userShops,
  setShowShopSelector,
  openMessages
}) => {
  const t = translations[language];

  const tabs = [
    { name: 'Home', label: t.home, icon: Home },
    { name: 'Search', label: t.ai, isSmartObject: true },
    { name: 'Brands', label: t.brands, icon: BrandsIcon, isCustom: true },
    { name: 'Live', label: t.live, icon: LiveIcon, isCustom: true },
    { name: 'Profile', label: t.profile, icon: UserIcon },
  ];

  return (
    <div className="hidden md:flex flex-col w-[260px] lg:w-[300px] h-full border-r border-border-primary bg-bg-primary py-8 px-6 overflow-y-auto">
      {/* SVG Gradient Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="nav-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0095FF" />
            <stop offset="100%" stopColor="#5AC8FA" />
          </linearGradient>
        </defs>
      </svg>
      {/* Logo */}
      <div 
        className="flex items-center gap-3 mb-10 cursor-pointer"
        onClick={() => setActiveTab('Home')}
      >
        <Logo width={44} height={44} />
        <h1 className="text-2xl font-bold font-cursive bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
          AlphaSpace
        </h1>
      </div>

      {workspace === 'Marketplace' && (
        <div className="flex flex-col gap-4 flex-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            const Icon = tab.icon;

            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${
                  isActive 
                    ? 'bg-accent-blue/10 dark:bg-accent-blue/20' 
                    : 'hover:bg-text-primary/5'
                }`}
              >
                <div className="flex items-center justify-center w-[30px] h-[30px]">
                  {tab.isSmartObject ? (
                    <SmartSellerLogo width={40} showText={false} />
                  ) : tab.name === 'Profile' && user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="" 
                      className="w-full h-full rounded-full object-cover border border-border-primary"
                    />
                  ) : tab.isCustom ? (
                    <Icon size={48} isActive={isActive} />
                  ) : Icon ? (
                    <Icon size={26} className={isActive ? 'text-accent-blue' : 'text-text-primary'} />
                  ) : null}
                </div>
                <span className={`text-base font-bold ${isActive ? 'text-accent-blue' : 'text-text-primary'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          <button
            onClick={openMessages}
            className={`flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-text-primary/5`}
          >
            <div className="relative flex items-center justify-center w-[30px] h-[30px]">
              <RealisticBlueMessageIcon active={true} size={32} />
              {unreadMessages > 0 && (
                <div className="absolute -top-1 -right-2 min-w-[20px] h-[20px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-bg-primary shadow-lg">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </div>
              )}
            </div>
            <span className={`text-base font-bold ${activeTab === 'Profile' ? 'text-accent-blue' : 'text-text-primary' }`}>Xabarlar</span>
          </button>
        </div>
      )}

      {workspace === 'Shop' && (
        <div className="flex flex-col gap-4 flex-1">
          <button
            onClick={() => handleWorkspaceChange('Marketplace')}
            className={`flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-text-primary/5`}
          >
            <div className="flex items-center justify-center w-[30px] h-[30px]">
              <Home size={26} className="text-text-primary" />
            </div>
            <span className="text-base font-bold text-text-primary">Marketplace</span>
          </button>
          
          <button
            onClick={() => setShowShopSelector(true)}
            className={`flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-text-primary/5`}
          >
            <div className="flex items-center justify-center w-[30px] h-[30px]">
              {userShops[0]?.logo ? (
                <img src={userShops[0].logo} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Home size={26} className="text-text-primary" />
              )}
            </div>
            <span className="text-base font-bold text-text-primary">Do'konlarim</span>
          </button>
        </div>
      )}

      {/* Footer / User Profile snippet */}
      {user && (
        <div className="mt-auto border-t border-border-primary pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-text-primary/10 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={24} className="m-2 text-text-secondary" />
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-text-primary truncate">{user.displayName || 'Foydalanuvchi'}</span>
              <span className="text-xs text-text-secondary truncate">{user.email}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
