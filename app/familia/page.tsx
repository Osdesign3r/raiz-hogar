"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Miembro } from "@/lib/types"
import { UserPlus, Trash2, User } from "lucide-react"

const ROL_OPTIONS = ["Padre", "Madre", "Hijo", "Hija", "Otro"]

export default function FamiliaPage() {
  const [miembros,  setMiembros]  = useState<Miembro[]>([])
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [nombre,    setNombre]    = useState("")
  const [rol,       setRol]       = useState("Otro")

  const cargar = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from("miembros")
      .select("*")
      .order("created_at")
    if (!err) setMiembros(data ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const agregar = async () => {
    if (!nombre.trim()) return
    setGuardando(true)
    setError(null)

    const { error: err } = await supabase
      .from("miembros")
      .insert({ nombre: nombre.trim(), rol })

    if (err) {
      setError("No se pudo agregar el miembro.")
    } else {
      setNombre("")
      setRol("Otro")
      await cargar()
    }
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    const { error: err } = await supabase.from("miembros").delete().eq("id", id)
    if (!err) setMiembros(prev => prev.filter(m => m.id !== id))
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="max-w-md mx-auto">

        <h1 className="text-2xl font-bold mb-6">Familia</h1>

        {/* Miembros */}
        {loading ? (
          <div className="space-y-3 mb-8">
            {[1,2].map(i => (
              <div key={i} className="bg-slate-900 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {miembros.map(m => (
              <div key={m.id} className="bg-slate-900 rounded-xl p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                    <User size={18} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{m.nombre}</p>
                    <p className="text-xs text-slate-400">{m.rol}</p>
                  </div>
                </div>
                <button
                  onClick={() => eliminar(m.id)}
                  className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formulario */}
        <div className="bg-slate-900 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Agregar miembro</p>

          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && agregar()}
            placeholder="Nombre"
            className="w-full p-3 rounded-lg bg-slate-800 placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-purple-500"
          />

          <select
            value={rol}
            onChange={e => setRol(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-purple-500"
          >
            {ROL_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            onClick={agregar}
            disabled={guardando || !nombre.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            <UserPlus size={16} />
            {guardando ? "Guardando..." : "Agregar"}
          </button>
        </div>

      </div>
    </main>
  )
}
