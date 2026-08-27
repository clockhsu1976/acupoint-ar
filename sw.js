const CACHE = "acupoint-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== CACHE + "-assets").map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = e.request.url;

  // MediaPipe wasm 與模型檔：快取優先（大檔、網址含版本，內容不變）
  if (url.includes("cdn.jsdelivr.net") || url.includes("storage.googleapis.com")) {
    e.respondWith(caches.open(CACHE + "-assets").then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok || res.type === "opaque") c.put(e.request, res.clone());
      return res;
    }));
    return;
  }

  // 頁面本體：網路優先、離線退回快取
  if (e.request.mode === "navigate" || url.endsWith("index.html")) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))
      )
    );
  }
});
