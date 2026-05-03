const TextToSVG = require('text-to-svg');
const fs = require('fs');
const https = require('https');

const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf';

https.get(fontUrl, (res) => {
  if (res.statusCode !== 200) {
     console.error('Failed to download font: HTTP ' + res.statusCode);
     process.exit(1);
  }
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync('DancingScript.ttf', buffer);
    console.log('Font downloaded.');

    const textToSVG = TextToSVG.loadSync('DancingScript.ttf');
    
    // "A.S" path
    const path1 = textToSVG.getPath('A.S', { x: 0, y: 0, fontSize: 28, anchor: 'left baseline', attributes: { fill: 'white' } });
    
    // "AlphaSpace" path
    const path2 = textToSVG.getPath('AlphaSpace', { x: 0, y: 0, fontSize: 22, anchor: 'left baseline', attributes: { fill: '#0066FF' } });
    
    fs.writeFileSync('paths.json', JSON.stringify({
      aS: path1,
      alphaSpace: path2
    }, null, 2));
    
    console.log('Paths generated.');
  });
}).on('error', (err) => {
  console.error('Error: ', err.message);
});