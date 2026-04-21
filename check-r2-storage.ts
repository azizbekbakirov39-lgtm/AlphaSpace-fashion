import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

async function checkStorage() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
    });

    const response = await r2Client.send(command);
    const objects = response.Contents || [];
    
    let totalSize = 0;
    console.log("--- Cloudflare R2 Storage Status ---");
    console.log(`Bucket: ${process.env.R2_BUCKET_NAME}`);
    console.log(`Fayllar soni: ${objects.length}`);
    
    objects.forEach(obj => {
      totalSize += obj.Size || 0;
      console.log(`- ${obj.Key} (${(obj.Size! / 1024 / 1024).toFixed(2)} MB)`);
    });

    console.log("------------------------------------");
    console.log(`Jami egallangan joy: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Bepul limitdan qolgan joy: ${(10240 - (totalSize / 1024 / 1024)).toFixed(2)} MB (10GB limitdan)`);
  } catch (error) {
    console.error("Storage tekshirishda xatolik:", error);
  }
}

checkStorage();
