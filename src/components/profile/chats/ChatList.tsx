import React from 'react';
import { Seller } from '../../../types';
import { ChatMessage } from '../types';

interface ChatListProps {
  chatSellers: Seller[];
  chatMessages: {[key: string]: ChatMessage[]};
  onOpenChat: (sellerId: string) => void;
  getLastMessagePreview: (sellerId: string) => string;
}

export const ChatList: React.FC<ChatListProps> = ({
  chatSellers,
  chatMessages,
  onOpenChat,
  getLastMessagePreview
}) => {
  return (
    <div className="flex flex-col gap-1 p-2">
      {chatSellers.map((seller) => (
        <button
          key={seller.id}
          onClick={() => {
            onOpenChat(seller.id);
          }}
          className="flex items-center gap-3 p-3 hover:bg-text-primary/5 rounded-xl transition-colors text-left"
        >
          <div className="relative">
            <img 
              src={seller.logo || undefined} 
              alt={seller.name} 
              className="w-12 h-12 rounded-full object-cover" 
              referrerPolicy="no-referrer" 
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-bg-primary rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p className="font-bold text-sm truncate">{seller.name}</p>
              <p className="text-[10px] text-text-primary/40">
                {chatMessages[seller.id]?.slice(-1)[0]?.time || '12:45'}
              </p>
            </div>
            <p className="text-xs text-text-primary/60 truncate">
              {getLastMessagePreview(seller.id)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
