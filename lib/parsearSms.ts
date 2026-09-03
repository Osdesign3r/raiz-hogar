// lib/parsearSms.ts
//
// Intenta sacarle el monto y el comercio a un SMS bancario para prellenar
// el formulario de "Nuevo gasto" — nunca guarda nada solo, solo prellena.
// Si no logra entender el mensaje, igual abre el formulario con el texto
// crudo como concepto y el monto vacío — mejor eso que dejarte con las
// manos vacías después de compartir el SMS.
//
// Afinado sobre SMS reales de Bancolombia y Banco de Bogotá. Cubre bastante
// pero no todos los bancos tienen la misma plantilla — si un banco nuevo no
// sale bien, mándame un SMS real (tapando cuenta/tarjeta) para ajustar.

export type SmsParseado = {
  valor: number | null
  concepto: string
}

// Los bancos colombianos casi siempre escriben los montos en formato
// "americano" — coma para miles, punto para decimales — y no en el formato
// civil colombiano que uno esperaría (punto miles, coma decimales).
// Ej. real: Bancolombia "$5,000.00" (cinco mil pesos, no cinco).
// Ej. real: Banco de Bogotá "4,850" (sin decimales, sin "$").
//
// Regla: si el string termina en separador+2 dígitos ("," o "." + 2
// números justo al final), eso son centavos — se descartan, a la app no
// le interesan. Todo lo demás que no sea dígito se trata como separador
// de miles y se quita. Esto funciona igual sin importar cuál de los dos
// caracteres use el banco como decimal, porque el criterio es la
// POSICIÓN (2 dígitos exactos al final), no el símbolo en sí.
function limpiarMonto(bruto: string): number {
  const terminaEnCentavos = /[.,]\d{2}$/.test(bruto)
  const sinCentavos = terminaEnCentavos ? bruto.slice(0, -3) : bruto
  const soloDigitos = sinCentavos.replace(/\D/g, "")
  return soloDigitos ? Number(soloDigitos) : 0
}

// Ancladas a la frase de acción del banco ("pagaste", "compra por", etc.)
// en vez de agarrar cualquier número suelto — un SMS trae de todo: número
// de cuenta, últimos dígitos de tarjeta, fecha, hora, teléfono de dudas.
// Sin ancla, cualquiera de esos se puede confundir con el monto real.
const PATRONES_MONTO: RegExp[] = [
  /pagaste\s+\$?\s?([\d.,]+)/i,
  /compra\s+por\s+\$?\s?([\d.,]+)/i,
  /transferencia\s+por\s+\$?\s?([\d.,]+)/i,
  /retiro\s+por\s+\$?\s?([\d.,]+)/i,
  /(?:enviaste|envió|envio)\s+\$?\s?([\d.,]+)/i,
  /recibiste\s+\$?\s?([\d.,]+)/i,
  /compra\s+.*?por\s+\$?\s?([\d.,]+)/i,
  // Última opción: cualquier monto con "$" explícito en el texto.
  /\$\s?([\d.,]+)/,
]

function extraerMonto(texto: string): number | null {
  for (const patron of PATRONES_MONTO) {
    const match = texto.match(patron)
    if (match) {
      const valor = limpiarMonto(match[1])
      if (valor > 0) return valor
    }
  }
  return null
}

// Pago por código QR (Bancolombia "Transfiya"/llave, muy común) no trae
// nombre de comercio — trae un número de "llave", que no le dice nada a
// nadie como concepto de gasto. Se detecta aparte y se usa una etiqueta
// genérica en vez de intentar extraer "a la llave 0092855182".
function esPagoQR(texto: string): boolean {
  return /c[oó]digo\s*qr/i.test(texto)
}

function extraerComercio(texto: string): string | null {
  if (esPagoQR(texto)) return "Pago por QR"

  // La clase de caracteres NO incluye ¿ ? — así el match se corta solo
  // antes de la coletilla de "¿Dudas? Llama a la Servilinea..." que traen
  // casi todos los bancos pegada justo después del nombre del comercio.
  const patrones = [
    /\ben\s+([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s.*_-]{2,50})/i,
    /\ba\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{2,50})/i,
  ]

  for (const patron of patrones) {
    const match = texto.match(patron)
    if (!match) continue

    const limpio = match[1]
      // corta si se cuela alguna palabra de relleno del banco antes de
      // topar con puntuación
      .split(/\b(?:el|Tarjeta|Dudas|Llama|desde)\b/i)[0]
      .trim()
      .replace(/\s{2,}/g, " ")

    if (limpio.length >= 3) return limpio
  }

  return null
}

export function parsearSms(textoCompartido: string): SmsParseado {
  const texto = textoCompartido.trim()

  const valor = extraerMonto(texto)
  const comercio = extraerComercio(texto)

  // Si no se identificó comercio, se usa el mensaje completo recortado —
  // siempre es mejor que dejar el campo en blanco sin ninguna pista de
  // dónde salió este gasto.
  const concepto = comercio ?? texto.slice(0, 60)

  return { valor, concepto }
}