import React, { useId } from 'react';

export const BrandsIcon = ({ size = 42, isActive = false }: { size?: number, isActive?: boolean }) => {
  const id = useId().replace(/:/g, '');
  const gradientId = `brands-bag-gradient-${id}`;
  const accentBlue = "#0066FF";
  const accentDeep = "#003399";
  const accentLight = "#00D2FF";

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 64 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
        style={{ filter: 'drop-shadow(0 6px 12px rgba(0, 80, 255, 0.45))' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentBlue} />
            <stop offset="100%" stopColor={accentDeep} />
          </linearGradient>
        </defs>

        {/* Back Layer for depth (Qavat-qavat look) */}
        <path 
          d="M18 18H50L52 54H16L18 18Z" 
          fill={accentDeep} 
          opacity="0.3"
          transform="translate(-2, -1) scale(0.98)"
        />
        
        {/* Main Bag Body */}
        <path 
          d="M14 16H50L53 58H11L14 16Z" 
          fill={`url(#${gradientId})`}
          stroke="white"
          strokeWidth="0.5"
          strokeOpacity="0.2"
        />

        {/* Paper Bag Top Folding Line */}
        <path 
          d="M14 20H50" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeOpacity="0.1" 
        />

        {/* Bag Handles - Rope style */}
        <path 
          d="M26 16C26 11 29 9 32 9C35 9 38 11 38 16" 
          stroke="white" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
        />
        <path 
          d="M26 16C23 16 23 14 26 14M38 16C41 16 41 14 38 14" 
          stroke="white" 
          strokeWidth="1" 
          opacity="0.5"
        />

        {/* Side Crease (Depth effect) */}
        <path 
          d="M17 16L20 58" 
          stroke="black" 
          strokeWidth="2" 
          opacity="0.1" 
        />
        <path 
          d="M47 16L44 58" 
          stroke="white" 
          strokeWidth="1" 
          opacity="0.1" 
        />

        {/* Letter B - Premium White */}
        <text 
          x="32" 
          y="42" 
          fill="white" 
          fontSize="24" 
          fontWeight="1000" 
          textAnchor="middle" 
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.4))' }}
        >
          B
        </text>

        {/* Premium Shine Layer */}
        <path 
          d="M15 17L18 57H22L19 17H15Z" 
          fill="white" 
          fillOpacity="0.1" 
        />
      </svg>
    </div>
  );
};

export const LiveIcon = ({ size = 42, isActive = false }: { size?: number, isActive?: boolean }) => {
  const id = useId().replace(/:/g, '');
  const gradientId = `live-marker-gradient-${id}`;
  const accentBlue = "#0066FF";
  const accentLight = "#00D2FF";

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 64 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
        style={{ filter: 'drop-shadow(0 6px 12px rgba(0, 102, 255, 0.45))' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentBlue} />
            <stop offset="100%" stopColor={accentLight} />
          </linearGradient>
          
          <filter id={`marker-inner-shadow-${id}`}>
            <feOffset dx="0" dy="2" />
            <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="black" floodOpacity="0.2" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>
        </defs>
        
        {/* Pin Shadow/Reflection on Ground */}
        <ellipse 
          cx="32" cy="58" rx="10" ry="3" 
          fill="black" opacity="0.1" 
        />
        
        {/* Main Marker Pin Body */}
        <path 
          d="M32 6C22.0589 6 14 14.0589 14 24C14 36.1421 32 58 32 58C32 58 50 36.1421 50 24C50 14.0589 41.9411 6 32 6Z" 
          fill={`url(#${gradientId})`}
          stroke="white"
          strokeWidth="1"
          strokeOpacity="0.3"
        />

        {/* Glossy Top Curve */}
        <path 
          d="M18 22C18 16 24 10 32 10" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.2" 
        />
        
        {/* Inner Circle Wrapper */}
        <circle 
          cx="32" cy="24" r="10" 
          fill="white" 
          fillOpacity="0.15" 
          filter={`url(#marker-inner-shadow-${id})`}
        />
        
        {/* Center Dot (The actual point) */}
        <circle 
          cx="32" cy="24" r="6" 
          fill="white" 
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        />
        
        {/* Pulsing Dot in Center if active */}
        {isActive && (
          <circle 
            cx="32" cy="24" r="4" 
            fill={accentBlue} 
            className="animate-pulse"
          />
        )}

        {/* Active Ping Animation */}
        {isActive && (
          <circle 
            cx="32" cy="24" r="18" 
            stroke="white" 
            strokeWidth="1.5" 
            className="animate-ping" 
            opacity="0.3" 
          />
        )}
      </svg>
    </div>
  );
};

export const RealisticBlueMessageIcon = ({ active, size = 26 }: { active: boolean, size?: number }) => {
  const id = useId().replace(/:/g, '');
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.4))', transform: active ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.3s' }}>
        {/* Main Bubble */}
        <path d="M52 32C52 43.0457 43.0457 52 32 52C28.4716 52 25.1558 51.085 22.2541 49.4891C21.7248 49.198 21.0963 49.103 20.5186 49.2272L12.5694 50.9328C11.3912 51.1856 10.3541 50.0463 10.702 48.8809L12.9818 41.2464C13.2036 40.503 13.064 39.7042 12.6288 39.0664C10.7416 36.3023 9.60001 32.969 9.60001 29.4C9.60001 17.0288 19.6288 7 32 7C44.3712 7 54.4 17.0288 54.4 29.4C54.4 30.2974 54.3473 31.182 54.2449 32.0526" fill={`url(#blue-gradient-chat-${id})`}/>
        
        {/* Gradients */}
        <defs>
          <linearGradient id={`blue-gradient-chat-${id}`} x1="10" y1="10" x2="54" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#80E0FF" />
            <stop offset="0.5" stopColor="#0095FF" />
            <stop offset="1" stopColor="#004E92" />
          </linearGradient>
        </defs>

        <path d="M52 32C52 43.0457 43.0457 52 32 52C28.4716 52 25.1558 51.085 22.2541 49.4891C21.7248 49.198 21.0963 49.103 20.5186 49.2272L12.5694 50.9328C11.3912 51.1856 10.3541 50.0463 10.702 48.8809L12.9818 41.2464C13.2036 40.503 13.064 39.7042 12.6288 39.0664C10.7416 36.3023 9.6 32.969 9.6 29.4C9.6 17.0288 19.6288 7 32 7C44.3712 7 54.4 17.0288 54.4 29.4C54.4 30.2974 54.3473 31.182 54.2449 32.0526" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Highlights */}
        <path d="M18.8 17.8C22.4 12.2 27.6 9.4 33.2 9.4C39.6 9.4 46.8 13.4 50 21" stroke="#93C5FD" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
        
        {/* Inner shadow/highlight for 3D feel */}
        <path d="M12 29.4C12 18.5 21 9.4 32 9.4C43 9.4 52 18.5 52 29.4C52 40.3 43 49.4 32 49.4" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeDasharray="4 8" opacity="0.3" />

        {/* Dots */}
        <circle cx="21" cy="29" r="3.5" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}/>
        <circle cx="32" cy="29" r="3.5" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}/>
        <circle cx="43" cy="29" r="3.5" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}/>
      </svg>
    </div>
  );
};
