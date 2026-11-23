// Reserva · funciona sin cobertura y se actualiza sola.
// La página se pide siempre a la red primero (sin la memoria del navegador); si no hay conexión, se usa la guardada.
const CACHE = 'reserva-v11';
const APP = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.endsWith('supabase.co')) return; // los datos van siempre a la red
  const pagina = e.request.mode === 'navigate' || /\/(index\.html|config\.js)?$/.test(u.pathname);
  if (pagina) { // red primero, con 4 s de margen; si no, lo guardado
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const guardado = () => c.match(e.request, { ignoreSearch: true }).then((h) => h || c.match('index.html'));
      try {
        const r = await Promise.race([fetch(e.request, { cache: 'no-store' }), new Promise((_, no) => setTimeout(() => no(new Error('lento')), 4000))]);
        if (r.ok) c.put(e.request, r.clone());
        return r.ok ? r : (await guardado()) || r;
      } catch (err) { return (await guardado()) || Response.error(); }
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(e.request, { ignoreSearch: true })) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })));
});
