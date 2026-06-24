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
})

self.addEventListener("fetch", () => {})
