const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n)

type Props = {
  totalMes: number
  balance: string
  loading?: boolean
}

export default function HouseholdCard({ totalMes, balance, loading }: Props) {
  return (
    <div className="accent-gradient rounded-3xl p-5">
      <p className="text-xs uppercase tracking-widest text-white/60">Mi hogar</p>

      {loading ? (
        <div className="h-9 w-36 rounded-lg bg-white/10 animate-pulse mt-2 mb-1" />
      ) : (
        <p className="text-4xl font-bold mt-2">{fmt(totalMes)}</p>
      )}

      <div className="mt-4">
        <p className="text-sm text-white/70">Balance</p>
        {loading ? (
          <div className="h-5 w-44 rounded bg-white/10 animate-pulse mt-1" />
        ) : (
          <p className="text-lg font-semibold">{balance}</p>
        )}
      </div>
    </div>
  )
}
