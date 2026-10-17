// Copia de los planes de la base de datos, para mostrarlos en pantalla.
// Los límites reales los hace cumplir la base de datos.
export const PLANES = {
  emprende: { tipo: 'tienda', nombre: 'Emprende', precio: 99, anual: 990, productos: 80, fotos: 1, usuarios: 1, activacion: 0, dominio: false },
  negocio: { tipo: 'tienda', nombre: 'Negocio', precio: 199, anual: 1990, productos: 400, fotos: 3, usuarios: 2, activacion: 0, dominio: false },
  empresa: { tipo: 'tienda', nombre: 'Empresa', precio: 349, anual: 3490, productos: null, fotos: 3, usuarios: 5, activacion: 0, dominio: false },
  agente: { tipo: 'agente', nombre: 'Agente', precio: 149, anual: 1490, productos: 6, fotos: 10, usuarios: 1, activacion: 250, dominio: true },
  agente_pro: { tipo: 'agente', nombre: 'Agente Pro', precio: 249, anual: 2490, productos: 20, fotos: 15, usuarios: 1, activacion: 450, dominio: true },
} as const

export type PlanId = keyof typeof PLANES
export type TipoNegocio = 'tienda' | 'agente'
export const esPlan = (x: string): x is PlanId => x in PLANES
// Planes de cada tipo de negocio
export const PLAN_IDS = (Object.keys(PLANES) as PlanId[]).filter((k) => PLANES[k].tipo === 'tienda')
export const PLAN_AGENTE_IDS = (Object.keys(PLANES) as PlanId[]).filter((k) => PLANES[k].tipo === 'agente')
export const planesDe = (tipo: TipoNegocio) => (tipo === 'agente' ? PLAN_AGENTE_IDS : PLAN_IDS)
