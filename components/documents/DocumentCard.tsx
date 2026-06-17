import { FileText, Lock, Users } from "lucide-react"

type Props = {
  nombre: string
  categoria: string
  visibilidad: "shared" | "private"
}

export default function DocumentCard({
  nombre,
  categoria,
  visibilidad,
}: Props) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 flex items-center gap-4">

      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
        <FileText size={18} className="text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate">
          {nombre}
        </h3>

        <p className="text-xs text-slate-400">
          {categoria}
        </p>
      </div>

      {visibilidad === "shared" ? (
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
  )
}