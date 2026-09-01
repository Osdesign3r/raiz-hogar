// lib/fecha.ts
//
// Fecha en formato YYYY-MM-DD usando hora LOCAL del dispositivo — nunca UTC.
//
// `Date.toISOString()` siempre convierte a UTC antes de formatear. Bogotá es
// UTC-5, así que a las 8pm hora local ya es la 1am del día siguiente en UTC
// — resultado: `new Date().toISOString().split("T")[0]` devuelve MAÑANA
// durante buena parte de la noche. Esto se repetía suelto en finanzas,
// calendario, documentos y useDashboard — cada uno con su propia copia de
// `hoy()`, cada una con el mismo bug. Ahora hay un solo lugar que lo hace
// bien, y todos importan de acá.
export function fechaLocal(d: Date = new Date()): string {
  const año = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")
  return `${año}-${mes}-${dia}`
}