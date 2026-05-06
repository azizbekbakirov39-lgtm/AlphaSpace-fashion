import * as tus from "tus-js-client";
import fs from "fs";
const file = "test.txt";
fs.writeFileSync(file, "hello world!");
const stream = fs.createReadStream(file);
const upload = new tus.Upload(stream, {
  endpoint: "https://httpbin.org/post",
  uploadSize: 12,
  onError: (err) => console.error("Error:", err.message),
  onSuccess: () => console.log("Success")
});
upload.start();
