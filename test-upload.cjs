const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function test() {
  fs.writeFileSync('dummy.mp4', 'dummy video content');
  const form = new FormData();
  form.append('files', fs.createReadStream('dummy.mp4'), 'dummy.mp4');

  try {
    const res = await axios.post('http://localhost:3000/api/upload-to-stream', form, {
      headers: form.getHeaders(),
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("HTTP ERROR:", err.response.status, err.response.data);
    } else {
      console.log("NETWORK ERROR:", err.message);
    }
  }
}
test();
