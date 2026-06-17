import {
  FileText,
  Plus,
} from "lucide-react"

import DashboardCard from "@/components/DashboardCard"

export default function DocumentosPage() {
  return (
    <main className="max-w-md mx-auto p-4 pb-28">

      <div className="flex items-center justify-between mb-6">

        <div>
          <h1 className="text-3xl font-bold">
            Documentos
          </h1>

          <p className="text-slate-400 text-sm">
            Archivos importantes del hogar
          </p>
        </div>

        <button
          className="
            h-11
            w-11
            rounded-xl
            bg-[var(--accent)]
            text-black
            flex
            items-center
            justify-center
          "
        >
          <Plus size={18} />
        </button>

      </div>

      <div className="space-y-3">

        <DashboardCard
          title="Oscar"
          description="3 documentos"
          href="/documentos/oscar"
          icon={<FileText size={18} />}
          accent="blue"
        />

        <DashboardCard
          title="Cathe"
          description="2 documentos"
          href="/documentos/cathe"
          icon={<FileText size={18} />}
          accent="purple"
        />

        <DashboardCard
          title="Tony"
          description="4 documentos"
          href="/documentos/tony"
          icon={<FileText size={18} />}
          accent="green"
        />

        <DashboardCard
          title="Chris"
          description="2 documentos"
          href="/documentos/chris"
          icon={<FileText size={18} />}
          accent="amber"
        />

        <DashboardCard
          title="Ori"
          description="6 documentos"
          href="/documentos/ori"
          icon={<FileText size={18} />}
          accent="purple"
        />

        <DashboardCard
          title="Compartidos"
          description="5 documentos"
          href="/documentos/compartidos"
          icon={<FileText size={18} />}
          accent="green"
        />

      </div>
    </main>
  )
}