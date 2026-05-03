const sharp = require('sharp');
const fs = require('fs');

async function convert() {
  const svgBuffer = fs.readFileSync('public/app-logo.svg');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/app-logo.png');
  console.log('PNG generated.');
}

convert().catch(console.error);
