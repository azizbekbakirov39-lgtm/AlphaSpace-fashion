# Mobile App Build (Smart Seller)

Sizning web-ilovangiz Capacitor orqali Android ilovaga tayyorlandi.

## APK fayl chiqarish uchun qadamlar:

1. **Loyihani yuklab oling:** 
   - AI Studio menyusidan **"Export to ZIP"** tugmasini bosing.
   - ZIP-ni o'z kompyuteringizda oching.

2. **Dasturlarni o'rnating:**
   - Kompyuteringizda [Node.js](https://nodejs.org/) o'rnatilgan bo'lishi kerak.
   - [Android Studio](https://developer.android.com/studio)ni o'rnating.

3. **Kompyuterda terminalni ochib quyidagilarni yozing:**
   ```bash
   npm install
   npm run build
   npx cap sync
   ```

4. **Android Studio-da oching:**
   ```bash
   npx cap open android
   ```
   *Bu Android Studio-ni avtomatik ochadi.*

5. **Build APK:**
   - Android Studio-da: **Build > Build Bundle(s) / APK(s) > Build APK(s)** ni bosing.
   - Tayyor bo'lgach, ekranda "Locate" degan yozuv chiqadi, o'sha yerda sizning `.apk` faylingiz bo'ladi.

## Galaxy Store uchun muhim:
Samsung Galaxy Store uchun sizga "Release Key" kerak bo'ladi (Android Studio ichida **Generate Signed Bundle/APK** orqali yaratiladi).

Siz hozir ZIP-ni yuklab olib, Android Studio-da ochsangiz kifoya!
