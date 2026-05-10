
export async function analyzeProductImage(imageUrl: string) {
  try {
    const prompt = `
      Ushbu mahsulot rasmini tahlil qil va quyidagi JSON formatida batafsil ma'lumot ber:
      {
        "color": "asosiy rang",
        "category": "kategoriya (masalan: ko'ylak, shim, poyabzal, aksessuar)",
        "style": "stil (masalan: klassik, sport, casual)",
        "description": "qisqa va aniq tavsif",
        "tags": ["tag1", "tag2"],
        "season": "qaysi fasl uchun mos (masalan: yoz, qish, bahor, kuz)",
        "purpose": "nima uchun mo'ljallangan (masalan: to'y, ofis, sport, kundalik)",
        "targetAudience": "kimlar uchun (masalan: erkaklar, ayollar, bolalar, yoshlar)"
      }
      Faqat JSON qaytar.
    `;

    const model = 'gemini-3-flash-preview';
    
    // We need to pass the image data as inlineData in the SDK
    const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;

    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server Error: ${res.status}`);
    }

    const result = await res.json();

    const text = result.text;
    const jsonMatch = text?.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("AI Analysis error:", error);
    return null;
  }
}
