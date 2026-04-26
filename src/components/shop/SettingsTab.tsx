import React from 'react';
import { 
  ChevronLeft, 
  Store, 
  Camera, 
  Navigation, 
  LogOut, 
  Trash2 
} from 'lucide-react';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { Seller, SELLER_CATEGORIES } from '../../types';
import { Language } from '../../translations';

interface SettingsTabProps {
  language: Language;
  localShopData: Seller;
  setLocalShopData: React.Dispatch<React.SetStateAction<Seller>>;
  logoInputRef: React.RefObject<HTMLInputElement>;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  detectLocation: () => void;
  handleSaveShopInfo: () => void;
  handleTabChange: (tab: string) => void;
  setShowFreezeModal: (show: boolean) => void;
  setShowDeleteModal: (show: boolean) => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_LABELS: {[key: string]: string} = {
  'Mon': 'Du', 'Tue': 'Se', 'Wed': 'Ch', 'Thu': 'Pa', 'Fri': 'Ju', 'Sat': 'Sh', 'Sun': 'Ya'
};

export const SettingsTab: React.FC<SettingsTabProps> = ({
  language,
  localShopData,
  setLocalShopData,
  logoInputRef,
  handleLogoUpload,
  detectLocation,
  handleSaveShopInfo,
  handleTabChange,
  setShowFreezeModal,
  setShowDeleteModal
}) => {
  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-4 pb-16 bg-bg-primary">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => handleTabChange('MyShop')}
          className="p-2 bg-white/5 backdrop-blur-md rounded-full hover:bg-white/10 transition-all border border-white/10 text-text-primary"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black italic tracking-tighter uppercase text-text-primary">Do'kon Sozlamalari</h2>
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
            {localShopData.logo ? (
              <div className="p-1 rounded-full bg-gradient-to-br from-accent-blue to-accent-light shadow-lg shadow-accent-blue/20">
                <img src={localShopData.logo || undefined} className="w-24 h-24 rounded-full object-cover border-2 border-white/20 group-hover:opacity-50 transition-opacity" alt="Logo" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center text-accent-blue border-2 border-accent-blue/30 group-hover:opacity-50 transition-opacity">
                <Store size={40} strokeWidth={1.5} />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white"><Camera size={24} /></div>
            </div>
            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40">Logoni o'zgartirish</p>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Do'kon nomi</label>
            <input type="text" value={localShopData.name} onChange={(e) => setLocalShopData(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Kategoriyalar *</label>
            <div className="flex flex-wrap gap-2 p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
              {SELLER_CATEGORIES.map(category => {
                const isActive = localShopData.categories.includes(category);
                return (
                  <button key={category} onClick={() => {
                    const currentCats = localShopData.categories || [];
                    const newCats = isActive ? currentCats.filter(c => c !== category) : [...currentCats, category];
                    if (newCats.length > 0) setLocalShopData(prev => ({ ...prev, categories: newCats }));
                  }} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${isActive ? 'bg-gradient-to-br from-accent-blue to-accent-light border-accent-blue text-white shadow-lg shadow-accent-blue/20' : 'bg-white/5 border-white/5 text-text-primary/40 hover:border-accent-blue/30'}`}>{category}</button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Tavsif</label>
            <textarea value={localShopData.description} onChange={(e) => setLocalShopData(prev => ({ ...prev, description: e.target.value }))} className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm h-24 focus:outline-none focus:border-accent-blue/50 text-text-primary resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Ish vaqti</label>
              <input type="text" value={localShopData.workingHours} onChange={(e) => setLocalShopData(prev => ({ ...prev, workingHours: e.target.value }))} placeholder="09:00 - 21:00" className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Telefon</label>
              <input type="text" value={localShopData.phone} onChange={(e) => setLocalShopData(prev => ({ ...prev, phone: e.target.value }))} className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Ish kunlari</label>
            <div className="flex flex-wrap gap-2 p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
              {DAYS_OF_WEEK.map(day => {
                const isActive = localShopData.workingDays?.includes(day);
                return (
                  <button key={day} onClick={() => {
                    const currentDays = localShopData.workingDays || [];
                    const newDays = isActive ? currentDays.filter(d => d !== day) : [...currentDays, day];
                    setLocalShopData(prev => ({ ...prev, workingDays: newDays }));
                  }} className={`flex-1 min-w-[60px] py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${isActive ? 'bg-gradient-to-br from-accent-blue to-accent-light border-accent-blue text-white shadow-lg shadow-accent-blue/20' : 'bg-white/5 border-white/5 text-text-primary/40 hover:border-accent-blue/30'}`}>{DAYS_LABELS[day]}</button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Instagram</label>
              <input type="text" value={localShopData.instagram} onChange={(e) => setLocalShopData(prev => ({ ...prev, instagram: e.target.value }))} className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Telegram</label>
              <input type="text" value={localShopData.telegram} onChange={(e) => setLocalShopData(prev => ({ ...prev, telegram: e.target.value }))} className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-blue/50 text-text-primary" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 ml-2">Joylashuv</label>
            <div className="w-full h-48 rounded-xl overflow-hidden border border-white/10 relative bg-white/5 backdrop-blur-md">
              <YMaps query={{ lang: language === 'ru' ? 'ru_RU' : 'en_US' }}>
                <Map state={{ center: [localShopData.location?.lat || 41.311081, localShopData.location?.lng || 69.240562], zoom: 15 }} width="100%" height="100%" onClick={(e: any) => { const coords = e.get('coords'); setLocalShopData(prev => ({ ...prev, location: { lat: coords[0], lng: coords[1] } })); }} options={{ suppressMapOpenBlock: true }}>
                  <Placemark geometry={[localShopData.location?.lat || 41.311081, localShopData.location?.lng || 69.240562]} />
                </Map>
              </YMaps>
              <button type="button" onClick={detectLocation} className="absolute bottom-3 right-3 z-10 p-3 bg-gradient-to-br from-accent-blue to-accent-light text-white rounded-xl shadow-lg active:scale-90 transition-all flex items-center gap-2"><Navigation size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Hozirgi joylashuv</span></button>
            </div>
          </div>
        </div>
        
        <button onClick={handleSaveShopInfo} className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-4">Saqlash</button>
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-4">
          <h3 className="text-sm font-black italic tracking-tighter uppercase text-red-500/80 mb-2">Xavfli Hudud</h3>
          <button onClick={() => setShowFreezeModal(true)} className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"><LogOut size={18} />Muzlatish</button>
          <button onClick={() => setShowDeleteModal(true)} className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"><Trash2 size={18} />O'chirish</button>
        </div>
      </div>
    </div>
  );
};
