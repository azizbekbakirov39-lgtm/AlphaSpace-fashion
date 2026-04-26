import React, { useState, useEffect, useRef } from 'react';
import { YMaps, Map, Placemark, Circle, Polyline, Clusterer } from '@pbe/react-yandex-maps';
import { Search, MapPin, Check, X, Navigation, ArrowRight, Star, Clock, Phone, Sparkles, Zap, Camera, Plus, Minus } from 'lucide-react';
import { Seller, SellerCategory, SELLER_CATEGORIES } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../translations';
import SearchOverlay from './SearchOverlay';
import { safePlayVideo } from '../utils/mediaUtils';

interface LiveMapProps {
  language: Language;
  onOpenShopProfile: (id: string) => void;
  onSearchActive: (active: boolean) => void;
  isSearchActive: boolean;
  sellers: Seller[];
  currentUserUid?: string | null;
}

const FASHION_DISTRICTS = [
  { id: 'd1', name: 'Chilonzor Fashion Hub', center: [41.2858, 69.2035], radius: 800, color: '#0095FF' },
  { id: 'd2', name: 'Yunusobod Style Zone', center: [41.3645, 69.2865], radius: 1000, color: '#9333ea' },
  { id: 'd3', name: 'Tashkent City Premium', center: [41.3111, 69.2406], radius: 600, color: '#f59e0b' },
];

const LiveMap: React.FC<LiveMapProps> = ({ language, onOpenShopProfile, onSearchActive, isSearchActive, sellers, currentUserUid }) => {
  const [selectedCategories, setSelectedCategories] = useState<SellerCategory[]>(SELLER_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentZoom, setCurrentZoom] = useState(13);

  const handleSearchActive = () => {
    onSearchActive(true);
  };

  const handleSearchClose = () => {
    onSearchActive(false);
  };
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const mapRef = useRef<any>(null);

  const [isAROpen, setIsAROpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isAROpen && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            safePlayVideo(videoRef.current);
          }
        })
        .catch(err => console.error("AR Camera error:", err));
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isAROpen]);

  const toggleCategory = (category: SellerCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const [error, setError] = useState<string | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d.toFixed(1);
  };

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          if (mapRef.current) {
            mapRef.current.setCenter([latitude, longitude], 15, { duration: 300 });
            setCurrentZoom(15);
          }
          setError(null);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError(language === 'uz' ? "Joylashuvni aniqlab bo'lmadi. Iltimos, ruxsat bering." : "Could not determine location. Please grant permission.");
          setTimeout(() => setError(null), 3000);
        }
      );
    }
  };

  const filteredSellers = React.useMemo(() => sellers.filter(s => {
    if (!s || !s.location) return false;
    
    // Support both string and number coordinates
    const lat = typeof s.location.lat === 'number' ? s.location.lat : Number(s.location.lat);
    const lng = typeof s.location.lng === 'number' ? s.location.lng : Number(s.location.lng);
    
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return false;

    // Barcha cheklovlar olib tashlandi: xuddi maxsulot sahifasidagidek erkin bo'lishi uchun
    return true;
  }), [sellers]);

  useEffect(() => {
    if (mapRef.current && filteredSellers.length > 0) {
      const bounds = filteredSellers.map(s => [s.location!.lat, s.location!.lng]);
      if (userLocation) bounds.push(userLocation);
      
      if (bounds.length > 0) {
        try {
          mapRef.current.setBounds(bounds, { 
            checkZoomRange: true, 
            zoomMargin: 80,
            duration: 1000 
          });
        } catch (err) {
          console.warn("Could not set bounds:", err);
        }
      }
    }
  }, [filteredSellers, userLocation]);

  const searchResults = searchQuery.length > 1 
    ? sellers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  const handleSearchSelect = (seller: Seller) => {
    if (seller.location) {
      handleSellerClick(seller);
      onSearchActive(false);
      setSearchQuery('');
    }
  };

  const handleSellerClick = (seller: Seller) => {
    setSelectedSeller(seller);
    if (mapRef.current) {
      mapRef.current.setCenter([seller.location!.lat, seller.location!.lng], 16, { duration: 300 });
      setCurrentZoom(16);
    }

    if (userLocation && seller.location) {
      setRoute([
        userLocation,
        [seller.location.lat, seller.location.lng]
      ]);
    }
  };

  const handleZoom = (delta: number) => {
    if (mapRef.current) {
      const newZoom = Math.max(1, Math.min(19, mapRef.current.getZoom() + delta));
      mapRef.current.setZoom(newZoom, { duration: 200 });
      setCurrentZoom(newZoom);
    }
  };

  return (
    <div className="h-full w-full relative bg-bg-primary overflow-hidden">
      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-[2000] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <YMaps query={{ lang: language === 'ru' ? 'ru_RU' : 'en_US', apikey: '40d1643f-98d9-46d3-9814-e2d199910109' }}>
        <Map 
          instanceRef={mapRef}
          defaultState={{
            center: [41.311081, 69.240562],
            zoom: 13,
            controls: []
          }}
          width="100%"
          height="100%"
          onBoundsChange={(e: any) => {
            const map = e.get('target');
            const newZoom = map.getZoom();
            setCurrentZoom(prev => prev === newZoom ? prev : newZoom);
          }}
          options={{
            suppressMapOpenBlock: true,
            yandexMapDisablePoiInteractivity: true,
          }}
        >
          {/* Fashion Districts - Glow Zones */}
          {FASHION_DISTRICTS.map(district => (
            <Circle
              key={district.id}
              geometry={[district.center, district.radius]}
              options={{
                fillColor: `${district.color}33`,
                strokeColor: district.color,
                strokeOpacity: 0.5,
                strokeWidth: 2,
                draggable: false,
              }}
            />
          ))}

          {/* Route Line */}
          {route && (
            <Polyline
              geometry={route}
              options={{
                strokeColor: "#0095FF",
                strokeWidth: 4,
                strokeOpacity: 0.8,
                strokeStyle: 'shortdash',
              }}
            />
          )}

          {/* Shop Markers */}
          {filteredSellers.map(seller => {
            // Ensure numeric coordinates for Yandex Maps Placemark
            const lat = typeof seller.location!.lat === 'number' ? seller.location!.lat : Number(seller.location!.lat);
            const lng = typeof seller.location!.lng === 'number' ? seller.location!.lng : Number(seller.location!.lng);

            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;

            const markerSize = 28; // Asl hajmga qaytarildi (2x kichiklashtirildi)
            const offset = -markerSize / 2;
            const safeName = encodeURIComponent(seller.name || 'Store');
            // Determine a fallback logo and use ui-avatars with &rounded=true to ensure its circular naturally!
            const logoUrl = seller.logo || `https://ui-avatars.com/api/?name=${safeName}&background=random&color=fff&bold=true&rounded=true`;

            return (
                <Placemark
                  key={seller.id}
                  geometry={[lat, lng]}
                  options={{
                    iconLayout: 'default#image', 
                    // Yandex map'ning oddiy imageLayout'idan foydalanamiz, bu hech qanday xatolik bermaydi.
                    iconImageHref: logoUrl,
                    iconImageSize: [markerSize, markerSize],
                    iconImageOffset: [offset, offset],
                    // marker shaklini yumaloq deb belgilash
                    iconImageShape: {
                      type: 'Circle',
                      coordinates: [0, 0],
                      radius: markerSize / 2
                    }
                  }}
                  onClick={() => handleSellerClick(seller)}
                />
            );
          })}

          {userLocation && (
            <Placemark
              geometry={userLocation}
              properties={{
                iconCaption: language === 'uz' ? 'Siz' : 'You',
              }}
              options={{
                preset: 'islands#blueCircleDotIconWithCaption',
              }}
            />
          )}
        </Map>
      </YMaps>
      
      {/* Search & Filter Overlay */}
      <div className="absolute top-4 left-4 right-4 pointer-events-none z-[1000]">
        <div className="flex gap-2 mb-3 pointer-events-auto">
          <div 
            onClick={handleSearchActive}
            className="flex-1 bg-bg-primary/80 backdrop-blur-xl border border-border-primary rounded-2xl shadow-2xl flex items-center px-4 py-3 cursor-pointer"
          >
            <div className="text-text-primary/40 mr-3">
              <Search size={18} />
            </div>
            <div className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary/40 font-bold">
              {searchQuery || (language === 'uz' ? "Do'konlarni qidiring..." : "Search shops...")}
            </div>
            {searchQuery && (
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }} 
                className="pointer-events-auto"
              >
                <X size={16} className="text-text-primary/40" />
              </button>
            )}
          </div>
          <button 
            onClick={() => setIsAROpen(true)}
            className="w-12 h-12 bg-bg-primary/80 backdrop-blur-xl border border-border-primary rounded-2xl shadow-2xl flex items-center justify-center text-accent-blue active:scale-90 transition-transform pointer-events-auto"
          >
            <Camera size={20} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pointer-events-auto">
          {SELLER_CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                selectedCategories.includes(category)
                  ? 'bg-gradient-to-r from-accent-blue to-accent-light border-transparent text-white shadow-lg shadow-accent-blue/20'
                  : 'bg-bg-primary/80 backdrop-blur-md border-border-primary text-text-primary/60'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Controls Side Bar (Like the reference image) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[1001]">
        <button 
          onClick={() => handleZoom(1)}
          className="w-12 h-12 bg-bg-primary/95 backdrop-blur-xl border border-border-primary rounded-2xl shadow-2xl flex items-center justify-center text-text-primary active:scale-90 transition-all"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
        <button 
          onClick={() => handleZoom(-1)}
          className="w-12 h-12 bg-bg-primary/95 backdrop-blur-xl border border-border-primary rounded-2xl shadow-2xl flex items-center justify-center text-text-primary active:scale-90 transition-all"
        >
          <Minus size={20} strokeWidth={3} />
        </button>
        <div className="h-2" />
        <button 
          onClick={handleLocationClick}
          className="w-12 h-12 bg-bg-primary/95 backdrop-blur-xl border border-border-primary rounded-2xl shadow-2xl flex items-center justify-center text-accent-blue active:scale-90 transition-all"
        >
          <Navigation size={22} fill="currentColor" className={userLocation ? 'text-accent-blue' : 'text-text-primary/40'} />
        </button>
      </div>

      <SearchOverlay 
        isOpen={isSearchActive}
        onClose={handleSearchClose}
        onSearch={setSearchQuery}
        language={language}
        initialQuery={searchQuery}
      />

      {/* Interactive Shop Card (Bottom Sheet) */}
      <AnimatePresence>
        {selectedSeller && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-[1002] p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] bg-bg-primary/95 backdrop-blur-3xl border-t border-border-primary rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.1)]"
          >
            <div className="w-12 h-1.5 bg-text-primary/10 rounded-full mx-auto mb-6" />
            
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={selectedSeller.logo} 
                    alt={selectedSeller.name} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-accent-blue/20 shadow-xl" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-bg-primary flex items-center justify-center text-white">
                    <Check size={12} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-text-primary tracking-tight mb-1">{selectedSeller.name}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-black">4.9</span>
                    </div>
                    <span className="text-[10px] text-text-primary/40 font-black uppercase tracking-widest">
                      {selectedSeller.categories[0]}
                    </span>
                    {selectedSeller.region && (
                      <div className="flex items-center gap-1 text-accent-blue/60">
                        <MapPin size={10} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{selectedSeller.region}</span>
                      </div>
                    )}
                  </div>
                  {/* Display exact coordinates as requested */}
                  <div className="mt-1 flex items-center gap-1.5 opacity-40">
                    < Zap size={10} className="text-accent-blue" />
                    <span className="text-[9px] font-mono font-bold tracking-tight">
                      {selectedSeller.location?.lat.toFixed(6)}, {selectedSeller.location?.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedSeller(null); setRoute(null); }}
                className="p-2 bg-text-primary/5 rounded-full text-text-primary/40 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-text-primary/5 rounded-2xl border border-border-primary text-center">
                <Clock size={16} className="mx-auto mb-1.5 text-accent-blue" />
                <p className="text-[9px] font-black text-text-primary/40 uppercase tracking-tighter">Ish vaqti</p>
                <p className="text-[10px] font-bold text-text-primary">{selectedSeller.workingHours || "09:00 - 20:00"}</p>
              </div>
              <div className="p-3 bg-text-primary/5 rounded-2xl border border-border-primary text-center">
                <MapPin size={16} className="mx-auto mb-1.5 text-accent-blue" />
                <p className="text-[9px] font-black text-text-primary/40 uppercase tracking-tighter">Masofa</p>
                <p className="text-[10px] font-bold text-text-primary">
                  {userLocation ? `${calculateDistance(userLocation[0], userLocation[1], selectedSeller.location!.lat, selectedSeller.location!.lng)} km` : "---"}
                </p>
              </div>
              <div className="p-3 bg-text-primary/5 rounded-2xl border border-border-primary text-center">
                <Zap size={16} className="mx-auto mb-1.5 text-accent-blue" />
                <p className="text-[9px] font-black text-text-primary/40 uppercase tracking-tighter">Aksiya</p>
                <p className="text-[10px] font-bold text-emerald-500">{selectedSeller.followers > 1000 ? "-20% OFF" : "Yangi"}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => onOpenShopProfile(selectedSeller.id)}
                className="flex-1 py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-accent-blue/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Do'konni ko'rish
              </button>
              <button 
                onClick={() => window.location.href = `tel:${selectedSeller.phone || '+998901234567'}`}
                className="w-14 h-14 bg-text-primary/5 border border-border-primary rounded-2xl flex items-center justify-center text-text-primary/60 hover:text-accent-blue transition-colors active:scale-90"
              >
                <Phone size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AR View Modal */}
      <AnimatePresence>
        {isAROpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[2000] bg-black"
          >
            <video 
              ref={videoRef} 
              playsInline 
              className="w-full h-full object-cover opacity-60"
            />
            
            {/* AR Overlays */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-accent-blue/30 rounded-full animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-accent-blue shadow-[0_0_20px_var(--color-accent-blue)] rounded-full" />
            </div>

            {/* Floating Shop Info in AR */}
            <div className="absolute inset-0 overflow-hidden">
              {filteredSellers.slice(0, 5).map((seller, idx) => {
                const dist = userLocation ? calculateDistance(userLocation[0], userLocation[1], seller.location!.lat, seller.location!.lng) : (idx + 1) * 0.2;
                return (
                  <motion.div
                    key={seller.id}
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ 
                      x: 50 + (idx * 20), 
                      y: 150 + (idx * 120), 
                      opacity: 1 
                    }}
                    onClick={() => {
                      setSelectedSeller(seller);
                      setIsAROpen(false);
                    }}
                    className="absolute p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center gap-3 pointer-events-auto cursor-pointer"
                  >
                    <img src={seller.logo} className="w-8 h-8 rounded-full border border-white/40" />
                    <div>
                      <p className="text-xs font-black text-white">{seller.name}</p>
                      <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest">{dist}km</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <button 
              onClick={() => setIsAROpen(false)}
              className="absolute top-8 right-8 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <X size={24} />
            </button>

            <div className="absolute bottom-12 left-0 right-0 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue/20 backdrop-blur-md border border-accent-blue/40 rounded-full">
                <div className="w-2 h-2 bg-accent-blue rounded-full animate-ping" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">AR Fashion Navigator Active</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .pulsing-marker:hover .pulse-ring {
          animation-duration: 1s;
        }
        .ymaps-2-1-79-map {
          filter: grayscale(0.1) contrast(1.05);
        }
        .dark .ymaps-2-1-79-map {
          filter: invert(1) hue-rotate(180deg) grayscale(0.5) contrast(1.2);
        }
        /* Exclude markers from inversion in dark mode */
        .dark .pulsing-marker {
          filter: invert(1) hue-rotate(180deg);
        }
        .dark .ymaps-2-1-79-placemark {
          filter: invert(1) hue-rotate(180deg);
        }
        /* Custom Cluster Design to match screenshot blue icons */
        .ymaps-2-1-79-cluster-caption {
          font-weight: 800 !important;
        }
      `}</style>
    </div>
  );
};

export default LiveMap;
