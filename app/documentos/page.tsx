// app/documentos/page.tsx
"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { Documento, DocumentoCategoria, DocumentoVisibilidad, Miembro } from "@/lib/types"
import {
  Upload, Trash2, Pencil, X, Search, Lock, Users,
  AlertTriangle, Clock, ExternalLink, Plus, FileText,
} from "lucide-react"

const CATEGORIAS: DocumentoCategoria[] = [
  "Familia", "Salud", "Educacion", "Finanzas", "Legal", "Hogar", "Vehiculos", "Mascotas", "Otros",
]

const ICONO_CATEGORIA: Record<DocumentoCategoria, string> = {
  Familia: "👨‍👩‍👧", Salud: "🏥", Educacion: "🎓", Finanzas: "💰",
  Legal: "⚖️", Hogar: "🏠", Vehiculos: "🚗", Mascotas: "🐾", Otros: "📦",
}

const hoy = () => new Date().toISOString().split("T")[0]
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(a + "T12:00:00").getTime() - new Date(b + "T12:00:00").getTime()) / 86400000)

const sanitizar = (nombre: string) =>
  nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-]/g, "_")

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [miembros,   setMiembros]   = useState<Miembro[]>([])
  const [userId,     setUserId]     = useState<string | null>(null)
  const [hogarId,    setHogarId]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [busqueda,   setBusqueda]   = useState("")
  const [filtro,     setFiltro]     = useState<"todos" | "compartido" | "privado">("todos")

  const [modalAbierto, setModalAbierto] = useState(false)
  const [hojaVisible,  setHojaVisible]  = useState(false)

  const [editandoId,    setEditandoId]    = useState<string | null>(null)
  const [editandoAjeno, setEditandoAjeno] = useState(false)
  const [archivoActual, setArchivoActual] = useState<string | null>(null)

  const [nombre,       setNombre]       = useState("")
  const [categoria,    setCategoria]    = useState<DocumentoCategoria>("Otros")
  const [miembroId,    setMiembroId]    = useState<string>("")
  const [visibilidad,  setVisibilidad]  = useState<DocumentoVisibilidad>("compartido")
  const [vencimiento,  setVencimiento]  = useState("")
  const [etiquetas,    setEtiquetas]    = useState("")
  const [notas,        setNotas]        = useState("")
  const [archivo,      setArchivo]      = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ data: { user } }, hogarRes, miembrosRes, docsRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("hogar_usuarios").select("hogar_id").limit(1).single(),
      supabase.from("miembros").select("*").order("nombre"),
      supabase.from("documentos").select("*").order("created_at", { ascending: false }),
    ])

    setUserId(user?.id ?? null)
    setHogarId(hogarRes.data?.hogar_id ?? null)
    setMiembros(miembrosRes.data ?? [])
    if (docsRes.error) {
      setError("Error cargando documentos.")
    } else {
      setDocumentos((docsRes.data ?? []) as Documento[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    cargarDatos()

    const channel = supabase
      .channel("documentos")
      .on("postgres_changes", { event: "*", schema: "public", table: "documentos" }, () => {
        cargarDatos()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cargarDatos])

  useEffect(() => {
    if (modalAbierto) {
      const t = setTimeout(() => setHojaVisible(true), 10)
      return () => clearTimeout(t)
    }
    setHojaVisible(false)
  }, [modalAbierto])

  const nombreMiembro = useCallback(
    (id: string | null) => id === null ? "General del hogar" : (miembros.find(m => m.id === id)?.nombre ?? "—"),
    [miembros]
  )

  const limpiarFormulario = useCallback(() => {
    setEditandoId(null)
    setEditandoAjeno(false)
    setArchivoActual(null)
    setNombre("")
    setCategoria("Otros")
    setMiembroId("")
    setVisibilidad("compartido")
    setVencimiento("")
    setEtiquetas("")
    setNotas("")
    setArchivo(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const abrirNuevo = () => {
    limpiarFormulario()
    setModalAbierto(true)
  }

  const editarDocumento = (d: Documento) => {
    setEditandoId(d.id)
    setEditandoAjeno(d.created_by !== userId)
    setArchivoActual(d.archivo_url)
    setNombre(d.nombre)
    setCategoria(d.categoria)
    setMiembroId(d.miembro_id ?? "")
    setVisibilidad(d.visibilidad)
    setVencimiento(d.fecha_vencimiento ?? "")
    setEtiquetas((d.etiquetas ?? []).join(", "))
    setNotas(d.notas ?? "")
    setArchivo(null)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    limpiarFormulario()
  }

  const guardarDocumento = async () => {
    if (!nombre.trim()) return
    if (!editandoId && !archivo) { setError("Selecciona un archivo."); return }
    if (!hogarId) { setError("No se pudo determinar tu hogar."); return }

    setGuardando(true)
    setError(null)

    let archivoPath = archivoActual

    try {
      if (archivo) {
        const nuevoPath = `${hogarId}/${crypto.randomUUID()}-${sanitizar(archivo.name)}`
        const { error: upErr } = await supabase.storage
          .from("documentos")
          .upload(nuevoPath, archivo, { contentType: archivo.type })
        if (upErr) throw new Error("No se pudo subir el archivo: " + upErr.message)
        archivoPath = nuevoPath
      }

      const payload = {
        nombre:             nombre.trim(),
        categoria,
        miembro_id:         miembroId || null,
        visibilidad,
        archivo_url:        archivoPath!,
        fecha_vencimiento:  vencimiento || null,
        etiquetas:          etiquetas.trim() ? etiquetas.split(",").map(e => e.trim()).filter(Boolean) : null,
        notas:              notas.trim() || null,
        ...(editandoId ? {} : { hogar_id: hogarId, created_by: userId }),
      }

      const res = editandoId
        ? await supabase.from("documentos").update(payload).eq("id", editandoId)
        : await supabase.from("documentos").insert(payload)

      if (res.error) throw new Error(res.error.message)

      if (editandoId && archivo && archivoActual && archivoActual !== archivoPath) {
        await supabase.storage.from("documentos").remove([archivoActual])
      }

      setModalAbierto(false)
      limpiarFormulario()
      await cargarDatos()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el documento.")
    } finally {
      setGuardando(false)
    }
  }

  const eliminarDocumento = async (d: Documento) => {
    if (!confirm(`¿Eliminar "${d.nombre}"? Esta acción no se puede deshacer.`)) return
    const { error: err } = await supabase.from("documentos").delete().eq("id", d.id)
    if (!err) {
      await supabase.storage.from("documentos").remove([d.archivo_url])
      setDocumentos(prev => prev.filter(x => x.id !== d.id))
      if (editandoId === d.id) cerrarModal()
    }
  }

  const verArchivo = async (d: Documento) => {
    const { data, error: err } = await supabase.storage
      .from("documentos")
      .createSignedUrl(d.archivo_url, 60)
    if (err || !data) { setError("No se pudo abrir el archivo."); return }
    window.open(data.signedUrl, "_blank")
  }

  // ── Listas derivadas ────────────────────────────────────────────────────

  const vencidos = useMemo(
    () => [...documentos]
      .filter(d => d.fecha_vencimiento && d.fecha_vencimiento < hoy())
      .sort((a, b) => a.fecha_vencimiento!.localeCompare(b.fecha_vencimiento!))
    , [documentos]
  )

  const porVencer = useMemo(
    () => [...documentos]
      .filter(d => d.fecha_vencimiento && d.fecha_vencimiento >= hoy() && diasEntre(d.fecha_vencimiento, hoy()) <= 30)
      .sort((a, b) => a.fecha_vencimiento!.localeCompare(b.fecha_vencimiento!))
    , [documentos]
  )

  const idsEspeciales = useMemo(
    () => new Set([...vencidos.map(d => d.id), ...porVencer.map(d => d.id)]),
    [vencidos, porVencer]
  )

  const documentosFiltrados = useMemo(() => {
    return documentos.filter(d => {
      if (idsEspeciales.has(d.id)) return false
      if (filtro !== "todos" && d.visibilidad !== filtro) return false
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase()
        const enNombre = d.nombre.toLowerCase().includes(q)
        const enEtiquetas = (d.etiquetas ?? []).some(e => e.toLowerCase().includes(q))
        if (!enNombre && !enEtiquetas) return false
      }
      return true
    })
  }, [documentos, filtro, busqueda, idsEspeciales])

  const fmtVencimiento = (fecha: string) => {
    const dias = diasEntre(fecha, hoy())
    if (dias < 0) return { texto: `Venció hace ${Math.abs(dias)} días`, color: "text-red-400" }
    if (dias === 0) return { texto: "Vence hoy", color: "text-amber-400" }
    if (dias <= 30) return { texto: `Vence en ${dias} días`, color: "text-amber-400" }
    return { texto: `Vence ${fecha}`, color: "text-muted" }
  }

  const renderItem = (d: Documento, destacar?: "vencido" | "porVencer") => (
    <div
      key={d.id}
      className={`rounded-xl p-4 flex items-center justify-between gap-3 group transition ${
        d.id === editandoId ? "surface border-subtle ring-1" :
        destacar === "vencido"   ? "bg-red-500/10 border border-red-500/30" :
        destacar === "porVencer" ? "bg-amber-500/10 border border-amber-500/30" :
        "surface border-subtle"
      }`}
      style={d.id === editandoId ? { "--tw-ring-color": "var(--accent)" } as React.CSSProperties : undefined}
    >
      <button onClick={() => verArchivo(d)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <span className="text-xl shrink-0">{ICONO_CATEGORIA[d.categoria]}</span>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{d.nombre}</p>
          <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
            <span>{nombreMiembro(d.miembro_id)}</span>
            <span>·</span>
            {d.visibilidad === "privado" ? (
              <span className="flex items-center gap-0.5"><Lock size={10} /> Privado</span>
            ) : (
              <span className="flex items-center gap-0.5"><Users size={10} /> Compartido</span>
            )}
            {d.fecha_vencimiento && (
              <span className={`flex items-center gap-0.5 ${fmtVencimiento(d.fecha_vencimiento).color}`}>
                <Clock size={10} /> {fmtVencimiento(d.fecha_vencimiento).texto}
              </span>
            )}
          </p>
          {d.etiquetas?.length ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {d.etiquetas.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[10px] text-muted">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => verArchivo(d)} className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-[var(--accent)] hover:bg-[var(--surface-2)] active:opacity-70 transition" title="Ver archivo">
          <ExternalLink size={16} />
        </button>
        {d.created_by === userId && (
          <button onClick={() => editarDocumento(d)} className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-[var(--accent)] hover:bg-[var(--surface-2)] active:opacity-70 transition">
            <Pencil size={16} />
          </button>
        )}
        {d.created_by === userId && (
          <button onClick={() => eliminarDocumento(d)} className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-red-400 hover:bg-[var(--surface-2)] active:opacity-70 transition">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <main className="min-h-screen p-4 pb-28">
      <div className="max-w-md mx-auto">

        <h1 className="text-2xl font-bold mb-4">Documentos</h1>

        {/* Chips de info — mismo patrón que calendario */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className={`rounded-xl p-3 ${vencidos.length > 0 ? "bg-red-500/10 border border-red-500/30" : "surface border-subtle"}`}>
            <p className="text-[11px] text-muted flex items-center gap-1 mb-1"><AlertTriangle size={11} /> Vencidos</p>
            <p className={`font-bold text-lg ${vencidos.length > 0 ? "text-red-400" : ""}`}>{vencidos.length}</p>
          </div>
          <div className={`rounded-xl p-3 ${porVencer.length > 0 ? "bg-amber-500/10 border border-amber-500/30" : "surface border-subtle"}`}>
            <p className="text-[11px] text-muted flex items-center gap-1 mb-1"><Clock size={11} /> Por vencer</p>
            <p className={`font-bold text-lg ${porVencer.length > 0 ? "text-amber-400" : ""}`}>{porVencer.length}</p>
          </div>
          <div className="surface border-subtle rounded-xl p-3">
            <p className="text-[11px] text-muted flex items-center gap-1 mb-1"><FileText size={11} /> Total</p>
            <p className="font-bold text-lg">{documentos.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="surface border-subtle rounded-xl h-16 animate-pulse" />)}
          </div>
        ) : (
          <>
            {vencidos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-red-400 font-medium uppercase tracking-wide mb-2 pl-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Vencidos
                </p>
                <div className="space-y-2">{vencidos.map(d => renderItem(d, "vencido"))}</div>
              </div>
            )}

            {porVencer.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-2 pl-1 flex items-center gap-1">
                  <Clock size={12} /> Por vencer (30 días)
                </p>
                <div className="space-y-2">{porVencer.map(d => renderItem(d, "porVencer"))}</div>
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 surface border-subtle rounded-lg px-3">
                <Search size={14} className="text-muted shrink-0" />
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar documento o etiqueta..."
                  className="w-full bg-transparent text-sm py-2.5 outline-none placeholder:text-muted"
                />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              {(["todos", "compartido", "privado"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`flex-1 p-2 rounded-lg text-xs font-medium transition ${
                    filtro === f ? "text-white" : "bg-[var(--surface-2)] text-muted hover:opacity-80"
                  }`}
                  style={filtro === f ? { background: "var(--accent)" } : undefined}
                >
                  {f === "todos" ? "Todos" : f === "compartido" ? "Compartidos" : "Privados"}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3 mb-3">{error}</div>
            )}

            {documentosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📂</div>
                <p className="text-base font-medium text-secondary">La carpeta está vacía</p>
                <p className="text-sm text-muted mt-1">
                  {busqueda
                    ? "No encontramos documentos con ese criterio"
                    : "Guarda aquí documentos importantes de la familia"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentosFiltrados.map(d => renderItem(d))}
              </div>
            )}
          </>
        )}

        {/* Botón flotante */}
        {!modalAbierto && (
          <button
            onClick={abrirNuevo}
            className="fixed bottom-[88px] right-4 w-14 h-14 rounded-full accent-gradient shadow-lg flex items-center justify-center z-40 text-white"
          >
            <Plus size={26} />
          </button>
        )}

        {/* Bottom sheet: formulario */}
        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={cerrarModal} />
            <div
              className={`relative w-full max-w-md surface rounded-t-3xl p-4 pb-20 max-h-[85dvh] overflow-y-auto space-y-3 transition-transform duration-300 ease-out ${
                hojaVisible ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="flex items-center justify-between sticky top-0 surface pb-1">
                <p className="text-sm font-semibold">{editandoId ? "Editando documento" : "Nuevo documento"}</p>
                <button onClick={cerrarModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-secondary transition">
                  <X size={18} />
                </button>
              </div>

              <label className="flex items-center gap-2 p-3 rounded-lg bg-[var(--surface-2)] text-sm text-secondary cursor-pointer hover:opacity-80 transition">
                <Upload size={15} className="shrink-0 text-muted" />
                <span className="truncate">
                  {archivo ? archivo.name : editandoId ? "Reemplazar archivo (opcional)" : "Selecciona un archivo"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                />
              </label>

              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Nombre del documento"
                autoFocus
                className="w-full p-3 rounded-lg bg-[var(--surface-2)] placeholder:text-muted text-sm outline-none focus:ring-1"
                style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value as DocumentoCategoria)}
                  className="p-3 rounded-lg bg-[var(--surface-2)] text-sm text-secondary outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
                >
                  {CATEGORIAS.map(c => (
                    <option key={c} value={c}>{ICONO_CATEGORIA[c]} {c}</option>
                  ))}
                </select>
                <select
                  value={miembroId}
                  onChange={e => setMiembroId(e.target.value)}
                  className="p-3 rounded-lg bg-[var(--surface-2)] text-sm text-secondary outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
                >
                  <option value="">General del hogar</option>
                  {miembros.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVisibilidad("compartido")}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    visibilidad === "compartido" ? "text-white" : "bg-[var(--surface-2)] text-muted hover:opacity-80"
                  }`}
                  style={visibilidad === "compartido" ? { background: "var(--accent)" } : undefined}
                >
                  <Users size={13} /> Compartido
                </button>
                <button
                  onClick={() => !editandoAjeno && setVisibilidad("privado")}
                  disabled={editandoAjeno}
                  title={editandoAjeno ? "No puedes hacer privado un documento que subió tu pareja" : undefined}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    editandoAjeno          ? "bg-[var(--surface-2)]/40 text-muted cursor-not-allowed" :
                    visibilidad==="privado"? "text-white" :
                                             "bg-[var(--surface-2)] text-muted hover:opacity-80"
                  }`}
                  style={!editandoAjeno && visibilidad === "privado" ? { background: "var(--accent)" } : undefined}
                >
                  <Lock size={13} /> Privado
                </button>
              </div>

              <div>
                <p className="text-xs text-muted mb-1">Fecha de vencimiento (opcional)</p>
                <input
                  value={vencimiento}
                  onChange={e => setVencimiento(e.target.value)}
                  type="date"
                  className="w-full p-3 rounded-lg bg-[var(--surface-2)] text-sm text-secondary outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
                />
              </div>

              <input
                value={etiquetas}
                onChange={e => setEtiquetas(e.target.value)}
                placeholder="Etiquetas separadas por coma (ej. pasaporte, urgente)"
                className="w-full p-3 rounded-lg bg-[var(--surface-2)] placeholder:text-muted text-sm outline-none focus:ring-1"
                style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
              />

              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Notas (opcional)"
                rows={2}
                className="w-full p-3 rounded-lg bg-[var(--surface-2)] placeholder:text-muted text-sm outline-none focus:ring-1 resize-none"
                style={{ "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
              />

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={guardarDocumento}
                disabled={guardando || !nombre.trim() || (!editandoId && !archivo)}
                className="w-full accent-gradient disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition text-white"
              >
                <Upload size={16} />
                {guardando ? "Guardando..." : editandoId ? "Actualizar documento" : "Guardar documento"}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}