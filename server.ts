import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { startBot } from "./bot";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_4eC39HqLyjWDarjtT1zdp7dc");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // FFmpeg.wasm requires these headers for SharedArrayBuffer support
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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

  // Parse Telegram Link using Gemini
  app.post("/api/parse-telegram", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || !url.includes("t.me/")) {
        return res.status(400).json({ error: "Noto'g'ri Telegram havolasi" });
      }

      // Fetch embed content to get text/media
      const embedUrl = url.includes("?embed=1") ? url : `${url}?embed=1`;
      const fetchResponse = await fetch(embedUrl);
      const html = await fetchResponse.text();

      const apiKey = process.env.GEMINI_KEY_API || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key topilmadi" });
      }

      const genAI = new GoogleGenAI({ apiKey: apiKey });
      
      const prompt = `Extract product information from this Telegram post HTML:
      ${html.substring(0, 15000)}
      
      Return ONLY a JSON object with these fields:
      {
        "productName": "string",
        "price": "string",
        "description": "string",
        "imageUrl": "string (find the media URL in the HTML, usually in og:image or similar)",
        "channelName": "string",
        "tags": ["string"]
      }
      If no product is found, return an empty object or best guess.`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }) as any;

      const text = result.text.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Parse Error:", error);
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
