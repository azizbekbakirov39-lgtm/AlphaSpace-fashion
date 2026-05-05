import express from "express";
import path from "path";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import crypto from "crypto";
import axios from "axios";
import fs from "fs";
import { promisify } from "util";
import os from "os";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import sharp from "sharp";

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(os.tmpdir(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max for 4K videos
  }
});

const uploadToR2FromDisk = async (filePath: string, key: string, contentType: string) => {
  const fileBuffer = await readFile(filePath);
  return r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  }));
};

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

// Cloudflare R2 Logic
let r2Client: any = null;
if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT) {
  try {
    r2Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    console.log("Cloudflare R2 Client initialized");
  } catch (err) {
    console.error("R2 Initialization Error:", err);
  }
}

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
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/proxy-video", async (req: any, res: any) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL required");

    let decodedUrl = decodeURIComponent(url as string);
    decodedUrl = decodedUrl.replace(/^https?:\/\/https?:\/\//, 'https://');
    console.log(`Proxying URL: ${decodedUrl}`);

      // If it is an R2 URL, use GetObjectCommand to bypass CORS or missing public access
      let proxiedViaR2 = false;
      if (r2Client && process.env.R2_BUCKET_NAME) {
        const publicDomain = process.env.R2_PUBLIC_DOMAIN ? process.env.R2_PUBLIC_DOMAIN.replace(/^https?:\/\//, "") : "";
        
        if (
          decodedUrl.includes("r2.dev") || 
          decodedUrl.includes("pub-") || 
          decodedUrl.includes("r2.cloudflarestorage.com") ||
          (publicDomain && decodedUrl.includes(publicDomain))
        ) {
          try {
            const parsedUrl = new URL(decodedUrl);
            const key = parsedUrl.pathname.replace(/^\//, '');
            console.log(`Intercepting R2 URL, fetching via SDK: bucket=${process.env.R2_BUCKET_NAME}, key=${key}`);
            
            const command = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: key,
            });
            
            const s3Response = await r2Client.send(command);
            
            if (s3Response.ContentType) res.setHeader('Content-Type', s3Response.ContentType);
            if (s3Response.ContentLength) res.setHeader('Content-Length', s3Response.ContentLength.toString());
            
            // @ts-ignore
            s3Response.Body.pipe(res);
            proxiedViaR2 = true;
          } catch (r2Error) {
            console.warn("Failed to fetch from R2 SDK, falling back to HTTP proxy...", r2Error);
          }
        }
      }
      
      if (proxiedViaR2) return;


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
app.get("/api/check-r2", async (req, res) => {
  res.json({
    initialized: !!r2Client,
    bucket: !!process.env.R2_BUCKET_NAME,
    domain: !!process.env.R2_PUBLIC_DOMAIN,
    endpoint: !!process.env.R2_ENDPOINT,
    publicDomain: process.env.R2_PUBLIC_DOMAIN
  });
});

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

// New endpoint to handle manual uploads directly to R2
app.post("/api/upload-to-r2", upload.array("files"), async (req: any, res: any) => {
  if (!r2Client) {
    const missing = [];
    if (!process.env.R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
    if (!process.env.R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
    if (!process.env.R2_ENDPOINT) missing.push("R2_ENDPOINT");
    
    return res.status(500).json({ 
      error: "Cloudflare R2 sozlanmagan. Iltimos, Secret sozlamalarini tekshiring.",
      details: `Missing: ${missing.join(", ")}`
    });
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "Fayllar tanlanmagan" });
  }

  const results = [];

  try {
    for (const file of files) {
      console.log(`Processing file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
      const isVideo = file.mimetype.startsWith("video/");
      const isImage = file.mimetype.startsWith("image/");
      const extension = isVideo ? "mp4" : "webp"; // Normalize to webp for images
      let contentType = isVideo ? "video/mp4" : "image/webp";
      const key = `manual/${crypto.randomBytes(8).toString("hex")}_${Date.now()}.${extension}`;
      
      let finalPath = file.path;
      const optimizedPath = path.join(os.tmpdir(), `opt-${path.basename(file.path)}.${extension}`);

      try {
        if (isVideo) {
          console.log(`Starting video compression for: ${file.originalname}`);
          await new Promise<void>((resolve, reject) => {
            ffmpeg(file.path)
              .outputOptions([
                "-vcodec libx264",
                "-crf 24", // Good balance of size and quality
                "-preset faster",
                "-acodec aac",
                "-movflags +faststart"
              ])
              // Keep original resolution (4K)
              .on("start", (cmd) => console.log("Spawned Ffmpeg with command: " + cmd))
              .on("progress", (progress) => console.log(`Processing: ${progress.percent}% done`))
              .on("end", () => {
                console.log("Video compression finished successfully");
                resolve();
              })
              .on("error", (err, stdout, stderr) => {
                console.error("Video compression error:", err);
                console.error("FFmpeg stderr:", stderr);
                reject(err);
              })
              .save(optimizedPath);
          });
          finalPath = optimizedPath;
          console.log(`Compression finished, final path: ${finalPath}`);
        } else if (isImage) {
          console.log("Optimizing image...");
          await sharp(file.path)
            .webp({ quality: 85 })
            .toFile(optimizedPath);
          finalPath = optimizedPath;
        }
      } catch (optError) {
        console.warn("Optimization failed, using original file:", optError);
        finalPath = file.path;
      }

      if (process.env.R2_BUCKET_NAME) {
        const stats = await fs.promises.stat(finalPath);
        const fileStream = fs.createReadStream(finalPath);
        
        await r2Client.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: fileStream,
          ContentType: contentType,
          ContentLength: stats.size
        }));
        
        let publicUrl = "";
        if (process.env.R2_PUBLIC_DOMAIN) {
          const domain = process.env.R2_PUBLIC_DOMAIN.replace(/^https?:\/\//, "");
          publicUrl = `https://${domain}/${key}`;
        } else {
          const endpoint = process.env.R2_ENDPOINT?.replace(/^https?:\/\//, "");
          publicUrl = `https://${process.env.R2_BUCKET_NAME}.${endpoint}/${key}`;
        }

        results.push({
          url: publicUrl,
          type: isVideo ? "video" : "image"
        });

        // Clean up temp files
        try { if (fs.existsSync(file.path)) await unlink(file.path); } catch (e) {}
        try { if (fs.existsSync(optimizedPath)) await unlink(optimizedPath); } catch (e) {}
      } else {
        throw new Error("R2_BUCKET_NAME o'rnatilmagan");
      }
    }

    res.json({ urls: results });

  } catch (error: any) {
    console.error("Manual Upload Error:", error);
    // Attempt to cleanup any remaining files
    for (const file of files) {
       try { if (fs.existsSync(file.path)) await unlink(file.path); } catch (e) {}
    }
    res.status(500).json({ error: error.message });
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

    const payload: any = {
      token: token,
      notification: {
        title: title || "Yangi xabar",
        body: body || "Sizga xabar keldi"
      },
      data: {}
    };
    
    // Safely clone and sanitize 'data' to prevent circular structure errors
    if (data && typeof data === 'object') {
       try {
         payload.data = JSON.parse(JSON.stringify(data, (key, value) => {
           // Simple circular structure detector
           if (typeof value === 'object' && value !== null) {
              if (key === 'src' || key === 'i') return '[Circular]'; // Basic heuristic based on error message
           }
           return value;
         }));
       } catch (e) {
         console.warn("Failed to sanitize push data, sending empty data:", e);
         payload.data = {};
       }
    } else {
        payload.data = data || {};
    }

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
async function startServer() {
  await setupVite();
  
  const PORT = process.env.PORT || 3000;
  const server = app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] Server is running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Set timeout to 10 minutes to handle large video uploads and compression
  server.timeout = 600000;
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
