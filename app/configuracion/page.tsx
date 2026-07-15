"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/useUser"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, Save, User, Shield, Palette, Users, ChevronRight, Bell, BellOff, BellRing } from "lucide-react"
import { ACCENT_COLORS, getAccentByValue, type AccentColor } from "@/lib/colors"
import { requestNotificationPermission } from "@/lib/firebase"

type Perfil = { id: string; nombre: string; email: string; avatar_url: string | null; accent_color: string }
type EstadoPush = "unsupported" | "default" | "granted" | "denied"

export default function ConfiguracionPage() {
  const { user, loading: authLoading } = useUser()
  const router = useRouter()

  const [perfil,    setPerfil]    = useState<Perfil | null>(null)
  const [nombre,    setNombre]    = useState("")
  const [accent,    setAccent]    = useState<AccentColor>(ACCENT_COLORS[0])
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado,  setGuardado]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [estadoPush,    setEstadoPush]    = useState<EstadoPush>("unsupported")
  const [activandoPush, setActivandoPush] = useState(false)
  const [resultadoPush, setResultadoPush] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setEstadoPush("unsupported")
      return
    }
    setEstadoPush(Notification.permission as EstadoPush)
  }, [])

  const activarPush = async () => {
    // Este onClick es el único lugar autorizado a pedir permiso — en iOS
    // Safari, pedirlo fuera de un gesto directo del usuario no muestra el
    // diálogo y puede quemar el permiso a "denied" para siempre.
    setActivandoPush(true)
    setResultadoPush(null)
    setError(null)
    const token = await requestNotificationPermission()
    setEstadoPush(typeof window !== "undefined" ? (Notification.permission as EstadoPush) : "default")
    if (!token) {
      setError(
        Notification.permission === "denied"
          ? "iOS bloqueó el permiso. Bórrala del inicio y vuelve a 'Agregar a inicio' desde Safari para reintentar."
          : "No se pudo activar. Revisa 'Verificar token guardado' abajo para ver el motivo exacto."
      )
    } else {
      setResultadoPush(`Token guardado: ...${token.slice(-8)}`)
    }
    setActivandoPush(false)
  }

  // Botón visible SIEMPRE, incluso con permiso ya concedido — el permiso del
  // navegador no garantiza que el token FCM se haya guardado en Supabase.
  // Esto fuerza el intento y muestra el resultado real en pantalla, en vez
  // de que muera en un console.error inaccesible en el celular.
  const verificarToken = async () => {
    setActivandoPush(true)
    setResultadoPush(null)
    setError(null)
    try {
      const { refrescarTokenSiYaHabilitado } = await import("@/lib/firebase")
      const token = await refrescarTokenSiYaHabilitado()
      if (token) {
        setResultadoPush(`✓ Token guardado correctamente: ...${token.slice(-8)}`)
      } else {
        setResultadoPush(null)
        setError("El navegador no devolvió un token. Puede ser la VAPID key, el service worker, o el permiso del sistema operativo.")
      }
    } catch (e) {
      setResultadoPush(null)
      setError("Error real: " + (e instanceof Error ? e.message : String(e)))
    }
    setActivandoPush(false)
  }

  useEffect(() => {
    if (!user) return
    supabase.from("perfiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setPerfil(data)
        setNombre(data.nombre ?? "")
        setAccent(getAccentByValue(data.accent_color ?? "#6C47FF"))
      }
      setLoading(false)
    })
  }, [user])

  const applyAccent = (a: AccentColor) => {
    document.documentElement.style.setProperty("--accent", a.value)
    document.documentElement.style.setProperty("--accent-from", a.from)
    document.documentElement.style.setProperty("--accent-to", a.to)
  }

  const guardar = async () => {
    if (!user || !nombre.trim()) return
    setGuardando(true)
    setError(null)

    const { error: err } = await supabase
      .from("perfiles")
      .update({ nombre: nombre.trim(), accent_color: accent.value })
      .eq("id", user.id)

    if (err) {
      setError("No se pudo guardar.")
    } else {
      applyAccent(accent)
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
    }
    setGuardando(false)
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen p-4 pb-28">
        <div className="max-w-md mx-auto space-y-3 mt-8">
          {[1,2,3].map(i => <div key={i} className="surface rounded-2xl h-16 animate-pulse" />)}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 pb-28">
      <div className="max-w-md mx-auto">

        <h1 className="text-2xl font-semibold mb-6">Configuración</h1>

        {/* Perfil */}
        <div className="surface border-subtle rounded-2xl p-4 mb-3 flex items-center gap-4">
          {perfil?.avatar_url ? (
            <img src={perfil.avatar_url} alt={perfil.nombre} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center shrink-0">
              <User size={24} className="text-muted" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">{perfil?.nombre}</p>
            <p className="text-sm text-secondary truncate">{perfil?.email}</p>
          </div>
        </div>

        {/* Miembros del hogar — antes era /familia, ruta huérfana sin acceso en el nav */}
        <Link href="/familia">
          <div className="surface border-subtle rounded-2xl p-4 mb-3 flex items-center gap-4 active:opacity-70 transition">
            <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] flex items-center justify-center shrink-0">
              <Users size={18} style={{ color: "var(--accent)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">Miembros del hogar</p>
              <p className="text-xs text-secondary">Personas y mascotas que conviven contigo</p>
            </div>
            <ChevronRight size={16} className="text-muted shrink-0" />
          </div>
        </Link>

        {/* Nombre */}
        <div className="surface border-subtle rounded-2xl p-4 mb-3 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted">Tu nombre en la app</p>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guardar()}
            placeholder="Tu nombre"
            className="w-full p-3 rounded-xl bg-[var(--surface-2)] text-sm outline-none focus:ring-1 placeholder:text-muted"
            style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
          />
        </div>

        {/* Color de acento */}
        <div className="surface border-subtle rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={15} style={{ color: "var(--accent)" }} />
            <p className="text-xs uppercase tracking-widest text-muted">Tu color de acento</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ACCENT_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setAccent(c)}
                className="flex items-center gap-2 p-2.5 rounded-xl border transition-all"
                style={{
                  background: accent.id === c.id
                    ? `color-mix(in srgb, ${c.value} 12%, transparent)`
                    : "var(--surface-2)",
                  borderColor: accent.id === c.id ? c.value : "rgba(255,255,255,0.07)",
                  borderWidth: accent.id === c.id ? "1px" : "0.5px",
                }}
              >
                <div
                  className="w-5 h-5 rounded-full shrink-0"
                  style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                />
                <span className="text-xs font-medium" style={{ color: accent.id === c.id ? c.value : "rgba(255,255,255,0.4)" }}>
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mb-3 px-1">{error}</p>}

        {/* Guardar */}
        <button
          onClick={guardar}
          disabled={guardando || !nombre.trim()}
          className="w-full accent-gradient disabled:opacity-40 p-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition mb-3 text-white"
        >
          <Save size={15} />
          {guardando ? "Guardando..." : guardado ? "✓ Guardado" : "Guardar cambios"}
        </button>

        {/* Notificaciones push */}
        <div className="surface border-subtle rounded-2xl p-4 mb-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] flex items-center justify-center shrink-0">
              {estadoPush === "granted" ? (
                <BellRing size={18} style={{ color: "var(--accent)" }} />
              ) : estadoPush === "denied" ? (
                <BellOff size={18} className="text-red-400" />
              ) : (
                <Bell size={18} className="text-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">Notificaciones push</p>
              <p className="text-xs text-secondary">
                {estadoPush === "granted"  ? "Permiso concedido en este dispositivo" :
                 estadoPush === "denied"   ? "Bloqueadas por el sistema" :
                 estadoPush === "unsupported" ? "No disponibles en este navegador" :
                                              "Aún no activadas en este dispositivo"}
              </p>
            </div>
          </div>

          {estadoPush !== "granted" && estadoPush !== "unsupported" && (
            <button
              onClick={activarPush}
              disabled={activandoPush}
              className="w-full accent-gradient disabled:opacity-40 p-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition text-white"
            >
              <Bell size={15} />
              {activandoPush ? "Activando..." : "Activar notificaciones"}
            </button>
          )}

          {/* Permiso ya concedido no garantiza que el token esté guardado en la
              base de datos — este botón fuerza y muestra el resultado real. */}
          {estadoPush === "granted" && (
            <button
              onClick={verificarToken}
              disabled={activandoPush}
              className="w-full surface border-subtle disabled:opacity-40 p-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              <BellRing size={15} />
              {activandoPush ? "Verificando..." : "Verificar / reintentar guardado del token"}
            </button>
          )}

          {resultadoPush && (
            <p className="text-[11px] text-emerald-400 leading-relaxed">{resultadoPush}</p>
          )}

          {estadoPush === "denied" && (
            <p className="text-[11px] text-muted leading-relaxed">
              iOS ya decidió por ti y no deja volver a preguntar desde la app. Bórrala del
              inicio y agrégala de nuevo desde Safari (compartir → Agregar a inicio) para
              que vuelva a preguntar.
            </p>
          )}
        </div>

        {/* Seguridad */}
        <div className="surface border-subtle rounded-2xl p-4 mb-3 flex items-center gap-3">
          <Shield size={15} className="shrink-0" style={{ color: "var(--accent)" }} />
          <p className="text-xs text-secondary">Autenticado con Google. Los datos del hogar son visibles para ambos.</p>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={cerrarSesion}
          className="w-full surface border-subtle hover:border-red-500/30 hover:text-red-400 text-secondary p-4 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>

      </div>
    </main>
  )
}