// Offline support (Enhancements #1). Everything the app needs is cached on install, so it opens with no signal.
// Requests go to the network first (so an update shows up straight away) and fall back to the cache after 3 s or
// when offline. Fonts from Google are cached the first time they load; without them the system font is used.
const CACHE = 'shutdown-v2';
const SHELL = [
  './', 'index.html', 'app.js', 'style.css', 'manifest.webmanifest',
  'lib/content.js', 'lib/phrases.js', 'lib/text.js', 'lib/tokens.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  ...['add', 'back', 'check', 'chevron', 'close', 'delete', 'edit', 'emoji', 'flip', 'keyboard', 'search', 'settings', 'share', 'speaker', 'stop',
    'signal-green', 'signal-yellow', 'signal-red'].map(n => 'lib/icons/' + n + '.png'),
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const timeout = ms => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !font) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([fetch(req), timeout(3000)]);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('index.html') : null);
      return hit || Response.error();
    }
  })());
});
