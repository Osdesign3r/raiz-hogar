// lib/finanzas.ts
import type { Gasto, Perfil } from "./types"

export type ResumenPersona = Pick<Perfil, "id" | "nombre"> & {
  pagado: number
  responsabilidad: number
  saldo: number
}

export type BalanceHogar = {
  resumen: ResumenPersona[]
  acreedor: ResumenPersona | null
  deudor: ResumenPersona | null
  diferencia: number
}

export function calcularBalance(
  perfiles: Pick<Perfil, "id" | "nombre">[],
  gastos: Pick<Gasto, "valor" | "pagado_por" | "porcentaje_pagador">[]
): BalanceHogar {
  const pagado: Record<string, number> = {}
  const responsabilidad: Record<string, number> = {}

  perfiles.forEach(p => {
    pagado[p.id] = 0
    responsabilidad[p.id] = 0
  })

  const [a, b] = perfiles

  if (!a || !b) {
    return { resumen: [], acreedor: null, deudor: null, diferencia: 0 }
  }

  gastos.forEach(g => {
    const valor = Number(g.valor) || 0
    const pct = g.porcentaje_pagador ?? 50

    if (!g.pagado_por) return

    const pagador = g.pagado_por
    const otro = pagador === a.id ? b.id : a.id

    // quién pagó
    pagado[pagador] += valor

    // responsabilidad directa del pagador
    responsabilidad[pagador] += (valor * pct) / 100

    // responsabilidad del otro (todo lo restante)
    responsabilidad[otro] += (valor * (100 - pct)) / 100
  })

  const resumen: ResumenPersona[] = perfiles.map(p => {
    const saldo = pagado[p.id] - responsabilidad[p.id]
    return {
      id: p.id,
      nombre: p.nombre,
      pagado: pagado[p.id],
      responsabilidad: responsabilidad[p.id],
      saldo,
    }
  })

  const acreedor = resumen.find(p => p.saldo > 0.5) ?? null
  const deudor = resumen.find(p => p.saldo < -0.5) ?? null

  return {
    resumen,
    acreedor,
    deudor,
    diferencia: acreedor?.saldo ?? 0,
  }
}
