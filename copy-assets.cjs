import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const assetsDir = path.join(process.cwd(), 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Just copy app-logo.png
const src = path.join(publicDir, 'app-logo.png');
fs.copyFileSync(src, path.join(assetsDir, 'logo.png'));
fs.copyFileSync(src, path.join(assetsDir, 'logo-dark.png'));
fs.copyFileSync(src, path.join(assetsDir, 'splash.png'));
fs.copyFileSync(src, path.join(assetsDir, 'splash-dark.png'));

console.log('Copied app-logo.png to assets/');
