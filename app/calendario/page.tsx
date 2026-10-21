"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import type { Evento, EventoInsert, EventoTipo, Perfil } from "@/lib/types"
import {
  CalendarPlus, Trash2, Calendar, ListChecks, Check, AlertTriangle, Pencil, Plus, Clock3, User, Leaf,
} from "lucide-react"
import { createNotification } from "@/lib/notifications"
import ConfirmDialog from "@/components/ConfirmDialog"
import Sheet from "@/components/Sheet"
import PageHeader from "@/components/PageHeader"
import EmptyState from "@/components/EmptyState"
import { fechaLocal } from "@/lib/fecha"
import { primerNombre, fechaCorta } from "@/lib/texto"

const hoy = () => fechaLocal()

const limiteSemana = () => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return fechaLocal(d)
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

  const miNombre = primerNombre(perfiles.find(p => p.id === userId)?.nombre, "Tu pareja")
  const otroPerfil = useMemo(() => perfiles.find(p => p.id !== userId) ?? null, [perfiles, userId])
  const esYo = useCallback((id: string | null) => !!id && id === userId, [userId])
  const nombreAsignado = useCallback(
    (id: string | null) => id === null ? "Ambos" : esYo(id) ? "Tú" : primerNombre(perfiles.find(p => p.id === id)?.nombre),
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
      setError("No pudimos guardar los cambios. Inténtalo de nuevo.")
    } else {
      if (esNuevo && otroPerfil) {
        await createNotification(
          otroPerfil.id,
          payload.tipo,
          `${miNombre} agregó ${payload.tipo === "tarea" ? "una tarea" : "un evento"}`,
          `${payload.titulo}${payload.fecha ? " · " + fechaCorta(payload.fecha) : ""}`,
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
          `${miNombre} completó una tarea`,
          e.titulo,
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
    <li
      key={e.id}
      className={`card flex items-center justify-between gap-1 p-3 pl-3.5 ${
        destacarAtrasado ? "tone-danger" : ""
      } ${e.completado ? "opacity-70" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {e.tipo === "tarea" ? (
          // Área táctil de 44px alrededor de un círculo visual de 24px
          <button
            onClick={() => marcarCompletado(e)}
            role="checkbox"
            aria-checked={!!e.completado}
            aria-label={`${e.completado ? "Reabrir" : "Completar"}: ${e.titulo}`}
            className="-ml-1.5 flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
              e.completado
                ? "border-[var(--success)] bg-[var(--success)]"
                : "border-[var(--border-strong)] hover:border-[var(--text-muted)]"
            }`}>
              {e.completado && <Check size={14} strokeWidth={3} className="text-[#06210f]" />}
            </span>
          </button>
        ) : (
          <span
            className={`mx-1.5 h-3 w-3 shrink-0 rounded-full ${COLOR_DOT[e.color] ?? "bg-slate-500"}`}
            aria-hidden="true"
          />
        )}
        <div className="min-w-0">
          <p className={`line-clamp-2 font-semibold leading-snug ${e.completado ? "text-muted line-through" : ""}`}>
            {e.titulo}
          </p>
          {e.descripcion && (
            <p className="mt-0.5 line-clamp-2 text-sm text-secondary">{e.descripcion}</p>
          )}
          <p className="mt-1 flex items-center gap-3 text-sm text-muted">
            {e.hora && (
              <span className="num flex items-center gap-1">
                <Clock3 size={13} aria-hidden="true" />{e.hora.slice(0, 5)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User size={13} aria-hidden="true" />{nombreAsignado(e.asignado_a)}
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0">
        <button onClick={() => editarEvento(e)} className="icon-btn is-accent" aria-label={`Editar ${e.titulo}`}>
          <Pencil size={18} />
        </button>
        <button onClick={() => setAEliminar(e)} className="icon-btn is-danger" aria-label={`Eliminar ${e.titulo}`}>
          <Trash2 size={18} />
        </button>
      </div>
    </li>
  )

  return (
    <main className="page-shell">
      <div className="page">

        <PageHeader title="Agenda" subtitle="Lo que necesita atención en casa" />

        <div className="mb-6 grid grid-cols-3 gap-2.5">
          <div className={`card p-3.5 ${atrasados.length > 0 ? "tone-danger" : ""}`}>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted"><AlertTriangle size={13} /> Atrasado</p>
            <p className={`num font-display text-2xl font-semibold ${atrasados.length > 0 ? "text-danger" : ""}`}>{atrasados.length}</p>
          </div>
          <div className="card p-3.5">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted"><Clock3 size={13} /> Hoy</p>
            <p className="num font-display text-2xl font-semibold">{hoyCount}</p>
          </div>
          <div className="card p-3.5">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted"><Calendar size={13} /> 7 días</p>
            <p className="num font-display text-2xl font-semibold">{semanaCount}</p>
          </div>
        </div>

        {/* Filtro evento / tarea — solo visible cuando hay algo que filtrar */}
        {!loading && eventos.length > 0 && (
          <div className="mb-5 grid grid-cols-3 gap-2" role="group" aria-label="Filtrar por tipo">
            {(["todos", "evento", "tarea"] as const).map(f => (
              <button key={f} onClick={() => setFiltroTipo(f)} aria-pressed={filtroTipo === f} className="chip">
                {f === "todos" ? "Todo" : f === "evento" ? "Eventos" : "Tareas"}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-[76px]" />)}
          </div>
        ) : (
          <>
            {atrasados.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-bold uppercase tracking-wider text-danger">
                  <AlertTriangle size={14} /> Quedó pendiente
                </h2>
                <ul className="space-y-2">{atrasados.map(e => renderItem(e, true))}</ul>
              </section>
            )}

            {Object.keys(proximosPorFecha).length === 0 ? (
              <EmptyState
                icon={Leaf}
                title={
                  filtroTipo === "todos" ? "La casa está en calma" :
                  filtroTipo === "evento" ? "No hay eventos próximos" :
                  "No hay tareas pendientes"
                }
                description={
                  filtroTipo === "todos"
                    ? "Cuando agreguen un evento o una tarea, aparecerá aquí."
                    : "Prueba con otro filtro."
                }
              />
            ) : (
              <div className="space-y-5">
                {Object.entries(proximosPorFecha).map(([f, evts]) => (
                  <section key={f}>
                    <h2 className="section-label mb-2 pl-1">{formatFecha(f)}</h2>
                    <ul className="space-y-2">{evts.map(e => renderItem(e))}</ul>
                  </section>
                ))}
              </div>
            )}

            {completadas.length > 0 && (
              <section className="mt-7">
                <h2 className="section-label mb-2 pl-1">
                  Completadas (últimos {DIAS_VISIBLES_COMPLETADAS} días)
                </h2>
                <ul className="space-y-2">{completadas.map(e => renderItem(e))}</ul>
              </section>
            )}
          </>
        )}

        {!modalAbierto && (
          <button onClick={abrirNuevo} className="fab" aria-label="Agregar evento o tarea">
            <Plus size={26} />
          </button>
        )}

        <Sheet open={modalAbierto} onClose={cerrarModal} title={editandoId ? (tipo === "tarea" ? "Editar tarea" : "Editar evento") : (tipo === "tarea" ? "Nueva tarea" : "Nuevo evento")}>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
            <button onClick={() => setTipo("evento")} aria-pressed={tipo === "evento"} className="chip !rounded-2xl">
              <Calendar size={16} /> Evento
            </button>
            <button onClick={() => setTipo("tarea")} aria-pressed={tipo === "tarea"} className="chip !rounded-2xl">
              <ListChecks size={16} /> Tarea
            </button>
          </div>

          <div>
            <label htmlFor="e-titulo" className="field-label">Título</label>
            <input
              id="e-titulo"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && guardar()}
              placeholder={tipo === "tarea" ? "¿Qué hay que hacer?" : "¿Qué tienen planeado?"}
              autoFocus
              className="field"
            />
          </div>

          <div>
            <label htmlFor="e-desc" className="field-label">Detalles (opcional)</label>
            <input
              id="e-desc"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej. qué materiales llevar"
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label htmlFor="e-fecha" className="field-label">Fecha</label>
              <input id="e-fecha" value={fecha} onChange={e => setFecha(e.target.value)} type="date" className="field min-w-0" />
            </div>
            <div className="min-w-0">
              <label htmlFor="e-hora" className="field-label">Hora</label>
              <input id="e-hora" value={hora} onChange={e => setHora(e.target.value)} type="time" className="field min-w-0" />
            </div>
          </div>

          <fieldset>
            <legend className="field-label">¿Quién se encarga?</legend>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setAsignadoA(userId)} aria-pressed={asignadoA === userId} className="chip !rounded-2xl truncate">
                A mí
              </button>
              <button
                onClick={() => setAsignadoA(otroPerfil?.id ?? null)}
                aria-pressed={!!otroPerfil && asignadoA === otroPerfil.id}
                className="chip !rounded-2xl truncate"
              >
                {otroPerfil ? otroPerfil.nombre : "Pareja"}
              </button>
              <button onClick={() => setAsignadoA(null)} aria-pressed={asignadoA === null} className="chip !rounded-2xl truncate">
                Ambos
              </button>
            </div>
          </fieldset>

          {tipo === "evento" && (
            <fieldset>
              <legend className="field-label">Color</legend>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    aria-label={c.label}
                    aria-pressed={color === c.value}
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${c.cls} transition-all ${
                      color === c.value
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--surface)]"
                        : "opacity-80"
                    }`}>
                      {color === c.value && <Check size={16} strokeWidth={3} className="text-white drop-shadow" aria-hidden="true" />}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando || !titulo.trim() || !fecha}
            className="btn btn-primary w-full"
          >
            <CalendarPlus size={18} />
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : tipo === "tarea" ? "Agregar tarea" : "Agregar evento"}
          </button>
        </Sheet>

        <ConfirmDialog
          open={!!aEliminar}
          title={aEliminar?.tipo === "tarea" ? "¿Eliminar tarea?" : "¿Eliminar evento?"}
          message={aEliminar ? `Se eliminará "${aEliminar.titulo}". No se puede deshacer.` : ""}
          onCancel={() => setAEliminar(null)}
          onConfirm={() => aEliminar && eliminarConfirmado(aEliminar)}
        />

      </div>
    </main>
  )
}
