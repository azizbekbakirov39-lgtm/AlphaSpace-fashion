const https = require('https');
https.get('https://pub-c0fcf81ee3c14a949b464f920d2f762b.r2.dev/manual/11ec8bc0c0d14b7d_1777887135074.jpg', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
});
