import express from "express";
import path from "path";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import crypto from "crypto";
import axios from "axios";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { promisify } from "util";
import os from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "ffmpeg-static";

// Set ffmpeg path
if (ffmpegInstaller) {
  ffmpeg.setFfmpegPath(ffmpegInstaller);
}

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

dotenv.config();

// Cloudflare R2 Client Initialization
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

// Initialize Firebase Admin safely
try {
  if (!admin.apps.length) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountVar) {
      try {
        const serviceAccount = JSON.parse(serviceAccountVar);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized with Service Account");
      } catch (parseError) {
        console.error("FIREBASE_SERVICE_ACCOUNT JSON parse error:", parseError);
        admin.initializeApp();
      }
    } else {
      admin.initializeApp();
      console.log("Firebase Admin initialized with default credentials");
    }
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_4eC39HqLyjWDarjtT1zdp7dc");
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY;
const app = express();

app.use(cors());
app.use(express.json());

// Request Logger - Disabled to keep terminal clean
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//   next();
// });

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

app.post("/api/fetch-telegram-html", async (req, res) => {
  try {
    const { url } = req.body;
    const embedUrl = url.includes("?embed=1") ? url : `${url}?embed=1`;
    const response = await fetch(embedUrl);
    const html = await response.text();
    res.json({ html });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/refresh-instagram-url", async (req, res) => {
  try {
    const { shortcode, type = 'p' } = req.body;
    if (!shortcode) return res.status(400).json({ error: "Shortcode required" });
    
    if (!RAPIDAPI_KEY) {
      console.error("RAPIDAPI_KEY missing");
      return res.status(500).json({ error: "API Key missing" });
    }

    const tryFetch = async (targetUrl: string) => {
      return axios.post(`https://instagram120.p.rapidapi.com/api/instagram/links`, 
        { url: targetUrl },
        {
          headers: {
            'content-type': 'application/json',
            'x-rapidapi-host': 'instagram120.p.rapidapi.com',
            'x-rapidapi-key': RAPIDAPI_KEY
          },
          validateStatus: () => true 
        }
      );
    };

    const isApiError = (res: any) => {
      const data = res.data || {};
      return res.status !== 200 || data.response === 4 || JSON.stringify(data).includes('not found');
    };

    // Try types in order of likelihood
    const typesToTry = [type];
    if (type === 'p') typesToTry.push('reel');
    else if (type === 'reel') typesToTry.push('p');
    else if (type === 'tv') typesToTry.push('reel', 'p');

    let response: any;
    for (const currentType of typesToTry) {
      response = await tryFetch(`https://www.instagram.com/${currentType}/${shortcode}/`);
      if (!isApiError(response)) {
        break; // Found valid data
      }
    }

    if (isApiError(response)) {
      console.error("RapidAPI Final Error:", response.status, response.data);
      return res.status(response.status === 200 ? 500 : response.status).json({ error: response.data || 'Link not found' });
    }

    res.json(response.data);
  } catch (error: any) {
    console.error("Backend Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to import video to Cloudflare R2 with compression
app.post("/api/import-to-r2", async (req, res) => {
  const tempFiles: string[] = [];
  try {
    const { videoUrl, fileName } = req.body;
    if (!videoUrl) return res.status(400).json({ error: "videoUrl required" });

    // 1. Download the video to a temporary file
    console.log(`Downloading video from: ${videoUrl}`);
    const response = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "arraybuffer",
      timeout: 60000, // 60 seconds for larger videos
    });

    const inputBuffer = Buffer.from(response.data);
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input-${crypto.randomBytes(8).toString("hex")}.mp4`);
    const outputPath = path.join(tempDir, `output-${crypto.randomBytes(8).toString("hex")}.mp4`);
    
    await writeFile(inputPath, inputBuffer);
    tempFiles.push(inputPath);

    // 2. Compress the video using FFmpeg
    // Using CRF 20 for high quality, and preset slow for better compression efficiency
    // This preserves high quality (effectively visually lossless) while reducing file size
    console.log(`Compressing video...`);
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-c:v libx264",
          "-crf 20",
          "-preset slow",
          "-c:a copy", // Copy audio without re-encoding to save time and quality
          "-movflags +faststart", // Optimize for web streaming
        ])
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });
    tempFiles.push(outputPath);

    // 3. Read compressed video
    const compressedBuffer = await readFile(outputPath);
    const contentType = "video/mp4";
    
    const key = fileName || `videos/${crypto.randomBytes(8).toString("hex")}.mp4`;

    // 4. Upload to Cloudflare R2
    console.log(`Uploading compressed video to R2: ${key}`);
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: compressedBuffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // 5. Return the public URL
    const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
    console.log(`Upload complete: ${publicUrl}`);
    
    res.json({ publicUrl, key, originalSize: inputBuffer.length, compressedSize: compressedBuffer.length });

  } catch (error: any) {
    console.error("R2 Upload/Compression Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    // Cleanup temporary files
    for (const file of tempFiles) {
      if (fs.existsSync(file)) {
        await unlink(file).catch(err => console.error(`Cleanup error for ${file}:`, err));
      }
    }
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { price, title } = req.body;
    const amount = parseInt(price.replace(/[^0-9]/g, "")) * 100;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "uzs",
          product_data: { name: title },
          unit_amount: amount || 2000000,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${req.headers.origin}/shop-workspace?payment=success`,
      cancel_url: `${req.headers.origin}/shop-workspace?payment=cancel`,
    });
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite / Static serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite();

// Export for Vercel
export default app;

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`[${new Date().toISOString()}] Server is running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[${new Date().toISOString()}] RapidAPI Key configured: ${!!RAPIDAPI_KEY}`);
});
