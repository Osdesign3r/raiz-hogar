import { Scale } from "lucide-react"

import { moneda as fmt } from "@/lib/texto"

type Props = {
  loading: boolean
  totalMes: number
  balance: string
}

/**
 * Tarjeta héroe del home. Todo el texto usa --on-accent (blanco u oscuro
 * según el acento elegido), nunca blanco fijo: sobre ámbar o esmeralda el
 * blanco quedaba ilegible.
 */
export default function HouseholdCard({ loading, totalMes, balance }: Props) {
  return (
    <section
      aria-label="Gasto compartido del mes"
      className="accent-gradient accent-glow relative overflow-hidden rounded-[28px] p-5"
    >
      {/* Brillo decorativo, no lleva información */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white opacity-20 blur-2xl"
      />

      <p className="relative text-sm font-bold uppercase tracking-wider opacity-80">
        Gasto compartido del mes
      </p>

      {loading ? (
        <div className="mt-3 h-11 w-48 animate-pulse rounded-xl bg-black/15" />
      ) : (
        <p className="num font-display relative mt-1 text-[2.5rem] font-semibold leading-tight">
          {fmt(totalMes)}
        </p>
      )}

      <div className="relative mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-black/15 px-3.5 py-2">
        <Scale size={16} aria-hidden="true" />
        {loading ? (
          <span className="block h-4 w-32 animate-pulse rounded bg-black/15" />
        ) : (
          <span className="text-sm font-bold">{balance}</span>
        )}
      </div>
    </section>
  )
}
