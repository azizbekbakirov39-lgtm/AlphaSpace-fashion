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

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  }
});

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
  const tempFiles: string[] = [];

  try {
    for (const file of files) {
      console.log(`Processing file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
      const isVideo = file.mimetype.startsWith("video/");
      const extension = file.originalname.split(".").pop() || (isVideo ? "mp4" : "jpg");
      let finalBuffer = file.buffer;
      let contentType = file.mimetype;
      const key = `manual/${crypto.randomBytes(8).toString("hex")}_${Date.now()}.${extension}`;

      if (isVideo) {
        contentType = "video/mp4";
      }

      if (process.env.R2_BUCKET_NAME) {
        await r2Client.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: finalBuffer,
          ContentType: contentType,
        }));
        
        let publicUrl = "";
        if (process.env.R2_PUBLIC_DOMAIN) {
          const domain = process.env.R2_PUBLIC_DOMAIN.replace(/^https?:\/\//, "");
          publicUrl = `https://${domain}/${key}`;
        } else {
          // Fallback to endpoint-based URL if no public domain
          const endpoint = process.env.R2_ENDPOINT?.replace(/^https?:\/\//, "");
          publicUrl = `https://${process.env.R2_BUCKET_NAME}.${endpoint}/${key}`;
        }

        results.push({
          url: publicUrl,
          type: isVideo ? "video" : "image"
        });
      } else {
        throw new Error("R2_BUCKET_NAME o'rnatilmagan");
      }
    }

    // Cleanup temp files
    for (const f of tempFiles) {
      try { await unlink(f); } catch (e) {}
    }

    res.json({ urls: results });

  } catch (error: any) {
    console.error("Manual Upload Error:", error);
    // Cleanup temp files on error
    for (const f of tempFiles) {
      try { await unlink(f); } catch (e) {}
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
async function startServer() {
  await setupVite();
  
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] Server is running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
