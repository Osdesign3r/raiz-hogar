"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/useUser"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, Save, User, Shield, Palette, Users, ChevronRight, Bell, BellOff, BellRing, Check } from "lucide-react"
import { ACCENT_COLORS, getAccentByValue, applyAccentToRoot, onAccentFor, type AccentColor } from "@/lib/colors"
import PageHeader from "@/components/PageHeader"
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
          ? "iOS bloqueó el permiso. Elimina LAZO de tu pantalla de inicio y agrégala de nuevo desde Safari (Compartir → Agregar a inicio)."
          : "No pudimos activar las notificaciones. Toca «Comprobar notificaciones» para ver qué falla."
      )
    } else {
      setResultadoPush("Listo: este dispositivo recibirá las notificaciones.")
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
        setResultadoPush("Todo en orden: este dispositivo recibirá las notificaciones.")
      } else {
        setResultadoPush(null)
        setError("Este dispositivo no quedó registrado para recibir notificaciones. Revisa que el permiso esté activo en los ajustes del teléfono y vuelve a intentarlo.")
      }
    } catch (e) {
      setResultadoPush(null)
      console.error(e)
      setError("No pudimos comprobar las notificaciones. Inténtalo de nuevo." + (e instanceof Error ? ` (${e.message})` : ""))
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

  const guardar = async () => {
    if (!user || !nombre.trim()) return
    setGuardando(true)
    setError(null)

    const { error: err } = await supabase
      .from("perfiles")
      .update({ nombre: nombre.trim(), accent_color: accent.value })
      .eq("id", user.id)

    if (err) {
      setError("No pudimos guardar los cambios. Inténtalo de nuevo.")
    } else {
      applyAccentToRoot(accent)
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
      <main className="page-shell">
        <div className="page space-y-3 pt-8" aria-hidden="true">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20" />)}
        </div>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <div className="page space-y-3">

        <PageHeader title="Ajustes" />

        {/* Perfil */}
        <section className="card flex items-center gap-4 p-4" aria-label="Tu perfil">
          {perfil?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfil.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)]">
              <User size={26} className="text-muted" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display truncate text-xl font-semibold">{perfil?.nombre}</p>
            <p className="truncate text-sm text-secondary">{perfil?.email}</p>
          </div>
        </section>

        {/* Miembros del hogar — antes era /familia, ruta huérfana sin acceso en el nav */}
        <Link
          href="/familia"
          className="card flex min-h-[72px] items-center gap-4 p-4 transition-colors hover:border-[var(--border-strong)] active:bg-[var(--surface-2)]"
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }}
          >
            <Users size={22} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Miembros del hogar</span>
            <span className="block text-sm text-secondary">Personas y mascotas que conviven contigo</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
        </Link>

        {/* Nombre */}
        <section className="card space-y-2 p-4">
          <label htmlFor="nombre" className="section-label block">Tu nombre en la app</label>
          <input
            id="nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guardar()}
            placeholder="Tu nombre"
            autoComplete="given-name"
            className="field"
          />
        </section>

        {/* Color de acento */}
        <section className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Palette size={16} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
            <h2 className="section-label">Tu color de acento</h2>
          </div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Color de acento">
            {ACCENT_COLORS.map(c => {
              const activo = accent.id === c.id
              return (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setAccent(c)}
                  className="relative flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 transition-all"
                  style={{
                    background: activo ? `color-mix(in srgb, ${c.value} 14%, var(--surface-2))` : "var(--surface-2)",
                    borderColor: activo ? c.value : "var(--border)",
                    borderWidth: activo ? 2 : 1,
                  }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                  >
                    {activo && <Check size={15} strokeWidth={3} style={{ color: onAccentFor(c) }} aria-hidden="true" />}
                  </span>
                  <span className={`text-xs font-semibold ${activo ? "text-[var(--foreground)]" : "text-secondary"}`}>
                    {c.name}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {error && (
          <p role="alert" className="px-1 text-sm text-danger">{error}</p>
        )}

        {/* Guardar */}
        <button
          onClick={guardar}
          disabled={guardando || !nombre.trim()}
          className="btn btn-primary w-full"
        >
          {guardado ? <Check size={18} /> : <Save size={18} />}
          {guardando ? "Guardando..." : guardado ? "Guardado" : "Guardar cambios"}
        </button>

        {/* Notificaciones push */}
        <section className="card space-y-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
              {estadoPush === "granted" ? (
                <BellRing size={22} style={{ color: "var(--accent-text)" }} />
              ) : estadoPush === "denied" ? (
                <BellOff size={22} className="text-danger" />
              ) : (
                <Bell size={22} className="text-muted" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Notificaciones push</h2>
              <p className="text-sm text-secondary" aria-live="polite">
                {estadoPush === "granted"  ? "Activadas en este dispositivo" :
                 estadoPush === "denied"   ? "Bloqueadas por el sistema" :
                 estadoPush === "unsupported" ? "No disponibles en este navegador" :
                                              "Todavía no activadas en este dispositivo"}
              </p>
            </div>
          </div>

          {estadoPush !== "granted" && estadoPush !== "unsupported" && (
            <button onClick={activarPush} disabled={activandoPush} className="btn btn-primary w-full">
              <Bell size={18} />
              {activandoPush ? "Activando..." : "Activar notificaciones"}
            </button>
          )}

          {/* Permiso ya concedido no garantiza que el token esté guardado en la
              base de datos — este botón fuerza y muestra el resultado real. */}
          {estadoPush === "granted" && (
            <button onClick={verificarToken} disabled={activandoPush} className="btn btn-secondary w-full">
              <BellRing size={18} />
              {activandoPush ? "Comprobando..." : "Comprobar notificaciones"}
            </button>
          )}

          {resultadoPush && (
            <p role="status" className="text-sm leading-relaxed text-success">{resultadoPush}</p>
          )}

          {estadoPush === "denied" && (
            <p className="text-sm leading-relaxed text-muted">
              iOS no permite volver a pedir el permiso desde la app. Elimina LAZO de tu
              pantalla de inicio y agrégala de nuevo desde Safari (Compartir → Agregar a
              inicio) para que vuelva a preguntar.
            </p>
          )}
        </section>

        {/* Seguridad */}
        <section className="card flex items-center gap-3 p-4">
          <Shield size={18} className="shrink-0" style={{ color: "var(--accent-text)" }} aria-hidden="true" />
          <p className="text-sm text-secondary">Entraste con Google. Ambos ven los datos del hogar, salvo lo que marques como personal o privado.</p>
        </section>

        {/* Cerrar sesión */}
        <button
          onClick={cerrarSesion}
          className="btn btn-secondary w-full text-secondary hover:!border-[color-mix(in_srgb,var(--danger)_40%,transparent)] hover:!text-[var(--danger)]"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>

      </div>
    </main>
  )
}
