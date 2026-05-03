import React from 'react';
import { Store } from 'lucide-react';
import { Language } from '../translations';
import { formatRelativeTime } from '../utils/timeUtils';
import { PostData } from '../types';

interface PostHeaderProps {
  post: PostData;
  language: Language;
  onShopClick: (e: React.MouseEvent) => void;
  onToggleSubscribe?: () => void;
}

const PostHeader: React.FC<PostHeaderProps> = ({
  post,
  language,
  onShopClick,
  onToggleSubscribe
}) => {
  return (
    <div className="mx-4 mt-4 mb-3 flex items-center justify-between group">
      <div 
        className="flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity flex-1"
        onClick={onShopClick}
      >
        <div className={`flex-shrink-0 p-[2px] rounded-full ${post.seller.hasStory ? 'bg-accent-light shadow-sm shadow-accent-light/20' : 'bg-text-primary/10'}`}>
          <div className="p-[1.5px] bg-bg-primary rounded-full">
            {post.seller.logo ? (
              <img 
                src={post.seller.logo} 
                alt={post.seller.name} 
                className="w-9 h-9 rounded-full object-cover aspect-square"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-accent-blue">
                <Store size={18} strokeWidth={1.5} />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-text-primary font-black text-[13px] tracking-tight uppercase leading-none">{post.seller.name}</span>
            {post.seller.followers > 1000 && (
              <div className="bg-accent-blue/10 text-accent-blue text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-widest">
                Top
              </div>
            )}
          </div>
          <span className="text-text-secondary text-[9px] font-bold uppercase tracking-wider opacity-50 mt-0.5">
            {post.seller.categories?.[0] || "Do'kon"} • {(post.seller.followers || 0).toLocaleString()} {language === 'uz' ? 'obunachi' : 'followers'} • {formatRelativeTime(post.createdAt)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          className={`px-5 py-1.5 text-[10px] font-black rounded-full uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center border ${
            post.seller.isSubscribed 
              ? 'bg-text-primary/5 text-text-primary/60 border-border-primary' 
              : 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 backdrop-blur-xl border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSubscribe) onToggleSubscribe();
          }}
        >
          {post.seller.isSubscribed ? (
            language === 'uz' ? "Kuzatilyapti" : "Following"
          ) : (
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {language === 'uz' ? "Kuzatish" : "Follow"}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default PostHeader;
