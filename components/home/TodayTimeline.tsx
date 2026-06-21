import {
  AlertTriangle,
  Clock3,
  CalendarDays
} from "lucide-react"

export default function TodayTimeline({ items }: any) {

  return (

    <section>

      <p className="text-xs uppercase tracking-widest text-muted mb-3">
        Mi día
      </p>

      <div className="space-y-2">

        {items.map((e: any) => (

          <div
            key={e.id}
            className="surface rounded-2xl p-4"
          >

            <div className="flex gap-3">

              {e.status === "late" && (
                <AlertTriangle
                  size={16}
                  className="text-red-400"
                />
              )}

              {e.status === "today" && (
                <Clock3
                  size={16}
                  className="text-yellow-400"
                />
              )}

              {e.status === "future" && (
                <CalendarDays
                  size={16}
                  className="text-blue-400"
                />
              )}

              <div>

                <p className="text-sm font-medium">
                  {e.title}
                </p>

                <p className="text-xs text-muted">
                  {e.subtitle}
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </section>

  )

}