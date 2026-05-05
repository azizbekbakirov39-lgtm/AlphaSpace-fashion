import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";
import fs from "fs";
import { promisify } from "util";
import os from "os";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import sharp from "sharp";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "alpha-space-secret-key-2024";

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

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

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

// R2-backed Database Helpers
const dbGet = async (collection: string, id: string) => {
  if (!r2Client || !process.env.R2_BUCKET_NAME) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `db/${collection}/${id}.json`,
    });
    const response = await r2Client.send(command);
    const bodyContents = await response.Body.transformToString();
    return JSON.parse(bodyContents);
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
};

const dbSet = async (collection: string, id: string, data: any) => {
  if (!r2Client || !process.env.R2_BUCKET_NAME) return;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: `db/${collection}/${id}.json`,
    Body: JSON.stringify(data),
    ContentType: "application/json",
  });
  await r2Client.send(command);
};

const dbList = async (collection: string) => {
  if (!r2Client || !process.env.R2_BUCKET_NAME) return [];
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: `db/${collection}/`,
    });
    
    const response = await r2Client.send(command);
    if (!response.Contents || response.Contents.length === 0) return [];
    
    // Fetch all files in parallel
    const promises = response.Contents.map(async (obj: any) => {
      // Skip "folder" markers (keys ending in /)
      if (obj.Key.endsWith('/')) return null;
      
      try {
        const getCmd = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: obj.Key,
        });
        const getRes = await r2Client.send(getCmd);
        const body = await getRes.Body.transformToString();
        return JSON.parse(body);
      } catch (e: any) {
        if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null;
        console.error(`Error fetching document ${obj.Key}:`, e.message);
        return null;
      }
    });
    
    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return [];
    }
    console.error(`Error listing collection ${collection}:`, err);
    return [];
  }
};

const dbDelete = async (collection: string, id: string) => {
  if (!r2Client) return;
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: `db/${collection}/${id}.json`,
  });
  await r2Client.send(command);
};

const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

// Auth Endpoints
app.post("/api/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const existingUser = await dbGet("users", email.toLowerCase());
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const newUser = {
      uid: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName: displayName || email.split('@')[0],
      createdAt: new Date().toISOString(),
      role: "user"
    };

    await dbSet("users", email.toLowerCase(), newUser);
    // Also index by UID
    await dbSet("users-by-uid", userId, { email: email.toLowerCase() });

    const token = jwt.sign({ uid: userId, email: email.toLowerCase() }, JWT_SECRET);
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ user: userWithoutPassword, token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await dbGet("users", email.toLowerCase());
    if (!user) return res.status(400).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
  try {
    const userRef = await dbGet("users-by-uid", req.user.uid);
    if (!userRef) return res.status(404).json({ error: "User not found" });
    const user = await dbGet("users", userRef.email);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Database Endpoints
app.get("/api/db/:collection", async (req, res) => {
  try {
    const data = await dbList(req.params.collection);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/db/:collection/:id", async (req, res) => {
  try {
    const data = await dbGet(req.params.collection, req.params.id);
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/db/:collection/:id", async (req, res) => {
  try {
    await dbSet(req.params.collection, req.params.id, req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/db/:collection/:id", async (req, res) => {
  try {
    await dbDelete(req.params.collection, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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

// New endpoint to handle manual uploads directly to R2
app.post("/api/upload-to-r2", upload.array("files"), async (req: any, res: any) => {
  console.log("POST /api/upload-to-r2 hit");
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
      let finalPath = file.path;
      let contentType = isVideo ? "video/mp4" : file.mimetype; // Keep original mimetype for images if possible
      const extension = file.originalname.split('.').pop() || (isVideo ? "mp4" : "jpg");
      const key = `manual/${crypto.randomBytes(8).toString("hex")}_${Date.now()}.${extension}`;

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
