import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function convert() {
  const input = path.join(process.cwd(), 'public', 'app-logo.svg');
  const output = path.join(process.cwd(), 'public', 'app-logo.png');

  if (!fs.existsSync(input)) {
    console.error('Input SVG not found:', input);
    process.exit(1);
  }

  try {
    await sharp(input)
      .resize(512, 512)
      .png()
      .toFile(output);
    console.log('Successfully converted SVG to PNG:', output);
  } catch (err) {
    console.error('Error during conversion:', err);
    process.exit(1);
  }
}

convert();
