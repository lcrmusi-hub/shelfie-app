self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Shelfie", {
      body: data.body || "You're on a streak! Read today to keep it alive 🔥",
      icon: "/icon-192.png",
      badge: "/icon-badge.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
