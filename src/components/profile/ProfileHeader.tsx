import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Edit3 } from 'lucide-react';
import { User, PostData } from '../../types';
import { Language } from '../../translations';

interface ProfileHeaderProps {
  user: User;
  userPosts: PostData[];
  downloadCount: number;
  onEditProfile: () => void;
  language: Language;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  userPosts,
  downloadCount,
  onEditProfile,
  language
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStats = () => [
    { label: language === 'uz' ? 'Postlar' : 'Посты', value: userPosts.length },
    { label: language === 'uz' ? 'Obunachilar' : 'Подписчики', value: '1.2k' },
    { label: language === 'uz' ? 'Obunalar' : 'Подписки', value: '156' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-accent-blue to-blue-600 p-0.5 shadow-xl shadow-accent-blue/20">
            <div className="w-full h-full rounded-[1.9rem] overflow-hidden bg-bg-primary flex items-center justify-center border-2 border-bg-primary">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || ''} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-2xl font-black text-accent-blue">
                  {getInitials(user.displayName || user.email || 'User')}
                </span>
              )}
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-text-primary text-bg-primary rounded-xl flex items-center justify-center shadow-lg border-4 border-bg-primary">
            <Sparkles size={14} />
          </div>
        </motion.div>

        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-xl font-black text-text-primary tracking-tight uppercase italic">{user.displayName || user.email?.split('@')[0]}</h2>
            <p className="text-xs font-bold text-accent-blue uppercase tracking-widest mt-0.5">Top Influencer</p>
          </div>
          
          <div className="flex gap-4">
            {getStats().map((stat) => (
              <div key={stat.label}>
                <p className="text-sm font-black text-text-primary uppercase tracking-tight">{stat.value}</p>
                <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {user.uid === 'user_123' && (
        <div className="p-4 bg-accent-blue/5 rounded-2xl border border-accent-blue/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Ilova yuklanganlar</p>
            <p className="text-xl font-black text-text-primary">{downloadCount}</p>
          </div>
          <div className="w-12 h-12 bg-accent-blue/20 rounded-xl flex items-center justify-center text-accent-blue">
            <Sparkles size={24} />
          </div>
        </div>
      )}

      <button 
        onClick={onEditProfile}
        className="w-full py-3 bg-text-primary/5 border border-border-primary rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-text-primary hover:bg-text-primary/10 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <Edit3 size={14} /> Profilni tahrirlash
      </button>
    </div>
  );
};

export default ProfileHeader;
