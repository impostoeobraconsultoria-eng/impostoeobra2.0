/* global self, clients */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error("Payload de push inválido", error);
    return;
  }

  const options = {
    body: data.mensagem,
    icon: data.icone || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-72.png",
    data: { link: internalPath(data.link) },
    tag: data.tag || undefined,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.titulo, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = internalPath(event.notification.data?.link);
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const windowClient of windows) {
          if (windowClient.url === targetUrl && "focus" in windowClient)
            return windowClient.focus();
        }
        return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
      }),
  );
});

function internalPath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/admin";
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : "/admin";
  } catch {
    return "/admin";
  }
}
