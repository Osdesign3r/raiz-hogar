// lib/texto.ts — helpers de redacción compartidos.
// Los textos que dependen de un número o de "quién es quién" se arman aquí en
// vez de con plantillas sueltas: así no salen "1 días" ni "Tú debe".

/** "1 día" / "3 días" */
export const diasTexto = (n: number) => `${n} ${n === 1 ? "día" : "días"}`

/** Primer nombre: "Catherine Nava" → "Catherine" */
export const primerNombre = (nombre: string | undefined | null, porDefecto = "tu pareja") =>
  nombre?.trim().split(/\s+/)[0] || porDefecto

/** Fecha corta legible: "2026-10-21" → "mié 21 oct" */
export const fechaCorta = (iso: string) =>
  new Date(iso + "T12:00:00")
    .toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })
    .replace(/\./g, "")

/** "Vence hoy" / "Vence mañana" / "Vence en 5 días" / "Venció ayer" / "Venció hace 10 días" */
export const textoVencimiento = (dias: number) => {
  if (dias === 0)  return "Vence hoy"
  if (dias === 1)  return "Vence mañana"
  if (dias === -1) return "Venció ayer"
  return dias > 0 ? `Vence en ${diasTexto(dias)}` : `Venció hace ${diasTexto(-dias)}`
}

/** Dinero en pesos, siempre igual en toda la app: "$1.234.567" (sin espacio, sin decimales). */
export const moneda = (n: number) => `$${Math.abs(Math.round(n)).toLocaleString("es-CO")}`

/** "Hoy" / "Ayer" / "lun 19 oct" — para listas de actividad. */
export const fechaRelativa = (fecha: Date) => {
  const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((dia(new Date()) - dia(fecha)) / 86400000)
  if (diff === 0) return "Hoy"
  if (diff === 1) return "Ayer"
  return fecha.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")
}
