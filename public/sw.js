/*
 * The app's service worker, for one job: the notification when a game ends --
 * from the page while it is open, or pushed from the server when the phone is
 * locked and the page frozen -- and bringing the app back when it is tapped.
 *
 * Chrome on Android will not show a notification from a page on its own
 * (`new Notification()` throws there); it has to come through a worker. Nothing
 * is cached and no request is intercepted -- the app works exactly as it did
 * without it.
 */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/*
 * A push from the server: the game has ended on the clock. It arrives even with
 * the phone locked and the app closed, which is the whole point of it.
 */
self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { title: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(message.title || "Pichangapp", {
      body: message.body || "",
      tag: message.tag,
      data: { url: message.url || "/" },
      icon: "/images/favicon/android-icon-192x192.png",
      badge: "/images/favicon/android-icon-192x192.png",
      // Buzz like a whistle: short, short, long.
      vibrate: [200, 120, 200, 120, 600],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((open) => {
        const here = open.find((client) => client.url.includes(url));
        if (here && "focus" in here) return here.focus();
        return self.clients.openWindow(url);
      }),
  );
});
