// Copia de los planes de la base de datos, para mostrarlos en pantalla.
// Los límites reales los hace cumplir la base de datos (supabase/schema.sql).
export const PLANES = {
  emprende: { nombre: 'Emprende', precio: 99, anual: 990, productos: 80, fotos: 1, usuarios: 1 },
  negocio: { nombre: 'Negocio', precio: 199, anual: 1990, productos: 400, fotos: 3, usuarios: 2 },
  empresa: { nombre: 'Empresa', precio: 349, anual: 3490, productos: null, fotos: 3, usuarios: 5 },
} as const

export type PlanId = keyof typeof PLANES
export const PLAN_IDS = Object.keys(PLANES) as PlanId[]
export const esPlan = (x: string): x is PlanId => x in PLANES
