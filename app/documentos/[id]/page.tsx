"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { FileText, Lock, Users } from "lucide-react"

import { supabase } from "@/lib/supabase"
import type { Documento, Miembro } from "@/lib/types"

export default function MiembroDocumentosPage() {
  const params = useParams()

  const miembroId = params.id as string

  const [miembro, setMiembro] = useState<Miembro | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: miembroData } = await supabase
        .from("miembros")
        .select("*")
        .eq("id", miembroId)
        .single()

      const { data: docsData } = await supabase
        .from("documentos")
        .select("*")
        .eq("miembro_id", miembroId)
        .order("created_at", {
          ascending: false,
        })

      if (miembroData) {
        setMiembro(miembroData)
      }

      if (docsData) {
        setDocumentos(docsData)
      }

      setLoading(false)
    }

    if (miembroId) {
      cargar()
    }
  }, [miembroId])

  if (loading) {
    return (
      <main className="max-w-md mx-auto p-4">
        <p className="text-slate-400">
          Cargando documentos...
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-28">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {miembro?.nombre}
        </h1>

        <p className="text-slate-400">
          {miembro?.parentesco}
        </p>
      </div>

      <div className="bg-slate-900 rounded-xl p-4 mb-4">
        <p className="text-slate-400 text-sm">
          Total documentos
        </p>

        <p className="text-2xl font-bold">
          {documentos.length}
        </p>
      </div>

      {documentos.length === 0 && (
        <div className="bg-slate-900 rounded-xl p-6 text-center">
          <FileText className="mx-auto mb-3 opacity-50" />

          <p className="text-slate-400">
            No hay documentos todavía
          </p>
        </div>
      )}

      <div className="space-y-3">
        {documentos.map((doc) => (
          <div
            key={doc.id}
            className="bg-slate-900 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText
                  size={18}
                  className="text-blue-400"
                />
              </div>

              <div className="flex-1">
                <h3 className="font-medium">
                  {doc.nombre}
                </h3>

                <p className="text-xs text-slate-400">
                  {doc.categoria}
                </p>
              </div>

              {doc.visibilidad === "shared" ? (
                <Users
                  size={16}
                  className="text-green-400"
                />
              ) : (
                <Lock
                  size={16}
                  className="text-amber-400"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}