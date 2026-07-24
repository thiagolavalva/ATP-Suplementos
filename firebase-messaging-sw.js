importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
// Reemplazá estos valores con los mismos de config.js.
firebase.initializeApp({apiKey:'PEGAR_API_KEY',authDomain:'PEGAR_PROJECT_ID.firebaseapp.com',projectId:'PEGAR_PROJECT_ID',storageBucket:'PEGAR_PROJECT_ID.appspot.com',messagingSenderId:'PEGAR_MESSAGING_SENDER_ID',appId:'PEGAR_APP_ID'});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{self.registration.showNotification(payload.notification?.title||'ATP Suplementos',{body:payload.notification?.body||'Tenés una novedad.',icon:'/logo-atp.jpg',data:{url:payload.data?.url||'/admin.html'}})});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.openWindow(event.notification.data?.url||'/admin.html'))});
