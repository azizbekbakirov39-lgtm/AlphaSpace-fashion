import React from 'react';
import { motion } from 'motion/react';
import { Store } from 'lucide-react';
import { Story } from '../types';
import { Language } from '../translations';

interface StoryBarProps {
  stories: Story[];
  onMarkStoryViewed: (storyId: string) => void;
  onOpenStories: (stories: Story[], index: number) => void;
  onOpenLive: (story: Story) => void;
  language: Language;
}

const StoryBar: React.FC<StoryBarProps> = ({ stories, onMarkStoryViewed, onOpenStories, onOpenLive, language }) => {
  // Sort stories: live first, then unviewed, then viewed
  // Group stories by seller - only show the most recent or live story for each seller in the bar
  const groupedStories = React.useMemo(() => {
    const map = new Map<string, Story>();
    stories.forEach(s => {
      if (!s.seller?.id) return;
      const existing = map.get(s.seller.id);
      
      // Keep live stories, or most recent unviewed, or most recent viewed
      if (!existing) {
        map.set(s.seller.id, s);
      } else {
        if (s.isLive && !existing.isLive) {
          map.set(s.seller.id, s);
        } else if (!existing.isLive) {
          if (!s.isViewed && existing.isViewed) {
            map.set(s.seller.id, s);
          } else if (s.isViewed === existing.isViewed) {
             const sTime = s.createdAt?.seconds || 0;
             const eTime = existing.createdAt?.seconds || 0;
             if (sTime > eTime) map.set(s.seller.id, s);
          }
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isViewed === b.isViewed) return 0;
      return a.isViewed ? 1 : -1;
    });
  }, [stories]);

  const handleStoryClick = (story: Story, index: number) => {
    if (story.isLive) {
      onOpenLive(story);
    } else {
      // Find all stories for this seller to pass to the viewer
      const sellerStories = stories
        .filter(s => s.seller.id === story.seller.id)
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      onOpenStories(sellerStories, 0);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide py-4 px-4 bg-bg-primary">
      {groupedStories.map((story, index) => (
        <div 
          key={`story-seller-${story.seller.id}`} 
          onClick={() => handleStoryClick(story, index)}
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
        >
          <div className={`p-[2px] rounded-full transition-all duration-500 relative ${
            story.isLive 
              ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse' 
              : story.isViewed 
                ? 'bg-text-primary/10' 
                : 'bg-gradient-to-tr from-blue-500 via-blue-500 to-purple-600 shadow-lg shadow-purple-500/20'
          } group-active:scale-90 transition-transform`}>
            <div className="p-[2px] bg-bg-primary rounded-full">
              {story.seller.logo ? (
                <img 
                  src={story.seller.logo} 
                  alt={story.seller.name} 
                  className={`w-[77px] h-[77px] rounded-full object-cover transition-all ${
                    story.isLive 
                      ? 'opacity-100' 
                      : story.isViewed 
                        ? 'opacity-50 grayscale-[0.5]' 
                        : 'opacity-100 group-hover:scale-105'
                  }`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-[77px] h-[77px] rounded-full bg-white flex items-center justify-center text-accent-blue transition-opacity ${
                  story.isLive 
                    ? 'opacity-100' 
                    : story.isViewed 
                      ? 'opacity-50' 
                      : 'opacity-100'
                }`}>
                  <Store size={38} strokeWidth={1.5} />
                </div>
              )}
            </div>
            {story.isLive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest text-white border-2 border-bg-primary shadow-lg">
                Live
              </div>
            )}
          </div>
          <span className={`text-[9px] font-bold tracking-tight truncate w-[77px] text-center uppercase mt-0.5 ${
            story.isLive 
              ? 'text-red-500' 
              : story.isViewed 
                ? 'text-text-primary/30' 
                : 'text-text-primary/70'
          }`}>
            {story.seller.name}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StoryBar;
