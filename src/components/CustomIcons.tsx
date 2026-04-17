import React from 'react';

export const BrandsIcon = ({ size = 48, isActive = false }: { size?: number, isActive?: boolean }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={`transition-transform duration-500 ${isActive ? 'rotate-[10deg] scale-110' : 'rotate-0 scale-100'}`}
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
    
    {/* Shopping Bag (Blue-Purple) */}
    <path 
      d="M5 8h14l-2 12H7L5 8z" 
      fill="url(#bag-gradient)" 
      stroke="#6d28d9" 
      strokeWidth="0.5"
    />
    <path 
      d="M9 8V5a3 3 0 0 1 6 0v3" 
      stroke="url(#bag-gradient)" 
      strokeWidth="1.5"
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

export const SmartSellerTabIcon = ({ size = 24, strokeWidth = 2, color = "currentColor" }: { size?: number, strokeWidth?: number, color?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Tag Shape */}
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <circle cx="7" cy="7" r="1" fill={color} stroke="none" />
  </svg>
);
