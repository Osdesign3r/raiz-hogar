import NotificationBell from "@/components/NotificationBell"

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function HeaderHome({ nombre }: { nombre: string }) {
  const fecha = capitalizar(
    new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
  )

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-muted">{fecha}</p>
        <h1 className="truncate text-[1.75rem] font-semibold leading-tight">
          Hola{nombre ? `, ${nombre}` : ""}
        </h1>
      </div>
      <NotificationBell />
    </header>
  )
}
