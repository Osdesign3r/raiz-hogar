"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Gasto, GastoInsert, Categoria, Division } from "@/lib/types"
import { Trash2, Plus, TrendingUp } from "lucide-react"

const DIVISION_LABELS: Record<Division, string> = {
  "50-50": "Mitad y mitad",
  oscar:   "Oscar paga",
  pareja:  "Pareja paga",
}

const hoy = () => new Date().toISOString().split("T")[0]

// Último día real del mes — nunca más junio-31
const ultimoDiaMes = (mesActivo: string) => {
  const [año, mes] = mesActivo.split("-").map(Number)
  return new Date(año, mes, 0).toISOString().split("T")[0]
}

export default function FinanzasPage() {
  const [gastos,     setGastos]     = useState<Gasto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading,    setLoading]    = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [concepto,    setConcepto]    = useState("")
  const [valor,       setValor]       = useState("")
  const [division,    setDivision]    = useState<Division>("50-50")
  const [categoriaId, setCategoriaId] = useState("")
  const [fecha,       setFecha]       = useState(hoy())
  const [mesActivo,   setMesActivo]   = useState(() => hoy().slice(0, 7))

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError(null)

    const fechaInicio = `${mesActivo}-01`
    const fechaFin    = ultimoDiaMes(mesActivo)

    const [{ data: cats }, { data: gastsData, error: gastosErr }] = await Promise.all([
      supabase.from("categorias").select("*").order("nombre"),
      supabase
        .from("gastos")
        .select("*, categorias(id, nombre, emoji)")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin)
        .order("fecha", { ascending: false }),
    ])

    if (gastosErr) {
      setError("Error cargando gastos. Intenta de nuevo.")
    } else {
      setCategorias(cats ?? [])
      setGastos((gastsData ?? []) as Gasto[])
    }
    setLoading(false)
  }, [mesActivo])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const guardarGasto = async () => {
    if (!concepto.trim() || !valor || Number(valor) <= 0) return
    setGuardando(true)
    setError(null)

    const nuevo: GastoInsert = {
      concepto:     concepto.trim(),
      valor:        Number(valor),
      division,
      categoria_id: categoriaId || null,
      fecha,
      notas:        null,
    }

    const { error: err } = await supabase.from("gastos").insert(nuevo)

    if (err) {
      setError("No se pudo guardar el gasto.")
    } else {
      setConcepto("")
      setValor("")
      setDivision("50-50")
      setCategoriaId("")
      setFecha(hoy())
      await cargarDatos()
    }
    setGuardando(false)
  }

  const eliminarGasto = async (id: string) => {
    const { error: err } = await supabase.from("gastos").delete().eq("id", id)
    if (!err) setGastos(prev => prev.filter(g => g.id !== id))
  }

  const totalOscar = gastos.reduce((acc, g) => {
    if (g.division === "50-50") return acc + g.valor / 2
    if (g.division === "oscar") return acc + g.valor
    return acc
  }, 0)

  const totalPareja = gastos.reduce((acc, g) => {
    if (g.division === "50-50") return acc + g.valor / 2
    if (g.division === "pareja") return acc + g.valor
    return acc
  }, 0)

  const totalMes   = gastos.reduce((acc, g) => acc + g.valor, 0)
  const diferencia = totalOscar - totalPareja
  const quienDebe  = diferencia > 0
    ? "Pareja le debe a Oscar"
    : diferencia < 0
    ? "Oscar le debe a Pareja"
    : null

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString("es-CO")}`

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
            <TrendingUp size={14} className="text-slate-400" />
            <input
              type="month"
              value={mesActivo}
              onChange={e => setMesActivo(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none"
            />
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-slate-900 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Total mes</p>
            <p className="font-bold text-sm">{fmt(totalMes)}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Oscar</p>
            <p className="font-bold text-sm text-blue-400">{fmt(totalOscar)}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Pareja</p>
            <p className="font-bold text-sm text-purple-400">{fmt(totalPareja)}</p>
          </div>
        </div>

        {/* Balance */}
        {quienDebe && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6">
            <p className="text-sm text-amber-300">
              ⚖️ {quienDebe}: <span className="font-bold">{fmt(diferencia)}</span>
            </p>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-slate-900 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Nuevo gasto</p>

          <input
            value={concepto}
            onChange={e => setConcepto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guardarGasto()}
            placeholder="¿En qué gastaste?"
            className="w-full p-3 rounded-lg bg-slate-800 placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Valor"
              type="number"
              min="0"
              className="p-3 rounded-lg bg-slate-800 placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              type="date"
              className="p-3 rounded-lg bg-slate-800 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={categoriaId}
            onChange={e => setCategoriaId(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Sin categoría</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-2">
            {(["50-50", "oscar", "pareja"] as Division[]).map(d => (
              <button
                key={d}
                onClick={() => setDivision(d)}
                className={`p-2 rounded-lg text-xs font-medium transition ${
                  division === d
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {DIVISION_LABELS[d]}
              </button>
            ))}
          </div>

          <button
            onClick={guardarGasto}
            disabled={guardando || !concepto || !valor}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            <Plus size={16} />
            {guardando ? "Guardando..." : "Agregar gasto"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-900 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : gastos.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-sm">No hay gastos este mes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {gastos.map(g => (
              <div key={g.id} className="bg-slate-900 rounded-xl p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{g.categorias?.emoji ?? "📦"}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{g.concepto}</p>
                    <p className="text-xs text-slate-400">
                      {g.fecha} · {DIVISION_LABELS[g.division]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="font-bold text-sm">{fmt(g.valor)}</p>
                  <button
                    onClick={() => eliminarGasto(g.id)}
                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}