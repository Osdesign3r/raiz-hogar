// lib/colors.ts
export type AccentColor = {
  id: string
  name: string
  from: string
  to: string
  value: string
}

export const ACCENT_COLORS: AccentColor[] = [
  { id: 'indigo',    name: 'Índigo',    from: '#6C47FF', to: '#818CF8', value: '#6C47FF' },
  { id: 'ocean',     name: 'Océano',    from: '#0EA5E9', to: '#38BDF8', value: '#0EA5E9' },
  { id: 'emerald',   name: 'Esmeralda', from: '#10B981', to: '#34D399', value: '#10B981' },
  { id: 'rose',      name: 'Rosa',      from: '#EC4899', to: '#F472B6', value: '#EC4899' },
  { id: 'amber',     name: 'Ámbar',     from: '#F59E0B', to: '#FCD34D', value: '#F59E0B' },
  { id: 'cyan',      name: 'Azul',      from: '#061bd4', to: '#22D3EE', value: '#06B6D4' },
]

export const DEFAULT_ACCENT = ACCENT_COLORS[0]

export function getAccentById(id: string): AccentColor {
  return ACCENT_COLORS.find(c => c.id === id) ?? DEFAULT_ACCENT
}

export function getAccentByValue(value: string): AccentColor {
  return ACCENT_COLORS.find(c => c.value === value) ?? DEFAULT_ACCENT
}

// ── Contraste ────────────────────────────────────────────────────────────────
// Texto blanco sobre ámbar o esmeralda da ~2:1 (WCAG pide 4.5:1). En vez de
// asumir blanco, se elige entre blanco y casi-negro el que mejor contraste
// tenga contra el PEOR punto del degradado real del botón (de `from` a
// `accentMid`, no hasta `to`: el extremo claro queda fuera de la superficie).

const canales = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminancia(hex: string): number {
  const [r, g, b] = canales(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Fin del degradado de botones: 30% del camino de `from` hacia `to`. */
export function accentMid(accent: AccentColor): string {
  const [a, b] = [canales(accent.from), canales(accent.to)]
  const mezcla = a.map((v, i) => Math.round(v + (b[i] - v) * 0.30))
  return '#' + mezcla.map(v => v.toString(16).padStart(2, '0')).join('')
}

const TEXTO_CLARO  = '#FFFFFF'
const TEXTO_OSCURO = '#0B0B12'

export function onAccentFor(accent: AccentColor): string {
  const mid = accentMid(accent)
  const peorCon = (texto: string) =>
    Math.min(contraste(texto, accent.from), contraste(texto, mid))
  return peorCon(TEXTO_OSCURO) > peorCon(TEXTO_CLARO) ? TEXTO_OSCURO : TEXTO_CLARO
}

/** Aplica el acento a toda la app vía variables CSS (ver globals.css). */
export function applyAccentToRoot(accent: AccentColor) {
  const root = document.documentElement
  root.style.setProperty('--accent', accent.value)
  root.style.setProperty('--accent-from', accent.from)
  root.style.setProperty('--accent-to', accent.to)
  root.style.setProperty('--accent-mid', accentMid(accent))
  root.style.setProperty('--on-accent', onAccentFor(accent))
}
