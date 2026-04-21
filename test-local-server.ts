import 'dotenv/config';
import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/fetch-instagram-post',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});

req.on('error', console.error);
req.write(JSON.stringify({ url: "https://www.instagram.com/p/Co1_y6Dq2T1/" }));
req.end();
