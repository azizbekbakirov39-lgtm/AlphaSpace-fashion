import 'dotenv/config';
import axios from 'axios';

const key = "24a016b72dmshab921371a8604f3p1bf7dbjsn6483e63bf0dd";
const host = "social-media-video-downloader.p.rapidapi.com";

const testPaths = [
  "/instagram/v1/media",
  "/instagram/v3/media",
  "/instagram/v1/post",
  "/instagram/v3/post",
  "/instagram/v1/details",
  "/instagram/v3/details",
  "/instagram/media",
  "/instagram/post",
  "/instagram/details",
  "/social/media/details",
  "/all/media/details"
];

async function run() {
  const url = "https://www.instagram.com/p/C6Z7u-xo_30/";
  for (const path of testPaths) {
    try {
       console.log(`Trying: ${path}`);
       const r = await axios.get(`https://${host}${path}`, {
         params: { url },
         headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
         timeout: 2000
       });
       console.log(`SUCCESS: ${path}`, r.data);
       return;
    } catch (e) {
       // Only ignore 404
    }
  }
}
run();
