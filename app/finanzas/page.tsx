"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import type { Gasto, GastoInsert, Categoria, Perfil, GastoVisibilidad } from "@/lib/types"
import { Trash2, Plus, TrendingUp, Lock, Users } from "lucide-react"

const hoy = () => new Date().toISOString().split("T")[0]

// Último día real del mes — nunca más junio-31
const ultimoDiaMes = (mesActivo: string) => {
  const [año, mes] = mesActivo.split("-").map(Number)
  return new Date(año, mes, 0).toISOString().split("T")[0]
}

export default function FinanzasPage() {
  const [gastos,     setGastos]     = useState<Gasto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [perfiles,   setPerfiles]   = useState<Perfil[]>([])
  const [userId,     setUserId]     = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [concepto,    setConcepto]    = useState("")
  const [valor,        setValor]       = useState("")
  const [visibilidad,  setVisibilidad] = useState<GastoVisibilidad>("compartido")
  const [pagadoPor,    setPagadoPor]   = useState<string>("")
  const [pctPagador,   setPctPagador]  = useState(50)
  const [categoriaId,  setCategoriaId] = useState("")
  const [fecha,        setFecha]       = useState(hoy())
  const [mesActivo,    setMesActivo]   = useState(() => hoy().slice(0, 7))

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError(null)

    const fechaInicio = `${mesActivo}-01`
    const fechaFin    = ultimoDiaMes(mesActivo)

    const [{ data: { user } }, { data: perfilesData }, { data: cats }, { data: gastsData, error: gastosErr }] =
      await Promise.all([
        supabase.auth.getUser(),
        supabase.from("perfiles").select("id, nombre, email, avatar_url, accent_color, created_at"),
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
      setUserId(user?.id ?? null)
      setPerfiles(perfilesData ?? [])
      setCategorias(cats ?? [])
      setGastos((gastsData ?? []) as Gasto[])
      if (!pagadoPor && user?.id) setPagadoPor(user.id)
    }
    setLoading(false)
  }, [mesActivo, pagadoPor])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const otroPerfil = useMemo(
    () => perfiles.find(p => p.id !== userId) ?? null,
    [perfiles, userId]
  )
  const esYo = useCallback((id: string | null) => !!id && id === userId, [userId])
  const nombreSujeto = useCallback(
    (id: string | null) => esYo(id) ? "Tú" : (perfiles.find(p => p.id === id)?.nombre ?? "tu pareja"),
    [perfiles, esYo]
  )
  const nombreObjeto = useCallback(
    (id: string | null) => esYo(id) ? "ti" : (perfiles.find(p => p.id === id)?.nombre ?? "tu pareja"),
    [perfiles, esYo]
  )

  const guardarGasto = async () => {
    if (!concepto.trim() || !valor || Number(valor) <= 0) return
    if (visibilidad === "compartido" && !pagadoPor) return
    setGuardando(true)
    setError(null)

    const nuevo: GastoInsert = {
      concepto:           concepto.trim(),
      valor:               Number(valor),
      visibilidad,
      pagado_por:          visibilidad === "compartido" ? pagadoPor : null,
      porcentaje_pagador:  visibilidad === "compartido" ? pctPagador : null,
      categoria_id:        categoriaId || null,
      fecha,
      notas:               null,
    }

    const { error: err } = await supabase.from("gastos").insert(nuevo)

    if (err) {
      setError("No se pudo guardar el gasto.")
    } else {
      setConcepto("")
      setValor("")
      setVisibilidad("compartido")
      setPctPagador(50)
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

  const compartidos = useMemo(() => gastos.filter(g => g.visibilidad === "compartido"), [gastos])
  // RLS ya filtra los privados a solo los míos — lo que llega aquí es 100% mío
  const personales  = useMemo(() => gastos.filter(g => g.visibilidad === "privado"), [gastos])

  const totalCompartido = compartidos.reduce((acc, g) => acc + Number(g.valor), 0)
  const totalPersonal   = personales.reduce((acc, g) => acc + Number(g.valor), 0)

  // Saldo real: cuánto adelantó cada uno por encima de su propia parte
  const saldos = useMemo(() => {
    const s: Record<string, number> = {}
    perfiles.forEach(p => { s[p.id] = 0 })
    compartidos.forEach(g => {
      if (!g.pagado_por || !(g.pagado_por in s)) return
      const valorNum = Number(g.valor)
      const pct = g.porcentaje_pagador ?? 50
      const parteOtro = valorNum * (100 - pct) / 100
      const otro = perfiles.find(p => p.id !== g.pagado_por)
      s[g.pagado_por] += parteOtro
      if (otro) s[otro.id] -= parteOtro
    })
    return s
  }, [compartidos, perfiles])

  const entradas  = Object.entries(saldos)
  const acreedor  = entradas.find(([, v]) => v > 0.5)
  const deudor    = entradas.find(([, v]) => v < -0.5)

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
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-900 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Users size={11} /> Compartido</p>
            <p className="font-bold text-sm">{fmt(totalCompartido)}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Lock size={11} /> Tus personales</p>
            <p className="font-bold text-sm">{fmt(totalPersonal)}</p>
          </div>
        </div>

        {/* Balance real */}
        {acreedor && deudor && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6">
            <p className="text-sm text-amber-300">
              ⚖️ {nombreSujeto(deudor[0])} le {esYo(deudor[0]) ? "debes" : "debe"} a{" "}
              {nombreObjeto(acreedor[0])}: <span className="font-bold">{fmt(acreedor[1])}</span>
            </p>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-slate-900 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Nuevo gasto</p>

          {/* Privado vs compartido */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setVisibilidad("compartido")}
              className={`p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                visibilidad === "compartido" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <Users size={13} /> Compartido
            </button>
            <button
              onClick={() => setVisibilidad("privado")}
              className={`p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                visibilidad === "privado" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <Lock size={13} /> Personal
            </button>
          </div>

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

          {/* Quién pagó + cómo se divide — solo si es compartido */}
          {visibilidad === "compartido" && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <p className="text-xs text-slate-500 pt-2">¿Quién pagó?</p>
              <div className="grid grid-cols-2 gap-2">
                {perfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPagadoPor(p.id)}
                    className={`p-2 rounded-lg text-xs font-medium truncate transition ${
                      pagadoPor === p.id ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {p.id === userId ? `Tú (${p.nombre})` : p.nombre}
                  </button>
                ))}
              </div>

              <p className="text-xs text-slate-500 pt-1">
                ¿Cómo se divide? · le corresponde el {pctPagador}% a quien pagó
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 50,  label: "Mitad y mitad" },
                  { v: 100, label: "Es todo suyo" },
                  { v: 0,   label: `Es todo de ${otroPerfil ? otroPerfil.nombre : "el otro"}` },
                ].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setPctPagador(opt.v)}
                    className={`p-2 rounded-lg text-[11px] leading-tight font-medium transition ${
                      pctPagador === opt.v ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={guardarGasto}
            disabled={guardando || !concepto || !valor || (visibilidad === "compartido" && !pagadoPor)}
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
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      {g.fecha} ·{" "}
                      {g.visibilidad === "privado" ? (
                        <span className="flex items-center gap-0.5"><Lock size={10} /> Personal</span>
                      ) : (
                        <span>
                          {esYo(g.pagado_por) ? "Pagaste tú" : `Pagó ${nombreSujeto(g.pagado_por)}`}
                          {" "}· {g.porcentaje_pagador ?? 50}/{100 - (g.porcentaje_pagador ?? 50)}
                        </span>
                      )}
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