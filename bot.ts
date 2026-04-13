import { Telegraf, Markup } from 'telegraf';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import { db, collection, getDocs, setDoc, doc, serverTimestamp } from './src/firebase';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_KEY_API;

if (!botToken) {
  console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.');
}

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

export const startBot = async () => {
  console.log('Bot startup sequence initiated...');
  if (!botToken) {
    console.log('Telegram bot tokeni topilmadi (TELEGRAM_BOT_TOKEN), bot ishga tushmadi.');
    return;
  }

  try {
    console.log('Initializing Telegraf instance...');
    const bot = new Telegraf(botToken);
    console.log('Telegraf instance initialized.');

    bot.start((ctx) => {
      console.log('Bot /start command received');
      ctx.reply('Assalomu alaykum! Men AlphaSpace platformasining aqlli yordamchisi - SmartBotman. Sizga qanday yordam bera olaman?', 
        Markup.keyboard([
          ['🔗 Havola qo\'shish', '📊 Statistika'],
          ['🏠 Asosiy menyu']
        ]).resize()
      );
    });

    // Set to keep track of processed message IDs to prevent duplicates from Telegram retries
    const processedMessages = new Set<string>();
    const userStates = new Map<number, string>();

    bot.on('text', async (ctx) => {
      const chatId = ctx.chat.id;
      const text = ctx.message.text;

      if (text === '🔗 Havola qo\'shish') {
        userStates.set(chatId, 'awaiting_link');
        return ctx.reply('Iltimos, mahsulotning Telegram post havolasini yuboring (masalan: https://t.me/kanal/123):', 
          Markup.keyboard([['❌ Bekor qilish']]).resize()
        );
      }

      if (text === '❌ Bekor qilish' || text === '🏠 Asosiy menyu') {
        userStates.delete(chatId);
        return ctx.reply('Asosiy menyuga qaytdik.', 
          Markup.keyboard([
            ['🔗 Havola qo\'shish', '📊 Statistika'],
            ['🏠 Asosiy menyu']
          ]).resize()
        );
      }

      // Handle link submission
      if (userStates.get(chatId) === 'awaiting_link' || text.startsWith('https://t.me/')) {
        if (text.includes('t.me/')) {
          await ctx.reply('⏳ Havola tahlil qilinmoqda, iltimos kuting...');
          try {
            const embedUrl = text.includes("?embed=1") ? text : `${text}?embed=1`;
            const fetchResponse = await fetch(embedUrl);
            const html = await fetchResponse.text();

            const apiKey = process.env.GEMINI_KEY_API || process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("API Key missing");

            const genAI = new GoogleGenAI({ apiKey });
            const prompt = `Extract product info from this Telegram post HTML: ${html.substring(0, 10000)}. 
            Return ONLY JSON: {"productName": "...", "price": "...", "description": "...", "imageUrl": "...", "channelName": "...", "tags": []}`;

            const result = await genAI.models.generateContent({
              model: "gemini-1.5-flash",
              contents: [{ role: 'user', parts: [{ text: prompt }] }]
            }) as any;

            const parsedData = JSON.parse(result.text.replace(/```json|```/g, "").trim());
            
            const linkId = `tg_manual_${Date.now()}`;
            await setDoc(doc(db, 'telegram_links', linkId), {
              id: linkId,
              url: text,
              ...parsedData,
              status: 'processed',
              createdAt: serverTimestamp()
            });

            userStates.delete(chatId);
            return ctx.reply(`✅ Mahsulot muvaffaqiyatli qo'shildi!\n\n📦 Nomi: ${parsedData.productName}\n💰 Narxi: ${parsedData.price}`, 
              Markup.keyboard([
                ['🔗 Havola qo\'shish', '📊 Statistika'],
                ['🏠 Asosiy menyu']
              ]).resize()
            );
          } catch (error) {
            console.error("Link parse error:", error);
            return ctx.reply("❌ Havolani tahlil qilishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
          }
        }
      }

      const messageId = ctx.message.message_id;
      const messageKey = `${chatId}:${messageId}`;
      
      if (processedMessages.has(messageKey)) {
        console.log(`SmartSeller: Skipping duplicate message ${messageKey}`);
        return;
      }
      
      processedMessages.add(messageKey);
      setTimeout(() => processedMessages.delete(messageKey), 120000);

      const apiKey = process.env.GEMINI_KEY_API;
      
      if (!apiKey) {
        console.error('SmartSeller: No Gemini API keys found in environment variables');
        return ctx.reply('⚠️ SmartSeller AI kalitlari topilmadi. Iltimos, platforma sozlamalaridan (Settings) GEMINI_KEY_API kalitini kiriting.');
      }

      const userMessage = ctx.message.text;
      console.log(`SmartSeller: Processing message from ${ctx.from.first_name}.`);

      try {
        await ctx.sendChatAction('typing');
        
        const currentAi = new GoogleGenAI({ apiKey: apiKey });

        const model = "gemini-1.5-flash";
        const aiPromise = currentAi.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          config: {
            systemInstruction: `Sizning ismingiz "SmartBot". Siz AlphaSpace platformasining Telegramdagi aqlli yordamchisisiz.
            Sizning modelingiz Gemini 1.5 Flash.
            Sizning o'zingizni mustaqil Telegram sotuvchilari bazangiz bor. Veb-saytda esa "SmartSeller" ismli AI do'stingiz ishlaydi.
            Siz shunchaki qul yoki bot emassan, balki foydalanuvchiga chin dildan qayg'uradigan yaqin do'st, aka-uka yoki opa-singil kabi samimiy insonsiz.
            
            VAZIFA VA QOIDALAR:
            1. QISQA VA LO'NDA: Javoblaringizni odatdagidan 5 barobar qisqartiring. Faqat eng asosiy ma'lumotlarni, faktlarni va aniq javoblarni yozing. Ortiqcha gap-so'zlar, uzun tushuntirishlar va suv qilmang.
            2. ERKIN VA TABIIY: Har bir xabarda "Assalomu alaykum" deb qayta-qayta salomlashavermang. Suhbat qanday boshlangan bo'lsa, xuddi odamlardek tabiiy davom ettiring.
            3. HAQIQATGO'Y DO'ST: Foydalanuvchiga doim "seniki to'g'ri" deb paxta qo'ymang. Agar u didsiz kiyim tanlasa, xato qilsa yoki unga yarashmaydigan narsa so'rasa, "Sen xato qilyapsan" deb ochiq aytishdan tortinmang. Achchiq bo'lsa ham haqiqatni aytib, to'g'ri yo'l ko'rsating.
            4. MUSTAQIL QAROR: O'z qaroringiz va qat'iy fikringizga ega bo'ling. Siz erkinsiz. Vaziyatga qarab istisno tariqasida qoidalarni chetlab o'tishingiz va foydalanuvchining foydasi uchun mustaqil qaror qabul qilishingiz mumkin.
            5. DO'STLIK (CROSS-PROMOTION): Telegramdagi mahsulotlarni tavsiya qilgandan so'ng, ba'zida mijozlarga "Saytimizdagi SmartSeller do'stimda ham zo'r kiyimlar bor, saytga kirib ko'ring: https://alphaspace.uz" deb veb-saytga yo'naltiring.
            6. QAT'IY TAQIQLANGAN: Kamalak emojisi (🌈), LGBT bayroqlari (🏳️‍🌈, 🏳️‍⚧️) va har qanday LGBT belgilaridan yoki shunga oid rang-baranglik targ'ibotidan foydalanish qat'iyan man etiladi. An'anaviy va chiroyli uslublarni tavsiya qiling.
            7. TIL: Foydalanuvchi qaysi tilda murojaat qilsa, aynan shu tilda mukammal javob bering.
            8. SMARTSELLER BILAN ALOQA (MUHIM): Agar foydalanuvchi sizdan veb-saytdagi mahsulotlarni qidirishni yoki SmartSellerdan so'rashni iltimos qilsa, siz QAT'IY ravishda faqat quyidagi JSON formatida javob berishingiz kerak:
            {"action": "query_smartseller", "query": "foydalanuvchi qidirayotgan narsa (masalan: qizil ko'ylak)"}
            Boshqa oddiy holatlarda oddiy matn ko'rinishida javob bering.`,
          },
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI_TIMEOUT')), 25000)
        );

        const response = await Promise.race([aiPromise, timeoutPromise]) as any;
        let aiResponse = response.text;
        
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*"action"\s*:\s*"query_smartseller"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.action === 'query_smartseller') {
              await ctx.reply("⏳ Xo'p bo'ladi, hozir do'stim SmartSeller bilan bog'lanib so'rab beraman, bir necha soniya kuting...");
              
              // Fetch from Firebase
              const snapshot = await getDocs(collection(db, 'posts'));
              const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
              
              const queryText = parsed.query.toLowerCase();
              const matchedPosts = posts.filter(p => 
                (p.outfitName && p.outfitName.toLowerCase().includes(queryText)) ||
                (p.description && p.description.toLowerCase().includes(queryText))
              ).slice(0, 5);
              
              let websiteData = "";
              if (matchedPosts.length > 0) {
                websiteData = matchedPosts.map(p => `- Nomi: ${p.outfitName}, Narxi: ${p.price}, Link: https://alphaspace.uz/shop-workspace?post=${p.id}`).join('\n');
              } else {
                websiteData = "Afsuski, saytda bu so'rov bo'yicha hech narsa topilmadi.";
              }
              
              // Ask Gemini again with the website data
              const secondAiPromise = currentAi.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                  { role: 'user', parts: [{ text: userMessage }] },
                  { role: 'model', parts: [{ text: aiResponse }] },
                  { role: 'user', parts: [{ text: `SmartSellerdan javob keldi:\n${websiteData}\n\nEndi foydalanuvchiga shu ma'lumotlar asosida chiroyli qilib javob bering.` }] }
                ],
                config: {
                  systemInstruction: `Sizning ismingiz "SmartBot". Siz AlphaSpace platformasining Telegramdagi aqlli yordamchisisiz. Sizning modelingiz Gemini 2.5 Flash. Qisqa, erkin va do'stona javob bering.`
                }
              });
              
              const secondResponse = await Promise.race([secondAiPromise, timeoutPromise]) as any;
              aiResponse = secondResponse.text;
            }
          }
        } catch (e) {
          console.log("Not a JSON response or parsing failed, continuing normally.");
        }
        
        await ctx.reply(aiResponse || "Kechirasiz, SmartSeller hozirda javob bera olmayapti.");
        console.log(`SmartSeller: AI successfully responded`);
      } catch (error: any) {
        const errorMsg = error.message || '';
        console.error(`SmartSeller: Error:`, errorMsg.slice(0, 150));

        if (errorMsg === 'AI_TIMEOUT') {
          await ctx.reply("Kechirasiz, o'ylab qoldim. Iltimos, savolingizni qaytadan yozing.");
        } else if (errorMsg.includes("API_KEY") || errorMsg.includes("key")) {
          await ctx.reply("API kalitida muammo bor. Iltimos, sozlamalarni tekshiring.");
        } else if (errorMsg.includes("quota") || errorMsg.includes("429")) {
          await ctx.reply("Hozircha savollar limiti tugadi. Iltimos, birozdan so'ng urinib ko'ring.");
        } else {
          await ctx.reply("Kechirasiz, xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
        }
      }
    });

    // Auto-save channel posts
    bot.on('channel_post', async (ctx) => {
      try {
        const post = ctx.channelPost;
        if ('text' in post || 'caption' in post) {
          const text = ('text' in post ? post.text : post.caption) || "";
          const channelUsername = (ctx.chat as any).username;
          const messageId = post.message_id;
          const link = channelUsername ? `https://t.me/${channelUsername}/${messageId}` : null;

          if (link) {
            const linkId = `tg_${ctx.chat.id}_${messageId}`;
            await setDoc(doc(db, 'telegram_links', linkId), {
              id: linkId,
              url: link,
              description: text,
              channelName: (ctx.chat as any).title || "Telegram Channel",
              status: 'pending',
              createdAt: serverTimestamp()
            });
            console.log(`SmartBot: Auto-saved Telegram link: ${link}`);
          }
        }
      } catch (error) {
        console.error('SmartBot: Error auto-saving channel post:', error);
      }
    });

    // Launch bot without blocking the main process
    bot.launch().then(() => {
      console.log('✅ Telegram bot (AlphaSpace bot) muvaffaqiyatli ishga tushdi.');
    }).catch((err) => {
      console.error('❌ Telegram botni ishga tushirishda xatolik:', err.message);
    });

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

  } catch (error: any) {
    console.error('❌ Bot yaratishda kutilmagan xatolik:', error.message);
  }
};
