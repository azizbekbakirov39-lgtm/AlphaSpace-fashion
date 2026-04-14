import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { startBot } from "./bot";
import admin from "firebase-admin";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    admin.initializeApp();
    console.log("Firebase Admin initialized with default credentials");
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_4eC39HqLyjWDarjtT1zdp7dc");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Request Logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes - MOVED TO TOP FOR PRIORITY
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/auth/telegram", (req, res) => {
    res.send("Telegram Auth API is alive and ready.");
  });

  app.post("/api/auth/telegram", async (req, res) => {
    console.log("Telegram Auth POST request received");
    try {
      const { hash, ...data } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        console.error("CRITICAL: TELEGRAM_BOT_TOKEN is missing in environment");
        return res.status(500).json({ 
          error: "TELEGRAM_BOT_TOKEN topilmadi. Iltimos, Settings -> Secrets bo'limidan ushbu kalitni qo'shing." 
        });
      }

      if (!hash) {
        return res.status(400).json({ error: "Telegram hash topilmadi" });
      }

      // 1. Verify Telegram hash
      const secretKey = crypto.createHash('sha256').update(botToken).digest();
      
      const dataCheckArr = [];
      for (const key in data) {
        dataCheckArr.push(`${key}=${data[key]}`);
      }
      const dataCheckString = dataCheckArr.sort().join('\n');
      
      const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (hmac !== hash) {
        console.error("Telegram Hash Mismatch!");
        return res.status(401).json({ error: "Xavfsizlik tekshiruvi muvaffaqiyatsiz (Hash mismatch). Bot tokeni to'g'riligini tekshiring." });
      }

      // 2. Check auth_date
      const authDate = parseInt(data.auth_date);
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > 86400) {
        return res.status(401).json({ error: "Sessiya muddati o'tgan (Auth date too old)" });
      }

      // 3. Email-proxy method
      const telegramId = String(data.id);
      const userEmail = `tg_${telegramId}@alphaspace.uz`;
      
      const userPassword = crypto.createHmac('sha256', botToken)
        .update(telegramId)
        .digest('hex')
        .substring(0, 20);

      res.json({ 
        email: userEmail, 
        password: userPassword,
        user: data 
      });
    } catch (error: any) {
      console.error("Global Telegram Auth Route Error:", error);
      res.status(500).json({ error: `Kutilmagan xatolik: ${error.message || "Noma'lum"}` });
    }
  });

  // FFmpeg.wasm requires these headers for SharedArrayBuffer support
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });

  // Fetch HTML for Telegram Link Parsing (Proxy to avoid CORS)
  app.post("/api/fetch-telegram-html", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || !url.includes("t.me/")) {
        return res.status(400).json({ error: "Noto'g'ri Telegram havolasi" });
      }
      const embedUrl = url.includes("?embed=1") ? url : `${url}?embed=1`;
      const fetchResponse = await fetch(embedUrl);
      const html = await fetchResponse.text();
      res.json({ html });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { price, title } = req.body;

      // In a real app, you'd look up the price in your database
      // For demo, we'll use the price passed from frontend (be careful in production!)
      const amount = parseInt(price.replace(/[^0-9]/g, "")) * 100; // Convert to cents/smallest unit

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "uzs",
              product_data: {
                name: title,
                description: "AlphaSpace Premium Xizmati",
              },
              unit_amount: amount || 2000000, // Default if parsing fails
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/shop-workspace?payment=success`,
        cancel_url: `${req.headers.origin}/shop-workspace?payment=cancel`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Start bot with a slight delay to ensure server is fully ready
    setTimeout(() => {
      startBot().catch(err => console.error('Error starting bot:', err));
    }, 1000);
  });
}

startServer();
