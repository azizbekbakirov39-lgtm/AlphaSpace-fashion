import React from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Send, Share2, Bookmark } from 'lucide-react';
import { PostData } from '../types';

interface PostInteractionsProps {
  post: PostData;
  onToggleLike: (e: React.MouseEvent) => void;
  onOpenComments: (e: React.MouseEvent) => void;
  onInternalShare: (e: React.MouseEvent) => void;
  onExternalShare: (e: React.MouseEvent) => void;
  onToggleSave: (e: React.MouseEvent) => void;
  onOpenChat: (e: React.MouseEvent) => void;
}

const PostInteractions: React.FC<PostInteractionsProps> = ({
  post,
  onToggleLike,
  onOpenComments,
  onInternalShare,
  onExternalShare,
  onToggleSave,
  onOpenChat
}) => {
  return (
    <div className="px-3 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={onToggleLike}
          className={`transition-colors duration-300 ${post.isLiked ? 'text-[#ef4444]' : 'text-text-primary'}`}
        >
          <Heart size={28} fill={post.isLiked ? '#ef4444' : 'none'} strokeWidth={1.5} />
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.8 }}
          className="text-text-primary"
          onClick={onOpenComments}
        >
          <MessageCircle size={28} strokeWidth={1.5} />
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.8 }}
          className="text-text-primary"
          onClick={onInternalShare}
        >
          <Send size={28} strokeWidth={1.5} />
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.8 }}
          className="text-text-primary"
          onClick={onExternalShare}
        >
          <Share2 size={28} strokeWidth={1.5} />
        </motion.button>
      </div>
      
      {/* Glassmorphic Price Tag */}
      <div className="flex-1 flex items-center justify-center mx-2">
        {post.price ? (
          <div className="px-5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/5 to-purple-500/5 backdrop-blur-xl border border-indigo-500/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-center">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-black text-[15px] tracking-tight">
              {post.price}
            </span>
          </div>
        ) : (
          <button 
            onClick={onOpenChat}
            className="px-5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/5 to-purple-500/5 backdrop-blur-xl border border-indigo-500/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-black text-[11px] uppercase tracking-widest">
              {post.priceMessage || "Narxi?"}
            </span>
          </button>
        )}
      </div>

      <motion.button 
        whileTap={{ scale: 0.8 }}
        onClick={onToggleSave}
        className={`transition-colors duration-300 ${post.isSaved ? 'text-accent-blue' : 'text-text-primary'}`}
      >
        <Bookmark size={28} fill={post.isSaved ? 'currentColor' : 'none'} strokeWidth={1.5} />
      </motion.button>
    </div>
  );
};

export default PostInteractions;
