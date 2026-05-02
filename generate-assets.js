import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generate() {
  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const inputSvg = path.join(process.cwd(), 'public', 'app-logo.svg');
  if (!fs.existsSync(inputSvg)) {
    console.error('Input SVG not found');
    process.exit(1);
  }

  // Capacitor requires min 1024x1024 for logo
  await sharp(inputSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'logo.png'));
    
  await sharp(inputSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'logo-dark.png'));

  // And min 2732x2732 for splash
  await sharp(inputSvg)
    .resize(2732, 2732)
    // Add a background color for splash screen
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
    
  await sharp(inputSvg)
    .resize(2732, 2732)
    .flatten({ background: '#000000' })
    .png()
    .toFile(path.join(assetsDir, 'splash-dark.png'));
    
  console.log('Assets generated successfully!');
}

generate().catch(console.error);
