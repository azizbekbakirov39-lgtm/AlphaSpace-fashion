import { toast } from 'sonner';

// Brauzer bildirishnomalari uchun ruxsat so'rash
export const requestNotificationPermission = () => {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(console.error);
  }
};

// Bildirishnoma shiqillagan ovozi
export const playNotificationSound = () => {
  try {
    // Elegant yengil "pop" yoki "ding" ovozi
    const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=message-incoming-132126.mp3');
    audio.volume = 0.5;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay tixirligi bo'lishi mumkin
      });
    }
  } catch (e) {
    console.warn("Sound play error", e);
  }
};

// Orqa fon (Push) xabarlar yuborish uchun funksiya
export const sendPushNotification = async (targetToken: String, title: string, body: string, data?: any) => {
  try {
    await fetch('/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: targetToken,
        title,
        body,
        data
      })
    });
  } catch (e) {
    console.error("Push jo'natish xatosi", e);
  }
};

// Umumiy bildirishnoma ko'rsatish funksiyasi
export const showChatNotification = (title: string, body: string) => {
  // 1. Ilova ichida chiroyli toast
  if (!document.hidden) {
    toast(body, {
      icon: '📩',
      duration: 5000,
      position: 'top-center',
      style: {
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        color: '#000',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        fontWeight: 'bold',
        border: '1px solid rgba(0,149,255,0.2)'
      },
    });
  }

  // 2. Ovoz
  playNotificationSound();

  // 3. Desktop/Telefon operatsion tizimining standart bildirishnomasi (Tepadan tushadigan panelda)
  if ("Notification" in window && Notification.permission === "granted") {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/favicon.ico', // Ilova ikonkasi
          badge: '/favicon.ico',
          tag: 'chat-message', // Bitta joyga yig'ish
        });
      }).catch(err => {
        new Notification(title, { body, icon: '/favicon.ico' });
      });
    } else {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }
};
