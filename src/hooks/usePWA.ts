import { useState, useEffect } from 'react';

// Capture the prompt globally as early as possible
let globalDeferredPrompt: any = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
  });
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(globalDeferredPrompt);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // If it was captured before this component mounted, set it
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }
    // Force open in external browser if inside an in-app browser (like Instagram/Telegram)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isInstagram = userAgent.includes('instagram');
    const isTelegram = userAgent.includes('telegram');
    const isFB = userAgent.includes('fbav') || userAgent.includes('fban');
    const isAndroid = userAgent.includes('android');

    const inApp = isInstagram || isTelegram || isFB;
    setIsInAppBrowser(inApp);

    if (inApp && isAndroid) {
      // Try to create an intent URL to force open Chrome on Android
      // Note: Instagram often blocks this, so we also rely on the UI warning
      const currentUrl = window.location.href.replace(/^https?:\/\//, '');
      const intentUrl = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end;`;
      
      // We use a slight delay so the UI can render the warning just in case the intent fails
      setTimeout(() => {
        window.location.href = intentUrl;
      }, 500);
    }

    // Check if already installed
    const isIframe = window.self !== window.top;
    if (!isIframe && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true)) {
      setIsStandalone(true);
    } else {
      setIsStandalone(false);
    }

    // iOS detection
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Android prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (isInAppBrowser) {
      // If we are in an in-app browser, we shouldn't even try to prompt.
      // The UI should handle this state by showing the InAppBrowserGuide.
      alert("Iltimos, yuqoridagi 3 ta nuqtani (⋮) bosib, 'Chrome brauzerida ochish' (Open in Chrome) ni tanlang.");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      alert("Ilovani o'rnatish uchun pastdagi 📤 (Ulashish) tugmasini bosing va 'Bosh ekranga qo'shish' (Add to Home Screen) ni tanlang.");
    } else {
      alert("O'rnatish oynasi avtomatik chiqmadi.\n\nSababi: Siz linkni Telegram yoki Instagram ichida ochgan bo'lishingiz mumkin.\n\nIltimos, yuqoridagi 3 ta nuqtani (⋮) bosib, 'Chrome brauzerida ochish' (Open in Chrome) ni tanlang va u yerdan yuklab oling.");
    }
  };

  return { installApp, isIOS, isStandalone, isInAppBrowser, canInstall: !!deferredPrompt || isIOS };
}
