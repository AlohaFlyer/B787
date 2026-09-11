/* AS787 Study Portal service worker - offline support
   Two tiers: core (pages, quizzes, data, PDFs) and audio (podcast mp3s).
   Nothing is downloaded until the user asks for it from the menu page. */
const VERSION = 'v4';
const CORE  = 'b787-core-'  + VERSION;
const AUDIO = 'b787-audio-' + VERSION;
const MANIFEST = '/offline-manifest.json';
const KEEP = [CORE, AUDIO];

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('b787-') && !KEEP.includes(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Every page gets the shared settings modal and the per-section assist widget,
// without editing each page. assist.js exits quietly on pages with no corpus.
const NO_INJECT = [];
const TAGS = '<script src="/portal-settings.js" defer></script><script src="/assist.js" defer></script>';

async function inject(res, url) {
  try {
    if (!res || !res.ok) return res;
    const type = res.headers.get('content-type') || '';
    if (type.indexOf('text/html') < 0) return res;
    if (NO_INJECT.indexOf(url.pathname) >= 0) return res;
    const body = await res.clone().text();
    if (body.indexOf('portal-settings.js') >= 0) return res;
    const i = body.lastIndexOf('</body>');
    const out = i < 0 ? body + TAGS : body.slice(0, i) + TAGS + body.slice(i);
    const h = new Headers(res.headers);
    h.delete('content-length');
    return new Response(out, { status: res.status, statusText: res.statusText, headers: h });
  } catch (e) {
    return res;
  }
}

function isAudio(url) { return /\.(mp3|m4a)$/i.test(url); }
// Code and data go network first so a shipped fix actually reaches the browser.
// Cache-first on .js pinned stale scripts forever, which is how an old settings
// gear and an old assist widget survived several deploys.
function isDoc(url)   { return /\.(html|json|js|css)$/i.test(url) || url.endsWith('/'); }

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const cacheName = isAudio(url.pathname) ? AUDIO : CORE;

  // Documents and data: network first when online so the portal stays current,
  // cache fallback when the radio is off.
  if (isDoc(url.pathname) || req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // "Network first" only means we go to the network STACK. The browser
        // HTTP cache will still answer with whatever max-age it was given, so a
        // shipped fix can sit unseen for the life of that entry. no-store makes
        // the SW read the origin's current bytes, which is the whole point of
        // going network first for code.
        let fresh;
        try {
          fresh = await fetch(req.url, { cache: 'no-store', credentials: 'same-origin' });
        } catch (e) {
          fresh = await fetch(req);
        }
        if (fresh && fresh.ok) {
          const c = await caches.open(CORE);
          c.put(req, fresh.clone());
          return inject(fresh, url);
        }
        return fresh;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return inject(hit, url);
        if (req.mode === 'navigate') {
          const shell = await caches.match('/index.html');
          if (shell) return inject(shell, new URL('/index.html', self.location.origin));
        }
        return new Response(
          '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<body style="font-family:Segoe UI,Arial,sans-serif;background:#E8F3FA;color:#01416e;padding:40px;text-align:center">' +
          '<h2>Not available offline</h2><p>This page was not part of the offline download.</p>' +
          '<p><a href="/index.html" style="color:#007cba;font-weight:700">Back to the portal</a></p></body>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        );
      }
    })());
    return;
  }

  // Static assets: cache first.
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok && fresh.type === 'basic') {
        const c = await caches.open(cacheName);
        c.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});

async function getManifest() {
  const res = await fetch(MANIFEST, { cache: 'no-store' });
  if (!res.ok) throw new Error('manifest ' + res.status);
  return res.json();
}

function post(client, msg) { if (client) client.postMessage(msg); }

async function download(tier, client) {
  // getManifest throws with no network. Without this the checkbox stayed ticked
  // and both offline controls were frozen until the page was reloaded.
  let man;
  try { man = await getManifest(); }
  catch (e) {
    post(client, { type: 'DONE', tier, done: 0, total: 0, bytes: 0, failed: ['manifest'], error: 'offline' });
    return;
  }
  const list = tier === 'audio' ? man.audio : man.core;
  const cacheName = tier === 'audio' ? AUDIO : CORE;
  const cache = await caches.open(cacheName);
  const total = list.length;
  let done = 0, bytes = 0, failed = [];

  const queue = list.slice();
  const worker = async () => {
    while (queue.length) {
      const item = queue.shift();
      const url = item.u || item;
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res && res.ok) {
          await cache.put(url, res.clone());
          bytes += item.b || 0;
        } else { failed.push(url); }
      } catch (e) { failed.push(url); }
      done++;
      if (done % 2 === 0 || done === total) {
        post(client, { type: 'PROGRESS', tier, done, total, bytes, failed: failed.length });
      }
    }
  };
  const lanes = tier === 'audio' ? 4 : 6;
  await Promise.all(Array.from({ length: lanes }, worker));
  post(client, { type: 'DONE', tier, done, total, bytes, failed });
}

async function clearTier(tier, client) {
  await caches.delete(tier === 'audio' ? AUDIO : CORE);
  post(client, { type: 'CLEARED', tier });
}

async function status(client) {
  const out = {};
  for (const [tier, name] of [['core', CORE], ['audio', AUDIO]]) {
    let n = 0;
    if (await caches.has(name)) { const c = await caches.open(name); n = (await c.keys()).length; }
    out[tier] = n;
  }
  let man = null;
  try { man = await getManifest(); } catch (e) {}
  post(client, {
    type: 'STATUS', cached: out,
    totals: man ? { core: man.core.length, audio: man.audio.length } : null
  });
}

self.addEventListener('message', event => {
  const client = event.source;
  const d = event.data || {};
  if (d.type === 'CACHE_CORE')  event.waitUntil(download('core', client));
  if (d.type === 'CACHE_AUDIO') event.waitUntil(download('audio', client));
  if (d.type === 'CLEAR_CORE')  event.waitUntil(clearTier('core', client));
  if (d.type === 'CLEAR_AUDIO') event.waitUntil(clearTier('audio', client));
  if (d.type === 'STATUS')      event.waitUntil(status(client));
});
