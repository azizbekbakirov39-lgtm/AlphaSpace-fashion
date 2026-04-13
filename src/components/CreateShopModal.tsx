import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Store, ShoppingBag, Tag, Navigation } from 'lucide-react';
import { SellerCategory, SELLER_CATEGORIES } from '../types';
import { Language } from '../translations';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { compressImage } from '../lib/compression';
import { toast } from 'sonner';

interface CreateShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, logoFile: File | null, workingDays: string[], categories: SellerCategory[], location: { lat: number, lng: number }) => void;
  language: Language;
}

const DAYS_OF_WEEK = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];

const CreateShopModal: React.FC<CreateShopModalProps> = ({ isOpen, onClose, onSubmit, language }) => {
  const [shopName, setShopName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [workingDays, setWorkingDays] = useState<string[]>(['Dush', 'Sesh', 'Chor', 'Pay', 'Jum']);
  const [selectedCategories, setSelectedCategories] = useState<SellerCategory[]>([]);
  const [location, setLocation] = useState<{ lat: number, lng: number }>({ lat: 41.311081, lng: 69.240562 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        toast.info("Logo siqilmoqda...");
        const compressedFile = await compressImage(file);
        setLogoFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogo(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing logo:", error);
        setLogoFile(file);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shopName.trim() && selectedCategories.length > 0) {
      onSubmit(shopName, logoFile, workingDays, selectedCategories, location);
    }
  };

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("Error detecting location:", error);
        }
      );
    }
  };

  const toggleCategory = (category: SellerCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleDay = (day: string) => {
    setWorkingDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-bg-primary rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]"
          >
            <div className="p-8 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent">
                Do'kon ochish
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-text-primary/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide p-8 pt-4">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Logo Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-32 h-32 rounded-3xl border-2 border-dashed border-accent-blue/30 bg-gradient-to-br from-accent-blue/5 to-accent-light/5 flex items-center justify-center cursor-pointer overflow-hidden group"
                  >
                    {logo ? (
                      <img src={logo} alt="Shop Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-accent-blue/40 to-accent-light/40 bg-clip-text text-transparent group-hover:from-accent-blue group-hover:to-accent-light transition-colors">
                        <Camera size={32} className="text-accent-blue" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Logo yuklash</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={24} className="text-white" />
                    </div>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-[10px] text-text-primary/40 uppercase tracking-widest font-bold">
                    Logo ixtiyoriy
                  </p>
                </div>

                {/* Shop Name Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-primary/40 ml-1">
                    Do'kon nomi *
                  </label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-blue" size={20} />
                    <input 
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Masalan: Alpha Fashion"
                      className="w-full bg-text-primary/5 border border-text-primary/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/50 transition-all font-bold"
                    />
                  </div>
                </div>

                {/* Categories Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-primary/40 ml-1">
                    Kategoriyalar * (Kamida bitta)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SELLER_CATEGORIES.map(category => {
                      const isActive = selectedCategories.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            isActive 
                              ? 'bg-gradient-to-br from-accent-blue to-accent-light border-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                              : 'bg-text-primary/5 border-text-primary/10 text-text-primary/40 hover:border-accent-blue/30'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Working Days Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-primary/40 ml-1">
                    Ish kunlari
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      const isActive = workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`flex-1 min-w-[60px] py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            isActive 
                              ? 'bg-gradient-to-br from-accent-blue to-accent-light border-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                              : 'bg-text-primary/5 border-text-primary/10 text-text-primary/40 hover:border-accent-blue/30'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Location Picker */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-primary/40 ml-1">
                    Do'kon joylashuvi
                  </label>
                  <div className="w-full h-48 rounded-2xl overflow-hidden border border-text-primary/10 relative">
                    <YMaps query={{ lang: language === 'ru' ? 'ru_RU' : 'en_US' }}>
                      <Map 
                        state={{ center: [location.lat, location.lng], zoom: 15 }}
                        width="100%"
                        height="100%"
                        options={{
                          suppressMapOpenBlock: true,
                        }}
                      >
                        <Placemark geometry={[location.lat, location.lng]} />
                      </Map>
                    </YMaps>
                    <button 
                      type="button"
                      onClick={detectLocation}
                      className="absolute bottom-3 right-3 z-10 p-3 bg-gradient-to-br from-accent-blue to-accent-light text-white rounded-xl shadow-lg active:scale-90 transition-all flex items-center gap-2"
                    >
                      <Navigation size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Hozirgi joylashuv</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!shopName.trim() || selectedCategories.length === 0}
                    className="w-full py-5 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    <ShoppingBag size={20} />
                    Do'konni qurish
                  </motion.button>
                  
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-4 text-text-primary/40 font-black uppercase tracking-widest text-[10px] hover:text-text-primary transition-colors"
                  >
                    Bekor qilish
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateShopModal;
