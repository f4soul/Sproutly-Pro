// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
// We need to inject these or hardcode them, but wait, usually SW can't read process.env.
// Let's rely on query parameters or just fetch them from a config file.
// Actually, firebase-messaging-sw requires the sender ID at least.

const firebaseConfig = {
  // We can pass the config here, but it's hard to read environment variables in static JS.
  // We'll instruct the user to update this or we'll fetch it from a public endpoint if we had a server.
  // For now, we'll leave placeholders, as the user will need to configure this manually if not using a bundler for SW.
};

// We will use standard approach: the user must replace these with their config.
// Or we can configure Vite to build the service worker.
// Let's use Vite PWA plugin or simply a basic SW if the user provides the config.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.notification?.title || 'Новое уведомление';
  const options = {
    body: data.notification?.body || 'Проверьте ваши активы',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
