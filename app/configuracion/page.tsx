"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/useUser"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, Save, User, Shield, Palette, Users, ChevronRight } from "lucide-react"
import { ACCENT_COLORS, getAccentByValue, type AccentColor } from "@/lib/colors"

type Perfil = { id: string; nombre: string; email: string; avatar_url: string | null; accent_color: string }

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