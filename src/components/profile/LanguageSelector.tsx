import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Language } from '../../translations';

interface LanguageSelectorProps {
  currentLanguage: Language;
  languages: { code: string; name: string; flag: string }[];
  onBack: () => void;
  onSelect: (lang: Language) => void;
  t: any;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  languages,
  onBack,
  onSelect,
  t
}) => {
  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="flex items-center gap-4 px-4 py-4 border-b border-border-primary">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-text-primary/5 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black uppercase tracking-tight italic">{t.language}</h2>
      </div>
      <div className="p-4 space-y-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code as Language)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
              currentLanguage === lang.code 
                ? 'bg-accent-blue border-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                : 'bg-text-primary/5 border-border-primary text-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag}</span>
              <span className="font-bold">{lang.name}</span>
            </div>
            {currentLanguage === lang.code && (
              <div className="w-2 h-2 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
