import 'dotenv/config';
import axios from 'axios';

async function test() {
  const key = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY;
  console.log("Using key prefix:", key ? key.substring(0, 4) : "NONE");
  
  try {
    const res = await axios.post(`https://instagram120.p.rapidapi.com/api/instagram/links`, 
      { url: "https://www.instagram.com/reel/C8q7_iQO6XW/" },
      {
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-host': 'instagram120.p.rapidapi.com',
          'x-rapidapi-key': key || 'MISSING'
        },
        timeout: 10000
      }
    );
    console.log("Success:", JSON.stringify(res.data).substring(0, 200));
  } catch (err: any) {
    console.log("Error:", err.response?.status, err.response?.data);
  }
}
test();
