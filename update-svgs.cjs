const fs = require('fs');
const TextToSVG = require('text-to-svg');
const textToSVG = TextToSVG.loadSync('DancingScript.ttf');

const filesToUpdate = [
  'public/app-logo.svg',
  'public/pwa-icon-solid-v1.svg',
  'public/pwa-icon-v2.svg',
  'public/pwa-icon-v3.svg'
];

for (const file of filesToUpdate) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace text with SVG paths
  content = content.replace(/<text([^>]*)>([^<]*)<\/text>/g, (match, attrsInfo, text) => {
    let x = 0, y = 0, fontSize = 20, fill = 'black', transform = '';
    
    let xMatch = attrsInfo.match(/[\s]x="([^"]+)"/);
    if (xMatch) x = parseFloat(xMatch[1]);
    
    let yMatch = attrsInfo.match(/[\s]y="([^"]+)"/);
    if (yMatch) y = parseFloat(yMatch[1]);
    
    let fsMatch = attrsInfo.match(/font-size="([^"]+)"/);
    if (fsMatch) fontSize = parseFloat(fsMatch[1]);
    
    let fillMatch = attrsInfo.match(/fill="([^"]+)"/);
    if (fillMatch) fill = fillMatch[1];
    
    let tMatch = attrsInfo.match(/transform="([^"]+)"/);
    if (tMatch) transform = tMatch[1];
    
    const options = {
      x, y, fontSize,
      anchor: 'center baseline',
      attributes: { fill }
    };
    
    let path = textToSVG.getPath(text, options);
    
    if (transform) {
      return `<g transform="${transform}">${path}</g>`;
    }
    return path;
  });

  // Scale down by 1.3x
  content = content.replace(/<g transform="translate\(60, 60\) scale\(([0-9.]+)\) translate\(-60, -60\)">/g, (m, sc) => {
    // only scale down if it hasn't been scaled down already a lot
    let num = parseFloat(sc);
    let newSc = (num / 1.3).toFixed(2);
    // If it was 0.77 -> ~0.59
    // If it was 0.54 -> ~0.42
    return `<g transform="translate(60, 60) scale(${newSc}) translate(-60, -60)">`;
  });

  // Optional: Update gold color to a brighter gold if needed
  content = content.replace(/#D4AF37/g, '#FFD700');
  
  fs.writeFileSync(file, content);
}

console.log('SVG files successfully updated.');
