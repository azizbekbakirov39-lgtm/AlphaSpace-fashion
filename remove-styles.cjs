const fs = require('fs');

const filesToUpdate = [
  'public/app-logo.svg',
  'public/pwa-icon-solid-v1.svg',
  'public/pwa-icon-v2.svg',
  'public/pwa-icon-v3.svg'
];

for (const file of filesToUpdate) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Remove the <style> block and its contents
  content = content.replace(/<style>[\s\S]*?<\/style>/g, '');
  
  fs.writeFileSync(file, content);
}
console.log('Styles removed in SVG files.');
