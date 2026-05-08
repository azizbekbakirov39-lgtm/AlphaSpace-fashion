
const sharp = require('sharp');
const path = require('path');

async function syncPng() {
  const svgPath = path.resolve(__dirname, 'public/app-logo.svg');
  const pngPath = path.resolve(__dirname, 'public/app-logo.png');
  
  await sharp(svgPath)
    .resize(1024, 1024)
    .png()
    .toFile(pngPath);
    
  console.log('Synchronized public/app-logo.png from SVG');
}

syncPng().catch(console.error);
