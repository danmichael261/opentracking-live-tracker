// Service Worker for push notifications

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'New checkpoint update!',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Track Live 📍' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🏃 Race Update', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return clients.openWindow(url);
    })
  );
});
