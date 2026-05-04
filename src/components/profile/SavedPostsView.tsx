import React from 'react';
import { Bookmark } from 'lucide-react';
import { PostData } from '../../types';
import { ImageWithFallback } from '../ImageWithFallback';

interface SavedPostsViewProps {
  savedPosts: PostData[];
  onOpenPostDetails: (posts: PostData[], index: number) => void;
  t: any;
}

export const SavedPostsView: React.FC<SavedPostsViewProps> = ({
  savedPosts,
  onOpenPostDetails,
  t
}) => {
  return (
    <div className="grid grid-cols-3 gap-1">
      {savedPosts.length > 0 ? (
        savedPosts.map((post, index) => (
          <div 
            key={post.id} 
            onClick={() => onOpenPostDetails(savedPosts, index)}
            className="aspect-square relative group overflow-hidden cursor-pointer"
          >
            <ImageWithFallback 
              originalSrc={post.thumbnailUrl || post.mediaUrls[0]} 
              alt={post.outfitName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
              <div className="flex items-center gap-1 text-white text-[10px] font-bold">
                <Bookmark size={12} fill="white" />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-3 flex flex-col items-center justify-center py-20 text-text-primary/20">
          <Bookmark size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">{t.no_saved}</p>
        </div>
      )}
    </div>
  );
};
