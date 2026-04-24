import React from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Bookmark, Send, Share2 } from 'lucide-react';
import { PostData } from '../types';

interface ReelRightActionsProps {
  realPost: PostData;
  onToggleLike: () => void;
  onToggleSharedLike: () => void;
  onToggleSave: () => void;
  onToggleComment: () => void;
  onOpenChat: () => void;
  onExternalShare: () => void;
}

const ReelRightActions: React.FC<ReelRightActionsProps> = ({
  realPost,
  onToggleLike,
  onToggleSave,
  onToggleComment,
  onOpenChat,
  onExternalShare
}) => {
  return (
    <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-20">
      {/* Like */}
      <div className="flex flex-col items-center gap-1">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }} 
          className={`w-9 h-9 flex items-center justify-center transition-all ${realPost.isLiked ? 'text-red-500' : 'text-white drop-shadow-lg'}`}
        >
          <Heart size={28} fill={realPost.isLiked ? 'currentColor' : 'none'} strokeWidth={2.5} />
        </motion.button>
        <span className="text-white text-[11px] font-bold drop-shadow-lg">{realPost.likes}</span>
      </div>

      {/* Comments */}
      <div className="flex flex-col items-center gap-1">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComment();
          }} 
          className="w-9 h-9 flex items-center justify-center text-white drop-shadow-lg"
        >
          <MessageCircle size={28} strokeWidth={2.5} />
        </motion.button>
        <span className="text-white text-[11px] font-bold drop-shadow-lg">{realPost.comments}</span>
      </div>

      {/* Save */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.8 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave();
        }} 
        className={`w-9 h-9 flex items-center justify-center transition-all ${realPost.isSaved ? 'text-accent-blue' : 'text-white drop-shadow-lg'}`}
      >
        <Bookmark size={28} fill={realPost.isSaved ? 'currentColor' : 'none'} strokeWidth={2.5} />
      </motion.button>

      {/* Message / Send to Chat */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.8 }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChat();
        }} 
        className="w-9 h-9 flex items-center justify-center text-white drop-shadow-lg"
      >
        <Send size={28} strokeWidth={2.5} />
      </motion.button>

      {/* External Share */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.8 }}
        onClick={(e) => {
          e.stopPropagation();
          onExternalShare();
        }} 
        className="w-9 h-9 flex items-center justify-center text-white drop-shadow-lg"
      >
        <Share2 size={28} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
};

export default ReelRightActions;
