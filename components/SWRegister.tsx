"use client"

import { useEffect } from "react"

export default function SWRegister() {

  useEffect(() => {

    if (
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(reg => console.log("SW registrado, scope:", reg.scope))
        .catch(err => console.error("SW falló al registrarse:", err))
    }

  }, [])

  return null
}
