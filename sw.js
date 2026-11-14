// 오프라인 지원: 앱 파일은 미리 캐시, 글꼴은 사용 시 캐시. 친구 서버(Supabase) 요청은 캐시하지 않음.
const V = 'wordcard-v1';
const CORE = ['./', 'index.html', 'styles.css', 'app.js', 'art.js', 'verses.js', 'store.js', 'social.js', 'config.js', 'vendor/supabase-js-2.45.4.min.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.endsWith('supabase.co')) return;
  if (u.origin === location.origin) {
    // 앱 파일: 네트워크 우선(업데이트 반영), 실패 시 캐시
    e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
  } else if (/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); } return r; })));
  }
});
