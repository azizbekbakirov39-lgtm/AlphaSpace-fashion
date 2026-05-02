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

app.get("/api/proxy-video", async (req: any, res: any) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL required");

    const decodedUrl = decodeURIComponent(url as string);
    console.log(`Proxying video: ${decodedUrl}`);

    const outboundHeaders: any = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Referer': 'https://www.instagram.com/',
      'Origin': 'https://www.instagram.com'
    };
    if (req.headers.range) {
      outboundHeaders['range'] = req.headers.range;
    }

    const response = await axios({
      url: decodedUrl,
      method: "GET",
      responseType: "stream",
      headers: outboundHeaders,
      timeout: 15000,
      validateStatus: () => true
    });

    if (response.status >= 400) {
       return res.status(response.status).send(`Upstream error: ${response.status}`);
    }

    // Set headers for streaming
    res.status(response.status); // 200 or 206
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
    
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    response.data.pipe(res);
  } catch (error: any) {
    console.error("Video proxy error:", error.message);
    res.status(500).send(error.message);
  }
});

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

    const isApiError = (res: any) => {
      if (!res || !res.data) return true;
      const data = res.data;
      
      // Look for specific error fields or codes rather than searching the entire JSON string.
      // E.g. `data.error` or `data.response === 4` or `data.status === 'failed'`
      
      if (res.status !== 200) return true;
      if (data.response === 4) return true;
      if (data.status === 'failed') return true;
      
      const errorMsg = (typeof data.error === 'string' ? data.error : '').toLowerCase();
      const msg = (typeof data.message === 'string' ? data.message : '').toLowerCase();
      
      if (errorMsg.includes('not found') || msg.includes('not found')) return true;
      if (errorMsg.includes('private') || msg.includes('private')) return true;
      if (errorMsg.includes('invalid url') || msg.includes('invalid url')) return true;
      
      // If none of these specific error strings indicate an error, and we have urls or media, it's valid
      return false;
    };

    const tryFetch = async (targetUrl: string) => {
      const commonHeaders = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };

      // 1. Primary: instagram120
      try {
        const primaryResponse = await axios.post(`https://instagram120.p.rapidapi.com/api/instagram/links`, 
          { url: targetUrl },
          {
            headers: { ...commonHeaders, 'x-rapidapi-host': 'instagram120.p.rapidapi.com' },
            validateStatus: () => true,
            timeout: 15000
          }
        );
        if (primaryResponse.status === 200 && !isApiError(primaryResponse)) return primaryResponse;
        console.log(`Primary RapidAPI failed (${primaryResponse.status}) for ${targetUrl}`);
      } catch (e: any) {
        console.log(`Primary API Request Error: ${e.message}`);
      }

      // 2. Fallback 1: instagram-media-downloader
      try {
        const fallback1 = await axios.get(`https://instagram-media-downloader.p.rapidapi.com/api/index`, {
          params: { url: targetUrl },
          headers: { ...commonHeaders, 'x-rapidapi-host': 'instagram-media-downloader.p.rapidapi.com' },
          validateStatus: () => true,
          timeout: 15000
        });

        if (fallback1.status === 200 && fallback1.data && (fallback1.data.media || fallback1.data.url)) {
          const data = fallback1.data;
          return {
            ...fallback1,
            data: {
              urls: [{ url: data.media || data.url }],
              thumbnail_url: data.thumbnail
            }
          };
        }
        console.log(`Fallback 1 failed (${fallback1.status})`);
      } catch (e: any) {
        console.log(`Fallback 1 Request Error: ${e.message}`);
      }

      // 3. Fallback 2: rocketapi-for-instagram (Very reliable)
      try {
        const fallback2 = await axios.post(`https://rocketapi-for-instagram.p.rapidapi.com/instagram/media/get_info`, 
          { url: targetUrl },
          {
            headers: { ...commonHeaders, 'x-rapidapi-host': 'rocketapi-for-instagram.p.rapidapi.com' },
            validateStatus: () => true,
            timeout: 15000
          }
        );

        if (fallback2.status === 200 && fallback2.data?.response?.body) {
          const body = fallback2.data.response.body;
          const media = Array.isArray(body) ? body[0] : body;
          const videoUrl = media.video_versions?.[0]?.url || media.image_versions2?.candidates?.[0]?.url;
          
          if (videoUrl) {
            return {
              ...fallback2,
              data: {
                urls: [{ url: videoUrl }],
                thumbnail_url: media.image_versions2?.candidates?.[0]?.url
              }
            };
          }
        }
        console.log(`Fallback 2 (RocketAPI) failed (${fallback2.status})`);
      } catch (e: any) {
        console.log(`Fallback 2 Request Error: ${e.message}`);
      }

      // 4. Fallback 3: social-media-video-downloader (Last resort)
      try {
        const fallback3 = await axios.get(`https://social-media-video-downloader.p.rapidapi.com/smvd/get/instagram`, {
          params: { url: targetUrl },
          headers: { ...commonHeaders, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' },
          validateStatus: () => true,
          timeout: 15000
        });

        if (fallback3.status === 200 && fallback3.data && (fallback3.data.url || fallback3.data.media)) {
          return {
            ...fallback3,
            data: {
              urls: [{ url: fallback3.data.url || fallback3.data.media }],
              thumbnail_url: fallback3.data.thumbnail
            }
          };
        }
        console.log(`Fallback 3 failed (${fallback3.status})`);
      } catch (e: any) {
        console.log(`Fallback 3 Request Error: ${e.message}`);
      }

      return null;
    };

    // Try types in order of likelihood
    const typesToTry = [type];
    if (type === 'p') typesToTry.push('reel');
    else if (type === 'reel') typesToTry.push('p');
    else if (type === 'tv') typesToTry.push('reel', 'p');

    let response: any;
    for (const currentType of typesToTry) {
      // Try with and without trailing slash as some APIs are picky
      const urls = [
        `https://www.instagram.com/${currentType}/${shortcode}/`,
        `https://www.instagram.com/${currentType}/${shortcode}`
      ];
      
      for (const url of urls) {
        response = await tryFetch(url);
        if (!isApiError(response)) break;
      }
      
      if (response && !isApiError(response)) break;
    }

    if (!response || isApiError(response)) {
      const lastStatus = response?.status || 500;
      const lastData = response?.data || { error: 'All RapidAPI providers failed' };
      console.log("RapidAPI Final Error:", lastStatus, lastData);
      return res.status(lastStatus === 200 ? 404 : lastStatus).json({ 
        error: lastData,
        message: "None of the RapidAPI providers could fetch this media. The post might be private, deleted, or the API key is invalid."
      });
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

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
      console.error("R2 Config Missing");
      return res.status(500).json({ error: "R2 configuration is missing" });
    }

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
        .on("error", (err) => {
          console.error("FFmpeg Error:", err);
          reject(err);
        })
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

app.post("/api/send-push", async (req, res) => {
  try {
    const { token, title, body, data } = req.body;
    if (!token) return res.status(400).json({ error: "No target FCM token provided" });
    if (!admin.apps.length) return res.status(500).json({ error: "Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT."});

    const payload = {
      token: token,
      notification: {
        title: title || "Yangi xabar",
        body: body || "Sizga xabar keldi"
      },
      data: data || {}
    };

    const response = await admin.messaging().send(payload);
    console.log("FCM xabar muvaffaqiyatli jo'natildi:", response);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error("FCM jo'natish xatosi:", error);
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
