"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { Gasto, GastoInsert, Categoria, Perfil, GastoVisibilidad } from "@/lib/types"
import { Trash2, Plus, TrendingUp, Lock, Users, Pencil, X } from "lucide-react"

const hoy = () => new Date().toISOString().split("T")[0]

const ultimoDiaMes = (mes: string) => {
  const [año, m] = mes.split("-").map(Number)
  return new Date(año, m, 0).toISOString().split("T")[0]
}

const fmt = (n: number) =>
  `$${Math.abs(Math.round(n)).toLocaleString("es-CO")}`

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

type ResumenPersona = Perfil & {
  pagado:          number   // lo que puso de su bolsillo este mes
  responsabilidad: number   // lo que le correspondía pagar
  saldo:           number   // pagado - responsabilidad: > 0 → le deben, < 0 → debe
}

// ─── Componente ─────────────────────────────────────────────────────────────

export default function FinanzasPage() {
  const [gastos,     setGastos]     = useState<Gasto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [perfiles,   setPerfiles]   = useState<Perfil[]>([])
  const [userId,     setUserId]     = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [editandoId,    setEditandoId]    = useState<string | null>(null)
  const [editandoAjeno, setEditandoAjeno] = useState(false)
  const [filtro,        setFiltro]        = useState<"todos" | "compartido" | "privado">("todos")

  const [concepto,   setConcepto]   = useState("")
  const [valor,      setValor]      = useState("")
  const [visibilidad,setVisibilidad]= useState<GastoVisibilidad>("compartido")
  const [pagadoPor,  setPagadoPor]  = useState<string>("")
  const [pctPagador, setPctPagador] = useState(50)
  const [categoriaId,setCategoriaId]= useState("")
  const [fecha,      setFecha]      = useState(hoy())
  const [mesActivo,  setMesActivo]  = useState(() => hoy().slice(0, 7))

  // ── Carga de datos ────────────────────────────────────────────────────────

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

  const cancelarRef    = useRef(cancelarEdicion)
  cancelarRef.current  = cancelarEdicion
  const editandoIdRef  = useRef(editandoId)
  editandoIdRef.current = editandoId

  // Al cambiar de mes, cancela solo si había una edición abierta
  // (no debe limpiar el formulario si estabas creando uno nuevo)
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
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const guardarGasto = async () => {
    if (!concepto.trim() || !valor || Number(valor) <= 0) return
    if (visibilidad === "compartido" && !pagadoPor) return
    setGuardando(true)
    setError(null)

    const payload: GastoInsert = {
      concepto:          concepto.trim(),
      valor:             Number(valor),
      visibilidad,
      pagado_por:        visibilidad === "compartido" ? pagadoPor : null,
      porcentaje_pagador:visibilidad === "compartido" ? pctPagador : null,
      categoria_id:      categoriaId || null,
      fecha,
      notas:             null,
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

  // ── Cálculos ─────────────────────────────────────────────────────────────

  const compartidos = useMemo(() => gastos.filter(g => g.visibilidad === "compartido"), [gastos])
  const personales  = useMemo(() => gastos.filter(g => g.visibilidad === "privado"),    [gastos])

  const gastosFiltrados = useMemo(() => {
    if (filtro === "todos") return gastos
    return gastos.filter(g => g.visibilidad === filtro)
  }, [gastos, filtro])

  /**
   * Resumen por persona — un solo memo, fuente única de verdad:
   *
   *   pagado         = suma de lo que puso de su bolsillo
   *   responsabilidad= suma de lo que le tocaba pagar según el split de cada gasto
   *   saldo          = pagado - responsabilidad
   *                    > 0 → le deben (acreedor)
   *                    < 0 → debe (deudor)
   *
   * Verificación algebraica:
   *   Si Oscar paga $100k (50/50) y Catherine paga $60k (50/50):
   *     pagado[Oscar] = 100k, resp[Oscar] = 80k → saldo = +20k  (le deben 20k) ✓
   *     pagado[Cath]  = 60k,  resp[Cath]  = 80k → saldo = -20k  (debe 20k)    ✓
   *   Suma de saldos = 0 siempre (condición de consistencia).
   */
  const resumenPorPersona = useMemo((): ResumenPersona[] => {
    const pagado:    Record<string, number> = {}
    const resp:      Record<string, number> = {}
    perfiles.forEach(p => { pagado[p.id] = 0; resp[p.id] = 0 })

    compartidos.forEach(g => {
      const v   = Number(g.valor) || 0
      const pct = g.porcentaje_pagador ?? 50
      if (!g.pagado_por || !(g.pagado_por in pagado)) return

      // Quién puso el dinero
      pagado[g.pagado_por] += v

      // Quién es responsable de qué porción
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

  const totalCompartido  = compartidos.reduce((acc, g) => acc + (Number(g.valor) || 0), 0)
  const totalPersonal    = personales.reduce( (acc, g) => acc + (Number(g.valor) || 0), 0)

  const acreedor = resumenPorPersona.find(p => p.saldo >  0.5)
  const deudor   = resumenPorPersona.find(p => p.saldo < -0.5)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
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

        {/* ── Resumen Splitwise-style ─────────────────────────────────────── */}
        {/* Muestra lo que pagó cada uno, lo que le correspondía y el balance.
            Esto hace la liquidación AUDITABLE: cualquiera puede verificar la
            cuenta con una calculadora sin tener que "confiar en la app". */}
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

          {/* Liquidación */}
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

        {/* Personales */}
        {totalPersonal > 0 && (
          <div className="bg-slate-900 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <p className="text-xs text-slate-400 flex items-center gap-1"><Lock size={11} /> Tus gastos personales</p>
            <p className="font-bold text-sm">{fmt(totalPersonal)}</p>
          </div>
        )}

        {/* ── Formulario ────────────────────────────────────────────────── */}
        <div className="bg-slate-900 rounded-xl p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {editandoId ? "Editando gasto" : "Nuevo gasto"}
            </p>
            {editandoId && (
              <button onClick={cancelarEdicion} className="text-slate-500 hover:text-slate-300 transition">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Tipo */}
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
                editandoAjeno         ? "bg-slate-800/40 text-slate-600 cursor-not-allowed" :
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

          {/* Quién pagó + división — solo si es compartido */}
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

              {/* Preview del saldo que va a generar este gasto */}
              {valor && Number(valor) > 0 && pagadoPor && (
                <div className="bg-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400">
                  {pctPagador === 100
                    ? <span>No genera deuda — es un gasto propio de {nombreSujeto(pagadoPor).toLowerCase()}</span>
                    : pctPagador === 0
                    ? <span>{nombreSujeto(pagadoPor)} adelanta <span className="text-white">{fmt(Number(valor))}</span> que es responsabilidad de {nombreObjeto(perfiles.find(p => p.id !== pagadoPor)?.id ?? null)}</span>
                    : <span>{esYo(pagadoPor) ? "Tu pareja" : nombreSujeto(pagadoPor) === "Tú" ? "Tu pareja" : nombreSujeto(perfiles.find(p=>p.id!==pagadoPor)?.id ?? null)} debe <span className="text-white">{fmt(Number(valor) * (100 - pctPagador) / 100)}</span></span>
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

        {/* ── Filtros + Lista ────────────────────────────────────────────── */}
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
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-900 rounded-xl h-16 animate-pulse" />
            ))}
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
                    className="text-slate-600 hover:text-blue-400 transition opacity-0 group-hover:opacity-100"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => eliminarGasto(g.id)}
                    className="text-slate-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
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
