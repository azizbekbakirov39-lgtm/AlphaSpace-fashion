const fs = require('fs');

const accentBlue = "#0095FF";
const accentLight = "#5AC8FA";
const accentBlueBright = "#007AFF";

let svg = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="${accentBlue}" />
      <stop offset="100%" stopColor="${accentBlueBright}" />
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="${accentBlueBright}" floodOpacity="0.3" />
    </filter>
    <filter id="chainShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" floodColor="black" floodOpacity="0.2" />
    </filter>
    <clipPath id="appIconClip">
      <rect x="0" y="0" width="120" height="120" rx="28" />
    </clipPath>
    <linearGradient id="chainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="white" />
      <stop offset="50%" stopColor="${accentLight}" />
      <stop offset="100%" stopColor="white" />
    </linearGradient>
  </defs>

  <g clipPath="url(#appIconClip)">
    <rect x="0" y="0" width="120" height="120" rx="28" fill="url(#logoBg)" />

    <g transform="translate(60, 60) scale(1.1) translate(-50, -50)">
      <g stroke-width="0.8" fill="none" filter="url(#chainShadow)">
`;

// Back Upper Strand
for (let i = 0; i < 8; i++) {
  const cx = 28 + i * 1.2;
  const cy = 28 - i * 0.8;
  const isEven = i % 2 === 0;
  svg += `        <g opacity="0.4"><ellipse cx="${cx}" cy="${cy}" rx="3" ry="1.2" stroke="url(#chainGradient)" stroke-width="0.8" transform="rotate(${isEven ? -45 : 45} ${cx} ${cy})" /></g>\n`;
}

// Middle Strand (Moved to back)
for (let i = 0; i < 50; i++) {
  const curve = Math.cos(i * 0.15) * 6;
  const cx = 28 - i * 2.5 + curve;
  const cy = 28 + i * 1.4 + curve;
  const isEven = i % 2 === 0;
  if (cx < -40 || cy > 140) continue;
  svg += `        <g>
          <ellipse cx="${cx}" cy="${cy}" rx="3.5" ry="1.5" stroke="url(#chainGradient)" stroke-width="1.2" transform="rotate(${isEven ? -20 + curve : 70 + curve} ${cx} ${cy})" />
          <ellipse cx="${cx}" cy="${cy}" rx="2.8" ry="1" stroke="white" stroke-width="0.4" opacity="0.5" transform="rotate(${isEven ? -20 + curve : 70 + curve} ${cx} ${cy})" />
        </g>\n`;
}

svg += `      </g>

      <path d="M45 15 L20 15 C17.2 15 15 17.2 15 20 L15 45 L55 85 C57.8 87.8 62.2 87.8 65 85 L85 65 C87.8 62.2 87.8 57.8 85 55 L45 15 Z" fill="white" filter="url(#dropShadow)" />
      <path d="M43.8 18 L20 18 C18.9 18 18 18.9 18 20 L18 43.8 L55 80.8 C57.8 83.6 62.2 83.6 65 80.8 L80.8 65 C83.6 62.2 83.6 57.8 80.8 55 L43.8 18 Z" stroke="${accentLight}" stroke-width="1.5" fill="none" />
      <circle cx="28" cy="28" r="4.5" fill="${accentBlueBright}" />

      <g stroke-width="0.8" fill="none" filter="url(#chainShadow)">
`;

// Upper Strand
for (let i = 0; i < 35; i++) {
  const curve = Math.sin(i * 0.2) * 4;
  const cx = 28 - i * 2.2 + curve;
  const cy = 28 - i * 1.5 - curve * 0.5;
  const isEven = i % 2 === 0;
  if (cx < -40 || cy < -40) continue;
  svg += `        <g>
          <ellipse cx="${cx}" cy="${cy}" rx="3.5" ry="1.5" stroke="url(#chainGradient)" stroke-width="1.2" transform="rotate(${isEven ? -60 + curve : 30 + curve} ${cx} ${cy})" />
          <ellipse cx="${cx}" cy="${cy}" rx="2.8" ry="1" stroke="white" stroke-width="0.4" opacity="0.5" transform="rotate(${isEven ? -60 + curve : 30 + curve} ${cx} ${cy})" />
        </g>\n`;
}

svg += `      </g>
      <text x="50" y="58" font-family="'Dancing Script', cursive" font-size="24" font-weight="700" fill="${accentBlueBright}" text-anchor="middle" transform="rotate(45 50 58)">A.S</text>
    </g>
  </g>
</svg>`;

fs.writeFileSync('public/icon.svg', svg);
console.log('Icon generated successfully');
