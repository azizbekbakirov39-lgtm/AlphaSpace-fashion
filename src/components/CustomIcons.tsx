import React from 'react';

export const BrandsIcon = ({ size = 42, isActive = false }: { size?: number, isActive?: boolean }) => {
  const id = React.useId().replace(/:/g, '');
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
  const id = React.useId().replace(/:/g, '');
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
