import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || '' });

export async function analyzeProductImage(imageUrl: string) {
  try {
    const prompt = `
      Ushbu mahsulot rasmini tahlil qil va quyidagi JSON formatida ma'lumot ber:
      {
        "color": "asosiy rang",
        "category": "kategoriya",
        "style": "stil",
        "description": "qisqa tavsif",
        "tags": ["tag1", "tag2"]
      }
      Faqat JSON qaytar.
    `;

    const model = 'gemini-1.5-flash';
    
    const result = await ai.models.generateContent({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              fileData: {
                mimeType: "image/jpeg",
                fileUri: imageUrl
              }
            }
          ]
        }
      ]
    });

    const text = result.text;
    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("AI Analysis error:", error);
    return null;
  }
}
