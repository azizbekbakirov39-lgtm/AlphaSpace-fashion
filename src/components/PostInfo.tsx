import React from 'react';
import { PostData } from '../types';
import { Language, translations } from '../translations';

interface PostInfoProps {
  post: PostData;
  language: Language;
  isDescriptionExpanded: boolean;
  setIsDescriptionExpanded: (val: boolean) => void;
  onOpenChat: () => void;
  onOpenDetails: () => void;
}

const PostInfo: React.FC<PostInfoProps> = ({
  post,
  language,
  isDescriptionExpanded,
  setIsDescriptionExpanded,
  onOpenChat,
  onOpenDetails
}) => {
  const t = translations[language];

  return (
    <div className="px-4 flex flex-col gap-0.5">
      <p className="text-text-primary text-xs font-bold">
        {(post.likes || 0).toLocaleString()} {t.likes}
      </p>
      <div className="flex flex-col gap-0.5 mb-0.5">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-black text-[14px] font-black tracking-tight">{post.seller.name}</span>
          <span className="text-black/80 text-[13px] font-bold">
            {!(post.outfitName || '').toLowerCase().includes("instagram") ? post.outfitName : ""}
          </span>
        </div>
        {post.description && (
          <div className="relative">
            <p className={`text-black text-[13px] font-bold leading-snug transition-all ${isDescriptionExpanded ? '' : 'line-clamp-1'}`}>
              {post.description}
            </p>
            {!isDescriptionExpanded && post.description.length > 40 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDescriptionExpanded(true);
                }}
                className="text-text-secondary text-[12px] font-black mt-0.5 hover:text-accent-blue transition-colors"
              >
                ...davomi
              </button>
            )}
            {isDescriptionExpanded && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDescriptionExpanded(false);
                }}
                className="text-text-secondary text-[12px] font-black mt-1 hover:text-accent-blue transition-colors"
              >
                yashirish
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onOpenChat();
          }}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 backdrop-blur-xl border border-indigo-500/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-all flex items-center justify-center"
        >
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-black text-[11px] uppercase tracking-widest">
            {language === 'uz' ? "Xabar yuborish" : "Message"}
          </span>
        </button>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 backdrop-blur-xl border border-cyan-500/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-all flex items-center justify-center"
        >
          <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent font-black text-[11px] uppercase tracking-widest">
            {language === 'uz' ? "Batafsil" : "Details"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default PostInfo;
