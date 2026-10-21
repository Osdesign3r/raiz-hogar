"use client"

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Gasto, GastoInsert, Categoria, Perfil, GastoVisibilidad, Presupuesto } from "@/lib/types"
import {
  Trash2, Plus, TrendingUp, TrendingDown, Lock, Users, Pencil, X,
  ChevronDown, Flame, CalendarDays, Target, AlertTriangle, Check, Scale, CircleCheck, Package, Receipt,
} from "lucide-react"
import ConfirmDialog from "@/components/ConfirmDialog"
import Sheet from "@/components/Sheet"
import PageHeader from "@/components/PageHeader"
import EmptyState from "@/components/EmptyState"
import { fechaLocal } from "@/lib/fecha"
import { parsearSms } from "@/lib/parsearSms"
import { primerNombre, moneda } from "@/lib/texto"

const hoy = () => fechaLocal()

const ultimoDiaMes = (mes: string) => {
  const [año, m] = mes.split("-").map(Number)
  return fechaLocal(new Date(año, m, 0))
}

const mesAnteriorDe = (mes: string) => {
  const [año, m] = mes.split("-").map(Number)
  const d = new Date(año, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const nombreMes = (mes: string) => {
  const [año, m] = mes.split("-").map(Number)
  return new Date(año, m - 1, 1).toLocaleDateString("es-CO", { month: "long" })
}

const fmtFechaCorta = (f: string) =>
  new Date(f + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })

// "50/50" no dice nada a quien lo lee de pasada; las dos puntas sí merecen palabras.
const textoReparto = (pctPagador: number) =>
  pctPagador === 50 ? "a medias" : pctPagador === 100 ? "sin deuda" : `${pctPagador}/${100 - pctPagador}`

const fmt = moneda

type ResumenPersona = Perfil & { pagado: number; responsabilidad: number; saldo: number }
type CategoriaComparada = { id: string; nombre: string; emoji: string; actual: number; anterior: number }

function FinanzasContent() {
  const [gastos,            setGastos]            = useState<Gasto[]>([])
  const [gastosMesAnterior, setGastosMesAnterior]  = useState<Gasto[]>([])
  const [gastosBalance,     setGastosBalance]      = useState<Gasto[]>([])
  const [categorias,        setCategorias]         = useState<Categoria[]>([])
  const [presupuestos,      setPresupuestos]       = useState<Presupuesto[]>([])
  const [hogarId,           setHogarId]            = useState<string | null>(null)
  const [perfiles,          setPerfiles]           = useState<Perfil[]>([])
  const [userId,            setUserId]             = useState<string | null>(null)
  const [loading,           setLoading]            = useState(true)
  const [guardando,         setGuardando]          = useState(false)
  const [error,             setError]              = useState<string | null>(null)

  const [mostrarPresupuestos,   setMostrarPresupuestos]   = useState(false)
  const [editandoPresupuestoId, setEditandoPresupuestoId] = useState<string | null>(null) // categoria_id
  const [montoPresupuestoInput, setMontoPresupuestoInput] = useState("")
  const [guardandoPresupuesto,  setGuardandoPresupuesto]  = useState(false)

  const [modalAbierto,    setModalAbierto]    = useState(false)
  const [gastoAEliminar,        setGastoAEliminar]        = useState<Gasto | null>(null)
  const [presupuestoAQuitar,    setPresupuestoAQuitar]    = useState<string | null>(null) // categoria_id
  const [mostrarDesglose, setMostrarDesglose] = useState(false)
  const [editandoId,      setEditandoId]      = useState<string | null>(null)
  const [editandoAjeno,   setEditandoAjeno]   = useState(false)
  const [filtro,          setFiltro]          = useState<"todos" | "compartido" | "privado">("todos")

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

    const fechaInicio    = `${mesActivo}-01`
    const fechaFin       = ultimoDiaMes(mesActivo)
    const mesAnterior    = mesAnteriorDe(mesActivo)
    const fechaInicioAnt = `${mesAnterior}-01`
    const fechaFinAnt    = ultimoDiaMes(mesAnterior)

    const [
      { data: { user } },
      { data: perfilesData },
      { data: cats },
      { data: gastsData, error: gastosErr },
      { data: gastsAntData },
      { data: gastsBalData },
      { data: hogarData },
      { data: presData },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("perfiles").select("id, nombre, email, avatar_url, accent_color, created_at"),
      supabase.from("categorias").select("*").order("nombre"),
      supabase
        .from("gastos")
        .select("*, categorias(id, nombre, emoji)")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin)
        .order("fecha", { ascending: false }),
      supabase
        .from("gastos")
        .select("*, categorias(id, nombre, emoji)")
        .eq("visibilidad", "compartido")
        .gte("fecha", fechaInicioAnt)
        .lte("fecha", fechaFinAnt),
      // Sin filtro de fecha, a propósito — la deuda es una cuenta corrida
      // que sube o se empareja, no algo que reinicia cada mes. Distinto de
      // "cuánto se gastó" (compartidos, filtrado por mesActivo), que sí es
      // del mes. Home usa el mismo criterio para este número.
      supabase
        .from("gastos")
        .select("id, valor, pagado_por, porcentaje_pagador")
        .eq("visibilidad", "compartido"),
      supabase.from("hogar_usuarios").select("hogar_id").limit(1).single(),
      supabase.from("presupuestos").select("*"),
    ])

    if (gastosErr) {
      setError("No pudimos cargar los gastos. Inténtalo de nuevo.")
    } else {
      setUserId(user?.id ?? null)
      setPerfiles(perfilesData ?? [])
      setCategorias(cats ?? [])
      setGastos((gastsData ?? []) as Gasto[])
      setGastosMesAnterior((gastsAntData ?? []) as Gasto[])
      setGastosBalance((gastsBalData ?? []) as Gasto[])
      setHogarId(hogarData?.hogar_id ?? null)
      setPresupuestos(presData ?? [])
    }
    setLoading(false)
  }, [mesActivo])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  useEffect(() => {
    if (!pagadoPor && userId) setPagadoPor(userId)
  }, [userId, pagadoPor])

  const otroPerfil = useMemo(() => perfiles.find(p => p.id !== userId) ?? null, [perfiles, userId])
  const esYo = useCallback((id: string | null) => !!id && id === userId, [userId])
  const nombreDe = useCallback(
    (id: string | null) => primerNombre(perfiles.find(p => p.id === id)?.nombre),
    [perfiles]
  )

  // Frase de deuda conjugada según quién la lea. Antes se armaba con
  // "sujeto + debe + a + objeto" y salían cosas como "Tú debe" o "le debe a ti".
  const fraseDeuda = useCallback((deudorId: string | null, acreedorId: string | null, monto: number) => {
    const m = fmt(monto)
    if (esYo(deudorId))   return `Le debes ${m} a ${nombreDe(acreedorId)}`
    if (esYo(acreedorId)) return `${nombreDe(deudorId)} te debe ${m}`
    return `${nombreDe(deudorId)} le debe ${m} a ${nombreDe(acreedorId)}`
  }, [esYo, nombreDe])

  // ── Edición / modal ──────────────────────────────────────────────────────

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
    if (editandoIdRef.current) { cancelarRef.current(); setModalAbierto(false) }
  }, [mesActivo])

  // Cuando LAZO se abre porque compartiste un SMS (o cualquier texto) desde
  // el menú "Compartir" del teléfono — ver share_target en app/manifest.ts.
  // Nunca guarda nada solo: solo prellena el formulario y lo abre, la
  // confirmación de guardar sigue siendo tuya siempre.
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const textoCompartido = searchParams.get("text")
    if (!textoCompartido) return

    const { valor: valorDetectado, concepto: conceptoDetectado } = parsearSms(textoCompartido)

    cancelarEdicion()
    setConcepto(conceptoDetectado)
    if (valorDetectado) setValor(String(valorDetectado))
    setVisibilidad("compartido")
    setModalAbierto(true)

    // Limpia el ?text= de la URL — si no, al recargar la página se vuelve a
    // abrir el mismo formulario con el mismo SMS de hace rato.
    router.replace("/finanzas")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const abrirNuevo = () => {
    cancelarEdicion()
    setModalAbierto(true)
  }

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
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    cancelarEdicion()
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  // La notificación al otro perfil YA NO se dispara desde aquí — la genera
  // el trigger `trg_notificar_gasto_compartido` en el INSERT de `gastos`.
  // Resolver "quién es mi pareja" en el cliente era una condición de carrera:
  // si `perfiles` no había cargado todavía, `otroPerfil` salía null y la
  // notificación se perdía en silencio. El trigger la resuelve en la DB,
  // donde el dato siempre está completo.

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
      ? await supabase
          .from("gastos")
          .update(payload)
          .eq("id", editandoId)

      : await supabase
          .from("gastos")
          .insert(payload)

    if (res.error) {
      setError("No pudimos guardar el gasto. Inténtalo de nuevo.")
    } else {
      setModalAbierto(false)
      cancelarEdicion()
      await cargarDatos()
    }
    setGuardando(false)
  }

  const eliminarGasto = async (id: string) => {
    const { error: err } = await supabase.from("gastos").delete().eq("id", id)
    if (!err) {
      setGastos(prev => prev.filter(g => g.id !== id))
      if (editandoId === id) cerrarModal()
    }
  }

  // ── Cálculos: balance ────────────────────────────────────────────────────

  const compartidos = useMemo(() => gastos.filter(g => g.visibilidad === "compartido"), [gastos])
  const personales  = useMemo(() => gastos.filter(g => g.visibilidad === "privado"),    [gastos])

  const gastosFiltrados = useMemo(() => {
    if (filtro === "todos") return gastos
    return gastos.filter(g => g.visibilidad === filtro)
  }, [gastos, filtro])

  // Resumen del MES seleccionado — SOLO para las tarjetas "Pagó"/"Le
  // correspondía", que están paradas bajo un encabezado que dice "de
  // agosto" (o el mes que sea). Para la deuda (quién le debe a quién) no se
  // usa esto — ver balanceGeneral más abajo.
  const resumenPorPersonaMes = useMemo((): ResumenPersona[] => {
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

  // Deuda HISTÓRICA — cuenta corrida desde siempre, no reinicia cada mes.
  // Sube o se empareja según lo que se va registrando, pero nunca se resetea
  // solo porque cambió el mes. Mismo criterio que usa Home — los dos deben
  // mostrar la misma deuda pase lo que pase con el selector de mes de acá.
  const balanceGeneral = useMemo((): ResumenPersona[] => {
    const pagado: Record<string, number> = {}
    const resp:   Record<string, number> = {}
    perfiles.forEach(p => { pagado[p.id] = 0; resp[p.id] = 0 })

    gastosBalance.forEach(g => {
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
  }, [gastosBalance, perfiles])

  const totalCompartido = compartidos.reduce((acc, g) => acc + (Number(g.valor) || 0), 0)
  const totalPersonal   = personales.reduce( (acc, g) => acc + (Number(g.valor) || 0), 0)

  const acreedor = balanceGeneral.find(p => p.saldo >  0.5)
  const deudor   = balanceGeneral.find(p => p.saldo < -0.5)

  // ── Cálculos: análisis ───────────────────────────────────────────────────

  // Un mes a medias contra un mes completo siempre sale "X% menos" y es
  // engañoso. Si el mes activo es el actual, el mes anterior se corta en el
  // mismo día, para comparar lo comparable.
  const esMesActual = mesActivo === hoy().slice(0, 7)
  const diaCorte    = new Date().getDate()
  const gastosAnteriorComparable = useMemo(
    () => esMesActual
      ? gastosMesAnterior.filter(g => Number(g.fecha.slice(8, 10)) <= diaCorte)
      : gastosMesAnterior,
    [gastosMesAnterior, esMesActual, diaCorte]
  )
  const nombreMesAnterior = nombreMes(mesAnteriorDe(mesActivo))

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
    const anteriorMap = agruparPorCategoria(gastosAnteriorComparable)
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
  }, [compartidos, gastosAnteriorComparable])

  // ── Presupuestos ─────────────────────────────────────────────────────────

  type ProgresoPresupuesto = {
    categoriaId: string
    nombre: string
    emoji: string
    monto: number
    actual: number
    pct: number
    estado: "ok" | "cerca" | "excedido"
  }

  const progresoPresupuestos = useMemo((): ProgresoPresupuesto[] => {
    const actualMap = agruparPorCategoria(compartidos)
    return presupuestos
      .map(p => {
        const cat  = categorias.find(c => c.id === p.categoria_id)
        const dato = actualMap.get(p.categoria_id)
        const actual = dato?.total ?? 0
        const monto  = Number(p.monto)
        const pct    = monto > 0 ? Math.round((actual / monto) * 100) : 0
        return {
          categoriaId: p.categoria_id,
          nombre: cat?.nombre ?? dato?.nombre ?? "Categoría",
          emoji:  cat?.emoji  ?? dato?.emoji  ?? "📦",
          monto,
          actual,
          pct,
          estado: (pct >= 100 ? "excedido" : pct >= 80 ? "cerca" : "ok") as ProgresoPresupuesto["estado"],
        }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [presupuestos, categorias, compartidos])

  // Categorías que ya tuvieron gasto compartido este mes pero todavía no
  // tienen presupuesto puesto — para ofrecerlas como sugerencia rápida en
  // vez de obligar a buscarlas en un selector largo.
  const categoriasSinPresupuesto = useMemo(() => {
    const conPresupuesto = new Set(presupuestos.map(p => p.categoria_id))
    return categoriasComparadas
      .filter(c => c.id !== "_sin" && c.actual > 0 && !conPresupuesto.has(c.id))
  }, [categoriasComparadas, presupuestos])

  const abrirEdicionPresupuesto = (categoriaId: string, montoActual?: number) => {
    setEditandoPresupuestoId(categoriaId)
    setMontoPresupuestoInput(montoActual ? String(montoActual) : "")
  }

  const cerrarEdicionPresupuesto = () => {
    setEditandoPresupuestoId(null)
    setMontoPresupuestoInput("")
  }

  const guardarPresupuesto = async () => {
    if (!editandoPresupuestoId || !hogarId) return
    const monto = Number(montoPresupuestoInput)
    if (!monto || monto <= 0) return

    setGuardandoPresupuesto(true)
    const { error: err } = await supabase
      .from("presupuestos")
      .upsert(
        { hogar_id: hogarId, categoria_id: editandoPresupuestoId, monto },
        { onConflict: "hogar_id,categoria_id" }
      )

    if (!err) {
      cerrarEdicionPresupuesto()
      await cargarDatos()
    }
    setGuardandoPresupuesto(false)
  }

  const eliminarPresupuesto = async (categoriaId: string) => {
    const { error: err } = await supabase
      .from("presupuestos")
      .delete()
      .eq("categoria_id", categoriaId)
    if (!err) setPresupuestos(prev => prev.filter(p => p.categoria_id !== categoriaId))
  }

  const insights = useMemo(() => {
    return categoriasComparadas
      .filter(c => c.anterior >= 10000)
      .map(c => ({ ...c, delta: c.actual - c.anterior, deltaPct: Math.round(((c.actual - c.anterior) / c.anterior) * 100) }))
      .filter(c => Math.abs(c.deltaPct) >= 20 && Math.abs(c.delta) >= 15000)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)
  }, [categoriasComparadas])

  const totalMesAnterior = gastosAnteriorComparable.reduce((acc, g) => acc + (Number(g.valor) || 0), 0)
  const deltaTotalPct = totalMesAnterior > 0
    ? Math.round(((totalCompartido - totalMesAnterior) / totalMesAnterior) * 100)
    : null

  const diasParaPromedio = useMemo(() => {
    if (esMesActual) return diaCorte
    const [y, m] = mesActivo.split("-").map(Number)
    return new Date(y, m, 0).getDate()
  }, [mesActivo, esMesActual, diaCorte])

  const promedioDiario = totalCompartido / Math.max(diasParaPromedio, 1)

  const gastoMasGrande = useMemo(() => {
    if (compartidos.length === 0) return null
    return compartidos.reduce((max, g) => (Number(g.valor) > Number(max.valor) ? g : max), compartidos[0])
  }, [compartidos])

  const maxBarra = Math.max(1, ...categoriasComparadas.map(c => Math.max(c.actual, c.anterior)))

  // ── Render ────────────────────────────────────────────────────────────────

  // El mismo editor de monto aparecía copiado dos veces (categoría con
  // presupuesto y categoría nueva); aquí vive una sola vez.
  const editorPresupuesto = (titulo: string) => (
    <div className="space-y-2 rounded-2xl bg-[var(--surface-2)] p-3">
      <label htmlFor="monto-presupuesto" className="field-label !mb-0">{titulo} — presupuesto mensual</label>
      <div className="flex gap-2">
        <input
          id="monto-presupuesto"
          value={montoPresupuestoInput}
          onChange={e => setMontoPresupuestoInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && guardarPresupuesto()}
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="Monto mensual"
          autoFocus
          className="field !bg-[var(--surface)]"
        />
        <button
          onClick={guardarPresupuesto}
          disabled={guardandoPresupuesto || !montoPresupuestoInput}
          className="btn btn-primary !min-h-[48px] !px-4"
          aria-label="Guardar presupuesto"
        >
          <Check size={18} />
        </button>
        <button onClick={cerrarEdicionPresupuesto} className="btn btn-secondary !min-h-[48px] !px-4" aria-label="Cancelar">
          <X size={18} />
        </button>
      </div>
    </div>
  )

  const pastilla = (tono: "danger" | "success" | "neutral") =>
    tono === "danger"  ? "bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-danger" :
    tono === "success" ? "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-success" :
                         "bg-[var(--surface-3)] text-secondary"

  return (
    <main className="page-shell">
      <div className="page">

        <PageHeader
          title="Finanzas"
          action={
            <div className="w-[9.5rem] shrink-0">
              <label htmlFor="mes" className="sr-only">Mes</label>
              <input
                id="mes"
                type="month"
                value={mesActivo}
                onChange={e => setMesActivo(e.target.value)}
                className="field !min-h-[44px] !py-2 text-center"
              />
            </div>
          }
        />

        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-28" />)}
          </div>
        ) : (
          <>
            {/* ── Lo primero que se ve: el balance ──────────────────────── */}
            <section className="card mb-3 space-y-4 p-4" aria-label="Balance del mes">
              <div>
                <p className="section-label flex items-center gap-1.5">
                  <Users size={13} aria-hidden="true" /> Gasto compartido de {nombreMes(mesActivo)}
                </p>
                <p className="num font-display mt-1 text-[2.25rem] font-semibold leading-tight">{fmt(totalCompartido)}</p>
                {deltaTotalPct !== null && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${pastilla(
                        deltaTotalPct > 0 ? "danger" : deltaTotalPct < 0 ? "success" : "neutral"
                      )}`}
                    >
                      {deltaTotalPct > 0 ? <TrendingUp size={13} aria-hidden="true" /> : deltaTotalPct < 0 ? <TrendingDown size={13} aria-hidden="true" /> : null}
                      {deltaTotalPct === 0 ? "Igual" : `${Math.abs(deltaTotalPct)}% ${deltaTotalPct > 0 ? "más" : "menos"}`}
                    </span>
                    <span>que {nombreMesAnterior}{esMesActual ? " a esta altura del mes" : ""}</span>
                  </p>
                )}
              </div>

              {resumenPorPersonaMes.length > 0 && (
                <div>
                <p className="section-label mb-2">Así va {nombreMes(mesActivo)}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {resumenPorPersonaMes.map(p => (
                    <div key={p.id} className="rounded-2xl bg-[var(--surface-2)] p-3">
                      <p className="mb-2 truncate text-sm font-semibold">{esYo(p.id) ? "Tú" : primerNombre(p.nombre)}</p>
                      <span
                        className={`num mb-3 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${pastilla(
                          p.saldo > 0.5 ? "success" : p.saldo < -0.5 ? "danger" : "neutral"
                        )}`}
                      >
                        {p.saldo > 0.5  ? `A favor ${fmt(p.saldo)}` :
                         p.saldo < -0.5 ? `Debe ${fmt(p.saldo)}` :
                                          "A mano"}
                      </span>
                      <dl className="space-y-1.5 text-sm">
                        <div>
                          <dt className="text-muted">Pagó</dt>
                          <dd className="num font-semibold">{fmt(p.pagado)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Le correspondía</dt>
                          <dd className="num font-semibold">{fmt(p.responsabilidad)}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
                </div>
              )}

              {acreedor && deudor ? (
                <div className="card tone-warning flex items-start gap-3 p-3.5">
                  <Scale size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                  <div>
                    <p className="text-[0.9375rem] font-semibold leading-snug">
                      {esYo(acreedor.id)
                        ? `Pusiste ${fmt(acreedor.saldo)} de más`
                        : `Te faltan ${fmt(acreedor.saldo)} para quedar a mano`}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      Es el saldo de todos los meses, no solo de {nombreMes(mesActivo)}.
                    </p>
                  </div>
                </div>
              ) : totalCompartido > 0 ? (
                <p className="flex items-center justify-center gap-1.5 py-1 text-sm text-success">
                  <CircleCheck size={16} aria-hidden="true" /> Están a mano, sin deudas entre ustedes
                </p>
              ) : null}
            </section>

            {/* ── Stats rápidas ──────────────────────────────────────────── */}
            {totalCompartido > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2.5">
                <div className="card p-3.5">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted"><CalendarDays size={13} /> Promedio diario</p>
                  <p className="num font-display text-lg font-semibold">{fmt(promedioDiario)}</p>
                </div>
                <div className="card p-3.5">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted"><Flame size={13} /> Mayor gasto</p>
                  <p className="num font-display truncate text-lg font-semibold">{gastoMasGrande ? fmt(Number(gastoMasGrande.valor)) : "—"}</p>
                  {gastoMasGrande && <p className="truncate text-sm text-muted">{gastoMasGrande.concepto}</p>}
                </div>
              </div>
            )}

            {totalPersonal > 0 && (
              <div className="card mb-3 flex items-center justify-between px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-secondary"><Lock size={14} /> Tus gastos personales</p>
                <p className="num font-display text-lg font-semibold">{fmt(totalPersonal)}</p>
              </div>
            )}

            {/* ── Insights — lo que cambió, sin tener que ir a buscarlo ──── */}
            {insights.length > 0 && (
              <ul className="mb-3 space-y-2">
                {insights.map(i => (
                  <li key={i.id} className={`card flex items-start gap-3 p-3.5 ${i.delta > 0 ? "tone-danger" : "tone-success"}`}>
                    {i.delta > 0
                      ? <TrendingUp size={20} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                      : <TrendingDown size={20} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />}
                    <p className="text-[0.9375rem] leading-snug text-secondary">
                      En {i.nombre} {esMesActual ? "llevan" : "gastaron"}{" "}
                      <span className="num font-semibold text-[var(--foreground)]">{fmt(i.actual)}</span>, un{" "}
                      <span className={`font-bold ${i.delta > 0 ? "text-danger" : "text-success"}`}>
                        {Math.abs(i.deltaPct)}% {i.delta > 0 ? "más" : "menos"}
                      </span>{" "}
                      que en {nombreMesAnterior}{esMesActual ? " a esta altura" : ""} (<span className="num">{fmt(i.anterior)}</span>).
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {/* ── Presupuestos por categoría ───────────────────────────────── */}
            <section className="card mb-3 overflow-hidden">
              <button
                onClick={() => setMostrarPresupuestos(v => !v)}
                aria-expanded={mostrarPresupuestos}
                aria-controls="panel-presupuestos"
                className="flex min-h-[56px] w-full items-center justify-between px-4"
              >
                <span className="section-label flex items-center gap-2">
                  <Target size={14} aria-hidden="true" /> Presupuestos
                  {progresoPresupuestos.some(p => p.estado === "excedido") && (
                    <span className="h-2 w-2 rounded-full bg-[var(--danger)]" aria-label="Hay presupuestos excedidos" />
                  )}
                </span>
                <ChevronDown size={18} className={`text-muted transition-transform ${mostrarPresupuestos ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>

              {mostrarPresupuestos && (
                <div id="panel-presupuestos" className="space-y-4 px-4 pb-4">
                  {progresoPresupuestos.length === 0 && categoriasSinPresupuesto.length === 0 && (
                    <p className="py-2 text-sm text-muted">
                      Aún no tienen presupuestos. Puedes ponerlos en las categorías que ya tienen gastos compartidos este mes.
                    </p>
                  )}

                  {progresoPresupuestos.map(p => (
                    <div key={p.categoriaId}>
                      {editandoPresupuestoId === p.categoriaId ? (
                        editorPresupuesto(p.nombre)
                      ) : (
                        <div>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                              <span aria-hidden="true">{p.emoji}</span>
                              <span className="truncate">{p.nombre}</span>
                              {p.estado === "excedido" && <AlertTriangle size={14} className="shrink-0 text-danger" aria-hidden="true" />}
                            </span>
                            <div className="flex shrink-0 items-center">
                              <span className={`num mr-1 text-sm font-semibold ${
                                p.estado === "excedido" ? "text-danger" :
                                p.estado === "cerca"    ? "text-warning" :
                                                           "text-secondary"
                              }`}>
                                {fmt(p.actual)} / {fmt(p.monto)}
                              </span>
                              <button onClick={() => abrirEdicionPresupuesto(p.categoriaId, p.monto)} className="icon-btn is-accent !h-11 !w-9" aria-label={`Editar presupuesto de ${p.nombre}`}>
                                <Pencil size={15} />
                              </button>
                              <button onClick={() => setPresupuestoAQuitar(p.categoriaId)} className="icon-btn is-danger !h-11 !w-9" aria-label={`Quitar presupuesto de ${p.nombre}`}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={`Presupuesto de ${p.nombre}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.min(p.pct, 100)}
                            className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)]"
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(p.pct, 100)}%`,
                                background:
                                  p.estado === "excedido" ? "var(--danger)" :
                                  p.estado === "cerca"    ? "var(--warning)" :
                                                             "var(--accent)",
                              }}
                            />
                          </div>
                          {p.estado === "excedido" && (
                            <p className="mt-1 text-sm text-danger">
                              Se pasaron por <span className="num">{fmt(p.actual - p.monto)}</span> este mes.
                            </p>
                          )}
                          {p.estado === "cerca" && (
                            <p className="mt-1 text-sm text-warning">Llevan el {p.pct}% del presupuesto.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {categoriasSinPresupuesto.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm text-muted">Poner presupuesto a:</p>
                      <div className="flex flex-wrap gap-2">
                        {categoriasSinPresupuesto.map(c => (
                          <button key={c.id} onClick={() => abrirEdicionPresupuesto(c.id)} className="chip">
                            <span aria-hidden="true">{c.emoji}</span> {c.nombre}
                          </button>
                        ))}
                      </div>
                      {editandoPresupuestoId && !progresoPresupuestos.some(p => p.categoriaId === editandoPresupuestoId) && (
                        <div className="mt-3">
                          {editorPresupuesto(categorias.find(c => c.id === editandoPresupuestoId)?.nombre ?? "Categoría")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── Desglose por categoría — colapsado por defecto ─────────── */}
            {categoriasComparadas.length > 0 && (
              <section className="card mb-5 overflow-hidden">
                <button
                  onClick={() => setMostrarDesglose(v => !v)}
                  aria-expanded={mostrarDesglose}
                  aria-controls="panel-desglose"
                  className="flex min-h-[56px] w-full items-center justify-between px-4"
                >
                  <span className="section-label">Gasto por categoría</span>
                  <ChevronDown size={18} className={`text-muted transition-transform ${mostrarDesglose ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {mostrarDesglose && (
                  <div id="panel-desglose" className="space-y-3.5 px-4 pb-4">
                    <p className="-mt-1 flex items-center gap-2 text-sm text-muted">
                      <span className="inline-block h-3 w-0.5 bg-white/70" aria-hidden="true" /> La marca blanca es {nombreMesAnterior}{esMesActual ? " a esta altura" : ""}
                    </p>
                    {categoriasComparadas.map(c => {
                      const pctActual   = (c.actual   / maxBarra) * 100
                      const pctAnterior = (c.anterior / maxBarra) * 100
                      return (
                        <div key={c.id}>
                          <div className="mb-1.5 flex justify-between gap-2 text-sm">
                            <span className="truncate text-secondary"><span aria-hidden="true">{c.emoji}</span> {c.nombre}</span>
                            <span className="num font-semibold">{fmt(c.actual)}</span>
                          </div>
                          <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                            <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pctActual}%`, background: "var(--accent)" }} />
                            {c.anterior > 0 && (
                              <div className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: `${Math.min(pctAnterior, 99.5)}%` }} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ── Filtros + lista de movimientos ─────────────────────────── */}
            <div className="mb-3">
              <h2 className="section-label mb-2.5">Movimientos</h2>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Filtrar movimientos">
                {(["todos", "compartido", "privado"] as const).map(f => (
                  <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f} className="chip">
                    {f === "todos" ? "Todos" : f === "compartido" ? "Compartidos" : "Personales"}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div role="alert" className="card tone-danger mb-3 p-3.5 text-sm text-danger">{error}</div>
            )}

            {gastosFiltrados.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={filtro === "todos" ? `Aún no hay gastos en ${nombreMes(mesActivo)}` : "No hay gastos de este tipo"}
                description={filtro === "todos" ? "Toca + para registrar el primero." : "Prueba con otro filtro."}
              />
            ) : (
              <ul className="space-y-2">
                {gastosFiltrados.map(g => (
                  <li
                    key={g.id}
                    className="card flex items-center justify-between gap-1 p-3 pl-3.5"
                    style={g.id === editandoId ? { borderColor: "var(--accent)" } : undefined}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-xl">
                        {g.categorias?.emoji
                          ? <span aria-hidden="true">{g.categorias.emoji}</span>
                          : <Package size={20} className="text-muted" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold leading-snug">{g.concepto}</p>
                        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                          <span>{fmtFechaCorta(g.fecha)}</span>
                          <span aria-hidden="true">·</span>
                          {g.visibilidad === "privado" ? (
                            <span className="flex items-center gap-1"><Lock size={12} aria-hidden="true" /> Personal</span>
                          ) : (
                            <span>
                              {esYo(g.pagado_por) ? "Pagaste tú" : `Pagó ${nombreDe(g.pagado_por)}`}
                              {" · "}{textoReparto(g.porcentaje_pagador ?? 50)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <p className="num font-display mr-0.5 text-base font-semibold">{fmt(Number(g.valor))}</p>
                      <button onClick={() => editarGasto(g)} className="icon-btn is-accent" aria-label={`Editar ${g.concepto}`}>
                        <Pencil size={17} />
                      </button>
                      <button onClick={() => setGastoAEliminar(g)} className="icon-btn is-danger" aria-label={`Eliminar ${g.concepto}`}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* ── Botón flotante ───────────────────────────────────────────── */}
        {!modalAbierto && (
          <button onClick={abrirNuevo} className="fab" aria-label="Agregar gasto">
            <Plus size={26} />
          </button>
        )}

        {/* ── Bottom sheet: formulario ─────────────────────────────────── */}
        <Sheet open={modalAbierto} onClose={cerrarModal} title={editandoId ? "Editar gasto" : "Nuevo gasto"}>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de gasto">
            <button onClick={() => setVisibilidad("compartido")} aria-pressed={visibilidad === "compartido"} className="chip !rounded-2xl">
              <Users size={16} /> Compartido
            </button>
            <button
              onClick={() => !editandoAjeno && setVisibilidad("privado")}
              disabled={editandoAjeno}
              aria-pressed={!editandoAjeno && visibilidad === "privado"}
              title={editandoAjeno ? "No puedes hacer privado un gasto de tu pareja" : undefined}
              className="chip !rounded-2xl"
            >
              <Lock size={16} /> Personal
            </button>
          </div>

          <div>
            <label htmlFor="g-concepto" className="field-label">Concepto</label>
            <input
              id="g-concepto"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              onKeyDown={e => e.key === "Enter" && guardarGasto()}
              placeholder="¿En qué gastaste?"
              autoFocus
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label htmlFor="g-valor" className="field-label">Valor</label>
              <input
                id="g-valor"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="0"
                type="number"
                inputMode="numeric"
                min="0"
                className="field num"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="g-fecha" className="field-label">Fecha</label>
              <input id="g-fecha" value={fecha} onChange={e => setFecha(e.target.value)} type="date" className="field min-w-0" />
            </div>
          </div>

          <div>
            <label htmlFor="g-cat" className="field-label">Categoría</label>
            <select id="g-cat" value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="field">
              <option value="">Sin categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>
              ))}
            </select>
          </div>

          {visibilidad === "compartido" && (
            <div className="space-y-3 border-t border-[var(--border)] pt-3">
              <fieldset>
                <legend className="field-label">¿Quién pagó?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {perfiles.map(p => (
                    <button key={p.id} onClick={() => setPagadoPor(p.id)} aria-pressed={pagadoPor === p.id} className="chip !rounded-2xl truncate">
                      {esYo(p.id) ? `Yo (${p.nombre})` : p.nombre}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="field-label">¿Cómo se reparte?</legend>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 50,  label: "A partes iguales" },
                    { v: 100, label: "Gasto de quien pagó" },
                    { v: 0,   label: `Gasto de ${primerNombre(otroPerfil?.nombre, "la otra persona")}` },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setPctPagador(opt.v)}
                      aria-pressed={pctPagador === opt.v}
                      className="chip !rounded-2xl !px-2 text-center leading-tight"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {valor && Number(valor) > 0 && pagadoPor && (
                <div className="rounded-2xl bg-[var(--surface-2)] px-3.5 py-3 text-sm text-secondary" role="status">
                  {pctPagador === 100
                    ? <span>No genera deuda: es un gasto {esYo(pagadoPor) ? "tuyo" : `de ${nombreDe(pagadoPor)}`}.</span>
                    : <span>{fraseDeuda(perfiles.find(p => p.id !== pagadoPor)?.id ?? null, pagadoPor, Number(valor) * (100 - pctPagador) / 100)}.</span>
                  }
                </div>
              )}
            </div>
          )}

          <button
            onClick={guardarGasto}
            disabled={guardando || !concepto || !valor || (visibilidad === "compartido" && !pagadoPor)}
            className="btn btn-primary w-full"
          >
            <Plus size={18} />
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar gasto"}
          </button>
        </Sheet>

        <ConfirmDialog
          open={!!gastoAEliminar}
          title="¿Eliminar gasto?"
          message={gastoAEliminar ? `Se eliminará "${gastoAEliminar.concepto}" por ${fmt(Number(gastoAEliminar.valor))}.` : ""}
          onCancel={() => setGastoAEliminar(null)}
          onConfirm={() => {
            if (gastoAEliminar) eliminarGasto(gastoAEliminar.id)
            setGastoAEliminar(null)
          }}
        />

        <ConfirmDialog
          open={!!presupuestoAQuitar}
          title="¿Quitar presupuesto?"
          message="Se quitará el presupuesto de esta categoría. Los gastos no se tocan."
          confirmLabel="Quitar"
          onCancel={() => setPresupuestoAQuitar(null)}
          onConfirm={() => {
            if (presupuestoAQuitar) eliminarPresupuesto(presupuestoAQuitar)
            setPresupuestoAQuitar(null)
          }}
        />

      </div>
    </main>
  )
}

// useSearchParams (para leer el SMS compartido) exige un límite de Suspense
// en Next — sin esto, el build falla. Mismo patrón que ya usa app/login.
export default function FinanzasPage() {
  return (
    <Suspense>
      <FinanzasContent />
    </Suspense>
  )
}
