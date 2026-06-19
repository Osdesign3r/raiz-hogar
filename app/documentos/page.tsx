"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { Documento, DocumentoCategoria, DocumentoVisibilidad, Miembro } from "@/lib/types"
import {
  Upload, Trash2, Pencil, X, Search, Lock, Users,
  AlertTriangle, Clock, ExternalLink, FileText,
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

  const [editandoId,    setEditandoId]    = useState<string | null>(null)
  const [editandoAjeno, setEditandoAjeno] = useState(false)
  const [archivoActual, setArchivoActual] = useState<string | null>(null) // path existente al editar

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

  useEffect(() => { cargarDatos() }, [cargarDatos])

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
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const guardarDocumento = async () => {
    if (!nombre.trim()) return
    if (!editandoId && !archivo) { setError("Selecciona un archivo."); return }
    if (!hogarId) { setError("No se pudo determinar tu hogar."); return }

    setGuardando(true)
    setError(null)

    let archivoPath = archivoActual

    try {
      // Si hay un archivo nuevo (creación, o reemplazo durante edición), subirlo primero
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
if(

vencimiento

&&

!editandoId

){

const aviso = new Date(

vencimiento

)

aviso.setDate(

aviso.getDate()-15

)


await supabase

.from("eventos")

.insert({

titulo:

`${nombre.trim()} vence`,

fecha:

aviso.toISOString().split("T")[0],

hora:null,

descripcion:

"Documento próximo a vencer",

tipo:"tarea",

color:"yellow",

asignado_a:null,

recordatorio_minutos_antes:null

})

}
      // Si reemplazamos el archivo en una edición, borrar el viejo del bucket
      if (editandoId && archivo && archivoActual && archivoActual !== archivoPath) {
        await supabase.storage.from("documentos").remove([archivoActual])
      }

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
      if (editandoId === d.id) limpiarFormulario()
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
    () => documentos.filter(d => d.fecha_vencimiento && d.fecha_vencimiento < hoy()),
    [documentos]
  )
  const porVencer = useMemo(
    () => documentos.filter(d =>
      d.fecha_vencimiento && d.fecha_vencimiento >= hoy() && diasEntre(d.fecha_vencimiento, hoy()) <= 30
    ),
    [documentos]
  )

  const documentosFiltrados = useMemo(() => {
    return documentos.filter(d => {
      if (filtro !== "todos" && d.visibilidad !== filtro) return false
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase()
        const enNombre = d.nombre.toLowerCase().includes(q)
        const enEtiquetas = (d.etiquetas ?? []).some(e => e.toLowerCase().includes(q))
        if (!enNombre && !enEtiquetas) return false
      }
      return true
    })
  }, [documentos, filtro, busqueda])
const idsEspeciales = useMemo(
  () => new Set([
    ...vencidos.map(d => d.id),
    ...porVencer.map(d => d.id)
  ]),
  [vencidos, porVencer]
)

const documentosNormales = useMemo(
  () => documentosFiltrados.filter(
    d => !idsEspeciales.has(d.id)
  ),
  [documentosFiltrados, idsEspeciales]
)
  const fmtVencimiento = (fecha: string) => {
    const dias = diasEntre(fecha, hoy())
    if (dias < 0) return { texto: `Venció hace ${Math.abs(dias)} días`, color: "text-red-400" }
    if (dias === 0) return { texto: "Vence hoy", color: "text-amber-400" }
    if (dias <= 30) return { texto: `Vence en ${dias} días`, color: "text-amber-400" }
    return { texto: `Vence ${fecha}`, color: "text-slate-500" }
  }

  const renderItem = (d: Documento, destacar?: "vencido" | "porVencer") => (
    <div
      key={d.id}
      className={`rounded-xl p-4 flex items-center justify-between gap-3 group transition ${
        d.id === editandoId ? "bg-slate-900 ring-1 ring-blue-500" :
        destacar === "vencido"   ? "bg-red-500/10 border border-red-500/30" :
        destacar === "porVencer" ? "bg-amber-500/10 border border-amber-500/30" :
        "bg-slate-900"
      }`}
    >
      <button onClick={() => verArchivo(d)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <span className="text-xl shrink-0">{ICONO_CATEGORIA[d.categoria]}</span>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{d.nombre}</p>
          
          <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
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
        </div>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => verArchivo(d)} className="text-slate-600 hover:text-blue-400 transition" title="Ver archivo">
          <ExternalLink size={15} />
        </button>
        <button
          onClick={() => editarDocumento(d)}
          className="text-slate-600 hover:text-blue-400 transition opacity-0 group-hover:opacity-100"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => eliminarDocumento(d)}
          className="text-slate-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="max-w-md mx-auto">

        <h1 className="text-2xl font-bold mb-5">Documentos</h1>

        {/* Formulario */}
        <div className="bg-slate-900 rounded-xl p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {editandoId ? "Editando documento" : "Nuevo documento"}
            </p>
            {editandoId && (
              <button onClick={limpiarFormulario} className="text-slate-500 hover:text-slate-300 transition">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Archivo */}
          <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-800 text-sm text-slate-300 cursor-pointer hover:bg-slate-700 transition">
            <Upload size={15} className="shrink-0 text-slate-500" />
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
            className="w-full p-3 rounded-lg bg-slate-800 placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value as DocumentoCategoria)}
              className="p-3 rounded-lg bg-slate-800 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
            >
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>{ICONO_CATEGORIA[c]} {c}</option>
              ))}
            </select>
            <select
              value={miembroId}
              onChange={e => setMiembroId(e.target.value)}
              className="p-3 rounded-lg bg-slate-800 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
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
                visibilidad === "compartido" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <Users size={13} /> Compartido
            </button>
            <button
              onClick={() => !editandoAjeno && setVisibilidad("privado")}
              disabled={editandoAjeno}
              title={editandoAjeno ? "No puedes hacer privado un documento que subió tu pareja" : undefined}
              className={`p-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                editandoAjeno          ? "bg-slate-800/40 text-slate-600 cursor-not-allowed" :
                visibilidad==="privado"? "bg-blue-600 text-white" :
                                         "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <Lock size={13} /> Privado
            </button>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1">Fecha de vencimiento (opcional)</p>
            <input
              value={vencimiento}
              onChange={e => setVencimiento(e.target.value)}
              type="date"
              className="w-full p-3 rounded-lg bg-slate-800 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <input
            value={etiquetas}
            onChange={e => setEtiquetas(e.target.value)}
            placeholder="Etiquetas separadas por coma (ej. pasaporte, urgente)"
            className="w-full p-3 rounded-lg bg-slate-800 placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />

          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            className="w-full p-3 rounded-lg bg-slate-800 placeholder-slate-500 text-sm outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={guardarDocumento}
            disabled={guardando || !nombre.trim() || (!editandoId && !archivo)}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            <Upload size={16} />
            {guardando ? "Guardando..." : editandoId ? "Actualizar documento" : "Guardar documento"}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-slate-900 rounded-xl h-16 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Vencidos */}
            {vencidos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-red-400 font-medium uppercase tracking-wide mb-2 pl-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Vencidos
                </p>
                <div className="space-y-2">{vencidos.map(d => renderItem(d, "vencido"))}</div>
              </div>
            )}

            {/* Por vencer */}
            {porVencer.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-2 pl-1 flex items-center gap-1">
                  <Clock size={12} /> Por vencer (30 días)
                </p>
                <div className="space-y-2">{porVencer.map(d => renderItem(d, "porVencer"))}</div>
              </div>
            )}

            {/* Búsqueda + filtro */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 bg-slate-900 rounded-lg px-3">
                <Search size={14} className="text-slate-500 shrink-0" />
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar documento o etiqueta..."
                  className="w-full bg-transparent text-sm py-2.5 outline-none placeholder-slate-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              {(["todos", "compartido", "privado"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`flex-1 p-2 rounded-lg text-xs font-medium transition ${
                    filtro === f ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {f === "todos" ? "Todos" : f === "compartido" ? "Compartidos" : "Privados"}
                </button>
              ))}
            </div>

            {documentosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <div className="text-center py-12">

<div className="text-4xl mb-3">
📂
</div>

<p className="text-base font-medium text-slate-300">
Tu bóveda familiar está vacía
</p>

<p className="text-sm text-slate-500 mt-1">

Guarda aquí registros civiles,
vacunas, seguros y documentos importantes.

</p>

</div>
              </div>
            ) : (
              <div className="space-y-2">
                {documentosNormales.map(d => renderItem(d))}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  )
}
