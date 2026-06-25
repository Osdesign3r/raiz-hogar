"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Miembro } from "@/lib/types"
import { UserPlus, Trash2, Pencil, User, X, Plus } from "lucide-react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

const ROL_OPTIONS = ["Padre", "Madre", "Hijo", "Hija", "Mascota", "Otro"]

const ROL_EMOJI: Record<string, string> = {
  Padre: "👨", Madre: "👩", Hijo: "👦", Hija: "👧", Mascota: "🐾", Otro: "👤",
}

export default function FamiliaPage() {
  const [miembros,  setMiembros]  = useState<Miembro[]>([])
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [hojaVisible,  setHojaVisible]  = useState(false)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombre,     setNombre]     = useState("")
  const [rol,        setRol]        = useState("Otro")

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from("miembros")
      .select("*")
      .order("created_at")
    if (!err) setMiembros(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (modalAbierto) {
      const t = setTimeout(() => setHojaVisible(true), 10)
      return () => clearTimeout(t)
    }
    setHojaVisible(false)
  }, [modalAbierto])

  const limpiarFormulario = useCallback(() => {
    setEditandoId(null)
    setNombre("")
    setRol("Otro")
  }, [])

  const abrirNuevo = () => {
    limpiarFormulario()
    setModalAbierto(true)
  }

  const editarMiembro = (m: Miembro) => {
    setEditandoId(m.id)
    setNombre(m.nombre)
    setRol(m.parentesco)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    limpiarFormulario()
  }

  const guardar = async () => {
    if (!nombre.trim()) return
    setGuardando(true)
    setError(null)

    const payload = { nombre: nombre.trim(), parentesco: rol }

    const res = editandoId
      ? await supabase.from("miembros").update(payload).eq("id", editandoId)
      : await supabase.from("miembros").insert(payload)

    if (res.error) {
      setError("No se pudo guardar el miembro.")
    } else {
      setModalAbierto(false)
      limpiarFormulario()
      await cargar()
    }
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este miembro? Si tiene documentos asociados, revísalos antes — pueden quedar huérfanos.")) return
    const { error: err } = await supabase.from("miembros").delete().eq("id", id)
    if (!err) {
      setMiembros(prev => prev.filter(m => m.id !== id))
      if (editandoId === id) cerrarModal()
    } else {
      setError("No se pudo eliminar — probablemente tiene documentos vinculados.")
    }
  }

  return (
    <main className="min-h-screen p-4 pb-28">
      <div className="max-w-md mx-auto">

        <div className="flex items-center gap-2 mb-5">
          <Link href="/configuracion" className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-secondary hover:bg-[var(--surface-2)] transition shrink-0">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold">Miembros del hogar</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="surface border-subtle rounded-xl h-16 animate-pulse" />)}
          </div>
        ) : miembros.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">👨‍👩‍👧</div>
            <p className="text-base font-medium text-secondary">Aún no has agregado a nadie</p>
            <p className="text-sm text-muted mt-1">Hijos, mascotas — quien sea que viva en la casa</p>
          </div>
        ) : (
          <div className="space-y-2">
            {miembros.map(m => (
              <div key={m.id} className="surface border-subtle rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center shrink-0 text-lg">
                    {ROL_EMOJI[m.parentesco] ?? "👤"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{m.nombre}</p>
                    <p className="text-xs text-muted">{m.parentesco}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => editarMiembro(m)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-[var(--accent)] hover:bg-[var(--surface-2)] active:opacity-70 transition"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => eliminar(m.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-red-400 hover:bg-[var(--surface-2)] active:opacity-70 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botón flotante */}
        {!modalAbierto && (
          <button
            onClick={abrirNuevo}
            className="fixed bottom-[88px] right-4 w-14 h-14 rounded-full accent-gradient shadow-lg flex items-center justify-center z-40 text-white"
          >
            <Plus size={26} />
          </button>
        )}

        {/* Bottom sheet: formulario */}
        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={cerrarModal} />
            <div
              className={`relative w-full max-w-md surface rounded-t-3xl p-4 pb-20 max-h-[85dvh] overflow-y-auto space-y-3 transition-transform duration-300 ease-out ${
                hojaVisible ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="flex items-center justify-between sticky top-0 surface pb-1">
                <p className="text-sm font-semibold">{editandoId ? "Editando miembro" : "Agregar miembro"}</p>
                <button onClick={cerrarModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-secondary transition">
                  <X size={18} />
                </button>
              </div>

              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === "Enter" && guardar()}
                placeholder="Nombre"
                autoFocus
                className="w-full p-3 rounded-lg bg-[var(--surface-2)] placeholder:text-muted text-sm outline-none focus:ring-1"
                style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
              />

              <div className="grid grid-cols-3 gap-2">
                {ROL_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setRol(r)}
                    className={`p-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                      rol === r ? "text-white" : "bg-[var(--surface-2)] text-muted hover:opacity-80"
                    }`}
                    style={rol === r ? { background: "var(--accent)" } : undefined}
                  >
                    <span>{ROL_EMOJI[r]}</span> {r}
                  </button>
                ))}
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={guardar}
                disabled={guardando || !nombre.trim()}
                className="w-full accent-gradient disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition text-white"
              >
                <UserPlus size={16} />
                {guardando ? "Guardando..." : editandoId ? "Actualizar" : "Agregar"}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}