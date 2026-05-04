import React from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  ChevronLeft, 
  Grid, 
  Bookmark, 
  Dna, 
  LayoutGrid,
  Heart
} from 'lucide-react';
import { User, PostData, Seller } from '../../types';
import { ImageWithFallback } from '../ImageWithFallback';
import { translations } from '../../translations';

interface ProfileMainProps {
  user: User;
  onOpenSettings: () => void;
  onBack: () => void;
  activeTab: 'posts' | 'saved' | 'dna' | 'closet';
  setActiveTab: (tab: any) => void;
  userPosts: PostData[];
  savedPosts: PostData[];
  onOpenPostDetails: (posts: PostData[], index: number) => void;
  onLogout: () => void;
  onLanguageSettings: () => void;
  onOpenShop: () => void;
  onOpenAdminDashboard?: () => void;
  hasShop: boolean;
  language: string;
  languages: any[];
  downloadCount: number;
  userShops?: Seller[];
  workspace: 'Marketplace' | 'Shop';
  renderProfileHeader: () => React.ReactNode;
  renderTabContent: () => React.ReactNode;
  t: any;
}

const ProfileMain: React.FC<ProfileMainProps> = ({
  user,
  onOpenSettings,
  onBack,
  activeTab,
  setActiveTab,
  onLogout,
  onLanguageSettings,
  onOpenShop,
  onOpenAdminDashboard,
  hasShop,
  language,
  languages,
  downloadCount,
  userShops,
  workspace,
  renderProfileHeader,
  renderTabContent,
  t
}) => {
  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Custom Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-bg-primary/80 backdrop-blur-xl border-b border-border-primary">
        <button onClick={onBack} className="p-2 -ml-2 text-text-primary/60 hover:text-text-primary active:scale-95 transition-all">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-text-primary">{user.displayName || user.email?.split('@')[0]}</h1>
        <button onClick={onOpenSettings} className="p-2 -mr-2 text-text-primary/60 hover:text-text-primary active:scale-95 transition-all">
          <Settings size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {renderProfileHeader()}

        {/* Tab Navigation */}
        <div className="sticky top-0 z-20 bg-bg-primary/80 backdrop-blur-xl border-y border-border-primary">
          <div className="flex items-center justify-around">
            {[
              { id: 'posts', icon: Grid, label: t.posts },
              { id: 'saved', icon: Bookmark, label: t.saved },
              { id: 'closet', icon: LayoutGrid, label: 'Garderob' },
              { id: 'dna', icon: Dna, label: 'DNK' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center py-3 relative transition-all ${isActive ? 'text-accent-blue' : 'text-text-primary/40'}`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[9px] font-black uppercase tracking-widest mt-1">{tab.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {renderTabContent()}
        </div>

        {/* Action Menu Sections */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onLanguageSettings}
                className="p-5 bg-gradient-to-br from-blue-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                  <Grid size={24} />
                </div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.language}</h3>
                <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">
                  {languages.find(l => l.code === language)?.name}
                </p>
              </motion.button>

               <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {}}
                className="p-5 bg-gradient-to-br from-purple-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
              >
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-500 mb-3 group-hover:scale-110 transition-transform">
                  <Heart size={24} />
                </div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Afzalliklar</h3>
                <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">Sozlamalar</p>
              </motion.button>
          </div>

          {user.role === 'admin' && (
            <motion.button
              onClick={onOpenAdminDashboard}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-yellow-500/20"
            >
              Admin Panel
            </motion.button>
          )}

          {!hasShop && (
            <motion.button
              onClick={onOpenShop}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-accent-blue text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-accent-blue/20"
            >
              Do'kon ochish
            </motion.button>
          )}

          <button 
            onClick={onLogout}
            className="w-full py-4 text-red-500 font-bold uppercase tracking-widest text-sm border border-red-500/20 rounded-2xl hover:bg-red-500/5 transition-colors"
          >
            {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileMain;
