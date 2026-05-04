import React from 'react';
import { motion } from 'motion/react';
import { Plus, ImageIcon, Video, Trash2, LayoutGrid, ShoppingBag, Sparkles } from 'lucide-react';
import { Language } from '../../translations';
import { ImageWithFallback } from '../ImageWithFallback';

interface ClosetViewProps {
  t: any;
  activeClosetCategory: string;
  setActiveClosetCategory: (cat: any) => void;
  // Other props for interaction
}

export const ClosetView: React.FC<ClosetViewProps> = ({ t, activeClosetCategory, setActiveClosetCategory }) => {
  return (
    <div className="p-4 space-y-6">
      <div className="flex gap-2 p-1 bg-text-primary/5 rounded-2xl overflow-x-auto scrollbar-hide">
        {[
          { id: 'all', label: t.all },
          { id: 'clothing', label: t.clothing },
          { id: 'outfits', label: t.outfits },
          { id: 'other', label: t.other }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveClosetCategory(cat.id as any)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeClosetCategory === cat.id 
                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/25' 
                : 'text-text-primary/40 hover:bg-text-primary/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          className="aspect-[4/5] rounded-[2rem] border-2 border-dashed border-accent-blue/20 bg-accent-blue/5 flex flex-col items-center justify-center gap-3 group hover:border-accent-blue/40 transition-colors"
        >
          <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform">
            <Plus size={28} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">{t.add_item}</span>
        </motion.button>
        
        {/* Placeholder for real items */}
        <div className="aspect-[4/5] rounded-[2rem] bg-text-primary/5 border border-border-primary flex items-center justify-center">
            <p className="text-[10px] font-black text-text-primary/20 uppercase tracking-widest italic">{t.empty}</p>
        </div>
      </div>
    </div>
  );
};
