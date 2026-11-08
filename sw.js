// MoneyTracker PWA 離線快取守衛
const CACHE_NAME = 'moneytracker-v1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './debt-tracker.js',
  './statement.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. 安裝階段：快取靜態資源
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. 啟動階段：清理舊版本快取
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 攔截請求：Cache First 原則 (無網絡時直接讀本機硬碟快取)
self.addEventListener('fetch', (e) => {
  // 外部 API (如匯率、Google Apps Script) 不走快取，直接聯網
  if (e.request.url.includes('open.er-api.com') || 
      e.request.url.includes('script.google.com') || 
      e.request.url.includes('finance.yahoo.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // 動態快取成功的靜態請求
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // 離線回退
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});