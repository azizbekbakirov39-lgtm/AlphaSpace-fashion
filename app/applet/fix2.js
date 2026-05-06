import fs from 'fs';
const path = 'src/components/ShopWorkspace.tsx';
let str = fs.readFileSync(path, 'utf8');
str = str.replace(/\\`/g, '`');
str = str.replace(/\\\$/g, '$');
fs.writeFileSync(path, str);
