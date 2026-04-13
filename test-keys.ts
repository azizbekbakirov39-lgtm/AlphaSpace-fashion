import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  const keys = [
    process.env.GEMINI_KEY_API,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_KEY_3
  ];
  
  console.log("Keys found:", keys.map(k => k ? k.substring(0, 5) + "..." : "null"));
  
  for (let i = 0; i < keys.length; i++) {
    if (!keys[i]) continue;
    try {
      const ai = new GoogleGenAI({ apiKey: keys[i] });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: "hi" }] }]
      });
      console.log(`Key ${i+1} SUCCESS:`, response.text.substring(0, 20));
    } catch (e: any) {
      console.log(`Key ${i+1} FAILED:`, e.message);
    }
  }
}
test();
