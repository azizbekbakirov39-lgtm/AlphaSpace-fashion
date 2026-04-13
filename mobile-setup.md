# AlphaSpace Mobil Ilova Qo'llanmasi

Ushbu loyiha **Capacitor** yordamida Android va iOS ilovalariga aylantirish uchun tayyorlangan.

## 1. Tayyorgarlik
Kompyuteringizda quyidagilar o'rnatilgan bo'lishi kerak:
- **Node.js** (v18+)
- **Android Studio** (Android ilova uchun)
- **Xcode** (iOS ilova uchun - faqat Mac kompyuterlarda)

## 2. Loyihani yuklab olish va o'rnatish
1. Loyihani ZIP holatida yuklab oling va oching.
2. Terminalda loyiha papkasiga kiring:
   ```bash
   npm install
   ```

## 3. Ilovani qurish (Build)
Veb-kodni mobil ilova uchun tayyorlash:
```bash
npm run build
npm run cap:sync
```

## 4. Platformalarni qo'shish (Faqat bir marta)
Android va iOS papkalarini yaratish:
```bash
npm run cap:add:android
npm run cap:add:ios
```

## 5. Ilovani ochish va ishga tushirish
Ilovani Android Studio yoki Xcode'da ochish:
```bash
npm run cap:open:android
npm run cap:open:ios
```

## 6. Avtomatik Yangilanish (Live Updates)
Ilovani do'konlarga yuklagandan so'ng, kodingizni avtomatik yangilash (OTA) uchun **Ionic Appflow** yoki shunga o'xshash xizmatlardan foydalanishingiz mumkin. 

Hozirgi sozlamalar bilan siz saytda o'zgarish qilib, `npm run build` va `npm run cap:sync` buyruqlarini bajarsangiz, ilovangiz yangi kodni qabul qiladi.
