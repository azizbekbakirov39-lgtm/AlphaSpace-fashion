import sharp from 'sharp';

async function test() {
  try {
    const meta = await sharp('public/pwa-icon-v2.svg').metadata();
    console.log(meta);
  } catch (e) {
    console.error('Sharp error:', e.message);
  }
}
test();
