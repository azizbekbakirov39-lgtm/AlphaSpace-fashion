import express from "express";
import path from "path";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import crypto from "crypto";
import axios from "axios";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import { promisify } from "util";

dotenv.config();

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Ensure temp directory exists
const TEMP_DIR = path.join(process.cwd(), "temp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

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
    const { videoUrl, fileName, compress = true } = req.body;
    if (!videoUrl) return res.status(400).json({ error: "videoUrl required" });

    // 1. Download the video
    console.log(`Downloading video from: ${videoUrl}`);
    const downloadResponse = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 60000, // 60 seconds
    });

    const buffer = Buffer.from(downloadResponse.data);
    const originalSize = buffer.length;
    
    // Generate unique temp filenames
    const inputPath = path.join(TEMP_DIR, `input_${crypto.randomBytes(8).toString('hex')}.mp4`);
    const outputPath = path.join(TEMP_DIR, `output_${crypto.randomBytes(8).toString('hex')}.mp4`);
    tempFiles.push(inputPath, outputPath);

    // Save buffer to temp file
    await writeFile(inputPath, buffer);

    let finalBuffer: Buffer = buffer;
    
    if (compress) {
      console.log(`Compressing video... Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
      
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            "-c:v libx264",
            "-crf 20", // Higher quality (lower is better, 20 is very high quality/low compression)
            "-preset medium",
            "-pix_fmt yuv420p",
            "-c:a aac",
            "-b:a 192k", // Better audio quality
            "-movflags +faststart" // Web optimized, keep original resolution
          ])
          .toFormat("mp4")
          .on("start", (cmd) => console.log("FFmpeg command:", cmd))
          .on("end", resolve)
          .on("error", (err) => {
            console.error("FFmpeg Error:", err);
            reject(err);
          })
          .save(outputPath);
      });

      finalBuffer = fs.readFileSync(outputPath);
      const compressedSize = finalBuffer.length;
      console.log(`Compression complete. New size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${((1 - compressedSize/originalSize) * 100).toFixed(1)}% reduced)`);
    }

    // 2. Upload to Cloudflare R2
    const key = fileName || `videos/${crypto.randomBytes(8).toString('hex')}.mp4`;
    console.log(`Uploading to R2: ${key}`);
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: finalBuffer,
      ContentType: "video/mp4",
    });

    await r2Client.send(command);

    // 3. Return the public URL
    const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
    console.log(`Upload complete: ${publicUrl}`);
    
    res.json({ publicUrl, key, size: finalBuffer.length });
  } catch (error: any) {
    console.error("R2 Upload/Compress Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    // Cleanup temp files
    for (const file of tempFiles) {
      if (fs.existsSync(file)) {
        try { await unlink(file); } catch(e) {}
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
