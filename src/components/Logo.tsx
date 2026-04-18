import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  animated?: boolean;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', width = 120, height = 120, animated = false, showText = true }) => {
  const accentBlue = "#3B82F6";
  const accentLight = "#5AC8FA";
  const accentBlueBright = "#9333EA";

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1 },
  };

  const tagPath = "M45 15 L20 15 C17.2 15 15 17.2 15 20 L15 45 L55 85 C57.8 87.8 62.2 87.8 65 85 L85 65 C87.8 62.2 87.8 57.8 85 55 L45 15 Z";
  const tagInnerPath = "M43.8 18 L20 18 C18.9 18 18 18.9 18 20 L18 43.8 L55 80.8 C57.8 83.6 62.2 83.6 65 80.8 L80.8 65 C83.6 62.2 83.6 57.8 80.8 55 L43.8 18 Z";

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accentBlue} />
          <stop offset="100%" stopColor={accentBlueBright} />
        </linearGradient>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.35" />
        </filter>
        <filter id="chainShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" floodColor="black" floodOpacity="0.2" />
        </filter>
        <clipPath id="appIconClip">
          <rect x="0" y="0" width="120" height="120" rx="28" />
        </clipPath>
        <linearGradient id="chainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" />
          <stop offset="50%" stopColor={accentLight} />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>

      <g clipPath="url(#appIconClip)">
        {/* App Icon Background */}
        {animated ? (
          <motion.rect
            x="0"
            y="0"
            width="120"
            height="120"
            rx="28"
            fill="white"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ) : (
          <rect x="0" y="0" width="120" height="120" rx="28" fill="white" />
        )}

        {/* Tag Group */}
        <g transform={`translate(60, ${showText ? 42 : 60}) scale(${showText ? 0.95 : 1.1}) translate(-50, -50)`}>
          {/* Back Strands (Behind the hole) */}
          <g strokeWidth="0.8" fill="none" filter="url(#chainShadow)">
            {animated ? (
              <>
                {[...Array(8)].map((_, i) => {
                  const cx = 28 + i * 1.2;
                  const cy = 28 - i * 0.8;
                  const isEven = i % 2 === 0;
                  return (
                    <motion.g
                      key={`back-up-${i}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 0.4, scale: 1 }}
                      transition={{ delay: 1.4 + i * 0.03, duration: 0.3 }}
                    >
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="3"
                        ry="1.2"
                        stroke="url(#chainGradient)"
                        strokeWidth="0.8"
                        transform={`rotate(${isEven ? -45 : 45} ${cx} ${cy})`}
                      />
                    </motion.g>
                  );
                })}
              </>
            ) : (
              <>
                {[...Array(8)].map((_, i) => {
                  const cx = 28 + i * 1.2;
                  const cy = 28 - i * 0.8;
                  const isEven = i % 2 === 0;
                  return (
                    <g key={`back-up-${i}`} opacity="0.4">
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="3"
                        ry="1.2"
                        stroke="url(#chainGradient)"
                        strokeWidth="0.8"
                        transform={`rotate(${isEven ? -45 : 45} ${cx} ${cy})`}
                      />
                    </g>
                  );
                })}
              </>
            )}

            {/* Middle Strand - Going towards bottom-left, curved (Moved to back) */}
            {animated ? (
              <>
                {[...Array(50)].map((_, i) => {
                  // Add curve using cosine
                  const curve = Math.cos(i * 0.15) * 6;
                  const cx = 28 - i * 2.5 + curve;
                  const cy = 28 + i * 1.4 + curve;
                  const isEven = i % 2 === 0;
                  if (cx < -40 || cy > 140) return null;
                  return (
                    <motion.g
                      key={`middle-${i}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.8 + i * 0.03, duration: 0.3 }}
                    >
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="3.5"
                        ry="1.5"
                        stroke="url(#chainGradient)"
                        strokeWidth="1.2"
                        transform={`rotate(${isEven ? -20 + curve : 70 + curve} ${cx} ${cy})`}
                      />
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="2.8"
                        ry="1"
                        stroke="white"
                        strokeWidth="0.4"
                        opacity="0.5"
                        transform={`rotate(${isEven ? -20 + curve : 70 + curve} ${cx} ${cy})`}
                      />
                    </motion.g>
                  );
                })}
              </>
            ) : (
              <>
                {[...Array(50)].map((_, i) => {
                  const curve = Math.cos(i * 0.15) * 6;
                  const cx = 28 - i * 2.5 + curve;
                  const cy = 28 + i * 1.4 + curve;
                  const isEven = i % 2 === 0;
                  if (cx < -40 || cy > 140) return null;
                  return (
                    <g key={`middle-${i}`}>
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="3.5"
                        ry="1.5"
                        stroke="url(#chainGradient)"
                        strokeWidth="1.2"
                        transform={`rotate(${isEven ? -20 + curve : 70 + curve} ${cx} ${cy})`}
                      />
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="2.8"
                        ry="1"
                        stroke="white"
                        strokeWidth="0.4"
                        opacity="0.5"
                        transform={`rotate(${isEven ? -20 + curve : 70 + curve} ${cx} ${cy})`}
                      />
                    </g>
                  );
                })}
              </>
            )}
          </g>

          {/* Main Tag Background */}
          {animated ? (
            <motion.path
              d={tagPath}
              fill="url(#logoBg)"
              filter="url(#dropShadow)"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            />
          ) : (
            <path d={tagPath} fill="url(#logoBg)" filter="url(#dropShadow)" />
          )}

          {/* Tag Inner Border */}
          {animated ? (
            <motion.path
              d={tagInnerPath}
              stroke={accentLight}
              strokeWidth="1.5"
              fill="none"
              initial="hidden"
              animate="visible"
              variants={pathVariants}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.8 }}
            />
          ) : (
            <path d={tagInnerPath} stroke={accentLight} strokeWidth="1.5" fill="none" />
          )}

          {/* Tag Hole */}
          {animated ? (
            <motion.circle
              cx="28"
              cy="28"
              r="4.5"
              fill={accentBlueBright}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 1.2, type: "spring" }}
            />
          ) : (
            <circle cx="28" cy="28" r="4.5" fill={accentBlueBright} />
          )}

          {/* Front Strands (Overlapping the hole) */}
          <g strokeWidth="0.8" fill="none" filter="url(#chainShadow)">
            {/* Upper Strand - Going towards top-left, curved */}
            {animated ? (
              <>
                {[...Array(35)].map((_, i) => {
                  // Add curve using sine
                  const curve = Math.sin(i * 0.2) * 4;
                  const cx = 28 - i * 2.2 + curve;
                  const cy = 28 - i * 1.5 - curve * 0.5;
                  const isEven = i % 2 === 0;
                  if (cx < -40 || cy < -40) return null;
                  return (
                    <motion.g
                      key={`upper-${i}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.6 + i * 0.03, duration: 0.3 }}
                    >
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="3.5"
                        ry="1.5"
                        stroke="url(#chainGradient)"
                        strokeWidth="1.2"
                        transform={`rotate(${isEven ? -60 + curve : 30 + curve} ${cx} ${cy})`}
                      />
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="2.8"
                        ry="1"
                        stroke="white"
                        strokeWidth="0.4"
                        opacity="0.5"
                        transform={`rotate(${isEven ? -60 + curve : 30 + curve} ${cx} ${cy})`}
                      />
                    </motion.g>
                  );
                })}
              </>
            ) : (
              <>
                {[...Array(35)].map((_, i) => {
                  const curve = Math.sin(i * 0.2) * 4;
                  const cx = 28 - i * 2.2 + curve;
                  const cy = 28 - i * 1.5 - curve * 0.5;
                  const isEven = i % 2 === 0;
                  if (cx < -40 || cy < -40) return null;
                  return (
                    <g key={`upper-${i}`}>
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="3.5"
                        ry="1.5"
                        stroke="url(#chainGradient)"
                        strokeWidth="1.2"
                        transform={`rotate(${isEven ? -60 + curve : 30 + curve} ${cx} ${cy})`}
                      />
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx="2.8"
                        ry="1"
                        stroke="white"
                        strokeWidth="0.4"
                        opacity="0.5"
                        transform={`rotate(${isEven ? -60 + curve : 30 + curve} ${cx} ${cy})`}
                      />
                    </g>
                  );
                })}
              </>
            )}
          </g>

          {/* A.S Text inside Tag */}
          {animated ? (
            <motion.text
              x="50"
              y="58"
              fontFamily="'Dancing Script', cursive"
              fontSize="24"
              fontWeight="700"
              fill="white"
              textAnchor="middle"
              transform="rotate(45 50 58)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
            >
              A.S
            </motion.text>
          ) : (
            <text
              x="50"
              y="58"
              fontFamily="'Dancing Script', cursive"
              fontSize="24"
              fontWeight="700"
              fill="white"
              textAnchor="middle"
              transform="rotate(45 50 58)"
            >
              A.S
            </text>
          )}
        </g>

        {/* AlphaSpace Text at the bottom */}
        {showText && (
          <text
            x="60"
            y="100"
            fontFamily="'Dancing Script', cursive"
            fontSize="22"
            fontWeight="700"
            fill="url(#textGradient)"
            textAnchor="middle"
          >
            AlphaSpace
          </text>
        )}
      </g>
    </svg>
  );
};

export default Logo;
