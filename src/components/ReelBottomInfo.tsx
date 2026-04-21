import React from 'react';
import { Send } from 'lucide-react';
import { PostData } from '../types';
import { Language } from '../translations';
import { formatRelativeTime } from '../utils/timeUtils';

interface ReelBottomInfoProps {
  realPost: PostData;
  language: Language;
  isDescriptionExpanded: boolean;
  setIsDescriptionExpanded: (val: boolean) => void;
  onShopClick: (e: React.MouseEvent) => void;
  onChatOpen: (e: React.MouseEvent) => void;
  onDetailsOpen: (e: React.MouseEvent) => void;
}

const ReelBottomInfo: React.FC<ReelBottomInfoProps> = ({
  realPost,
  language,
  isDescriptionExpanded,
  setIsDescriptionExpanded,
  onShopClick,
  onChatOpen,
  onDetailsOpen
}) => {
  return (
    <div className="absolute bottom-6 left-4 right-4 z-20 flex flex-col gap-4 pr-14">
      {/* Row 1 (Top): Shop Identity & Price */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div 
          className="flex items-center gap-2.5 cursor-pointer active:opacity-70 transition-opacity"
          onClick={onShopClick}
        >
          <img 
            src={realPost.seller.logo} 
            className="w-12 h-12 rounded-full border border-white/20 object-cover shadow-lg" 
            referrerPolicy="no-referrer" 
          />
          <div className="flex flex-col">
            <span className="text-white font-black text-base drop-shadow-md tracking-tight leading-none">{realPost.seller.name}</span>
            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-0.5">
              {formatRelativeTime(realPost.createdAt)}
            </span>
          </div>
        </div>
        
        <span className="text-white font-black text-lg drop-shadow-lg tracking-tight">
          {realPost.price && realPost.price.trim() !== "" 
            ? realPost.price 
            : (realPost.priceMessage || (language === 'uz' ? 'Narxi?' : 'Price?'))}
        </span>
      </div>

      {/* Row 2 (Middle): Message & Batafsil */}
      <div className="flex items-center gap-3">
        <div 
          onClick={onChatOpen}
          className="flex-1 flex items-center justify-between bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 h-10 shadow-lg cursor-pointer active:opacity-70 transition-opacity"
        >
          <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">{language === 'uz' ? 'Xabar yuborish...' : 'Send message...'}</span>
          <Send size={14} className="text-white/60" />
        </div>

        <button 
          onClick={onDetailsOpen}
          className="h-10 px-4 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-[0.2em] hover:text-white/80 active:scale-95 transition-all"
        >
          Batafsil
        </button>
      </div>

      {/* Row 3 (Bottom): Description (Izoh) */}
      {realPost.description && (
        <div className="px-1 mt-1">
          <p className={`text-white text-[12px] font-medium leading-snug drop-shadow-md transition-all ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
            {realPost.description}
          </p>
          {!isDescriptionExpanded && realPost.description.length > 60 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsDescriptionExpanded(true);
              }}
              className="text-white/50 text-[10px] font-bold mt-0.5 hover:text-white"
            >
              ...davomi
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReelBottomInfo;
