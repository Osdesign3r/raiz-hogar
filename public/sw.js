// public/sw.js
//
// Antes había DOS service workers compitiendo por el mismo scope ("/"):
// este archivo (registrado por SWRegister.tsx) y lib/firebase-messaging-sw.js
// (que ni siquiera estaba en public/, así que nunca era alcanzable — 404 al
// intentar registrarlo, por eso getToken() fallaba en silencio y push_tokens
// quedaba siempre vacío). Ahora es uno solo: este, con la lógica de Firebase
// Messaging fusionada adentro.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: "AIzaSyCDOQ_SIDTIpzMq8Mqgv-HlEmZ5n9s0U9M",
  authDomain: "lazo-40224.firebaseapp.com",
  projectId: "lazo-40224",
  storageBucket: "lazo-40224.firebasestorage.app",
  messagingSenderId: "1069694037313",
  appId: "1:1069694037313:web:b542c20a78e4d9d35005c0",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  // El edge function manda mensajes SOLO-DATA (sin campo `notification`) a
  // propósito — mandar ambos hacía que Firebase mostrara la notificación
  // dos veces. Por eso el título y el cuerpo vienen dentro de payload.data,
  // NO en payload.notification (que ya ni siquiera llega, así que leerlo
  // revienta esta función en silencio y no se muestra nada — eso es lo que
  // estaba pasando).
  const datos = payload.data || {}

  self.registration.showNotification(datos.titulo || "LAZO", {
    body: datos.mensaje || "",
    icon: "/icon-192.png",
    // Lo que notificationclick usa más abajo para saber a dónde navegar.
    data: datos,
  })
})

// Al tocar la notificación: si ya hay una pestaña de la app abierta, la
// enfoca y navega ahí en vez de abrir una segunda instancia de la PWA
// (en Android standalone eso deja dos ícoos "fantasma" en recientes).
// Si no hay ninguna abierta, abre una nueva directo en la ruta correcta.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const ruta = (event.notification.data && event.notification.data.url) || "/"

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus()
            if ("navigate" in client) return client.navigate(ruta)
            return
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(ruta)
      })
  )
})

self.addEventListener("install", () => {
  console.log("SW instalado")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", () => {})