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
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon-192.png",
  })
})

self.addEventListener("install", () => {
  console.log("SW instalado")
  // Sin esto, un SW nuevo se queda en estado "waiting" para siempre si la
  // PWA no se cierra por completo — y una PWA instalada casi nunca se
  // cierra. skipWaiting() lo activa apenas termina de instalarse, sin
  // esperar a que el usuario mate la app.
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  // clients.claim() hace que el SW nuevo tome control de las pestañas ya
  // abiertas de inmediato, en vez de esperar a la próxima navegación.
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", () => {})