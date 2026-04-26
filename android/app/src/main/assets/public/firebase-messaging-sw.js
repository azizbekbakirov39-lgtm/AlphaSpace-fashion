importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// `firebase-applet-config.json` dan olingan ma'lumotlar bu yerga yoziladi
const firebaseConfig = {
  projectId: "project-726cf4b3-72df-462e-a9d",
  appId: "1:107528289906:web:ea7fb252c46cb9d11a0ceb",
  apiKey: "AIzaSyCqCMqd-309i3JsryMGmvAm33x3yduUTmc",
  authDomain: "project-726cf4b3-72df-462e-a9d.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-757d0264-3864-4251-a106-49e5609c289d",
  storageBucket: "project-726cf4b3-72df-462e-a9d.firebasestorage.app",
  messagingSenderId: "107528289906",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Orqa fonda xabar keldi: ', payload);
  const notificationTitle = payload.notification?.title || 'Yangi xabar';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/pwa-icon-solid-v1.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
