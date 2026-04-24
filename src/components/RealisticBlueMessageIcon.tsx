import React from 'react';

export const RealisticBlueMessageIcon = ({ active, size = 26 }: { active: boolean, size?: number }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: active ? 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.4))' : 'grayscale(100%) opacity(60%)', transform: active ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.3s' }}>
        {/* Main Bubble */}
        <path d="M52 32C52 43.0457 43.0457 52 32 52C28.4716 52 25.1558 51.085 22.2541 49.4891C21.7248 49.198 21.0963 49.103 20.5186 49.2272L12.5694 50.9328C11.3912 51.1856 10.3541 50.0463 10.702 48.8809L12.9818 41.2464C13.2036 40.503 13.064 39.7042 12.6288 39.0664C10.7416 36.3023 9.60001 32.969 9.60001 29.4C9.60001 17.0288 19.6288 7 32 7C44.3712 7 54.4 17.0288 54.4 29.4C54.4 30.2974 54.3473 31.182 54.2449 32.0526" fill="url(#blue-gradient-chat)"/>
        
        {/* Gradients */}
        <defs>
          <linearGradient id="blue-gradient-chat" x1="10" y1="10" x2="54" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#1D4ED8" />
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
  )
}
