// Nexus Hub Service Worker
// Mục đích: (1) cache app shell để dùng offline, (2) hiển thị local notification
// Lưu ý: đây KHÔNG phải push notification thật từ server — xem ghi chú trong app.

const CACHE_NAME = 'nexus-hub-cache-v1';
const APP_SHELL = [
  './nexus_hub.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first cho app shell, network-first cho mọi request khác (vd: CDN Tailwind/Chart.js)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache lại các file cùng gốc để lần sau vẫn dùng được offline
          if (req.url.startsWith(self.location.origin)) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // Nếu mất mạng và không có cache, đành chịu (đặc biệt là CDN ngoài)
    })
  );
});

// Cho phép trang gọi navigator.serviceWorker.controller.postMessage(...) để hiện notification
// ngay cả khi tab đang ở nền (khác với push từ server, cái này chỉ hoạt động khi app còn đang mở/chạy nền gần đây)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png'
    });
  }
});
