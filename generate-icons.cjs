const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

let sourceFile = path.resolve(__dirname, 'public/app-logo.svg');
if (!fs.existsSync(sourceFile)) {
  sourceFile = path.resolve(__dirname, 'public/app-logo.png');
}

if (!fs.existsSync(sourceFile)) {
  console.error("app-logo not found");
  process.exit(1);
}

const sizes = {
  'ldpi': 36,
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192,
};

const resDir = path.resolve(__dirname, 'android/app/src/main/res');

async function generateIcons() {
  const image = sharp(sourceFile);
  
  for (const [sizeName, size] of Object.entries(sizes)) {
    const dir = path.join(resDir, `mipmap-${sizeName}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const launcherPath = path.join(dir, 'ic_launcher.png');
    const roundPath = path.join(dir, 'ic_launcher_round.png');
    const foregroundPath = path.join(dir, 'ic_launcher_foreground.png');

    // 1. ic_launcher.png (regular box image)
    try {
      await image.clone()
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toFile(launcherPath);
    } catch(e) { console.error("Error generating launcherPath", launcherPath, e); }
      
    // 2. ic_launcher_round.png (circle cropped)
    const circleSvg = `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white" /></svg>`;
    const circleMask = Buffer.from(circleSvg);
    
    try {
      await image.clone()
        .resize(size, size, { fit: 'cover' })
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .toFile(roundPath);
    } catch(e) { console.error("Error generating roundPath", roundPath, e); }

    // Generate adaptive icon foreground as png as well
    try {
      await image.clone()
        .resize(Math.floor(size * 0.7), Math.floor(size * 0.7), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .extend({
          top: Math.floor(size * 0.15),
          bottom: Math.floor(size * 0.15),
          left: Math.floor(size * 0.15),
          right: Math.floor(size * 0.15),
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .resize(size, size)
        .toFile(foregroundPath);
    } catch(e) { console.error("Error generating foregroundPath", foregroundPath, e); }

    console.log(`Generated multiple icons for mipmap-${sizeName} (${size}x${size})`);
  }

  // Update drawable-v24/ic_launcher_foreground.xml
  const v24Dir = path.join(resDir, 'drawable-v24');
  if (!fs.existsSync(v24Dir)) fs.mkdirSync(v24Dir, { recursive: true });
  fs.writeFileSync(path.join(v24Dir, 'ic_launcher_foreground.xml'), `<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@mipmap/ic_launcher_foreground"
    android:gravity="center"
    android:tileMode="disabled" />
`);

  // Update drawable/ic_launcher_background.xml
  const drawableDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
  fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<color xmlns:android="http://schemas.android.com/apk/res/android"
    android:color="#FFFFFF"/>
`);

  // Update mipmap-anydpi-v26 xmls
  const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>`;
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveXml);

  console.log("Updated XML resources successfully!");
}

generateIcons().catch(console.error);
