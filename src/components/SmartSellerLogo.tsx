import React from 'react';
import { motion } from 'motion/react';

interface SmartSellerLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  animated?: boolean;
  showText?: boolean;
}

const SmartSellerLogo: React.FC<SmartSellerLogoProps> = ({ 
  className = '', 
  width = 120, 
  height = 120, 
  animated = true, 
  showText = true 
}) => {
  const blue = "#0095FF";
  const purple = "#A855F7";
  const lightBlue = "#5AC8FA";

  return (
    <div className={`flex flex-col items-center ${className}`} style={{ width, height: 'auto' }}>
      <div className="relative" style={{ width, height: width }}>
        {/* Price Tag SVG */}
        <svg
          viewBox="0 0 120 120"
          fill="none"
          className="w-full h-full drop-shadow-xl"
        >
          <defs>
            <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={blue}>
                <animate attributeName="stop-color" values={`${blue};${purple};${blue}`} dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor={purple}>
                <animate attributeName="stop-color" values={`${purple};${blue};${purple}`} dur="2s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
            
            <linearGradient id="chainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={blue} />
              <stop offset="100%" stopColor={purple} />
            </linearGradient>

            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Chain - Behind the tag (Smaller, more links for longer look) */}
          <g filter="url(#glow)">
            {[...Array(10)].map((_, i) => {
              const cx = 38 - (i + 1) * 3;
              const cy = 38 + (i + 1) * 2;
              return (
                <circle 
                  key={`back-chain-${i}`}
                  cx={cx} cy={cy} r="2" 
                  stroke="url(#chainGradient)" strokeWidth="1" fill="none"
                  opacity={0.4}
                />
              );
            })}
          </g>

          {/* Main Tag Body */}
          <motion.g
            initial={animated ? { scale: 0.8, opacity: 0 } : {}}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            {/* Outer Shadow for the tag */}
            <path
              d="M55 25 L30 25 C27.2 25 25 27.2 25 30 L25 55 L65 95 C67.8 97.8 72.2 97.8 75 95 L95 75 C97.8 72.2 97.8 67.8 95 65 L55 25 Z"
              fill="black"
              fillOpacity="0.15"
              transform="translate(2, 2)"
            />
            
            {/* The Liquid Tag */}
            <path
              d="M55 25 L30 25 C27.2 25 25 27.2 25 30 L25 55 L65 95 C67.8 97.8 72.2 97.8 75 95 L95 75 C97.8 72.2 97.8 67.8 95 65 L55 25 Z"
              fill="url(#liquidGradient)"
            />

            {/* Solid White Inner Border */}
            <path
              d="M54 30 L33 30 C31.5 30 30 31.5 30 33 L30 54 L65 89 C67 91 70.5 91 72 89 L89 72 C91 70.5 91 67 89 65 L54 30 Z"
              stroke="white"
              strokeWidth="1.2"
              fill="none"
              opacity="0.8"
            />
            
            {/* Main Outer White Border */}
            <path
              d="M55 25 L30 25 C27.2 25 25 27.2 25 30 L25 55 L65 95 C67.8 97.8 72.2 97.8 75 95 L95 75 C97.8 72.2 97.8 67.8 95 65 L55 25 Z"
              stroke="white"
              strokeWidth="2.5"
              fill="none"
            />
          </motion.g>

          {/* Tag Hole */}
          <circle cx="38" cy="38" r="6" fill="white" />
          <circle cx="38" cy="38" r="3.5" fill="#1a1a1a" />

          {/* Chain - Front of the tag (Smaller, more links) */}
          <g filter="url(#glow)">
            {[...Array(8)].map((_, i) => {
              const cx = 38 - (i + 1) * 3.5;
              const cy = 38 - (i + 1) * 1;
              return (
                <circle 
                  key={`front-chain-${i}`}
                  cx={cx} cy={cy} r="2.2" 
                  stroke="url(#chainGradient)" strokeWidth="1.2" fill="none"
                />
              );
            })}
          </g>
          
          {/* AI Text inside tag */}
          <text
            x="60"
            y="66"
            fontFamily="'Dancing Script', cursive"
            fontSize="24"
            fontWeight="900"
            fill="white"
            textAnchor="middle"
            transform="rotate(45 60 66)"
            style={{ 
              filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.4))',
              letterSpacing: '-0.5px'
            }}
          >
            AI
          </text>
        </svg>
      </div>

      {/* SmartSeller Text - Repositioned closer to the tag */}
      {showText && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-[-10px] text-center relative z-10"
        >
          <span 
            className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 font-bold"
            style={{ 
              fontFamily: "'Dancing Script', cursive",
              fontSize: typeof width === 'number' ? (width as number) / 4 : '22px',
              display: 'block',
              lineHeight: 1,
              filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
            }}
          >
            SmartSeller
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default SmartSellerLogo;
