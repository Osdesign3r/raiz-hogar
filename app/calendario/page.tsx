"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import type { Evento, EventoInsert, EventoTipo, Perfil } from "@/lib/types"
import {
  CalendarPlus, Trash2, Calendar, ListChecks, Check, AlertTriangle, Pencil, X, Plus, Clock3,
} from "lucide-react"
import { createNotification } from "@/lib/notifications"
import ConfirmDialog from "@/components/ConfirmDialog"

const hoy = () => new Date().toISOString().split("T")[0]

const limiteSemana = () => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split("T")[0]
}

const COLOR_OPTIONS = [
  { value: "blue",   label: "Azul",    cls: "bg-blue-500"   },
  { value: "green",  label: "Verde",   cls: "bg-green-500"  },
  { value: "red",    label: "Rojo",    cls: "bg-red-500"    },
  { value: "yellow", label: "Amarillo",cls: "bg-yellow-500" },
  { value: "purple", label: "Morado",  cls: "bg-purple-500" },
]

const COLOR_DOT: Record<string, string> = {
  blue: "bg-blue-500", green: "bg-green-500", red: "bg-red-500",
  yellow: "bg-yellow-500", purple: "bg-purple-500",
}

const formatFecha = (f: string) =>
  new Date(f + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })

const DIAS_VISIBLES_COMPLETADAS = 7

export default function CalendarioPage() {
  const [eventos,   setEventos]   = useState<Evento[]>([])
  const [perfiles,  setPerfiles]  = useState<Perfil[]>([])
  const [userId,    setUserId]    = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [hojaVisible,  setHojaVisible]  = useState(false)
  const [aEliminar,    setAEliminar]    = useState<Evento | null>(null)

  const [titulo,      setTitulo]      = useState("")
  const [fecha,        setFecha]       = useState(hoy())
  const [hora,         setHora]        = useState("")
  const [color,        setColor]       = useState("blue")
  const [tipo,         setTipo]        = useState<EventoTipo>("evento")
  const [asignadoA,    setAsignadoA]   = useState<string | null>(null) // null = ambos
  const [descripcion,  setDescripcion] = useState("")
  const [editandoId,   setEditandoId]  = useState<string | null>(null)

  const refrescarEventos = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("eventos")
      .select("*")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true })
    if (!err) setEventos(data ?? [])
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: { user } }, { data: perfilesData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("perfiles").select("id, nombre, email, avatar_url, accent_color, created_at"),
    ])
    setUserId(user?.id ?? null)
    setPerfiles(perfilesData ?? [])
    await refrescarEventos()
    setLoading(false)
  }, [refrescarEventos])

  useEffect(() => {
    cargar()

    const channel = supabase
      .channel("eventos")
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, () => {
        refrescarEventos()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cargar, refrescarEventos])

  useEffect(() => {
    if (modalAbierto) {
      const t = setTimeout(() => setHojaVisible(true), 10)
      return () => clearTimeout(t)
    }
    setHojaVisible(false)
  }, [modalAbierto])

  const otroPerfil = useMemo(() => perfiles.find(p => p.id !== userId) ?? null, [perfiles, userId])
  const esYo = useCallback((id: string | null) => !!id && id === userId, [userId])
  const nombreAsignado = useCallback(
    (id: string | null) => id === null ? "Ambos" : esYo(id) ? "Ti" : (perfiles.find(p => p.id === id)?.nombre ?? "tu pareja"),
    [perfiles, esYo]
  )

  const cancelarEdicion = useCallback(() => {
    setEditandoId(null)
    setTitulo("")
    setFecha(hoy())
    setHora("")
    setColor("blue")
    setTipo("evento")
    setAsignadoA(null)
    setDescripcion("")
  }, [])

  const abrirNuevo = () => {
    cancelarEdicion()
    setModalAbierto(true)
  }

  const editarEvento = (e: Evento) => {
    setEditandoId(e.id)
    setTitulo(e.titulo)
    setFecha(e.fecha)
    setHora(e.hora || "")
    setColor(e.color)
    setTipo(e.tipo)
    setAsignadoA(e.asignado_a)
    setDescripcion(e.descripcion || "")
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    cancelarEdicion()
  }

  const guardar = async () => {
    if (!titulo.trim() || !fecha) return
    setGuardando(true)
    setError(null)

    const esNuevo = !editandoId

    const payload: EventoInsert = {
      titulo:      titulo.trim(),
      fecha,
      hora:        hora || null,
      descripcion: descripcion.trim() || null,
      color,
      tipo,
      asignado_a:  asignadoA,
      recordatorio_minutos_antes: null,
    }

    const res = editandoId
      ? await supabase.from("eventos").update(payload).eq("id", editandoId)
      : await supabase.from("eventos").insert(payload)

    if (res.error) {
      setError("No se pudo guardar.")
    } else {
      if (esNuevo && otroPerfil) {
        await createNotification(
          otroPerfil.id,
          payload.tipo,
          payload.tipo === "tarea" ? "Nueva tarea" : "Nuevo evento",
          `${payload.titulo}${payload.fecha ? " · " + payload.fecha : ""}`,
          { titulo: payload.titulo, fecha: payload.fecha, tipo: payload.tipo }
        )
      }
      setModalAbierto(false)
      cancelarEdicion()
      await refrescarEventos()
    }
    setGuardando(false)
  }

  const eliminarConfirmado = async (e: Evento) => {
    const { error: err } = await supabase.from("eventos").delete().eq("id", e.id)
    if (!err) {
      setEventos(prev => prev.filter(ev => ev.id !== e.id))
      if (editandoId === e.id) cerrarModal()
    }
    setAEliminar(null)
  }

  const marcarCompletado = async (e: Evento) => {
    const completado = !e.completado
    const completado_at = completado ? new Date().toISOString() : null
    const { error: err } = await supabase
      .from("eventos")
      .update({ completado, completado_at })
      .eq("id", e.id)
    if (!err) {
      setEventos(prev => prev.map(ev => ev.id === e.id ? { ...ev, completado, completado_at } : ev))
      if (completado && otroPerfil) {
        await createNotification(
          otroPerfil.id,
          "tarea_completada",
          "Tarea completada",
          `✅ ${e.titulo}`,
          { titulo: e.titulo }
        )
      }
    }
  }

  const atrasados = useMemo(
    () => eventos.filter(e => e.tipo === "tarea" && !e.completado && e.fecha < hoy()),
    [eventos]
  )
  const proximos = useMemo(
    () => eventos.filter(e => e.fecha >= hoy() && !(e.tipo === "tarea" && e.completado)),
    [eventos]
  )
  const completadas = useMemo(() => {
    const limite = new Date()
    limite.setDate(limite.getDate() - DIAS_VISIBLES_COMPLETADAS)
    return eventos.filter(e =>
      e.tipo === "tarea" && e.completado && e.completado_at && new Date(e.completado_at) >= limite
    )
  }, [eventos])

  const hoyCount = useMemo(
    () => eventos.filter(e => e.fecha === hoy() && !(e.tipo === "tarea" && e.completado)).length,
    [eventos]
  )
  const semanaCount = useMemo(() => {
    const limite = limiteSemana()
    return eventos.filter(e => e.fecha > hoy() && e.fecha <= limite && !(e.tipo === "tarea" && e.completado)).length
  }, [eventos])

  // Filtro por tipo — todos muestra la vista mezclada actual, evento y
  // tarea restringen la lista. Se aplica sobre proximos, no sobre atrasados
  // (los atrasados siempre son tareas — no tiene sentido filtrarlos).
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "evento" | "tarea">("todos")

  const proximosFiltrados = useMemo(
    () => filtroTipo === "todos" ? proximos : proximos.filter(e => e.tipo === filtroTipo),
    [proximos, filtroTipo]
  )

  const proximosPorFecha = proximosFiltrados.reduce<Record<string, Evento[]>>((acc, e) => {
    if (!acc[e.fecha]) acc[e.fecha] = []
    acc[e.fecha].push(e)
    return acc
  }, {})

  const renderItem = (e: Evento, destacarAtrasado = false) => (
    <div
      key={e.id}
      className={`rounded-xl p-4 flex items-center justify-between gap-2 group ${
        destacarAtrasado ? "bg-red-500/10 border border-red-500/30" : "surface border-subtle"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {e.tipo === "tarea" ? (
          <button onClick={() => marcarCompletado(e)} className="shrink-0">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
              e.completado ? "bg-green-500 border-green-500" : "border-white/15 hover:border-white/30"
            }`}>
              {e.completado && <Check size={12} className="text-white" />}
            </div>
          </button>
        ) : (
          <div className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT[e.color] ?? "bg-slate-500"}`} />
        )}
        <div className="min-w-0">
          <p className={`font-medium text-sm truncate ${e.completado ? "line-through text-muted" : ""}`}>
            {e.titulo}
          </p>
          {e.descripcion && (
            <p className="text-xs text-muted mt-1 line-clamp-2">{e.descripcion}</p>
          )}
          <p className="text-xs text-muted flex items-center gap-2 mt-1">
            {e.hora && (<><span>🕒</span><span>{e.hora.slice(0, 5)}</span></>)}
            <span>👤</span>
            <span>{nombreAsignado(e.asignado_a)}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => editarEvento(e)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-[var(--accent)] hover:bg-[var(--surface-2)] active:opacity-70 transition"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => setAEliminar(e)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-red-400 hover:bg-[var(--surface-2)] active:opacity-70 transition"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen p-4 pb-28">
      <div className="max-w-md mx-auto">

        <h1 className="text-2xl font-bold mb-1">Agenda Familiar</h1>
        <p className="text-sm text-muted mb-4">Lo que necesita atención en casa</p>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className={`rounded-xl p-3 ${atrasados.length > 0 ? "bg-red-500/10 border border-red-500/30" : "surface border-subtle"}`}>
            <p className="text-[11px] text-muted flex items-center gap-1 mb-1"><AlertTriangle size={11} /> Atrasado</p>
            <p className={`font-bold text-lg ${atrasados.length > 0 ? "text-red-400" : ""}`}>{atrasados.length}</p>
          </div>
          <div className="surface border-subtle rounded-xl p-3">
            <p className="text-[11px] text-muted flex items-center gap-1 mb-1"><Clock3 size={11} /> Hoy</p>
            <p className="font-bold text-lg">{hoyCount}</p>
          </div>
          <div className="surface border-subtle rounded-xl p-3">
            <p className="text-[11px] text-muted flex items-center gap-1 mb-1"><Calendar size={11} /> 7 días</p>
            <p className="font-bold text-lg">{semanaCount}</p>
          </div>
        </div>

        {/* Filtro evento / tarea — solo visible cuando hay algo que filtrar */}
        {!loading && eventos.length > 0 && (
          <div className="flex gap-2 mb-4">
            {(["todos", "evento", "tarea"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroTipo(f)}
                className={"flex-1 p-2 rounded-lg text-xs font-medium transition " + (
                  filtroTipo === f ? "text-white" : "bg-[var(--surface-2)] text-muted hover:opacity-80"
                )}
                style={filtroTipo === f ? { background: "var(--accent)" } : undefined}
              >
                {f === "todos" ? "Todo" : f === "evento" ? "Eventos" : "Tareas"}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="surface border-subtle rounded-xl h-16 animate-pulse" />)}
          </div>
        ) : (
          <>
            {atrasados.length > 0 && (
              <div className="mb-5">
                <p className="text-xs text-red-400 font-medium uppercase tracking-wide mb-2 pl-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Se quedó pendiente
                </p>
                <div className="space-y-2">{atrasados.map(e => renderItem(e, true))}</div>
              </div>
            )}

            {Object.keys(proximosPorFecha).length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🌿</div>
                <p className="text-base font-medium text-secondary">
                  {filtroTipo === "todos" ? "La casa está en calma" :
                   filtroTipo === "evento" ? "No hay eventos próximos" :
                   "No hay tareas pendientes"}
                </p>
                <p className="text-sm text-muted mt-1">
                  {filtroTipo === "todos"
                    ? "No hay tareas pendientes ni eventos próximos"
                    : "Prueba cambiando el filtro"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(proximosPorFecha).map(([f, evts]) => (
                  <div key={f}>
                    <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 pl-1">
                      {formatFecha(f)}
                    </p>
                    <div className="space-y-2">{evts.map(e => renderItem(e))}</div>
                  </div>
                ))}
              </div>
            )}

            {completadas.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-muted uppercase tracking-wide mb-2">
                  Completadas (últimos {DIAS_VISIBLES_COMPLETADAS} días)
                </p>
                <div className="space-y-2">{completadas.map(e => renderItem(e))}</div>
              </div>
            )}
          </>
        )}

        {!modalAbierto && (
          <button
            onClick={abrirNuevo}
            className="fixed bottom-[88px] right-4 w-14 h-14 rounded-full accent-gradient shadow-lg flex items-center justify-center z-40 text-white"
          >
            <Plus size={26} />
          </button>
        )}

        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={cerrarModal} />
            <div
              className={`relative w-full max-w-md surface rounded-t-3xl p-4 pb-20 max-h-[85dvh] overflow-y-auto space-y-3 transition-transform duration-300 ease-out ${
                hojaVisible ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="flex items-center justify-between sticky top-0 surface pb-1">
                <p className="text-sm font-semibold">{editandoId ? "Corrigiendo plan" : "Nuevo"}</p>
                <button onClick={cerrarModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-secondary transition">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTipo("evento")}
                  className={`p-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    tipo === "evento" ? "text-white" : "bg-[var(--surface-2)] text-muted hover:opacity-80"
                  }`}
                  style={tipo === "evento" ? { background: "var(--accent)" } : undefined}
                >
                  <Calendar size={13} /> Evento
                </button>
                <button
                  onClick={() => setTipo("tarea")}
                  className={`p-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    tipo === "tarea" ? "text-white" : "bg-[var(--surface-2)] text-muted hover:opacity-80"
                  }`}
                  style={tipo === "tarea" ? { background: "var(--accent)" } : undefined}
                >
                  <ListChecks size={13} /> Tarea
                </button>
              </div>

              <input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && guardar()}
                placeholder={tipo === "tarea" ? "¿Qué hay que hacer?" : "¿Qué tienen planeado?"}
                autoFocus
                className="w-full p-3 rounded-lg bg-[var(--surface-2)] placeholder:text-muted text-sm outline-none focus:ring-1"
                style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
              />

              <input
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Detalles (opcional) — ej. qué materiales llevar"
                className="w-full p-3 rounded-lg bg-[var(--surface-2)] placeholder:text-muted text-sm outline-none focus:ring-1"
                style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  type="date"
                  className="p-3 rounded-lg bg-[var(--surface-2)] text-sm text-secondary outline-none focus:ring-1 min-w-0"
                  style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
                />
                <input
                  value={hora}
                  onChange={e => setHora(e.target.value)}
                  type="time"
                  className="p-3 rounded-lg bg-[var(--surface-2)] text-sm text-secondary outline-none focus:ring-1 min-w-0"
                  style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
                />
              </div>

              <p className="text-xs text-muted pt-1">¿A quién le compete?</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setAsignadoA(userId)}
                  className={`p-2.5 rounded-lg text-[11px] font-medium transition truncate ${
                    asignadoA === userId ? "text-white" : "bg-[var(--surface-2)] text-muted hover:opacity-80"
                  }`}
                  style={asignadoA === userId ? { background: "var(--accent)" } : undefined}
                >
                  A mí
                </button>
                <button
                  onClick={() => setAsignadoA(otroPerfil?.id ?? null)}
                  className={`p-2.5 rounded-lg text-[11px] font-medium truncate transition ${
                    asignadoA === otroPerfil?.id && otroPerfil ? "text-white" : "bg-[var(--surface-2)] text-muted hover:opacity-80"
                  }`}
                  style={asignadoA === otroPerfil?.id && otroPerfil ? { background: "var(--accent)", opacity: 0.75 } : undefined}
                >
                  {otroPerfil ? otroPerfil.nombre : "Pareja"}
                </button>
                <button
                  onClick={() => setAsignadoA(null)}
                  className={`p-2.5 rounded-lg text-[11px] font-medium truncate transition ${
                    asignadoA === null ? "text-white" : "bg-[var(--surface-2)] text-muted hover:opacity-80"
                  }`}
                  style={asignadoA === null ? { background: "var(--accent)", opacity: 0.55 } : undefined}
                >
                  Ambos
                </button>
              </div>

              {tipo === "evento" && (
                <div className="flex gap-3 pt-1 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      aria-label={c.label}
                      className={`w-9 h-9 rounded-full ${c.cls} transition-all shrink-0 ${
                        color === c.value ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "opacity-50"
                      }`}
                    />
                  ))}
                </div>
              )}

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={guardar}
                disabled={guardando || !titulo.trim() || !fecha}
                className="w-full accent-gradient disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition text-white"
              >
                <CalendarPlus size={16} />
                {guardando ? "Guardando..." : editandoId ? "Actualizar" : tipo === "tarea" ? "Agregar tarea" : "Agregar evento"}
              </button>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!aEliminar}
          message="¿Eliminar este elemento? Esta acción no se puede deshacer."
          onCancel={() => setAEliminar(null)}
          onConfirm={() => aEliminar && eliminarConfirmado(aEliminar)}
        />

      </div>
    </main>
  )
}