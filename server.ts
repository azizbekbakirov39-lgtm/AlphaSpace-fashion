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
    const { shortcode, type = 'p', fullUrl } = req.body;
    if (!shortcode && !fullUrl) return res.status(400).json({ error: "Shortcode or fullUrl required" });
    
    if (!RAPIDAPI_KEY) {
      console.error("RAPIDAPI_KEY missing");
      return res.status(500).json({ error: "API Key missing" });
    }

    const isApiError = (res: any) => {
      if (!res || !res.data) return true;
      const data = res.data;
      if (res.status !== 200) return true;
      
      // Some APIs return status: 'failed', success: false or response: 4
      if (data.status === 'failed' || data.success === false || data.response === 4 || data.error) return true;
      
      // Check if we actually got any media
      const hasMedia = (data.urls && data.urls.length > 0) || 
                       data.media || data.url || data.pictureUrl || 
                       data.display_url || data.video_url ||
                       (data.response && data.response.body) ||
                       (data.data && (data.data.main_media || data.data.resources)) ||
                       data.download_url;
                       
      return !hasMedia;
    };

    const tryFetch = async (targetUrl: string) => {
      console.log(`Attempting to fetch Instagram media from: ${targetUrl}`);
      const commonHeaders = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };

      // 1. Primary: instagram-bulk-scraper-latest
      try {
        const res = await axios.get(`https://instagram-bulk-scraper-latest.p.rapidapi.com/media_download_from_url`, {
          params: { url: targetUrl },
          headers: { ...commonHeaders, 'x-rapidapi-host': 'instagram-bulk-scraper-latest.p.rapidapi.com' },
          timeout: 15000, validateStatus: () => true
        });
        if (res.status === 200 && res.data?.data) {
          const d = res.data.data;
          const mediaUrl = d.main_media_hd || d.main_media || (d.resources?.[0]?.url);
          if (mediaUrl) return { ...res, data: { urls: [{ url: mediaUrl }], thumbnail_url: d.thumbnail_url || d.main_media } };
        }
      } catch (e: any) { console.log("Bulk Scraper Error:", e.message); }

      // 2. RocketAPI
      try {
        const res = await axios.post(`https://rocketapi-for-instagram.p.rapidapi.com/instagram/media/get_info`, 
          { url: targetUrl },
          { headers: { ...commonHeaders, 'x-rapidapi-host': 'rocketapi-for-instagram.p.rapidapi.com' }, timeout: 15000, validateStatus: () => true }
        );
        if (res.status === 200 && res.data?.response?.body) {
          const body = res.data.response.body;
          const media = Array.isArray(body) ? body[0] : body;
          const vUrl = media.video_versions?.[0]?.url || media.image_versions2?.candidates?.[0]?.url;
          if (vUrl) return { ...res, data: { urls: [{ url: vUrl }], thumbnail_url: media.image_versions2?.candidates?.[0]?.url } };
        }
      } catch (e: any) { console.log("RocketAPI Error:", e.message); }

      // 3. Social Media Video Downloader
      try {
        const res = await axios.get(`https://social-media-video-downloader.p.rapidapi.com/smvd/get/instagram`, {
          params: { url: targetUrl },
          headers: { ...commonHeaders, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' },
          timeout: 15000, validateStatus: () => true
        });
        if (res.status === 200 && res.data && (res.data.url || res.data.media)) {
          return { ...res, data: { urls: [{ url: res.data.url || res.data.media }], thumbnail_url: res.data.thumbnail } };
        }
      } catch (e: any) { console.log("SMVD Error:", e.message); }

      // 4. Instagram Scraper API (Another reliable one)
      try {
        const res = await axios.get(`https://instagram-scraper-api2.p.rapidapi.com/v1/post_info`, {
          params: { url_or_shortcode: targetUrl },
          headers: { ...commonHeaders, 'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com' },
          timeout: 15000, validateStatus: () => true
        });
        if (res.status === 200 && res.data?.data) {
          const d = res.data.data;
          const vUrl = d.video_url || d.display_url || (d.carousel_media?.[0]?.video_url);
          if (vUrl) return { ...res, data: { urls: [{ url: vUrl }], thumbnail_url: d.thumbnail_url || d.display_url } };
        }
      } catch (e: any) { console.log("Scraper API 2 Error:", e.message); }

      // 5. Instagram120
      try {
        const res = await axios.post(`https://instagram120.p.rapidapi.com/api/instagram/links`, 
          { url: targetUrl },
          { headers: { ...commonHeaders, 'x-rapidapi-host': 'instagram120.p.rapidapi.com' }, timeout: 15000, validateStatus: () => true }
        );
        if (res.status === 200 && !isApiError(res)) return res;
      } catch (e: any) { console.log("Instagram120 Error:", e.message); }

      // 6. Scrappie (Very robust fallback)
      try {
        const res = await axios.get(`https://scrappie-instagram.p.rapidapi.com/media/download`, {
          params: { url: targetUrl },
          headers: { ...commonHeaders, 'x-rapidapi-host': 'scrappie-instagram.p.rapidapi.com' },
          timeout: 15000, validateStatus: () => true
        });
        if (res.status === 200 && res.data?.download_url) {
          return { ...res, data: { urls: [{ url: res.data.download_url }], thumbnail_url: res.data.thumbnail_url } };
        }
      } catch (e: any) { console.log("Scrappie Error:", e.message); }

      return null;
    };

    let finalResponse: any = null;

    // Use fullUrl if provided, otherwise try to reconstruct
    if (fullUrl) {
      finalResponse = await tryFetch(fullUrl);
      if (finalResponse && !isApiError(finalResponse)) {
         return res.json(finalResponse.data);
      }
    }

    // Fallback to shortcode reconstruction
    const typesToTry = [type];
    if (type === 'p') typesToTry.push('reel');
    else if (type === 'reel') typesToTry.push('p');
    else if (type === 'tv') typesToTry.push('reel', 'p');

    for (const currentType of typesToTry) {
      const urls = [
        `https://www.instagram.com/${currentType}/${shortcode}/`,
        `https://www.instagram.com/${currentType}/${shortcode}`
      ];
      
      for (const url of urls) {
        finalResponse = await tryFetch(url);
        if (finalResponse && !isApiError(finalResponse)) {
           return res.json(finalResponse.data);
        }
      }
    }

    // If we're here, everything failed
    res.status(404).json({ 
      message: "Instagramdan ma'lumot olib bo'lmadi. Post o'chirilgan, profil yopiq yoki API limiti tugagan bo'lishi mumkin." 
    });
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
      console.error("R2 Config Missing. Skipping R2 upload and falling back to original URL.");
      // Soft fallback: If we can't compress/upload, just return the original URL rather than crashing the save
      return res.json({ publicUrl: videoUrl });
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
