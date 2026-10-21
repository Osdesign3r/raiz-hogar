"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Miembro } from "@/lib/types"
import { UserPlus, Trash2, Pencil, Plus, UserRound, Baby, PawPrint, UsersRound, type LucideIcon } from "lucide-react"
import ConfirmDialog from "@/components/ConfirmDialog"
import Sheet from "@/components/Sheet"
import PageHeader from "@/components/PageHeader"
import EmptyState from "@/components/EmptyState"

const ROL_OPTIONS = ["Padre", "Madre", "Hijo", "Hija", "Mascota", "Otro"]

const ROL_ICON: Record<string, LucideIcon> = {
  Padre: UserRound, Madre: UserRound, Hijo: Baby, Hija: Baby, Mascota: PawPrint, Otro: UserRound,
}

export default function FamiliaPage() {
  const [miembros,  setMiembros]  = useState<Miembro[]>([])
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [aEliminar,    setAEliminar]    = useState<Miembro | null>(null)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombre,          setNombre]          = useState("")
  const [rol,             setRol]             = useState("Otro")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [notas,           setNotas]           = useState("")

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

  const limpiarFormulario = useCallback(() => {
    setEditandoId(null)
    setNombre("")
    setRol("Otro")
    setFechaNacimiento("")
    setNotas("")
  }, [])

  const abrirNuevo = () => {
    limpiarFormulario()
    setModalAbierto(true)
  }

  const editarMiembro = (m: Miembro) => {
    setEditandoId(m.id)
    setNombre(m.nombre)
    setRol(m.parentesco)
    setFechaNacimiento(m.fecha_nacimiento ?? "")
    setNotas(m.notas ?? "")
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

    const payload = {
      nombre:           nombre.trim(),
      parentesco:       rol,
      fecha_nacimiento: fechaNacimiento || null,
      notas:            notas.trim() || null,
    }

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

  const eliminarConfirmado = async (m: Miembro) => {
    const { error: err } = await supabase.from("miembros").delete().eq("id", m.id)
    if (!err) {
      setMiembros(prev => prev.filter(x => x.id !== m.id))
      if (editandoId === m.id) cerrarModal()
    } else {
      setError("No se pudo eliminar el miembro.")
    }
    setAEliminar(null)
  }

  return (
    <main className="page-shell">
      <div className="page">

        <PageHeader title="Miembros del hogar" backHref="/configuracion" />

        {error && !modalAbierto && (
          <div role="alert" className="card tone-danger mb-4 p-3.5 text-sm text-danger">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            {[1, 2].map(i => <div key={i} className="skeleton h-[72px]" />)}
          </div>
        ) : miembros.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Aún no has agregado a nadie"
            description="Hijos, mascotas — quien sea que viva en la casa"
          />
        ) : (
          <ul className="space-y-2">
            {miembros.map(m => {
              const Icon = ROL_ICON[m.parentesco] ?? UserRound
              return (
                <li key={m.id} className="card flex items-center justify-between gap-3 p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                      <Icon size={22} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{m.nombre}</p>
                      <p className="text-sm text-muted">{m.parentesco}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <button onClick={() => editarMiembro(m)} className="icon-btn is-accent" aria-label={`Editar a ${m.nombre}`}>
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => setAEliminar(m)} className="icon-btn is-danger" aria-label={`Eliminar a ${m.nombre}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!modalAbierto && (
          <button onClick={abrirNuevo} className="fab" aria-label="Agregar miembro">
            <Plus size={26} />
          </button>
        )}

        <Sheet open={modalAbierto} onClose={cerrarModal} title={editandoId ? "Editando miembro" : "Agregar miembro"}>
          <div>
            <label htmlFor="m-nombre" className="field-label">Nombre</label>
            <input
              id="m-nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === "Enter" && guardar()}
              placeholder="Nombre"
              autoFocus
              className="field"
            />
          </div>

          <fieldset>
            <legend className="field-label">Rol</legend>
            <div className="grid grid-cols-3 gap-2">
              {ROL_OPTIONS.map(r => {
                const Icon = ROL_ICON[r]
                return (
                  <button key={r} onClick={() => setRol(r)} aria-pressed={rol === r} className="chip !rounded-2xl">
                    <Icon size={15} aria-hidden="true" /> {r}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="m-nac" className="field-label">Fecha de nacimiento (opcional)</label>
            <input
              id="m-nac"
              value={fechaNacimiento}
              onChange={e => setFechaNacimiento(e.target.value)}
              type="date"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="m-notas" className="field-label">Notas (opcional)</label>
            <textarea
              id="m-notas"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Alergias, médico, colegio..."
              rows={2}
              className="field"
            />
          </div>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando || !nombre.trim()}
            className="btn btn-primary w-full"
          >
            <UserPlus size={18} />
            {guardando ? "Guardando..." : editandoId ? "Actualizar" : "Agregar"}
          </button>
        </Sheet>

        <ConfirmDialog
          open={!!aEliminar}
          title="¿Eliminar miembro?"
          message={aEliminar ? `Se eliminará a "${aEliminar.nombre}". Sus documentos no se borran, solo quedan sin asignar.` : ""}
          onCancel={() => setAEliminar(null)}
          onConfirm={() => aEliminar && eliminarConfirmado(aEliminar)}
        />

      </div>
    </main>
  )
}
