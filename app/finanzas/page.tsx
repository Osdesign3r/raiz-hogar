"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { Gasto, GastoInsert, Categoria, Perfil, GastoVisibilidad } from "@/lib/types"
import {
  Trash2, Plus, TrendingUp, TrendingDown, Lock, Users, Pencil, X,
  BarChart3, ListOrdered, Flame, CalendarDays,
} from "lucide-react"

const hoy = () => new Date().toISOString().split("T")[0]

const ultimoDiaMes = (mes: string) => {
  const [año, m] = mes.split("-").map(Number)
  return new Date(año, m, 0).toISOString().split("T")[0]
}

const mesAnteriorDe = (mes: string) => {
  const [año, m] = mes.split("-").map(Number)
  const d = new Date(año, m - 2, 1) // m es 1-indexado; m-2 da el mes previo en Date (0-indexado)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const nombreMes = (mes: string) => {
  const [año, m] = mes.split("-").map(Number)
  return new Date(año, m - 1, 1).toLocaleDateString("es-CO", { month: "long" })
}

const fmt = (n: number) =>
  `$${Math.abs(Math.round(n)).toLocaleString("es-CO")}`

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

type ResumenPersona = Perfil & {
  pagado:          number
  responsabilidad: number
  saldo:           number
}

type CategoriaComparada = {
  id: string
  nombre: string
  emoji: string
  actual: number
  anterior: number
}

// ─── Componente ─────────────────────────────────────────────────────────────

export default function FinanzasPage() {
  const [gastos,             setGastos]             = useState<Gasto[]>([])
  const [gastosMesAnterior,  setGastosMesAnterior]  = useState<Gasto[]>([])
  const [categorias,         setCategorias]         = useState<Categoria[]>([])
  const [perfiles,           setPerfiles]           = useState<Perfil[]>([])
  const [userId,             setUserId]             = useState<string | null>(null)
  const [loading,            setLoading]            = useState(true)
  const [guardando,          setGuardando]          = useState(false)
  const [error,              setError]              = useState<string | null>(null)

  const [vista,         setVista]         = useState<"movimientos" | "analisis">("movimientos")
  const [editandoId,    setEditandoId]    = useState<string | null>(null)
  const [editandoAjeno, setEditandoAjeno] = useState(false)
  const [filtro,        setFiltro]        = useState<"todos" | "compartido" | "privado">("todos")

  const [concepto,    setConcepto]    = useState("")
  const [valor,       setValor]       = useState("")
  const [visibilidad, setVisibilidad] = useState<GastoVisibilidad>("compartido")
  const [pagadoPor,   setPagadoPor]   = useState<string>("")
  const [pctPagador,  setPctPagador]  = useState(50)
  const [categoriaId, setCategoriaId] = useState("")
  const [fecha,       setFecha]       = useState(hoy())
  const [mesActivo,   setMesActivo]   = useState(() => hoy().slice(0, 7))

  // ── Carga de datos ────────────────────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError(null)

    const fechaInicio = `${mesActivo}-01`
    const fechaFin    = ultimoDiaMes(mesActivo)
    const mesAnterior      = mesAnteriorDe(mesActivo)
    const fechaInicioAnt   = `${mesAnterior}-01`
    const fechaFinAnt      = ultimoDiaMes(mesAnterior)

    const [{ data: { user } }, { data: perfilesData }, { data: cats }, { data: gastsData, error: gastosErr }, { data: gastsAntData }] =
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
        // Solo lo necesario para comparar: gasto compartido del mes anterior
        supabase
          .from("gastos")
          .select("*, categorias(id, nombre, emoji)")
          .eq("visibilidad", "compartido")
          .gte("fecha", fechaInicioAnt)
          .lte("fecha", fechaFinAnt),
      ])

    if (gastosErr) {
      setError("Error cargando gastos. Intenta de nuevo.")
    } else {
      setUserId(user?.id ?? null)
      setPerfiles(perfilesData ?? [])
      setCategorias(cats ?? [])
      setGastos((gastsData ?? []) as Gasto[])
      setGastosMesAnterior((gastsAntData ?? []) as Gasto[])
    }
    setLoading(false)
  }, [mesActivo])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Default del pagador a "yo" — separado de cargarDatos para no recargar
  // la página entera cada vez que se cambia el selector de "¿Quién pagó?"
  useEffect(() => {
    if (!pagadoPor && userId) setPagadoPor(userId)
  }, [userId, pagadoPor])

  // ── Helpers de nombre ─────────────────────────────────────────────────────

  const otroPerfil = useMemo(
    () => perfiles.find(p => p.id !== userId) ?? null,
    [perfiles, userId]
  )
  const esYo = useCallback((id: string | null) => !!id && id === userId, [userId])
  const nombreSujeto = useCallback(
    (id: string | null) =>
      esYo(id) ? "Tú" : (perfiles.find(p => p.id === id)?.nombre ?? "tu pareja"),
    [perfiles, esYo]
  )
  const nombreObjeto = useCallback(
    (id: string | null) =>
      esYo(id) ? "ti" : (perfiles.find(p => p.id === id)?.nombre ?? "tu pareja"),
    [perfiles, esYo]
  )

  // ── Edición ───────────────────────────────────────────────────────────────

  const cancelarEdicion = useCallback(() => {
    setEditandoId(null)
    setEditandoAjeno(false)
    setConcepto("")
    setValor("")
    setVisibilidad("compartido")
    setPctPagador(50)
    setCategoriaId("")
    setFecha(hoy())
    if (userId) setPagadoPor(userId)
  }, [userId])

  const cancelarRef     = useRef(cancelarEdicion)
  cancelarRef.current   = cancelarEdicion
  const editandoIdRef   = useRef(editandoId)
  editandoIdRef.current = editandoId

  useEffect(() => {
    if (editandoIdRef.current) cancelarRef.current()
  }, [mesActivo])

  const editarGasto = (g: Gasto) => {
    setEditandoId(g.id)
    setEditandoAjeno(g.user_id !== userId)
    setConcepto(g.concepto)
    setValor(String(g.valor))
    setFecha(g.fecha)
    setCategoriaId(g.categoria_id ?? "")
    setVisibilidad(g.visibilidad)
    setPagadoPor(g.pagado_por ?? "")
    setPctPagador(g.porcentaje_pagador ?? 50)
    setVista("movimientos")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const guardarGasto = async () => {
    if (!concepto.trim() || !valor || Number(valor) <= 0) return
    if (visibilidad === "compartido" && !pagadoPor) return
    setGuardando(true)
    setError(null)

    const payload: GastoInsert = {
      concepto:           concepto.trim(),
      valor:               Number(valor),
      visibilidad,
      pagado_por:          visibilidad === "compartido" ? pagadoPor : null,
      porcentaje_pagador:  visibilidad === "compartido" ? pctPagador : null,
      categoria_id:        categoriaId || null,
      fecha,
      notas:               null,
    }

    const res = editandoId
      ? await supabase.from("gastos").update(payload).eq("id", editandoId)
      : await supabase.from("gastos").insert(payload)

    if (res.error) {
      setError("No se pudo guardar el gasto.")
    } else {
      cancelarEdicion()
      await cargarDatos()
    }
    setGuardando(false)
  }

  const eliminarGasto = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return
    const { error: err } = await supabase.from("gastos").delete().eq("id", id)
    if (!err) {
      setGastos(prev => prev.filter(g => g.id !== id))
      if (editandoId === id) cancelarEdicion()
    }
  }

  // ── Cálculos: movimientos ───────────────────────────────────────────────

  const compartidos = useMemo(() => gastos.filter(g => g.visibilidad === "compartido"), [gastos])
  const personales  = useMemo(() => gastos.filter(g => g.visibilidad === "privado"),    [gastos])

  const gastosFiltrados = useMemo(() => {
    if (filtro === "todos") return gastos
    return gastos.filter(g => g.visibilidad === filtro)
  }, [gastos, filtro])

  const resumenPorPersona = useMemo((): ResumenPersona[] => {
    const pagado: Record<string, number> = {}
    const resp:   Record<string, number> = {}
    perfiles.forEach(p => { pagado[p.id] = 0; resp[p.id] = 0 })

    compartidos.forEach(g => {
      const v   = Number(g.valor) || 0
      const pct = g.porcentaje_pagador ?? 50
      if (!g.pagado_por || !(g.pagado_por in pagado)) return
      pagado[g.pagado_por] += v
      resp[g.pagado_por] += v * pct / 100
      const otro = perfiles.find(p => p.id !== g.pagado_por)
      if (otro) resp[otro.id] += v * (100 - pct) / 100
    })

    return perfiles.map(p => ({
      ...p,
      pagado:          pagado[p.id] ?? 0,
      responsabilidad: resp[p.id]   ?? 0,
      saldo:           (pagado[p.id] ?? 0) - (resp[p.id] ?? 0),
    }))
  }, [compartidos, perfiles])

  const totalCompartido = compartidos.reduce((acc, g) => acc + (Number(g.valor) || 0), 0)
  const totalPersonal   = personales.reduce( (acc, g) => acc + (Number(g.valor) || 0), 0)

  const acreedor = resumenPorPersona.find(p => p.saldo >  0.5)
  const deudor   = resumenPorPersona.find(p => p.saldo < -0.5)

  // ── Cálculos: análisis ───────────────────────────────────────────────────

  const agruparPorCategoria = (lista: Gasto[]) => {
    const mapa = new Map<string, { nombre: string; emoji: string; total: number }>()
    lista.forEach(g => {
      const id     = g.categoria_id ?? "_sin"
      const nombre = g.categorias?.nombre ?? "Sin categoría"
      const emoji  = g.categorias?.emoji ?? "📦"
      const prev   = mapa.get(id) ?? { nombre, emoji, total: 0 }
      prev.total  += Number(g.valor) || 0
      mapa.set(id, prev)
    })
    return mapa
  }

  const categoriasComparadas = useMemo((): CategoriaComparada[] => {
    const actualMap   = agruparPorCategoria(compartidos)
    const anteriorMap = agruparPorCategoria(gastosMesAnterior)
    const ids = new Set([...actualMap.keys(), ...anteriorMap.keys()])
    return Array.from(ids)
      .map(id => {
        const a = actualMap.get(id)
        const b = anteriorMap.get(id)
        return {
          id,
          nombre:   a?.nombre ?? b?.nombre ?? "Sin categoría",
          emoji:    a?.emoji  ?? b?.emoji  ?? "📦",
          actual:   a?.total ?? 0,
          anterior: b?.total ?? 0,
        }
      })
      .sort((x, y) => y.actual - x.actual)
  }, [compartidos, gastosMesAnterior])

  // Insights: solo categorías con base real para comparar (evita "infinito%"
  // en una categoría que recién empezó a usarse), y solo cambios que de
  // verdad importan — no "subió 22% en $3.000".
  const insights = useMemo(() => {
    return categoriasComparadas
      .filter(c => c.anterior >= 10000)
      .map(c => ({
        ...c,
        delta:    c.actual - c.anterior,
        deltaPct: Math.round(((c.actual - c.anterior) / c.anterior) * 100),
      }))
      .filter(c => Math.abs(c.deltaPct) >= 20 && Math.abs(c.delta) >= 15000)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)
  }, [categoriasComparadas])

  const totalMesAnterior = gastosMesAnterior.reduce((acc, g) => acc + (Number(g.valor) || 0), 0)
  const deltaTotalPct = totalMesAnterior > 0
    ? Math.round(((totalCompartido - totalMesAnterior) / totalMesAnterior) * 100)
    : null

  const diasParaPromedio = useMemo(() => {
    const esMesActual = mesActivo === hoy().slice(0, 7)
    if (esMesActual) return new Date().getDate()
    const [y, m] = mesActivo.split("-").map(Number)
    return new Date(y, m, 0).getDate()
  }, [mesActivo])

  const promedioDiario = totalCompartido / Math.max(diasParaPromedio, 1)

  const gastoMasGrande = useMemo(() => {
    if (compartidos.length === 0) return null
    return compartidos.reduce((max, g) => (Number(g.valor) > Number(max.valor) ? g : max), compartidos[0])
  }, [compartidos])

  const maxBarra = Math.max(1, ...categoriasComparadas.map(c => Math.max(c.actual, c.anterior)))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
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

        {/* Pestañas */}
        <div className="flex gap-2 mb-4 bg-slate-900 rounded-lg p-1">
          <button
            onClick={() => setVista("movimientos")}
            className={`flex-1 p-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              vista === "movimientos" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ListOrdered size={13} /> Movimientos
          </button>
          <button
            onClick={() => setVista("analisis")}
            className={`flex-1 p-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              vista === "analisis" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 size={13} /> Análisis
          </button>
        </div>

        {vista === "movimientos" ? (
          <>
            {/* ── Resumen Splitwise-style ─────────────────────────────── */}
            <div className="bg-slate-900 rounded-2xl p-4 mb-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                  <Users size={11} /> Gasto compartido
                </p>
                <p className="text-sm font-bold">{fmt(totalCompartido)}</p>
              </div>

              {resumenPorPersona.map(p => (
                <div key={p.id} className="bg-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{esYo(p.id) ? `Tú (${p.nombre})` : p.nombre}</p>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.saldo > 0.5  ? "bg-green-500/15 text-green-400" :
                        p.saldo < -0.5 ? "bg-red-500/15 text-red-400"    :
                                         "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {p.saldo > 0.5  ? `+ ${fmt(p.saldo)}`  :
                       p.saldo < -0.5 ? `− ${fmt(p.saldo)}`  :
                                        "En paz"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>
                      <p>Pagó</p>
                      <p className="text-white font-medium text-sm">{fmt(p.pagado)}</p>
                    </div>
                    <div>
                      <p>Le correspondía</p>
                      <p className="text-white font-medium text-sm">{fmt(p.responsabilidad)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {acreedor && deudor ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-sm text-amber-300 text-center">
                    ⚖️{" "}
                    {nombreSujeto(deudor.id)}{" "}
                    {esYo(deudor.id) ? "le debes" : "le debe"} a{" "}
                    {nombreObjeto(acreedor.id)}:{" "}
                    <span className="font-bold">{fmt(acreedor.saldo)}</span>
                  </p>
                </div>
              ) : totalCompartido > 0 ? (
                <p className="text-xs text-slate-500 text-center py-1">✓ Están en paz</p>
              ) : null}
            </div>

            {totalPersonal > 0 && (
              <div className="bg-slate-900 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                <p className="text-xs text-slate-400 flex items-center gap-1"><Lock size={11} /> Tus gastos personales</p>
                <p className="font-bold text-sm">{fmt(totalPersonal)}</p>
              </div>
            )}

            {/* ── Formulario ────────────────────────────────────────────── */}
            <div className="bg-slate-900 rounded-xl p-4 mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                  {editandoId ? "Editando gasto" : "Nuevo gasto"}
                </p>
                {editandoId && (
                  <button onClick={cancelarEdicion} className="text-slate-500 hover:text-slate-300 transition w-8 h-8 flex items-center justify-center">
                    <X size={16} />
                  </button>
                )}
              </div>

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
                  onClick={() => !editandoAjeno && setVisibilidad("privado")}
                  disabled={editandoAjeno}
                  title={editandoAjeno ? "No puedes hacer privado un gasto de tu pareja" : undefined}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    editandoAjeno          ? "bg-slate-800/40 text-slate-600 cursor-not-allowed" :
                    visibilidad==="privado"? "bg-blue-600 text-white" :
                                             "bg-slate-800 text-slate-400 hover:bg-slate-700"
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

              {visibilidad === "compartido" && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-500">¿Quién puso el dinero?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {perfiles.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPagadoPor(p.id)}
                        className={`p-2 rounded-lg text-xs font-medium truncate transition ${
                          pagadoPor === p.id ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {esYo(p.id) ? `Yo (${p.nombre})` : p.nombre}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-slate-500">
                    ¿Cómo se divide? — a quien pagó le corresponde el{" "}
                    <span className="text-white font-medium">{pctPagador}%</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: 50,  label: "50 / 50" },
                      { v: 100, label: "Todo suyo" },
                      { v: 0,   label: `Todo de ${otroPerfil?.nombre ?? "el otro"}` },
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

                  {valor && Number(valor) > 0 && pagadoPor && (
                    <div className="bg-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400">
                      {pctPagador === 100
                        ? <span>No genera deuda — es un gasto propio de {nombreSujeto(pagadoPor).toLowerCase()}</span>
                        : pctPagador === 0
                        ? <span>{nombreSujeto(pagadoPor)} adelanta <span className="text-white">{fmt(Number(valor))}</span> que es responsabilidad de {nombreObjeto(perfiles.find(p => p.id !== pagadoPor)?.id ?? null)}</span>
                        : <span>{nombreSujeto(perfiles.find(p => p.id !== pagadoPor)?.id ?? null)} debe <span className="text-white">{fmt(Number(valor) * (100 - pctPagador) / 100)}</span></span>
                      }
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={guardarGasto}
                disabled={guardando || !concepto || !valor || (visibilidad === "compartido" && !pagadoPor)}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
              >
                <Plus size={16} />
                {guardando ? "Guardando..." : editandoId ? "Actualizar gasto" : "Agregar gasto"}
              </button>
            </div>

            {/* ── Filtros + Lista ────────────────────────────────────────── */}
            <div className="flex gap-2 mb-4">
              {(["todos", "compartido", "privado"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`flex-1 p-2 rounded-lg text-xs font-medium transition ${
                    filtro === f ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {f === "todos" ? "Todos" : f === "compartido" ? "Compartidos" : "Personales"}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="bg-slate-900 rounded-xl h-16 animate-pulse" />)}
              </div>
            ) : gastosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-3xl mb-2">💸</p>
                <p className="text-sm">No hay gastos este mes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {gastosFiltrados.map(g => (
                  <div
                    key={g.id}
                    className={`rounded-xl p-4 flex items-center justify-between group transition ${
                      g.id === editandoId ? "bg-slate-900 ring-1 ring-blue-500" : "bg-slate-900"
                    }`}
                  >
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
                              {" · "}{g.porcentaje_pagador ?? 50}/{100 - (g.porcentaje_pagador ?? 50)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="font-bold text-sm">{fmt(Number(g.valor))}</p>
                      <button
                        onClick={() => editarGasto(g)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-400 hover:bg-slate-800 active:bg-slate-700 transition"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => eliminarGasto(g.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 active:bg-slate-700 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── ANÁLISIS ──────────────────────────────────────────────────── */
          loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="bg-slate-900 rounded-xl h-20 animate-pulse" />)}
            </div>
          ) : compartidos.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Todavía no hay gasto compartido este mes para analizar</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Total vs mes anterior */}
              <div className="bg-slate-900 rounded-2xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                  Gasto compartido de {nombreMes(mesActivo)}
                </p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold">{fmt(totalCompartido)}</p>
                  {deltaTotalPct !== null && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                      deltaTotalPct > 0 ? "bg-red-500/15 text-red-400" :
                      deltaTotalPct < 0 ? "bg-green-500/15 text-green-400" :
                                          "bg-slate-700 text-slate-400"
                    }`}>
                      {deltaTotalPct > 0 ? <TrendingUp size={12} /> : deltaTotalPct < 0 ? <TrendingDown size={12} /> : null}
                      {deltaTotalPct === 0 ? "Igual" : `${Math.abs(deltaTotalPct)}% vs ${nombreMes(mesAnteriorDe(mesActivo))}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats rápidas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-xl p-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-1"><CalendarDays size={11} /> Promedio diario</p>
                  <p className="font-bold text-sm">{fmt(promedioDiario)}</p>
                </div>
                <div className="bg-slate-900 rounded-xl p-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-1"><Flame size={11} /> Gasto más grande</p>
                  <p className="font-bold text-sm truncate">{gastoMasGrande ? fmt(Number(gastoMasGrande.valor)) : "—"}</p>
                  {gastoMasGrande && <p className="text-[11px] text-slate-500 truncate">{gastoMasGrande.concepto}</p>}
                </div>
              </div>

              {/* Insights automáticos */}
              {insights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wide pl-1">Lo que cambió</p>
                  {insights.map(i => (
                    <div
                      key={i.id}
                      className={`rounded-xl p-3 flex items-start gap-2.5 ${
                        i.delta > 0 ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"
                      }`}
                    >
                      <span className="text-lg shrink-0">{i.emoji}</span>
                      <p className="text-sm text-slate-300 leading-snug">
                        Gastaste{" "}
                        <span className={`font-semibold ${i.delta > 0 ? "text-red-400" : "text-green-400"}`}>
                          {Math.abs(i.deltaPct)}% {i.delta > 0 ? "más" : "menos"}
                        </span>{" "}
                        en {i.nombre} este mes — {fmt(i.actual)} vs {fmt(i.anterior)} en {nombreMes(mesAnteriorDe(mesActivo))}.
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Desglose por categoría con comparación visual */}
              <div className="bg-slate-900 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Por categoría</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-white/60 inline-block" /> mes anterior
                  </p>
                </div>
                <div className="space-y-3">
                  {categoriasComparadas.map(c => {
                    const pctActual   = (c.actual   / maxBarra) * 100
                    const pctAnterior = (c.anterior / maxBarra) * 100
                    return (
                      <div key={c.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">{c.emoji} {c.nombre}</span>
                          <span className="font-medium">{fmt(c.actual)}</span>
                        </div>
                        <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all"
                            style={{ width: `${pctActual}%` }}
                          />
                          {c.anterior > 0 && (
                            <div
                              className="absolute inset-y-0 w-0.5 bg-white/70"
                              style={{ left: `${Math.min(pctAnterior, 99.5)}%` }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )
        )}

      </div>
    </main>
  )
}
