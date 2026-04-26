import React, { useState, useEffect } from 'react';
import { Search, X, Clock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../translations';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  language: Language;
  initialQuery?: string;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ 
  isOpen, 
  onClose, 
  onSearch, 
  language,
  initialQuery = ''
}) => {
  const t = translations[language];
  const [query, setQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    // Check for prohibited content (Rainbow/LGBT symbols)
    const prohibitedPattern = /[🌈🏳️‍🌈🏳️‍⚧️⚧️⚧]|lgbt|gay|lesbian|bisexual|transgender/i;
    if (prohibitedPattern.test(searchQuery)) {
      return;
    }

    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    
    onSearch(searchQuery);
    onClose();
  };

  const removeRecent = (e: React.MouseEvent, search: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-bg-primary flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border-primary">
            <button onClick={onClose} className="p-2 -ml-2 hover:bg-accent-blue/5 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-text-primary" />
            </button>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(query);
              }}
              className="flex-1 relative"
            >
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder || "Qidirish..."}
                className="w-full bg-accent-blue/5 border-none rounded-2xl py-3 pl-10 pr-10 text-sm font-medium focus:ring-2 focus:ring-accent-blue/20 transition-all outline-none"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/40" />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent-blue/10 rounded-full transition-colors"
                >
                  <X size={14} className="text-text-primary/40" />
                </button>
              )}
            </form>
          </div>
    
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {recentSearches.length > 0 && !query && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-text-primary/40">
                    {language === 'uz' ? 'Oxirgi qidiruvlar' : 'Recent Searches'}
                  </h3>
                  <button 
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem('recentSearches');
                    }}
                    className="text-[10px] font-bold text-accent-blue uppercase tracking-widest"
                  >
                    {language === 'uz' ? 'Tozalash' : 'Clear All'}
                  </button>
                </div>
                
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={search}
                      onClick={() => handleSearch(search)}
                      className="flex items-center justify-between p-3 hover:bg-accent-blue/5 rounded-xl cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-text-primary/30" />
                        <span className="text-sm font-medium text-text-primary/80">{search}</span>
                      </div>
                      <button
                        onClick={(e) => removeRecent(e, search)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-accent-blue/10 rounded-full transition-all"
                      >
                        <X size={14} className="text-text-primary/40" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
    
            {query && (
              <div className="space-y-1">
                <div 
                  onClick={() => handleSearch(query)}
                  className="flex items-center gap-3 p-3 hover:bg-accent-blue/5 rounded-xl cursor-pointer transition-colors"
                >
                  <Search size={16} className="text-accent-blue" />
                  <span className="text-sm font-medium text-text-primary">
                    "{query}" {language === 'uz' ? 'uchun qidirish' : 'search for'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchOverlay;
