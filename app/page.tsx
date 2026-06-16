import { supabase } from "@/lib/supabase"
import DashboardCard from "@/components/DashboardCard"
import { Wallet, Users, Calendar, FolderOpen } from "lucide-react"

async function getDashboardData() {
  const hoy = new Date().toISOString().split("T")[0]
  const mesActual = hoy.slice(0, 7)

  const [gastosRes, eventosRes, miembrosRes] = await Promise.all([
    supabase
      .from("gastos")
      .select("valor, division")
      .gte("fecha", `${mesActual}-01`)
      .lte("fecha", `${mesActual}-31`),
    supabase
      .from("eventos")
      .select("titulo, fecha, hora")
      .gte("fecha", hoy)
      .order("fecha", { ascending: true })
      .limit(3),
    supabase.from("miembros").select("nombre").order("created_at").limit(1),
  ])

  const gastos = gastosRes.data ?? []
  const eventos = eventosRes.data ?? []
  const miembros = miembrosRes.data ?? []

  const totalMes = gastos.reduce((acc, g) => acc + Number(g.valor), 0)
  const nombreUsuario = miembros[0]?.nombre ?? "Hola"

  return { totalMes, eventos, nombreUsuario }
}

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`

export default async function Home() {
  const { totalMes, eventos, nombreUsuario } = await getDashboardData()

  const mesLabel = new Date().toLocaleDateString("es-CO", { month: "long" })

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-28">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="mb-6 mt-2">
          <h1 className="text-3xl font-bold">
            Hola {nombreUsuario} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Raíz · tu hogar en orden
          </p>
        </div>

        {/* Resumen rápido */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-900 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1 capitalize">Gasto {mesLabel}</p>
            <p className="text-xl font-bold text-blue-400">{fmt(totalMes)}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Próximos eventos</p>
            <p className="text-xl font-bold text-green-400">{eventos.length}</p>
          </div>
        </div>

        {/* Próximos eventos */}
        {eventos.length > 0 && (
          <div className="bg-slate-900 rounded-xl p-4 mb-6">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Próximamente</p>
            <div className="space-y-2">
              {eventos.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{e.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(e.fecha + "T12:00:00").toLocaleDateString("es-CO", {
                        weekday: "short", day: "numeric", month: "short"
                      })}
                      {e.hora ? ` · ${e.hora}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Módulos */}
        <div className="grid gap-3">
          <DashboardCard
            title="Finanzas"
            description="Gastos del hogar y balance entre los dos"
            href="/finanzas"
            icon={<Wallet size={18} />}
            accent="blue"
          />
          <DashboardCard
            title="Familia"
            description="Miembros del hogar"
            href="/familia"
            icon={<Users size={18} />}
            accent="purple"
          />
          <DashboardCard
            title="Calendario"
            description="Eventos y recordatorios compartidos"
            href="/calendario"
            icon={<Calendar size={18} />}
            accent="green"
          />
          <DashboardCard
            title="Documentos"
            description="Archivos importantes del hogar"
            href="/documentos"
            icon={<FolderOpen size={18} />}
            accent="amber"
          />
        </div>

      </div>
    </main>
  )
}
