import express from "express";
import path from "path";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import crypto from "crypto";

dotenv.config();

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

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

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
  console.log("API Proxy Hit: /api/refresh-instagram-url");
  try {
    const { shortcode, type = 'p' } = req.body;
    console.log("Proxy received shortcode:", shortcode, "type:", type);
    if (!shortcode) return res.status(400).json({ error: "Shortcode required" });
    
    if (!RAPIDAPI_KEY) {
      console.error("RAPIDAPI_KEY missing");
      return res.status(500).json({ error: "API Key missing" });
    }

    const tryFetch = async (targetUrl: string) => {
      console.log(`Attempting RapidAPI fetch for: ${targetUrl}`);
      return fetch(`https://instagram120.p.rapidapi.com/api/instagram/links`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-host': 'instagram120.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY
        },
        body: JSON.stringify({ url: targetUrl })
      });
    };

    // Primary attempt using the original type
    let response = await tryFetch(`https://www.instagram.com/${type}/${shortcode}/`);

    // If "link not found" (response: 4), or 500/404, try fallbacks
    if (!response.ok) {
      const clonedResponse = response.clone();
      const errorText = await clonedResponse.text();
      let errorData = {};
      try { errorData = JSON.parse(errorText); } catch (e) {}

      // response: 4 is a common internal error for "not found" in this API
      if (response.status === 500 || (errorData as any).response === 4 || errorText.includes('not found')) {
        console.log("Primary attempt failed with search error, trying fallback formats...");
        
        // Strategy: if 'p' failed, try 'reel' and vice-versa
        const fallbackType = type === 'reel' ? 'p' : 'reel';
        response = await tryFetch(`https://www.instagram.com/${fallbackType}/${shortcode}/`);
        
        // If still failing, try without trailing slash or different known patterns if we wanted, 
        // but 2 attempts is usually enough to cover the p vs reel issue.
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RapidAPI Final Error:", response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Backend Proxy Error:", error);
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

// Listen only if not on Vercel
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
