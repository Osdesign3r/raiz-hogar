"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/useUser"
import { useRouter } from "next/navigation"
import { LogOut, Save, User, Mail, Shield } from "lucide-react"

type Perfil = {
  id: string
  nombre: string
  email: string
  avatar_url: string | null
}

export default function ConfiguracionPage() {
  const { user, loading: authLoading } = useUser()
  const router = useRouter()

  const [perfil,    setPerfil]    = useState<Perfil | null>(null)
  const [nombre,    setNombre]    = useState("")
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado,  setGuardado]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const cargar = async () => {
      const { data } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (data) {
        setPerfil(data)
        setNombre(data.nombre ?? "")
      }
      setLoading(false)
    }

    cargar()
  }, [user])

  const guardar = async () => {
    if (!user || !nombre.trim()) return
    setGuardando(true)
    setError(null)

    const { error: err } = await supabase
      .from("perfiles")
      .update({ nombre: nombre.trim() })
      .eq("id", user.id)

    if (err) {
      setError("No se pudo guardar.")
    } else {
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
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
        <div className="max-w-md mx-auto space-y-4 mt-8">
          {[1,2,3].map(i => (
            <div key={i} className="bg-slate-900 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="max-w-md mx-auto">

        <h1 className="text-2xl font-bold mb-6">Configuración</h1>

        {/* Avatar + email */}
        <div className="bg-slate-900 rounded-xl p-4 mb-4 flex items-center gap-4">
          {perfil?.avatar_url ? (
            <img
              src={perfil.avatar_url}
              alt={perfil.nombre}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <User size={24} className="text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold truncate">{perfil?.nombre}</p>
            <p className="text-sm text-slate-400 truncate flex items-center gap-1">
              <Mail size={12} />
              {perfil?.email}
            </p>
          </div>
        </div>

        {/* Editar nombre */}
        <div className="bg-slate-900 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Tu nombre en la app</p>

          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guardar()}
            placeholder="Tu nombre"
            className="w-full p-3 rounded-lg bg-slate-800 placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando || !nombre.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            <Save size={15} />
            {guardando ? "Guardando..." : guardado ? "✓ Guardado" : "Guardar nombre"}
          </button>
        </div>

        {/* Info de seguridad */}
        <div className="bg-slate-900 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 text-slate-400">
            <Shield size={16} className="shrink-0 text-green-400" />
            <p className="text-xs">
              Autenticado con Google. Los datos del hogar son compartidos entre los dos usuarios.
            </p>
          </div>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={cerrarSesion}
          className="w-full bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 p-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>

      </div>
    </main>
  )
}
