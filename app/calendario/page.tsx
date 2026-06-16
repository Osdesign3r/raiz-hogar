"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Evento, EventoInsert } from "@/lib/types"
import { CalendarPlus, Trash2, Calendar } from "lucide-react"

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
  const [loading,   setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [titulo, setTitulo] = useState("")
  const [fecha,  setFecha]  = useState(hoy())
  const [hora,   setHora]   = useState("")
  const [color,  setColor]  = useState("blue")

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from("eventos")
      .select("*")
      .gte("fecha", hoy())
      .order("fecha", { ascending: true })
    if (!err) setEventos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!titulo.trim() || !fecha) return
    setGuardando(true)
    setError(null)

    const nuevo: EventoInsert = {
      titulo:      titulo.trim(),
      fecha,
      hora:        hora || null,
      descripcion: null,
      color,
    }

    const { error: err } = await supabase.from("eventos").insert(nuevo)
    if (err) {
      setError("No se pudo guardar el evento.")
    } else {
      setTitulo("")
      setFecha(hoy())
      setHora("")
      setColor("blue")
      await cargar()
    }
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    const { error: err } = await supabase.from("eventos").delete().eq("id", id)
    if (!err) setEventos(prev => prev.filter(e => e.id !== id))
  }

  // Agrupar por fecha
  const eventosPorFecha = eventos.reduce<Record<string, Evento[]>>((acc, e) => {
    if (!acc[e.fecha]) acc[e.fecha] = []
    acc[e.fecha].push(e)
    return acc
  }, {})

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="max-w-md mx-auto">

        <h1 className="text-2xl font-bold mb-6">Calendario</h1>

        {/* Formulario */}
        <div className="bg-slate-900 rounded-xl p-4 space-y-3 mb-6">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Nuevo evento</p>

          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guardar()}
            placeholder="¿Qué tienen planeado?"
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
              placeholder="Hora (opcional)"
              className="p-3 rounded-lg bg-slate-800 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Color picker */}
          <div className="flex gap-2">
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

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando || !titulo.trim() || !fecha}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            <CalendarPlus size={16} />
            {guardando ? "Guardando..." : "Agregar evento"}
          </button>
        </div>

        {/* Lista agrupada por fecha */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-slate-900 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : Object.keys(eventosPorFecha).length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay eventos próximos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(eventosPorFecha).map(([f, evts]) => (
              <div key={f}>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2 pl-1">
                  {formatFecha(f)}
                </p>
                <div className="space-y-2">
                  {evts.map(e => (
                    <div key={e.id} className="bg-slate-900 rounded-xl p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT[e.color] ?? "bg-slate-500"}`} />
                        <div>
                          <p className="font-medium text-sm">{e.titulo}</p>
                          {e.hora && (
                            <p className="text-xs text-slate-400">{e.hora}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => eliminar(e.id)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
