importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC5CVpjLaVQ0iZuZws6QAwI-WYQnau3ELo',
  authDomain: 'atp-suplementos-9c2c0.firebaseapp.com',
  projectId: 'atp-suplementos-9c2c0',
  storageBucket: 'atp-suplementos-9c2c0.firebasestorage.app',
  messagingSenderId: '255090217395',
  appId: '1:255090217395:web:590f0bd3a11c79f06e3bc6'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  self.registration.showNotification(data.title || 'ATP Suplementos', {
    body: data.body || 'Tenés una novedad.',
    icon: '/logo-atp.jpg',
    badge: '/logo-atp.jpg',
    tag: data.tag || 'atp-notification',
    data: { url: data.url || '/admin.html' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/admin.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(client => client.url.includes('/admin.html'));
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return clients.openWindow(target);
    })
  );
});
