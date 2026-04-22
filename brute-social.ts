import axios from 'axios';

const key = '24a016b72dmshab921371a8604f3p1bf7dbjsn6483e63bf0dd';
const host = 'social-media-video-downloader.p.rapidapi.com';
const url = 'https://www.instagram.com/p/C6Z7u-xo_30/';

const versions = ['v1', 'v2', 'v3'];
const bases = ['instagram', 'instagram-media', 'ig'];
const actions = ['media', 'post', 'reels', 'details', 'video', 'media-details', 'post-details'];

async function run() {
  for (const v of versions) {
    for (const b of bases) {
      for (const a of actions) {
        // Try various combinations
        const paths = [
          `/${b}/${v}/${a}`,
          `/${b}/${v}/${a}/details`,
          `/${b}/${a}/${v}`,
          `/${b}/${a}`
        ];
        
        for (const p of paths) {
          try {
            // console.log(`Testing: ${p}`);
            const res = await axios.get(`https://${host}${p}`, {
              params: { url },
              headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
              timeout: 1500
            });
            console.log(`FOUND!!! [${p}]:`, res.data);
            return;
          } catch (e: any) {
            if (e.response?.status && e.response.status !== 404) {
              console.log(`HIT (non-404) [${p}]:`, e.response.status, e.response.data);
              return;
            }
          }
        }
      }
    }
  }
  console.log('Finished without luck.');
}

run();
