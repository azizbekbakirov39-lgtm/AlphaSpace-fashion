import 'dotenv/config';
import axios from 'axios';

const key = "24a016b72dmshab921371a8604f3p1bf7dbjsn6483e63bf0dd";
const host = "social-media-video-downloader.p.rapidapi.com";

const configurations = [
  { endpoint: "/instagram/v3/post/details", param: "url" },
  { endpoint: "/tiktok/v3/post/details", param: "url" },
  { endpoint: "/facebook/v3/post/details", param: "url" },
  { endpoint: "/youtube/v3/video/details", param: "videoId" }
];

async function testV3() {
  const igUrl = "https://www.instagram.com/p/C6Z7u-xo_30/";
  const ttUrl = "https://www.tiktok.com/@khaby.lame/video/7352345678901234567";
  const fbUrl = "https://www.facebook.com/share/p/1B2C3D4E5F/";

  for (const config of configurations) {
    try {
      console.log(`Testing: ${config.endpoint}`);
      let url = igUrl;
      if (config.endpoint.includes("tiktok")) url = ttUrl;
      if (config.endpoint.includes("facebook")) url = fbUrl;
      if (config.endpoint.includes("youtube")) url = "dQw4w9WgXcQ";

      const res = await axios.get(`https://${host}${config.endpoint}`, {
        params: { [config.param]: url },
        headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
        timeout: 5000
      });
      console.log(`SUCCESS [${config.endpoint}]:`, JSON.stringify(res.data).substring(0, 100));
    } catch (err: any) {
       console.log(`ERROR [${config.endpoint}]:`, err.response?.status, err.response?.data || err.message);
    }
  }
}

testV3();
