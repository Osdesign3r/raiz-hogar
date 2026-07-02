"use client"

import { useEffect } from "react"

export default function SWRegister() {

  useEffect(() => {

    if (
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        // updateViaCache:'none' evita que el navegador sirva una copia
        // cacheada de sw.js — sin esto, aunque el SW nuevo esté publicado,
        // el navegador puede seguir comparando contra una versión vieja
        // cacheada y nunca detectar que cambió.
        .register("/sw.js", { updateViaCache: "none" })
        .then(reg => {
          console.log("SW registrado, scope:", reg.scope)
          // Empuja la comprobación de actualización de una vez — no
          // esperar a la próxima navegación, que en una PWA instalada
          // puede tardar días en volver a ocurrir.
          reg.update().catch(() => {})
        })
        .catch(err => console.error("SW falló al registrarse:", err))

      // Cuando el SW nuevo toma control (gracias a skipWaiting +
      // clients.claim en sw.js), esta pestaña queda controlada por un
      // worker distinto al que cargó la página. Un solo reload — con
      // guardia para no entrar en loop — asegura que todo lo que dependa
      // del SW activo (como getToken() de Firebase) use el correcto.
      let recargando = false
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (recargando) return
        if (sessionStorage.getItem("lazo_sw_recargado")) return
        recargando = true
        sessionStorage.setItem("lazo_sw_recargado", "1")
        window.location.reload()
      })
    }

  }, [])

  return null
}