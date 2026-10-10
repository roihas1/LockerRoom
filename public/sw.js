/* Push-only service worker: no offline caching, so deploys are never served stale. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "LockerRoom";
  const url = payload.url || "/";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: payload.body || "",
        icon: "/app-icon/192",
        badge: "/app-icon/badge",
        tag: payload.tag || undefined,
        renotify: Boolean(payload.tag),
        lang: "he",
        dir: "rtl",
        data: { url },
      }),
      // iOS hides the banner while the app is on screen, so open pages also get an in-app toast.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
        for (const win of windows) {
          if (win.visibilityState === "visible") win.postMessage({ type: "push", title, body: payload.body || "", url });
        }
      }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if (win.url === target && "focus" in win) return win.focus();
      }
      const any = windows.find((w) => "navigate" in w);
      if (any) return any.navigate(target).then((w) => (w ? w.focus() : undefined));
      return self.clients.openWindow(target);
    }),
  );
});
