"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { Documento, DocumentoCategoria, DocumentoVisibilidad, Miembro } from "@/lib/types"
import {
  Upload, Trash2, Pencil, X, Search, Lock, Users,
  AlertTriangle, Clock, ExternalLink, Plus, FileText, FileQuestion, FolderOpen,
  UsersRound, Stethoscope, GraduationCap, Banknote, Gavel, House, Car, PawPrint, Package,
  type LucideIcon,
} from "lucide-react"
import ConfirmDialog from "@/components/ConfirmDialog"
import Sheet from "@/components/Sheet"
import PageHeader from "@/components/PageHeader"
import EmptyState from "@/components/EmptyState"
import PdfViewer from "@/components/documentos/PdfViewer"
import { fechaLocal } from "@/lib/fecha"
import { textoVencimiento, fechaCorta } from "@/lib/texto"

const CATEGORIAS: DocumentoCategoria[] = [
  "Familia", "Salud", "Educacion", "Finanzas", "Legal", "Hogar", "Vehiculos", "Mascotas", "Otros",
]

const ICONO_CATEGORIA: Record<DocumentoCategoria, LucideIcon> = {
  Familia: UsersRound, Salud: Stethoscope, Educacion: GraduationCap, Finanzas: Banknote,
  Legal: Gavel, Hogar: House, Vehiculos: Car, Mascotas: PawPrint, Otros: Package,
}

const hoy = () => fechaLocal()
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(a + "T12:00:00").getTime() - new Date(b + "T12:00:00").getTime()) / 86400000)

const MAX_MB = 20
const MAX_BYTES = MAX_MB * 1024 * 1024

const sanitizar = (nombre: string) =>
  nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-]/g, "_")

// ── Visor flotante: qué tipo de contenido renderizar dentro del modal ──────
type TipoVisor = "pdf" | "imagen" | "otro"
const EXT_IMAGEN = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
const tipoVisorDe = (nombreArchivo: string): TipoVisor => {
  const ext = nombreArchivo.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "pdf") return "pdf"
  if (EXT_IMAGEN.includes(ext)) return "imagen"
  return "otro"
}

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [miembros,   setMiembros]   = useState<Miembro[]>([])
  const [userId,     setUserId]     = useState<string | null>(null)
  const [hogarId,    setHogarId]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [progreso,   setProgreso]   = useState<number | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  const [busqueda,   setBusqueda]   = useState("")
  const [filtro,     setFiltro]     = useState<"todos" | "compartido" | "privado">("todos")

  const [modalAbierto, setModalAbierto] = useState(false)
  const [aEliminar,    setAEliminar]    = useState<Documento | null>(null)

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

  // ── Visor flotante ───────────────────────────────────────────────────────
  const [visor, setVisor] = useState<{ url: string; nombre: string; tipo: TipoVisor } | null>(null)
  const [visorCargando, setVisorCargando] = useState(false)
  const [visorVisible, setVisorVisible] = useState(false)

  useEffect(() => {
    if (visor) {
      const t = setTimeout(() => setVisorVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisorVisible(false)
  }, [visor])

  const cerrarVisorRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!visor) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cerrarVisorRef.current() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [visor])

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
      setError("No pudimos cargar los documentos. Inténtalo de nuevo.")
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
    if (!hogarId) { setError("No encontramos tu hogar. Cierra sesión, vuelve a entrar e inténtalo de nuevo."); return }

    setGuardando(true)
    setError(null)

    let archivoPath = archivoActual

    try {
      if (archivo) {
        if (archivo.size > MAX_BYTES) {
          setError(`El archivo supera el límite de ${MAX_MB} MB. Comprime o divide el documento.`)
          setGuardando(false)
          return
        }

        const nuevoPath = `${hogarId}/${crypto.randomUUID()}-${sanitizar(archivo.name)}`

        setProgreso(1)
        const { error: upErr } = await supabase.storage
          .from("documentos")
          .upload(nuevoPath, archivo, { contentType: archivo.type })
        setProgreso(null)
        if (upErr) { console.error(upErr); throw new Error("No pudimos subir el archivo. Revisa tu conexión e inténtalo de nuevo.") }
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

      if (res.error) { console.error(res.error); throw new Error("No pudimos guardar el documento. Inténtalo de nuevo.") }

      if (editandoId && archivo && archivoActual && archivoActual !== archivoPath) {
        await supabase.storage.from("documentos").remove([archivoActual])
      }

      setModalAbierto(false)
      limpiarFormulario()
      await cargarDatos()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar el documento. Inténtalo de nuevo.")
    } finally {
      setGuardando(false)
    }
  }

  const eliminarConfirmado = async (d: Documento) => {
    const { error: err } = await supabase.from("documentos").delete().eq("id", d.id)
    if (!err) {
      await supabase.storage.from("documentos").remove([d.archivo_url])
      setDocumentos(prev => prev.filter(x => x.id !== d.id))
      if (editandoId === d.id) cerrarModal()
    }
    setAEliminar(null)
  }

  // Ya no usa window.open — en modo standalone de Android eso te saca de la
  // app a Chrome externo. Ahora abre el visor flotante dentro de la propia PWA.
  const verArchivo = async (d: Documento) => {
    setVisorCargando(true)
    setError(null)
    const { data, error: err } = await supabase.storage
      .from("documentos")
      .createSignedUrl(d.archivo_url, 300)
    setVisorCargando(false)
    if (err || !data) { setError("No pudimos abrir el archivo. Inténtalo de nuevo."); return }
    setVisor({ url: data.signedUrl, nombre: d.nombre, tipo: tipoVisorDe(d.archivo_url) })
  }

  const cerrarVisor = () => {
    setVisorVisible(false)
    setTimeout(() => setVisor(null), 200)
  }
  useEffect(() => { cerrarVisorRef.current = cerrarVisor })

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
    if (dias < 0) return { texto: textoVencimiento(dias), color: "text-danger" }
    if (dias <= 30) return { texto: textoVencimiento(dias), color: "text-warning" }
    return { texto: `Vence el ${fechaCorta(fecha)}`, color: "text-muted" }
  }

  const renderItem = (d: Documento, destacar?: "vencido" | "porVencer") => {
    const Icono = ICONO_CATEGORIA[d.categoria]
    return (
    <li
      key={d.id}
      className={`card flex items-center justify-between gap-1 p-3 pl-3.5 ${
        destacar === "vencido"   ? "tone-danger" :
        destacar === "porVencer" ? "tone-warning" : ""
      }`}
      style={d.id === editandoId ? { borderColor: "var(--accent)" } : undefined}
    >
      <button
        onClick={() => verArchivo(d)}
        aria-label={`Abrir ${d.nombre}`}
        className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-xl text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
          <Icono size={20} style={{ color: "var(--accent-text)" }} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold leading-snug">{d.nombre}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
            <span>{nombreMiembro(d.miembro_id)}</span>
            {d.visibilidad === "privado" ? (
              <span className="flex items-center gap-1"><Lock size={12} aria-hidden="true" /> Privado</span>
            ) : (
              <span className="flex items-center gap-1"><Users size={12} aria-hidden="true" /> Compartido</span>
            )}
            {d.fecha_vencimiento && (
              <span className={`flex items-center gap-1 font-semibold ${fmtVencimiento(d.fecha_vencimiento).color}`}>
                <Clock size={12} aria-hidden="true" /> {fmtVencimiento(d.fecha_vencimiento).texto}
              </span>
            )}
          </p>
          {d.etiquetas?.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {d.etiquetas.map(tag => (
                <span key={tag} className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-secondary">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>
      <div className="flex shrink-0">
        {d.created_by === userId && (
          <button onClick={() => editarDocumento(d)} className="icon-btn is-accent" aria-label={`Editar ${d.nombre}`}>
            <Pencil size={18} />
          </button>
        )}
        {d.created_by === userId && (
          <button onClick={() => setAEliminar(d)} className="icon-btn is-danger" aria-label={`Eliminar ${d.nombre}`}>
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </li>
    )
  }

  return (
    <main className="page-shell">
      <div className="page">

        <PageHeader title="Documentos" />

        <div className="mb-6 grid grid-cols-3 gap-2.5">
          <div className={`card p-3.5 ${vencidos.length > 0 ? "tone-danger" : ""}`}>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted"><AlertTriangle size={13} /> Vencidos</p>
            <p className={`num font-display text-2xl font-semibold ${vencidos.length > 0 ? "text-danger" : ""}`}>{vencidos.length}</p>
          </div>
          <div className={`card p-3.5 ${porVencer.length > 0 ? "tone-warning" : ""}`}>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted"><Clock size={13} /> Por vencer</p>
            <p className={`num font-display text-2xl font-semibold ${porVencer.length > 0 ? "text-warning" : ""}`}>{porVencer.length}</p>
          </div>
          <div className="card p-3.5">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted"><FileText size={13} /> Total</p>
            <p className="num font-display text-2xl font-semibold">{documentos.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-[76px]" />)}
          </div>
        ) : (
          <>
            {vencidos.length > 0 && (
              <section className="mb-5">
                <h2 className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-bold uppercase tracking-wider text-danger">
                  <AlertTriangle size={14} /> Vencidos
                </h2>
                <ul className="space-y-2">{vencidos.map(d => renderItem(d, "vencido"))}</ul>
              </section>
            )}

            {porVencer.length > 0 && (
              <section className="mb-5">
                <h2 className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-bold uppercase tracking-wider text-warning">
                  <Clock size={14} /> Por vencer (30 días)
                </h2>
                <ul className="space-y-2">{porVencer.map(d => renderItem(d, "porVencer"))}</ul>
              </section>
            )}

            <div className="relative mb-3">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar documento o etiqueta..."
                aria-label="Buscar documento o etiqueta"
                className="field !pl-11"
              />
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2" role="group" aria-label="Filtrar por visibilidad">
              {(["todos", "compartido", "privado"] as const).map(f => (
                <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f} className="chip">
                  {f === "todos" ? "Todos" : f === "compartido" ? "Compartidos" : "Privados"}
                </button>
              ))}
            </div>

            {error && (
              <div role="alert" className="card tone-danger mb-3 p-3.5 text-sm text-danger">{error}</div>
            )}

            {documentosFiltrados.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="La carpeta está vacía"
                description={
                  busqueda
                    ? "Ningún documento coincide con tu búsqueda."
                    : "Guarda aquí los documentos importantes de la familia: pasaportes, seguros, vacunas."
                }
              />
            ) : (
              <ul className="space-y-2">
                {documentosFiltrados.map(d => renderItem(d))}
              </ul>
            )}
          </>
        )}

        {!modalAbierto && (
          <button onClick={abrirNuevo} className="fab" aria-label="Agregar documento">
            <Plus size={26} />
          </button>
        )}

        <Sheet open={modalAbierto} onClose={cerrarModal} title={editandoId ? "Editar documento" : "Nuevo documento"}>
          <label className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[14px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] p-3.5 text-secondary transition hover:border-[var(--accent)] focus-within:border-[var(--accent)]">
            <Upload size={20} className="shrink-0 text-muted" aria-hidden="true" />
            <span className="flex-1 truncate">
              {archivo
                ? `${archivo.name} · ${(archivo.size / 1024 / 1024).toFixed(1)} MB`
                : editandoId ? "Reemplazar archivo (opcional)" : "Selecciona un archivo"}
            </span>
            {!archivo && (
              <span className="shrink-0 text-xs text-muted">máx. {MAX_MB} MB</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,.zip,.txt,.csv"
              onChange={e => setArchivo(e.target.files?.[0] ?? null)}
            />
          </label>

          {progreso !== null && (
            <div className="flex items-center gap-2 text-sm text-muted" role="status">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div className="h-full w-1/3 animate-pulse rounded-full" style={{ background: "var(--accent)" }} />
              </div>
              <span>Subiendo...</span>
            </div>
          )}

          <div>
            <label htmlFor="d-nombre" className="field-label">Nombre</label>
            <input
              id="d-nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre del documento"
              autoFocus
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label htmlFor="d-cat" className="field-label">Categoría</label>
              <select
                id="d-cat"
                value={categoria}
                onChange={e => setCategoria(e.target.value as DocumentoCategoria)}
                className="field"
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="d-miembro" className="field-label">Pertenece a</label>
              <select
                id="d-miembro"
                value={miembroId}
                onChange={e => setMiembroId(e.target.value)}
                className="field"
              >
                <option value="">General del hogar</option>
                {miembros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Visibilidad">
            <button onClick={() => setVisibilidad("compartido")} aria-pressed={visibilidad === "compartido"} className="chip !rounded-2xl">
              <Users size={16} /> Compartido
            </button>
            <button
              onClick={() => !editandoAjeno && setVisibilidad("privado")}
              disabled={editandoAjeno}
              aria-pressed={!editandoAjeno && visibilidad === "privado"}
              title={editandoAjeno ? "No puedes hacer privado un documento que subió tu pareja" : undefined}
              className="chip !rounded-2xl"
            >
              <Lock size={16} /> Privado
            </button>
          </div>

          <div>
            <label htmlFor="d-venc" className="field-label">Fecha de vencimiento (opcional)</label>
            <input
              id="d-venc"
              value={vencimiento}
              onChange={e => setVencimiento(e.target.value)}
              type="date"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="d-tags" className="field-label">Etiquetas (opcional)</label>
            <input
              id="d-tags"
              value={etiquetas}
              onChange={e => setEtiquetas(e.target.value)}
              placeholder="Ej. pasaporte, urgente (separadas por coma)"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="d-notas" className="field-label">Notas (opcional)</label>
            <textarea
              id="d-notas"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              className="field"
            />
          </div>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <button
            onClick={guardarDocumento}
            disabled={guardando || !nombre.trim() || (!editandoId && !archivo)}
            className="btn btn-primary w-full"
          >
            <Upload size={18} />
            {guardando ? "Subiendo..." : editandoId ? "Guardar cambios" : "Guardar documento"}
          </button>
        </Sheet>

        <ConfirmDialog
          open={!!aEliminar}
          title="¿Eliminar documento?"
          message={aEliminar ? `Se eliminará "${aEliminar.nombre}" permanentemente, junto con el archivo.` : ""}
          onCancel={() => setAEliminar(null)}
          onConfirm={() => aEliminar && eliminarConfirmado(aEliminar)}
        />

      </div>

      {/* ── Visor flotante — reemplaza el window.open que sacaba de la PWA ── */}
      {visor && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: "var(--z-sheet)" }}>
          <div className="absolute inset-0 bg-black/80" onClick={cerrarVisor} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Vista previa de ${visor.nombre}`}
            className={`relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl transition-all duration-200 ease-out ${
              visorVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] py-1.5 pl-4 pr-1.5">
              <p className="truncate font-semibold">{visor.nombre}</p>
              <div className="flex shrink-0 items-center">
                <a
                  href={visor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn is-accent"
                  aria-label="Abrir externamente"
                >
                  <ExternalLink size={18} />
                </a>
                <button onClick={cerrarVisor} className="icon-btn" aria-label="Cerrar vista previa">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex min-h-[50vh] flex-1 items-center justify-center overflow-auto bg-black/30">
              {visor.tipo === "pdf" && (
                <PdfViewer url={visor.url} />
              )}

              {visor.tipo === "imagen" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={visor.url} alt={visor.nombre} className="max-h-[75vh] max-w-full object-contain" />
              )}

              {visor.tipo === "otro" && (
                <div className="p-8 text-center">
                  <FileQuestion size={40} className="mx-auto mb-3 text-muted" />
                  <p className="mb-1 text-secondary">
                    Este tipo de archivo no se puede previsualizar aquí
                  </p>
                  <a
                    href={visor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary mt-3"
                  >
                    <ExternalLink size={16} />
                    Abrir externamente
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {visorCargando && (
        <div
          role="status"
          aria-label="Cargando archivo"
          className="fixed inset-0 flex items-center justify-center bg-black/60"
          style={{ zIndex: "var(--z-sheet)" }}
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}

    </main>
  )
}
