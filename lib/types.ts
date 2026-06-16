// lib/types.ts
// Tipos globales de la app — derivados del schema SQL

export type Miembro = {
  id: string
  nombre: string
  rol: string
  avatar_url: string | null
  created_at: string
}

export type Categoria = {
  id: string
  nombre: string
  emoji: string
}

export type Division = '50-50' | 'oscar' | 'pareja'

export type Gasto = {
  id: string
  concepto: string
  valor: number
  division: Division
  categoria_id: string | null
  fecha: string          // YYYY-MM-DD
  notas: string | null
  created_at: string
  // join opcional
  categorias?: Categoria
}

export type GastoInsert = Omit<Gasto, 'id' | 'created_at' | 'categorias'>

export type Evento = {
  id: string
  titulo: string
  fecha: string          // YYYY-MM-DD
  hora: string | null
  descripcion: string | null
  color: string
  created_at: string
}

export type EventoInsert = Omit<Evento, 'id' | 'created_at'>
