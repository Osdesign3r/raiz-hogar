"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const DURACION_MINIMA_MS = 1200  // para que no parpadee si todo resuelve instantáneo
const DURACION_FADE_MS   = 350

/**
 * Splash de arranque. Se queda visible hasta que se cumplan DOS cosas:
 *   1. Pasó el tiempo mínimo (evita el flash si todo carga muy rápido)
 *   2. La sesión de Supabase ya resolvió (algo real, no un número inventado)
 * Lo que tarde más de las dos gana — así si la red está lenta, el splash
 * se queda el tiempo que de verdad haga falta en vez de desaparecer antes
 * de que la app esté lista para mostrarse.
 *
 * Solo se muestra una vez por sesión de navegador (sessionStorage) — no en
 * cada navegación interna entre páginas, solo en el arranque real.
 */
export default function SplashScreen() {
  const [visible,   setVisible]   = useState(true)
  const [saliendo,  setSaliendo]  = useState(false)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("lazo_splash_visto")) {
      setVisible(false)
      return
    }

    let cancelado = false

    const tiempoMinimo = new Promise<void>(resolve => setTimeout(resolve, DURACION_MINIMA_MS))
    const sesionLista  = supabase.auth.getSession().catch(() => null)

    Promise.all([tiempoMinimo, sesionLista]).then(() => {
      if (cancelado) return
      setSaliendo(true)
      setTimeout(() => {
        if (cancelado) return
        setVisible(false)
        sessionStorage.setItem("lazo_splash_visto", "1")
      }, DURACION_FADE_MS)
    })

    return () => { cancelado = true }
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-label="Cargando LAZO"
      className={`fixed inset-0 flex flex-col items-center justify-center bg-[var(--background)] transition-opacity ease-out ${
        saliendo ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ zIndex: "var(--z-splash)", transitionDuration: `${DURACION_FADE_MS}ms` }}
    >
      {/* Halo de acento detrás del logo */}
      <div
        aria-hidden="true"
        className="absolute h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--accent)" }}
      />

      {logoError ? (
        <div className="accent-gradient relative mb-5 flex h-24 w-24 items-center justify-center rounded-[28px]">
          <span className="font-display text-4xl font-semibold">L</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/icon-512.png"
          alt=""
          width={96}
          height={96}
          className="relative mb-5 h-24 w-24 rounded-[28px] shadow-2xl shadow-black/50"
          onError={() => setLogoError(true)}
        />
      )}

      <p className="font-display relative mb-1 text-2xl font-semibold tracking-wide">LAZO</p>
      <p className="relative mb-8 text-sm text-muted">Tu hogar, en orden</p>

      <div className="relative flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)]"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
