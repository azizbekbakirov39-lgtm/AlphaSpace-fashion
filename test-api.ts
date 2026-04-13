import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_RAPIDAPI_KEY;
const host = 'instagram120.p.rapidapi.com';

async function testEndpoints() {
  const url = 'https://www.instagram.com/p/DBQ6/';

  console.log(`Testing url:`, url);
  try {
    const res = await fetch(`https://${host}/api/instagram/links`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rapidapi-host': host,
        'x-rapidapi-key': apiKey as string
      },
      body: JSON.stringify({ url })
    });
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Success!`);
      console.log(JSON.stringify(data, null, 2));
      return;
    } else {
      const text = await res.text();
      console.log(`Error: ${text.substring(0, 100)}`);
    }
  } catch (e: any) {
    console.log(`Fetch error: ${e.message}`);
  }
}

testEndpoints();
