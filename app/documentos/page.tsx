"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"

import DashboardCard from "@/components/DashboardCard"
import { supabase } from "@/lib/supabase"
import type { Miembro } from "@/lib/types"

export default function DocumentosPage() {
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMembers() {
      const { data, error } = await supabase
        .from("miembros")
        .select("*")
        .order("nombre")

      if (!error && data) {
        setMiembros(data)
      }

      setLoading(false)
    }

    loadMembers()
  }, [])

  return (
    <main className="max-w-md mx-auto p-4 pb-28">
      <h1 className="text-3xl font-bold mb-6">
        Documentos
      </h1>

      {loading && (
        <p className="text-slate-400">
          Cargando...
        </p>
      )}

      <div className="space-y-3">
        {miembros.map((miembro) => (
          <DashboardCard
            key={miembro.id}
            title={miembro.nombre}
            description={miembro.parentesco}
            href={`/documentos/${miembro.id}`}
            icon={<FileText size={18} />}
          />
        ))}
      </div>
    </main>
  )
}