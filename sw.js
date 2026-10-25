/* ClinPharmAI Hub – service worker.
   Tăng CACHE_VERSION mỗi lần đổi khung ứng dụng, danh mục hoặc nội dung trang. */
var CACHE_VERSION = 'v1.0.0';
var SHELL = 'hub-shell-' + CACHE_VERSION;
var RUNTIME = 'hub-runtime-' + CACHE_VERSION;

var SHELL_FILES = [
  './', 'index.html', 'css/base.css', 'js/core.js', 'js/app.js', 'data/catalog.json',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];

// Thư viện CDN mà các trang gốc dùng: lưu khi mở trực tuyến lần đầu để xem lại khi ngoại tuyến.
var CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(SHELL).then(function (cache) {
    return cache.addAll(SHELL_FILES).then(function () {
      // Lưu sẵn mọi trang trong danh mục; một trang lỗi không làm hỏng cả lần cài.
      return fetch('data/catalog.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (cat) {
        return Promise.all(cat.records.map(function (rec) {
          return cache.add('pages/' + encodeURIComponent(rec.file)).catch(function () {});
        }));
      }).catch(function () {});
    });
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf('hub-') === 0 && k !== SHELL && k !== RUNTIME;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (event) {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

function networkFirst(req, fallbackUrl) {
  return fetch(req).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(SHELL).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (fallbackUrl ? caches.match(fallbackUrl) : null);
    }).then(function (hit) { return hit || Response.error(); });
  });
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var fresh = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit || Response.error(); });
      return hit || fresh;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Danh mục: ưu tiên mạng để thấy bản mới; ngoại tuyến thì dùng bản đã lưu.
    if (url.pathname.endsWith('/data/catalog.json')) { event.respondWith(networkFirst(req)); return; }
    // Điều hướng tới index: ưu tiên mạng, ngoại tuyến trả index đã lưu.
    if (req.mode === 'navigate' && !/\/pages\//.test(url.pathname)) {
      event.respondWith(networkFirst(req, 'index.html'));
      return;
    }
    event.respondWith(staleWhileRevalidate(req, SHELL));
    return;
  }

  if (CDN_HOSTS.indexOf(url.hostname) !== -1) event.respondWith(staleWhileRevalidate(req, RUNTIME));
});
