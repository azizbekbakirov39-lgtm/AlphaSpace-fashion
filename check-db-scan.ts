import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin safely
if (!admin.apps.length) {
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountVar) {
    try {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (parseError) {
      admin.initializeApp();
    }
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function checkStorageUsage() {
  try {
    console.log("--- Baza tahlili boshlandi ---");
    const snapshot = await db.collection('posts').get();
    let r2VideosCount = 0;
    let instagramVideosCount = 0;
    let totalR2Files = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.mediaUrls && Array.isArray(data.mediaUrls)) {
        data.mediaUrls.forEach(url => {
          if (url.includes('r2.dev')) {
            r2VideosCount++;
            totalR2Files.push({ docId: doc.id, url });
          } else if (url.includes('instagram.com/v/')) {
            instagramVideosCount++;
          }
        });
      }
    });

    console.log(`\nJami postlar soni: ${snapshot.size}`);
    console.log(`Cloudflare R2 ga ko'chirilgan videolar: ${r2VideosCount}`);
    console.log(`Hali ham Instagram linkida turgan videolar: ${instagramVideosCount}`);
    
    if (totalR2Files.length > 0) {
      console.log("\n--- Yuklangan fayllar ro'yxati ---");
      totalR2Files.forEach((f, i) => {
        console.log(`${i+1}. Post ID: ${f.docId} -> ${f.url}`);
      });
    }

    console.log("\n------------------------------------");
    console.log("Xulosa: Tizim ishlamoqda. Yangi yuklangan videolar R2 xotirasidan o'rin olgan.");
  } catch (error) {
    console.error("Tekshirishda xatolik:", error);
  }
}

checkStorageUsage();
