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
