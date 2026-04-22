import 'dotenv/config';
import axios from 'axios';

const key = "24a016b72dmshab921371a8604f3p1bf7dbjsn6483e63bf0dd";
const host = "social-media-video-downloader.p.rapidapi.com";

const paths = [
  "/instagram/v1/media/details",
  "/instagram/v1/post/details",
  "/instagram/v1/video/details",
  "/tiktok/v1/video/details",
  "/tiktok/v1/post/details",
  "/facebook/v1/post/details",
  "/facebook/v1/video/details"
];

async function testBrute() {
  const url = "https://www.instagram.com/p/C6Z7u-xo_30/";
  for (const path of paths) {
     try {
       console.log(`Testing path: ${path}`);
       const res = await axios.get(`https://${host}${path}`, {
         params: { url },
         headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
         timeout: 3000
       });
       console.log(`SUCCESS [${path}]:`, res.data);
     } catch (err: any) {
        if (err.response?.status !== 404) {
           console.log(`ERROR [${path}]:`, err.response?.status, err.response?.data);
        }
     }
  }
}

testBrute();
