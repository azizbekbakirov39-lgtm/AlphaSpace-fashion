import React from 'react';

export const BrandsIcon = ({ size = 48, isActive = false }: { size?: number, isActive?: boolean }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={`transition-transform duration-500 ${isActive ? 'rotate-[-15deg] scale-110' : 'rotate-0 scale-100'}`}
  >
    <defs>
      <linearGradient id="bag-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#A855F7" />
      </linearGradient>
      <linearGradient id="gold-metallic" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8B4513" />
      </linearGradient>
    </defs>
    
    {/* Side Face (3D connection, behind) */}
    <path 
      d="M19 8L20.5 20L19 21L17.5 9z" 
      fill="#5D4037" 
      className="opacity-50"
    />
    {/* Secondary Bag (Behind, Right) */}
    <path 
      d="M10 9h10l-1.5 12H11z" 
      fill="url(#bag-gradient)" 
      className="opacity-60"
    />
    
    {/* Main Shopping Bag (Blue-Purple) */}
    <path 
      d="M5 8h14l-2 12H7L5 8z" 
      fill="url(#bag-gradient)" 
    />
    {/* Thin inner white border for highlight */}
    <path 
      d="M6 9l1.5 9.5h9l1.5-9.5z" 
      fill="none"
      stroke="white"
      strokeWidth="0.5"
      strokeOpacity="0.6"
    />
    
    <path 
      d="M9 8V5a3 3 0 0 1 6 0v3" 
      stroke="white" 
      strokeWidth="1"
      fill="none"
    />
    <path 
      d="M9.5 8.5v-3a2.5 2.5 0 0 1 5 0v3" 
      stroke="url(#bag-gradient)" 
      strokeWidth="1"
      fill="none"
    />
    {/* Letter B (Gold) */}
    <text 
      x="12" y="15" 
      fontSize="8" 
      fontWeight="bold" 
      fill="url(#gold-metallic)" 
      textAnchor="middle"
      fontFamily="sans-serif"
    >
      B
    </text>
  </svg>
);

export const LiveIcon = ({ size = 128, strokeWidth = 1.5, color = "currentColor", isActive = false }: { size?: number, strokeWidth?: number, color?: string, isActive?: boolean }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-100'}`}
    stroke={color}
    strokeWidth={strokeWidth}
  >
    <defs>
      <linearGradient id="live-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#A855F7" />
      </linearGradient>
      <linearGradient id="gold-metallic" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8B4513" />
      </linearGradient>
    </defs>
    
    {/* Map Pin Shape */}
    <path 
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      fill="url(#live-gradient)"
      stroke="white"
      strokeWidth={strokeWidth}
    />
    {/* Map Pin Center Dot */}
    <circle cx="12" cy="9" r="2" fill="white" />
    
    {/* Pulse effect if active */}
    {isActive && (
      <circle cx="12" cy="9" r="6" stroke="white" strokeWidth="1" className="animate-ping" opacity="0.6" />
    )}
  </svg>
);
