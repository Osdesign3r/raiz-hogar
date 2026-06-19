"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import type { Evento, EventoInsert, EventoTipo, Perfil } from "@/lib/types"
import { CalendarPlus, Trash2, Calendar, ListChecks, Check, AlertTriangle, Pencil,
X } from "lucide-react"

const hoy = () => new Date().toISOString().split("T")[0]

const COLOR_OPTIONS = [
  { value: "blue",   label: "Azul",    cls: "bg-blue-500"   },
  { value: "green",  label: "Verde",   cls: "bg-green-500"  },
  { value: "red",    label: "Rojo",    cls: "bg-red-500"    },
  { value: "yellow", label: "Amarillo",cls: "bg-yellow-500" },
  { value: "purple", label: "Morado",  cls: "bg-purple-500" },
]

const COLOR_DOT: Record<string, string> = {
  blue:   "bg-blue-500",
  green:  "bg-green-500",
  red:    "bg-red-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
}

const formatFecha = (f: string) =>
  new Date(f + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "short", day: "numeric", month: "short"
  })

export default function CalendarioPage() {
  const [eventos,   setEventos]   = useState<Evento[]>([])
  const [perfiles,  setPerfiles]  = useState<Perfil[]>([])
  const [userId,    setUserId]    = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [titulo,      setTitulo]      = useState("")
  const [fecha,        setFecha]       = useState("")
  const [hora,         setHora]        = useState("")
  const [color,        setColor]       = useState("blue")
  const [tipo,         setTipo]        = useState<EventoTipo>("evento")
  const [asignadoA,    setAsignadoA]   = useState<string | null>(null) // null = ambos
  const [descripcion,  setDescripcion] = useState("")
  const [editandoId,setEditandoId]=useState<string|null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: { user } }, { data: perfilesData }, { data, error: err }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("perfiles").select("id, nombre, email, avatar_url, accent_color, created_at"),
      supabase
     .from("eventos")

.select("*")

.order("fecha", { ascending: true })

.order("hora", { ascending: true }),
    ])
    setUserId(user?.id ?? null)
    setPerfiles(perfilesData ?? [])
    if (!err) setEventos(data ?? [])
    setLoading(false)
  }, [])
useEffect(() => {
  setFecha(hoy())
}, [])
  useEffect(()=>{


cargar()



const channel = supabase


.channel("eventos")


.on(

'postgres_changes',

{

event:'*',

schema:'public',

table:'eventos'

},

()=>{

cargar()

}

)


.subscribe()



return ()=>{

supabase.removeChannel(channel)

}


},[cargar])

  const otroPerfil = useMemo(() => perfiles.find(p => p.id !== userId) ?? null, [perfiles, userId])
  const esYo = useCallback((id: string | null) => !!id && id === userId, [userId])
  const nombreAsignado = useCallback(
    (id: string | null) => id === null ? "Ambos" : esYo(id) ? "Ti" : (perfiles.find(p => p.id === id)?.nombre ?? "tu pareja"),
    [perfiles, esYo]
  )
const editarEvento=(e:Evento)=>{

setEditandoId(e.id)

setTitulo(e.titulo)

setFecha(e.fecha)

setHora(e.hora || "")

setColor(e.color)

setTipo(e.tipo)

setAsignadoA(e.asignado_a)

setDescripcion(e.descripcion || "")

}
const cancelarEdicion=()=>{

setEditandoId(null)

setTitulo("")

setFecha(hoy())

setHora("")

setColor("blue")

setTipo("evento")

setAsignadoA(null)

setDescripcion("")

}
  const guardar = async () => {
    if (!titulo.trim() || !fecha) return
    setGuardando(true)
    setError(null)

    const nuevo: EventoInsert = {
      titulo:       titulo.trim(),
      fecha,
      hora:         hora || null,
      descripcion:  descripcion.trim() || null,
      color,
      tipo,
      asignado_a:   asignadoA,
      recordatorio_minutos_antes: null,
    }

    const res = editandoId

? await supabase
.from("eventos")
.update(nuevo)
.eq("id",editandoId)

: await supabase
.from("eventos")
.insert(nuevo)

const err = res.error
    if(err){
      setError("No se pudo guardar.")
    } else {
      setEditandoId(null)
      setTitulo("")
      setFecha(hoy())
      setHora("")
      setColor("blue")
      setTipo("evento")
      setAsignadoA(null)
      setDescripcion("")
      await cargar()
    }
    setGuardando(false)
  }

const eliminar = async (id: string) => {

  const ok = confirm(

    "¿Eliminar este elemento?"

  )

  if (!ok) return


  const { error } = await supabase

    .from("eventos")

    .delete()

    .eq("id", id)


  if (!error) {

    setEventos(prev =>

      prev.filter(

        e => e.id !== id

      )

    )

  }

}

  const marcarCompletado = async (e: Evento) => {
    const completado = !e.completado
    const { error: err } = await supabase
      .from("eventos")
      .update({ completado, completado_at: completado ? new Date().toISOString() : null })
      .eq("id", e.id)
    if (!err) {
      setEventos(prev => prev.map(ev => ev.id === e.id ? { ...ev, completado, completado_at: completado ? new Date().toISOString() : null } : ev))
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
const completadas = useMemo(

()=>eventos.filter(

e=>e.tipo==="tarea"

&& e.completado

),

[eventos]

)
  // Agrupar próximos por fecha
  const proximosPorFecha = proximos.reduce<Record<string, Evento[]>>((acc, e) => {
    if (!acc[e.fecha]) acc[e.fecha] = []
    acc[e.fecha].push(e)
    return acc
  }, {})

  const renderItem = (e: Evento, destacarAtrasado = false) => (
    <div
      key={e.id}
      className={`rounded-xl p-4 flex items-center justify-between group ${
        destacarAtrasado ? "bg-red-500/10 border border-red-500/30" : "bg-slate-900"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {e.tipo === "tarea" ? (
          <button onClick={() => marcarCompletado(e)} className="shrink-0">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
              e.completado ? "bg-green-500 border-green-500" : "border-slate-600 hover:border-slate-400"
            }`}>
              {e.completado && <Check size={12} className="text-white" />}
            </div>
          </button>
        ) : (
          <div className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT[e.color] ?? "bg-slate-500"}`} />
        )}
        <div className="min-w-0">
           <p
    className={`font-medium text-sm truncate ${
      e.completado
        ? "line-through text-slate-500"
        : ""
    }`}
  >
    {e.titulo}
  </p>


  {e.descripcion && (

    <p className="text-xs text-slate-500 mt-1 line-clamp-2">

      {e.descripcion}

    </p>

  )}


 <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">

{e.hora && (

<>

<span>🕒</span>

<span>{e.hora.slice(0,5)}</span>

</>

)}


<span>👤</span>

<span>

{nombreAsignado(e.asignado_a)}

</span>


</p>
        </div>
      </div>
     <div className="flex gap-2">


<button

onClick={()=>editarEvento(e)}

className="text-slate-600 hover:text-green-400 opacity-0 group-hover:opacity-100"

>

<Pencil size={15}/>

</button>



<button

onClick={()=>eliminar(e.id)}

className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"

>

<Trash2 size={15}/>

</button>


</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="max-w-md mx-auto">

        <h1 className="text-2xl font-bold mb-1">

Agenda Familiar

</h1>

<p className="text-sm text-slate-500 mb-6">

Lo que necesita atención en casa

</p>

        {/* Formulario */}
        <div className="bg-slate-900 rounded-xl p-4 space-y-3 mb-6">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
  {editandoId ? "Corrigiendo plan" : "Nuevo"}
</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTipo("evento")}
              className={`p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                tipo === "evento" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <Calendar size={13} /> Evento
            </button>
            <button
              onClick={() => setTipo("tarea")}
              className={`p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                tipo === "tarea" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <ListChecks size={13} /> Tarea
            </button>
          </div>

          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guardar()}
            placeholder={tipo === "tarea" ? "¿Qué hay que hacer?" : "¿Qué tienen planeado?"}
            className="w-full p-3 rounded-lg bg-slate-800 placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-green-500"
          />

          <input
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Detalles (opcional) — ej. qué materiales llevar"
            className="w-full p-3 rounded-lg bg-slate-800 placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-green-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              type="date"
              className="p-3 rounded-lg bg-slate-800 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-green-500"
            />
            <input
              value={hora}
              onChange={e => setHora(e.target.value)}
              type="time"
              className="p-3 rounded-lg bg-slate-800 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Asignación ternaria — elección deliberada, sin default ambiguo */}
          <p className="text-xs text-slate-500 pt-1">¿A quién le compete?</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setAsignadoA(userId)}
              className={`p-2 rounded-lg text-[11px] font-medium transition ${
                asignadoA === userId ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              A mí
            </button>
            <button
              onClick={() => setAsignadoA(otroPerfil?.id ?? null)}
              className={`p-2 rounded-lg text-[11px] font-medium truncate transition ${
                asignadoA === otroPerfil?.id && otroPerfil ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {otroPerfil ? otroPerfil.nombre : "Pareja"}
            </button>
            <button
              onClick={() => setAsignadoA(null)}
              className={`p-2 rounded-lg text-[11px] font-medium transition ${
                asignadoA === null ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Ambos
            </button>
          </div>

          {/* Color — solo aplica visualmente a eventos */}
          {tipo === "evento" && (
            <div className="flex gap-2 pt-1">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full ${c.cls} transition-all ${
                    color === c.value ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "opacity-50"
                  }`}
                />
              ))}
            </div>
          )}

         {error && <p className="text-red-400 text-xs">{error}</p>}

{editandoId && (
  <button
    onClick={cancelarEdicion}
    className="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition mb-2"
  >
    Cancelar edición
  </button>
)}

<button
  onClick={guardar}
  disabled={guardando || !titulo.trim() || !fecha}
  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
>
            <CalendarPlus size={16} />
            {guardando ? "Guardando..." : tipo === "tarea"
? "Agregar tarea"
: "Agregar evento"}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-slate-900 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Atrasados — lo que se quedó pendiente */}
            {atrasados.length > 0 && (
              <div className="mb-5">
                <p className="text-xs text-red-400 font-medium uppercase tracking-wide mb-2 pl-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Se quedó pendiente
                </p>
                <div className="space-y-2">
                  {atrasados.map(e => renderItem(e, true))}
                </div>
              </div>
            )}

            {/* Próximos, agrupados por fecha */}
           {Object.keys(proximosPorFecha).length === 0 ? (
  <div className="text-center py-12">

    <div className="text-4xl mb-3">
      🌿
    </div>

    <p className="text-base font-medium text-slate-300">
      La casa está en calma
    </p>

    <p className="text-sm text-slate-500 mt-1">
      No hay tareas pendientes ni eventos próximos
    </p>

  </div>
) : (
              <div className="space-y-4">
                {Object.entries(proximosPorFecha).map(([f, evts]) => (
                  <div key={f}>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2 pl-1">
                      {formatFecha(f)}
                    </p>
                    <div className="space-y-2">
                      {evts.map(e => renderItem(e))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {completadas.length>0 && (

<div className="mt-6">


<p className="text-xs text-slate-500 uppercase tracking-wide mb-2">

Completadas

</p>


<div className="space-y-2">


{completadas.map(

e=>renderItem(e)

)}


</div>


</div>

)}
          </>
        )}

      </div>
    </main>
  )
}
