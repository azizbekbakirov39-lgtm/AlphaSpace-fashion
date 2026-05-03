import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
  }

  // Accent colors from Logo.tsx
  const accentBlue = "#0066FF";
  const accentBlueBright = "#00D2FF";
  
  // Scaled up subject by 1.4x for better fill
  const svg = `
    <svg width="1024" height="1024" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accentBlue}" />
          <stop offset="60%" stop-color="${accentBlue}" />
          <stop offset="100%" stop-color="${accentBlueBright}" />
        </linearGradient>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.3" />
        </filter>
        <linearGradient id="chainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#BF953F" />
          <stop offset="25%" stop-color="#FCF6BA" />
          <stop offset="50%" stop-color="#B38728" />
          <stop offset="75%" stop-color="#FBF5B7" />
          <stop offset="100%" stop-color="#AA771C" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="120" height="120" fill="white" />
      
      <!-- Scaled Group (1.4x larger to fill the space better) -->
      <g transform="translate(60, 60) scale(1.4) translate(-60, -60)">
        <g transform="translate(10, 5)">
          <!-- Chain Strands -->
          <g stroke-width="0.8" fill="none">
            <ellipse cx="28" cy="28" rx="3.5" ry="1.5" stroke="url(#chainGradient)" stroke-width="1.2" transform="rotate(45 28 28)" />
          </g>

          <!-- Tag -->
          <path d="M45 15 L20 15 C17.2 15 15 17.2 15 20 L15 45 L55 85 C57.8 87.8 62.2 87.8 65 85 L85 65 C87.8 62.2 87.8 57.8 85 55 L45 15 Z" 
                fill="url(#logoBg)" filter="url(#dropShadow)" />
          <path d="M43.8 18 L20 18 C18.9 18 18 18.9 18 20 L18 43.8 L55 80.8 C57.8 83.6 62.2 83.6 65 80.8 L80.8 65 C83.6 62.2 83.6 57.8 80.8 55 L43.8 18 Z" 
                stroke="white" stroke-width="1.5" fill="none" />
          
          <circle cx="28" cy="28" r="4.5" fill="white" />
          
          <text x="50" y="58" font-family="cursive, serif" font-size="24" font-weight="900" fill="white" text-anchor="middle" transform="rotate(45 50 58)">
            A.S
          </text>
        </g>
        
        <text x="60" y="108" font-family="cursive, serif" font-size="14" font-weight="900" fill="${accentBlue}" text-anchor="middle">
          AlphaSpace
        </text>
      </g>
    </svg>
  `;

  console.log('Generating high-resolution logo.png...');
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(assetsDir, 'logo.png'));
    
  console.log('Generating icon.png...');
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  console.log('Assets generated successfully in /assets folder');
}

generateIcons().catch(console.error);
