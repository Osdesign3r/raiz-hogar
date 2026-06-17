// lib/types.ts
// Tipos globales de la app — derivados del schema SQL

export type Miembro = {
  id: string
  nombre: string
  parentesco: string
  avatar_url: string | null

  hogar_id: string | null

  tipo: string | null

  fecha_nacimiento: string | null

  notas: string | null

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
export type DocumentoCategoria =
  | "Salud"
  | "Educacion"
  | "Finanzas"
  | "Vivienda"
  | "Vehiculos"
  | "Mascotas"
  | "Personal"
  | "Otros"

export type DocumentoVisibilidad =
  | "shared"
  | "private"

export type Documento = {
  id: string

  hogar_id: string

  miembro_id: string | null

  nombre: string

  categoria: DocumentoCategoria

  archivo_url: string

  visibilidad: DocumentoVisibilidad

  fecha_vencimiento: string | null

  notas: string | null

  created_by: string

  created_at: string
}