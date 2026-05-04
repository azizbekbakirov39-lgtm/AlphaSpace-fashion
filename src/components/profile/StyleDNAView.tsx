import React from 'react';
import { motion } from 'motion/react';
import { Dna } from 'lucide-react';
import { Language } from '../../translations';

interface StyleDNAProps {
  t: any;
}

export const StyleDNAView: React.FC<StyleDNAProps> = ({ t }) => {
  return (
    <div className="p-6 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-accent-blue rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
          <Dna size={40} />
        </div>
        <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Sizning Uslub DNKngiz</h2>
        <p className="text-xs text-text-primary/60 font-medium">AI tomonidan tahlil qilingan shaxsiy moda profilingiz</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary">
          <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-4">Uslub Yo'nalishlari</h3>
          <div className="space-y-4">
            {[
              { label: t.minimalism, value: 65, color: 'bg-accent-blue' },
              { label: t.streetwear, value: 25, color: 'bg-purple-500' },
              { label: t.classic, value: 10, color: 'bg-emerald-500' }
            ].map((style) => (
              <div key={style.label} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                  <span className="text-text-primary">{style.label}</span>
                  <span className="text-accent-blue">{style.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-text-primary/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${style.value}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full ${style.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary">
            <p className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-3">Ranglar Palitrasi</p>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-black border border-white/10" />
              <div className="w-6 h-6 rounded-full bg-white border border-black/10" />
              <div className="w-6 h-6 rounded-full bg-slate-500" />
              <div className="w-6 h-6 rounded-full bg-neutral-300" />
            </div>
          </div>
          <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary">
            <p className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-2">Vibe</p>
            <p className="text-xs font-black text-text-primary uppercase tracking-tight">Modern Tech</p>
            <p className="text-[9px] font-bold text-accent-blue uppercase mt-1">Urban Casual</p>
          </div>
        </div>
      </div>
    </div>
  );
};
