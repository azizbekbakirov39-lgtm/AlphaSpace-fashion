import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
     const res1 = await axios.post('https://instagram120.p.rapidapi.com/api/instagram/links', {url: "https://www.instagram.com/reel/C8q7_iQO6XW/"}, {
        headers: { 'content-type': 'application/json', 'x-rapidapi-host': 'instagram120.p.rapidapi.com', 'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''}
     });
     console.log("POST json ok:", res1.data);
  } catch(e: any) {
     console.log("POST json error:", e.response?.status, e.response?.data);
  }

  try {
     const res2 = await axios.post('https://instagram120.p.rapidapi.com/api/instagram/links', "url=https://www.instagram.com/p/Co1_y6Dq2T1/", {
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-rapidapi-host': 'instagram120.p.rapidapi.com', 'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''}
     });
     console.log("POST form ok:", res2.data);
  } catch(e: any) {
     console.log("POST form error:", e.response?.status, e.response?.data);
  }

  try {
     const res3 = await axios.get('https://instagram120.p.rapidapi.com/api/instagram/links', {
        params: { url: "https://www.instagram.com/p/Co1_y6Dq2T1/" },
        headers: { 'x-rapidapi-host': 'instagram120.p.rapidapi.com', 'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''}
     });
     console.log("GET ok:", res3.data);
  } catch(e: any) {
     console.log("GET error:", e.response?.status, e.response?.data);
  }
}
run();
