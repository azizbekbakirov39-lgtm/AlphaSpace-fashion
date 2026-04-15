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
import nodemailer from "nodemailer";

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
    try {
      const { hash, ...data } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN topilmadi" });
      }

      // Verify Telegram hash
      const secretKey = crypto.createHash('sha256').update(botToken).digest();
      const dataCheckArr = [];
      for (const key in data) {
        dataCheckArr.push(`${key}=${data[key]}`);
      }
      const dataCheckString = dataCheckArr.sort().join('\n');
      const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (hmac !== hash) {
        return res.status(401).json({ error: "Xavfsizlik tekshiruvi muvaffaqiyatsiz" });
      }

      // Email-proxy method
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
      res.status(500).json({ error: error.message });
    }
  });

  // --- Email OTP Authentication ---
  
  // Temporary in-memory storage for OTPs if Firestore fails
  const tempOtpStore = new Map<string, { otp: string, expiresAt: number }>();

  // Configure Nodemailer
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Send OTP
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: "Noto'g'ri email manzil" });
    }

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store in memory as fallback
      tempOtpStore.set(email, { otp, expiresAt });

      // Try to store in Firestore if admin is ready
      try {
        await admin.firestore().collection('otps').doc(email).set({
          otp,
          expiresAt,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (fsError) {
        console.warn("Firestore OTP storage failed, using memory fallback:", fsError);
      }

      // Send Email (only if credentials are set)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"AlphaSpace" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "AlphaSpace - Kirish kodi",
          text: `Sizning kirish kodingiz: ${otp}. Ushbu kod 10 daqiqa davomida amal qiladi.`,
          html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">AlphaSpace</h2>
            <p>Sizning kirish kodingiz:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; padding: 10px 0;">${otp}</div>
            <p style="color: #64748b; font-size: 14px;">Ushbu kod 10 daqiqa davomida amal qiladi. Agar buni siz so'ramagan bo'lsangiz, ushbu xatga e'tibor bermang.</p>
          </div>`
        });
        res.json({ success: true, message: "Kod emailingizga yuborildi" });
      } else {
        // For development/demo purposes if no email service is configured
        console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
        res.json({ 
          success: true, 
          message: "Kod yuborildi (Dev mode: konsolda ko'ring)",
          devOtp: otp // Only for demo when no email is set
        });
      }
    } catch (error: any) {
      console.error("Send OTP Error:", error);
      res.status(500).json({ error: "Kod yuborishda xatolik yuz berdi" });
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email va kod talab qilinadi" });
    }

    try {
      let data: any = null;
      
      // Try Firestore first
      try {
        const otpDoc = await admin.firestore().collection('otps').doc(email).get();
        if (otpDoc.exists) {
          data = otpDoc.data();
        }
      } catch (fsError) {
        console.warn("Firestore OTP retrieval failed, checking memory:", fsError);
      }

      // Check memory fallback if not found in Firestore
      if (!data) {
        data = tempOtpStore.get(email);
      }

      if (!data) {
        return res.status(400).json({ error: "Kod topilmadi yoki muddati o'tgan" });
      }

      if (data.otp !== otp || Date.now() > data.expiresAt) {
        return res.status(400).json({ error: "Noto'g'ri yoki muddati o'tgan kod" });
      }

      // OTP is valid, delete it
      try {
        await admin.firestore().collection('otps').doc(email).delete();
      } catch (e) {}
      tempOtpStore.delete(email);

      // Generate credentials for the user
      const botToken = process.env.TELEGRAM_BOT_TOKEN || "default_secret";
      const userPassword = crypto.createHmac('sha256', botToken)
        .update(email)
        .digest('hex')
        .substring(0, 20);

      res.json({ 
        email: email, 
        password: userPassword,
        success: true
      });
    } catch (error: any) {
      console.error("Verify OTP Error:", error);
      res.status(500).json({ error: "Kodni tekshirishda xatolik" });
    }
  });

  // --- End Email OTP ---

  // FFmpeg.wasm requires these headers for SharedArrayBuffer support
  app.use((req, res, next) => {
    // Do not set these headers for API routes or Telegram auth to avoid blocking external scripts
    if (!req.path.startsWith('/api/')) {
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    }
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
